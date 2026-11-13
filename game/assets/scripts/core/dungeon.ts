// Hang Xoáy: một lượt = 5 tầng của một chặng. Sinh quái theo nhóm, boss và đòn báo trước, chuỗi hạ gục,
// qua tầng, thắng/thua (01 mục 12.3, 13).
import { BossAbilityDef, FloorDef, MonsterDef, ResourceMap, StageDef } from './data';
import { DungeonRunView } from './contract';
import { Arena, ArenaHost, HeroSpec, Unit } from './arena';
import { Rng } from './rng';
import { CHARGE_DASH_SEC, SUMMON_RADIUS, TIME_EPS } from './constants';

export interface DungeonHost extends ArenaHost {
  /** Vừa sạch quái tầng `floor` (kể cả tầng boss). */
  onFloorCleared(floor: number): void;
}

export class DungeonSim extends Arena implements DungeonRunView {
  stage = 0;
  floor = 0;
  isBossFloor = false;
  floorTime = 0;
  cleared = false;
  exitOpen = false;
  exitX = 0; exitY = 0;
  fadeT = 0;
  streak = 0;
  streakT = 0;
  auto = false;
  loot: ResourceMap = {};
  bossId = 0;
  bossName = '';
  remaining = 0;
  roomW = 0; roomH = 0;

  /** Kết quả lượt: '' khi còn đang đánh. */
  outcome: '' | 'victory' | 'defeat' = '';
  kills = 0;
  bestStreak = 0;
  durationSec = 0;
  running = false;

  private dhost: DungeonHost;
  private stageDef: StageDef = null;
  private floorDef: FloorDef = null;
  private spawned: number[] = [];
  private aliveMonsters = 0;
  private clearedT = 0;
  private bossDead = false;

  constructor(host: DungeonHost, rng: Rng) {
    super(host, rng);
    this.dhost = host;
    this.kind = 'dungeon';
    const d = this.t.dungeon;
    this.roomW = d.roomW; this.roomH = d.roomH;
    this.setBounds(0, 0, d.roomW, d.roomH);
    this.exitX = d.exitPos[0]; this.exitY = d.exitPos[1];
    this.active = this.monsters; // trong dungeon mọi quái đều được mô phỏng
  }

  /** Bắt đầu một lượt. `rng` là RNG con của lượt (seed = hash(seed gốc, số thứ tự lượt)). */
  start(stage: StageDef, specs: HeroSpec[], rng: Rng, auto: boolean): void {
    this.rng = rng;
    this.stageDef = stage;
    this.stage = stage.stage;
    this.auto = auto;
    this.outcome = '';
    this.running = true;
    this.kills = 0; this.bestStreak = 0; this.durationSec = 0;
    this.streak = 0; this.streakT = 0;
    for (const k of Object.keys(this.loot)) delete this.loot[k];
    this.clearMonsters();
    this.clearPickups();
    const d = this.t.dungeon;
    this.setHeroes(specs, d.startPos[0], d.startPos[1], false);
    this.joyX = 0; this.joyY = 0; this.idleT = 99;
    this.startFloor(stage.firstFloor, true);
  }

  /** Dọn dẹp khi lượt kết thúc. */
  stop(): void {
    this.running = false;
    this.clearMonsters();
    this.clearPickups();
    this.setHeroes([], 0, 0, false);
    this.bossId = 0; this.bossName = '';
  }

  private startFloor(floor: number, first: boolean): void {
    const d = this.t.dungeon;
    this.floor = floor;
    this.floorDef = this.data.dungeon.floors[floor - 1];
    this.isBossFloor = this.floorDef.isBoss;
    this.floorTime = 0; this.cleared = false; this.exitOpen = false; this.clearedT = 0; this.fadeT = 0;
    this.bossDead = false; this.bossId = 0; this.bossName = '';
    this.clearMonsters();
    this.clearPickups();
    this.aliveMonsters = 0;
    this.spawned.length = 0;
    let total = 0;
    for (const g of this.floorDef.groups) { this.spawned.push(0); total += g.count; }
    this.remaining = total;
    const offs = this.t.squad.formationOffsets;
    let fi = 0;
    for (const h of this.heroes) {
      h.target = null; h.nodeTarget = -1; h.targetId = 0; h.windupT = 0; h.pending = 0; h.attackCd = 0;
      h.buffT = 0; h.buffPct = 0; h.vx = 0; h.vy = 0;
      this.resetSkillCooldowns(h); // đầu mỗi tầng: hồi chiêu đặt lại đầy
      if (!h.alive) continue;
      h.x = d.startPos[0] + offs[Math.min(fi, offs.length - 1)][0];
      h.y = d.startPos[1] + offs[Math.min(fi, offs.length - 1)][1];
      fi++;
      this.clampToBounds(h);
      if (first) h.hp = h.maxHp;
      else h.hp = Math.min(h.maxHp, h.hp + h.maxHp * d.healBetweenFloorsPct);
    }
    this.updateLeader();
    this.sinceCombat = 0;
    this.host.emit('floor_start', 0, 0, floor, 0, '');
  }

  setAuto(on: boolean): void { this.auto = on; }

  step(): void {
    if (!this.running || this.outcome !== '') return;
    const dt = this.dt;
    const d = this.t.dungeon;
    this.durationSec += dt;
    if (this.fadeT > 0) {
      this.fadeT -= dt;
      if (this.fadeT <= TIME_EPS) { this.fadeT = 0; this.startFloor(this.floor + 1, false); }
      return;
    }
    this.floorTime += dt;
    this.spawnDue();

    // AUTO: tự đi tới cửa ra sau khi tầng sạch
    let ax = 0;
    let ay = 0;
    if (this.cleared && this.exitOpen) {
      this.clearedT += dt;
      if (this.auto && this.clearedT >= d.floorExitDelaySec - TIME_EPS && this.leader) {
        const dx = this.exitX - this.leader.x;
        const dy = this.exitY - this.leader.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1e-6) { ax = dx / len; ay = dy / len; }
      }
    }
    this.stepHeroes(true, ax, ay);
    this.stepDungeonMonsters();
    this.stepMovement();
    this.stepAttacks();
    this.stepPickups();
    this.stepCorpses();

    if (this.outcome !== '') return; // boss vừa chết trong bước này
    this.updateLeader();
    if (this.aliveHeroes === 0) { this.outcome = 'defeat'; return; }

    if (!this.cleared) {
      if (this.streakT > 0) {
        this.streakT -= dt;
        if (this.streakT <= TIME_EPS) { this.streakT = 0; this.streak = 0; }
      }
      if (this.remaining === 0 && !this.isBossFloor) this.clearFloor();
    } else if (this.exitOpen && this.leader) {
      const dx = this.exitX - this.leader.x;
      const dy = this.exitY - this.leader.y;
      if (dx * dx + dy * dy <= d.exitTouchRadius * d.exitTouchRadius) this.fadeT = d.floorFadeSec;
    }
    this.sinceCombat += dt;
  }

  private clearFloor(): void {
    this.cleared = true;
    this.flyAllPickups();
    const gold = this.floorDef.clearGold;
    if (gold > 0) this.loot.gold = (this.loot.gold || 0) + gold;
    this.dhost.onFloorCleared(this.floor);
    if (!this.isBossFloor) {
      this.exitOpen = true;
      this.host.emit('floor_clear', this.exitX, this.exitY, gold, this.floor, '');
    }
  }

  // ----- sinh quái -----

  private spawnDue(): void {
    const groups = this.floorDef.groups;
    const max = this.t.dungeon.maxAlive;
    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      if (this.floorTime < grp.delaySec - TIME_EPS || this.spawned[g] >= grp.count) continue;
      const def = this.data.monsterById[grp.monster];
      const base = this.rng.next() * 6.283185307179586;
      while (this.spawned[g] < grp.count) {
        // boss không tính vào giới hạn chờ: luôn xuất hiện
        if (this.aliveMonsters >= max && def.kind !== 'boss') return; // xếp hàng theo thứ tự nhóm
        this.spawnOne(def, grp.pattern, this.spawned[g], grp.count, base);
        this.spawned[g]++;
      }
    }
  }

  private spawnOne(def: MonsterDef, pattern: string, i: number, count: number, baseAngle: number): Unit {
    const d = this.t.dungeon;
    const f = this.floorDef;
    let x = 0;
    let y = 0;
    if (pattern === 'boss') { x = d.roomW / 2; y = d.roomH - 5; }
    else if (pattern === 'front') { x = this.rng.range(2, d.roomW - 2); y = this.rng.range(14, d.roomH - 2); }
    else {
      // ring / waves: rải đều trên vòng tròn quanh thủ lĩnh, kẹp trong phòng, cách mọi hero >= spawnMinDistFromHero
      const lx = this.leader ? this.leader.x : d.startPos[0];
      const ly = this.leader ? this.leader.y : d.startPos[1];
      let ang = baseAngle + 6.283185307179586 * i / count;
      let ok = false;
      for (let tries = 0; tries < 12 && !ok; tries++) {
        const r = this.rng.range(d.ringSpawnRadius[0], d.ringSpawnRadius[1]);
        x = lx + Math.cos(ang) * r;
        y = ly + Math.sin(ang) * r;
        if (x < 0.5) x = 0.5; else if (x > d.roomW - 0.5) x = d.roomW - 0.5;
        if (y < 0.5) y = 0.5; else if (y > d.roomH - 0.5) y = d.roomH - 0.5;
        ok = this.farFromHeroes(x, y, d.spawnMinDistFromHero);
        ang += 2.399963229728653; // góc vàng: thử hướng khác
      }
      for (let tries = 0; tries < 12 && !ok; tries++) {
        x = this.rng.range(0.5, d.roomW - 0.5);
        y = this.rng.range(0.5, d.roomH - 0.5);
        ok = this.farFromHeroes(x, y, d.spawnMinDistFromHero);
      }
    }
    const m = this.spawnMonster(def, x, y, Math.max(1, Math.round(def.baseHp * f.hpMult)),
      Math.round(def.baseAtk * f.atkMult), Math.round(def.exp * f.expMult));
    m.goldMult = f.goldMult;
    m.state = 'chase';
    this.aliveMonsters++;
    if (m.isBoss) {
      this.bossId = m.id; this.bossName = def.name;
      const ab = def.abilities || [];
      const startPct = this.t.combat.bossAbilityStartCooldownPct;
      for (let k = 0; k < ab.length; k++) m.abilityCd.push(this.data.monsters.abilities[ab[k]].cooldownSec * startPct);
      const near = this.nearestHero(m.x, m.y);
      if (near) { const dx = near.x - m.x; const dy = near.y - m.y; const len = Math.sqrt(dx * dx + dy * dy) || 1; m.faceX = dx / len; m.faceY = dy / len; }
    }
    return m;
  }

  private farFromHeroes(x: number, y: number, min: number): boolean {
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const dx = h.x - x;
      const dy = h.y - y;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  }

  // ----- AI quái và boss -----

  private stepDungeonMonsters(): void {
    const list = this.monsters;
    const n = list.length; // quái gọi thêm trong bước này bắt đầu hành động từ bước sau
    for (let i = 0; i < n; i++) {
      const m = list[i];
      if (!m.alive) continue;
      m.vx = 0; m.vy = 0;
      if (m.isBoss && this.stepBoss(m)) continue;
      this.monsterChase(m);
    }
    // vùng báo đòn chạy theo giờ
    for (let i = 0; i < this.telegraphs.length; i++) this.telegraphs[i].elapsed += this.dt;
  }

  /** Trả về true nếu boss đang bận (gồng kỹ năng hoặc lao) và không đánh thường trong bước này. */
  private stepBoss(m: Unit): boolean {
    const dt = this.dt;
    const ids = m.mdef.abilities || [];
    for (let k = 0; k < m.abilityCd.length; k++) if (m.abilityCd[k] > 0) m.abilityCd[k] -= dt;
    if (m.dashing) {
      m.dashT -= dt;
      m.vx = m.dashVx; m.vy = m.dashVy;
      if (m.dashT <= TIME_EPS) m.dashing = false; // bước cuối vẫn di chuyển để đi đủ chiều dài
      return true;
    }
    if (m.castAbility !== '') {
      m.castT -= dt;
      if (m.castT <= TIME_EPS) this.resolveAbility(m, m.castAbility, this.data.monsters.abilities[m.castAbility]);
      return true;
    }
    if (m.windupT > 0) return false; // đang gồng đòn thường: để đánh xong
    for (let k = 0; k < ids.length; k++) {
      if (m.abilityCd[k] > TIME_EPS) continue;
      const ab = this.data.monsters.abilities[ids[k]];
      if (this.startAbility(m, ids[k], ab)) { m.abilityCd[k] = ab.cooldownSec; return true; }
    }
    return false;
  }

  private startAbility(m: Unit, id: string, ab: BossAbilityDef): boolean {
    if (ab.telegraph === 'circle') {
      const tg = this.addTelegraph('circle', id, m, ab.telegraphSec);
      tg.radius = ab.radius;
      m.castAbility = id; m.castT = ab.telegraphSec; m.castTelegraphId = tg.id;
      this.host.emit('telegraph', tg.x, tg.y, ab.telegraphSec, tg.id, id);
      return true;
    }
    if (ab.telegraph === 'rect') {
      const near = this.nearestHero(m.x, m.y);
      if (!near) return false;
      let dx = near.x - m.x;
      let dy = near.y - m.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-6) { dx = m.faceX; dy = m.faceY; } else { dx /= len; dy /= len; }
      const tg = this.addTelegraph('rect', id, m, ab.telegraphSec);
      tg.dirX = dx; tg.dirY = dy; tg.length = ab.length; tg.width = ab.width;
      m.castAbility = id; m.castT = ab.telegraphSec; m.castTelegraphId = tg.id;
      m.castDirX = dx; m.castDirY = dy; m.faceX = dx; m.faceY = dy;
      this.host.emit('telegraph', tg.x, tg.y, ab.telegraphSec, tg.id, id);
      return true;
    }
    // Gọi Bầy: không báo trước, gọi quái thường đầu tiên trong danh sách nhóm của tầng
    let def: MonsterDef = null;
    for (const g of this.floorDef.groups) {
      const cand = this.data.monsterById[g.monster];
      if (cand.kind !== 'boss') { def = cand; break; }
    }
    if (!def) return false;
    const max = this.t.dungeon.maxAlive;
    const f = this.floorDef;
    let made = 0;
    for (let i = 0; i < ab.count && this.aliveMonsters < max; i++) {
      const ang = 6.283185307179586 * i / ab.count + this.rng.next() * 0.5;
      const r = SUMMON_RADIUS * (0.6 + 0.4 * this.rng.next());
      const s = this.spawnMonster(def, m.x + Math.cos(ang) * r, m.y + Math.sin(ang) * r,
        Math.max(1, Math.round(def.baseHp * f.hpMult)), Math.round(def.baseAtk * f.atkMult), Math.round(def.exp * f.expMult));
      s.goldMult = f.goldMult;
      s.state = 'chase';
      this.clampToBounds(s);
      this.aliveMonsters++;
      this.remaining++;
      made++;
    }
    this.host.emit('boss_ability', m.x, m.y, made, m.id, id);
    return true;
  }

  private resolveAbility(m: Unit, id: string, ab: BossAbilityDef): void {
    const tg = this.findTelegraph(m.castTelegraphId);
    const dmg = Math.max(1, Math.round(m.atk * ab.mult));
    if (tg && tg.shape === 'circle') {
      const r2 = tg.radius * tg.radius;
      for (const h of this.heroes) {
        if (!h.alive) continue;
        const dx = h.x - tg.x;
        const dy = h.y - tg.y;
        if (dx * dx + dy * dy <= r2) this.damage(h, dmg, tg.x, tg.y);
      }
    } else if (tg && tg.shape === 'rect') {
      const half = tg.width * 0.5;
      for (const h of this.heroes) {
        if (!h.alive) continue;
        const dx = h.x - tg.x;
        const dy = h.y - tg.y;
        const along = dx * tg.dirX + dy * tg.dirY;
        const side = Math.abs(dx * -tg.dirY + dy * tg.dirX);
        if (along >= 0 && along <= tg.length && side <= half) this.damage(h, dmg, tg.x, tg.y);
      }
      // boss lao hết chiều dài hình chữ nhật
      m.dashing = true; m.dashT = CHARGE_DASH_SEC;
      m.dashVx = tg.dirX * tg.length / CHARGE_DASH_SEC;
      m.dashVy = tg.dirY * tg.length / CHARGE_DASH_SEC;
    }
    this.host.emit('boss_ability', m.x, m.y, 0, m.id, id);
    if (m.castTelegraphId) this.removeTelegraph(m.castTelegraphId);
    m.castAbility = ''; m.castT = 0; m.castTelegraphId = 0;
  }

  // ----- hạ gục -----

  protected onMonsterDied(m: Unit): void {
    const d = this.t.dungeon;
    this.aliveMonsters--;
    this.remaining--;
    this.kills++;
    this.streak++;
    this.streakT = d.streakTimeoutSec;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    if (this.streak % d.streakMilestone === 0) {
      const bonus = Math.round(d.streakBonusGoldBase * (this.streak / d.streakMilestone) * this.floorDef.goldMult);
      this.loot.gold = (this.loot.gold || 0) + bonus;
      const lx = this.leader ? this.leader.x : m.x;
      const ly = this.leader ? this.leader.y : m.y;
      this.host.emit('streak_bonus', lx, ly, bonus, this.streak, '');
    }
    if (m.isBoss) {
      // boss chết -> quái còn lại biến mất -> thắng chặng; vật rơi còn trên đất được nhặt hết
      this.bossDead = true;
      this.bossId = 0;
      if (d.bossMinionsDespawnOnDeath) {
        for (const o of this.monsters) {
          if (o.alive && o !== m) { o.alive = false; o.anim = 'dead'; o.state = 'corpse'; o.corpseT = 0.3; o.target = null; }
        }
        this.aliveMonsters = 0;
      }
      this.remaining = 0;
      for (const p of this.pickups) this.host.onPickup(this, p.item, p.amount, p.x, p.y);
      this.clearPickups();
      this.cleared = true;
      this.dhost.onFloorCleared(this.floor);
      this.outcome = 'victory';
    }
  }

  protected onCorpseGone(m: Unit): void { /* không mọc lại trong dungeon */ }
}
