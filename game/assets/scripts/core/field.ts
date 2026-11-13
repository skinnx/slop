// Ngoài đồng (và làng, cùng một bản đồ): nút tài nguyên, ổ quái, gây hấn, kéo về ổ, hồi sinh, về làng.
import { CampDef, MonsterDef, ZoneId } from './data';
import { CampView, FieldView, ResourceNodeView } from './contract';
import { Arena, ArenaHost, Unit } from './arena';
import { Rng } from './rng';
import { CAMP_ACTIVE_DIST, HOME_ARRIVE_DIST, NODE_RADIUS, RETURN_CHANNEL_SEC } from './constants';

export class FieldNode implements ResourceNodeView {
  index = 0;
  id = '';
  type = '';
  kind: 'tree' | 'rock' = 'tree';
  resource = '';
  zone: ZoneId = 'z1';
  x = 0; y = 0;
  durability = 0;
  maxDurability = 0;
  depleted = false;
  respawnT = 0;
  respawnSec = 0;
  yieldPerHit = 1;
}

export class Camp implements CampView {
  index = 0;
  id = '';
  zone: ZoneId = 'z1';
  monsterId = '';
  x = 0; y = 0;
  alive = 0;
  count = 0;
  respawnT = 0;
  respawnSec = 0;
  radius = 1.5;
  def: MonsterDef = null;
  hp = 1; atk = 0; exp = 0; amountMult = 1;
  /** Đồng hồ mọc lại cho từng chỗ trong ổ: −1 = con đó đang sống, > 0 = giây còn lại. */
  slotTimers: number[] = [];
  active = false;
  /** Số con đang đuổi hoặc đang quay về (ổ như vậy luôn được mô phỏng). */
  busy = 0;
}

export interface FieldHost extends ArenaHost {
  /** Một nhát thu thập trúng nút: cộng tài nguyên vào kho (theo trần), đếm nhiệm vụ. */
  onGather(node: FieldNode, amount: number, hero: Unit): void;
}

export class FieldSim extends Arena implements FieldView {
  nodes: FieldNode[] = [];
  camps: Camp[] = [];
  returnChannelT = 0;
  returnTarget: 'village' | 'field' = 'village';
  wipeT = 0;
  returnPoint: number[] | null = null;
  /** Có quái đang đuổi đội (nút Về làng bị khóa). */
  chasing = 0;

  private fhost: FieldHost;
  private activeTimer = 0;
  private depletedCount = 0;

  constructor(host: FieldHost, rng: Rng) {
    super(host, rng);
    this.fhost = host;
    this.kind = 'field';
    const w = this.t.world;
    const e = w.mapEdgeBlocked;
    this.setBounds(e, e, w.mapW - e, w.mapH - e);
    const layout = this.data.field;
    for (let i = 0; i < layout.nodes.length; i++) {
      const src = layout.nodes[i];
      const type = layout.nodeTypes[src.type];
      const n = new FieldNode();
      n.index = i; n.id = src.id; n.type = src.type;
      n.kind = type.resource === 'wood' ? 'tree' : 'rock';
      n.resource = type.resource; n.zone = type.zone;
      n.x = src.pos[0]; n.y = src.pos[1];
      n.maxDurability = type.durability; n.durability = type.durability;
      n.respawnSec = type.respawnSec; n.yieldPerHit = type.yieldPerHit;
      this.nodes.push(n);
    }
    const zoneMult = this.data.monsters.fieldZoneMult;
    const amountMult = this.data.drops.zoneAmountMult;
    for (let i = 0; i < layout.camps.length; i++) {
      const src: CampDef = layout.camps[i];
      const def = this.data.monsterById[src.monster];
      const c = new Camp();
      c.index = i; c.id = src.id; c.zone = src.zone; c.monsterId = src.monster;
      c.x = src.pos[0]; c.y = src.pos[1]; c.count = src.count; c.radius = src.radius;
      c.respawnSec = src.respawnSec; c.def = def;
      c.hp = Math.max(1, Math.round(def.baseHp * zoneMult[src.zone]));
      c.atk = Math.round(def.baseAtk * zoneMult[src.zone]);
      c.amountMult = amountMult[src.zone];
      c.exp = Math.round(def.exp * c.amountMult);
      for (let s = 0; s < c.count; s++) {
        c.slotTimers.push(-1);
        const ang = this.rng.next() * 6.283185307179586;
        const r = this.rng.next() * c.radius;
        this.spawnCampMonster(c, s, c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r);
      }
      this.camps.push(c);
    }
    this.active = [];
  }

  private spawnCampMonster(c: Camp, slot: number, x: number, y: number): void {
    const m = this.spawnMonster(c.def, x, y, c.hp, c.atk, c.exp);
    m.campIndex = c.index; m.campSlot = slot; m.zone = c.zone;
    m.amountMult = c.amountMult;
    m.state = 'wander';
    m.homeX = x; m.homeY = y;
    m.wanderT = this.rng.range(this.t.field.wanderRetargetSec[0], this.t.field.wanderRetargetSec[1]);
    this.clampToBounds(m);
    c.slotTimers[slot] = -1;
    c.alive++;
    c.respawnT = 0;
    this.activeTimer = 0;
  }

  /** Đặt cả đội tại (x, y) theo đội hình, bỏ mọi mục tiêu. */
  placeSquad(x: number, y: number): void {
    const offs = this.t.squad.formationOffsets;
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      h.x = x + offs[Math.min(i, offs.length - 1)][0];
      h.y = y + offs[Math.min(i, offs.length - 1)][1];
      h.target = null; h.nodeTarget = -1; h.targetId = 0; h.windupT = 0; h.pending = 0; h.vx = 0; h.vy = 0;
      this.clampToBounds(h);
    }
    this.activeTimer = 0;
    this.updateLeader();
  }

  /** Hồi sinh và hồi đầy máu cả đội (sau dungeon, sau khi cả đội gục). */
  restoreSquad(): void {
    for (const h of this.heroes) { h.alive = true; h.anim = 'idle'; h.hp = h.maxHp; h.reviveT = 0; }
    this.wipeT = 0;
    this.updateLeader();
  }

  /** Mọi quái đang đuổi quay về ổ. */
  sendMonstersHome(): void {
    for (const m of this.active) if (m.alive && m.state === 'chase') this.startReturn(m);
  }

  startChannel(target: 'village' | 'field'): void {
    this.returnChannelT = RETURN_CHANNEL_SEC;
    this.returnTarget = target;
  }

  // ------------------------------------------------------------------------------------------

  step(joystickEnabled: boolean): 'none' | 'channel_done' | 'channel_cancel' | 'wipe_respawn' {
    const dt = this.dt;
    let outcome: 'none' | 'channel_done' | 'channel_cancel' | 'wipe_respawn' = 'none';

    if (this.returnChannelT > 0) {
      const mag2 = this.joyX * this.joyX + this.joyY * this.joyY;
      const dead = this.t.combat.joystickDeadZonePct;
      if ((joystickEnabled && mag2 >= dead * dead) || !this.leader || this.chasing > 0) {
        this.returnChannelT = 0;
        outcome = 'channel_cancel';
      } else {
        this.returnChannelT -= dt;
        if (this.returnChannelT <= 0) { this.returnChannelT = 0; outcome = 'channel_done'; }
      }
    }

    this.activeTimer -= dt;
    if (this.activeTimer <= 0) { this.activeTimer = 0.33; this.refreshActive(); }

    this.stepHeroes(joystickEnabled, 0, 0);
    this.stepFieldMonsters();
    this.stepMovement();
    this.stepAttacks();
    this.stepPickups();
    this.stepCorpses();
    this.stepNodes();
    this.stepCamps();
    if (this.stepHeroTimers()) outcome = 'wipe_respawn';
    this.sinceCombat += dt;
    return outcome;
  }

  private refreshActive(): void {
    const leader = this.leader;
    const lx = leader ? leader.x : -999;
    const ly = leader ? leader.y : -999;
    const r2 = CAMP_ACTIVE_DIST * CAMP_ACTIVE_DIST;
    for (const c of this.camps) {
      const dx = c.x - lx;
      const dy = c.y - ly;
      c.active = c.busy > 0 || dx * dx + dy * dy <= r2;
    }
    const act = this.active;
    act.length = 0;
    const all = this.monsters;
    for (let i = 0; i < all.length; i++) {
      const m = all[i];
      if (m.alive && this.camps[m.campIndex].active) act.push(m);
    }
  }

  protected onMonsterListChanged(): void { this.activeTimer = 0; }

  private stepFieldMonsters(): void {
    const f = this.t.field;
    const cmb = this.t.combat;
    const dt = this.dt;
    const aggro2 = cmb.monsterAggroRadiusField * cmb.monsterAggroRadiusField;
    const leash2 = cmb.monsterLeashField * cmb.monsterLeashField;
    const list = this.active;
    let chasing = 0;
    for (let i = 0; i < this.camps.length; i++) this.camps[i].busy = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive) continue;
      m.vx = 0; m.vy = 0;
      const camp = this.camps[m.campIndex];
      if (m.state === 'wander') {
        // gây hấn khi có hero lại gần
        const near = this.nearestHero(m.x, m.y);
        if (near) {
          const dx = near.x - m.x;
          const dy = near.y - m.y;
          if (dx * dx + dy * dy <= aggro2) { this.aggroCamp(camp, m); }
        }
      }
      if (m.state === 'wander') {
        if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * cmb.monsterRegenOutOfCombatPctPerSec * dt);
        m.wanderT -= dt;
        if (m.wanderT <= 0) {
          m.wanderT = this.rng.range(f.wanderRetargetSec[0], f.wanderRetargetSec[1]);
          const ang = this.rng.next() * 6.283185307179586;
          const r = this.rng.next() * camp.radius;
          m.wanderX = camp.x + Math.cos(ang) * r;
          m.wanderY = camp.y + Math.sin(ang) * r;
        }
        this.walk(m, m.wanderX, m.wanderY, m.moveSpeed * f.wanderSpeedMult, 0.1);
        m.targetId = 0;
      } else if (m.state === 'chase') {
        const cx = m.x - camp.x;
        const cy = m.y - camp.y;
        if (cx * cx + cy * cy > leash2 || this.aliveHeroes === 0) { this.startReturn(m); }
        else { chasing++; this.monsterChase(m); }
      }
      if (m.state === 'return') {
        if (this.walk(m, m.homeX, m.homeY, m.moveSpeed, HOME_ARRIVE_DIST)) {
          m.state = 'wander';
          m.invulnerable = false;
          m.wanderT = 0;
        }
      }
      if (m.state !== 'wander') camp.busy++;
    }
    this.chasing = chasing;
  }

  /** Đi về phía (tx, ty); trả về true khi đã tới nơi. */
  private walk(m: Unit, tx: number, ty: number, speed: number, arrive: number): boolean {
    const dx = tx - m.x;
    const dy = ty - m.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= arrive) return true;
    const step = speed * this.dt;
    const k = (d < step ? d / this.dt : speed) / d;
    m.vx = dx * k; m.vy = dy * k;
    return false;
  }

  private aggroCamp(camp: Camp, first: Unit): void {
    if (!this.t.field.campAggroShared) {
      if (first.state === 'wander') { first.state = 'chase'; first.retargetT = 0; }
      return;
    }
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m.alive && m.campIndex === camp.index && m.state === 'wander') {
        m.state = 'chase'; m.retargetT = 0;
      }
    }
    // ổ chưa nằm trong danh sách mô phỏng (hiếm): gây hấn riêng con này, cả ổ theo sau ở lần làm mới
    if (first.state === 'wander') { first.state = 'chase'; first.retargetT = 0; }
    this.noteCombat();
  }

  private startReturn(m: Unit): void {
    m.state = 'return';
    m.invulnerable = true;
    m.target = null; m.targetId = 0; m.windupT = 0; m.pending = 0; m.tauntT = 0; m.tauntBy = null;
  }

  protected onMonsterHit(m: Unit): void {
    if (m.state === 'wander') this.aggroCamp(this.camps[m.campIndex], m);
  }

  protected onMonsterDied(m: Unit): void {
    const camp = this.camps[m.campIndex];
    if (m.campSlot >= 0) camp.slotTimers[m.campSlot] = camp.respawnSec;
    camp.alive--;
  }

  protected onHeroKilled(h: Unit): void {
    h.reviveT = this.t.field.heroReviveSec;
  }

  private stepNodes(): void {
    if (this.depletedCount === 0) return;
    const dt = this.dt;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (!n.depleted) continue;
      n.respawnT -= dt;
      if (n.respawnT <= 0) {
        n.respawnT = 0; n.depleted = false; n.durability = n.maxDurability;
        this.depletedCount--;
      }
    }
  }

  private stepCamps(): void {
    const dt = this.dt;
    for (let i = 0; i < this.camps.length; i++) {
      const c = this.camps[i];
      if (c.alive === c.count) continue;
      let min = Infinity;
      for (let s = 0; s < c.count; s++) {
        let tm = c.slotTimers[s];
        if (tm < 0) continue;
        tm -= dt;
        if (tm <= 0) {
          // mọc lại tại tâm ổ (lệch nhẹ để không chồng khít lên nhau)
          const ang = this.rng.next() * 6.283185307179586;
          this.spawnCampMonster(c, s, c.x + Math.cos(ang) * 0.3, c.y + Math.sin(ang) * 0.3);
        } else {
          c.slotTimers[s] = tm;
          if (tm < min) min = tm;
        }
      }
      c.respawnT = c.alive === 0 && min < Infinity ? min : 0;
    }
  }

  /** Hồi sinh, hồi máu ngoài chiến đấu, cả đội gục. Trả về true đúng lúc cả đội hồi sinh ở làng. */
  private stepHeroTimers(): boolean {
    const f = this.t.field;
    const dt = this.dt;
    let alive = 0;
    for (const h of this.heroes) if (h.alive) alive++;
    if (alive === 0 && this.heroes.length > 0) {
      if (this.wipeT <= 0) {
        this.wipeT = f.wipeRespawnSec;
        this.host.emit('wipe', 0, 0, f.wipeRespawnSec, 0, '');
        return false;
      }
      this.wipeT -= dt;
      if (this.wipeT <= 0) {
        this.wipeT = 0;
        return true;
      }
      return false;
    }
    const regen = this.sinceCombat >= f.outOfCombatDelaySec;
    for (const h of this.heroes) {
      if (h.alive) {
        if (regen && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * f.heroRegenPctPerSec * dt);
        continue;
      }
      h.reviveT -= dt;
      if (h.reviveT <= 0) {
        h.reviveT = 0; h.alive = true; h.hp = h.maxHp; h.anim = 'idle'; h.attackCd = 0;
        this.host.emit('revive', h.x, h.y, 0, h.id, h.heroId);
      }
    }
    return false;
  }

  // ----- nút tài nguyên -----

  protected pickNodeTarget(h: Unit, leader: Unit): number {
    const sq = this.t.squad;
    const g2 = sq.gatherRadius * sq.gatherRadius;
    let best = -1;
    let bestD = Infinity;
    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.depleted) continue;
      const lx = n.x - leader.x;
      const ly = n.y - leader.y;
      const dl2 = lx * lx + ly * ly;
      if (dl2 > g2) continue;
      if (h !== leader && Math.sqrt(dl2) - NODE_RADIUS - h.attackRange > sq.leashRadius) continue;
      const dx = n.x - h.x;
      const dy = n.y - h.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { best = i; bestD = d; }
    }
    return best;
  }
  protected nodeAvailable(index: number): boolean { return !this.nodes[index].depleted; }
  protected nodeX(index: number): number { return this.nodes[index].x; }
  protected nodeY(index: number): number { return this.nodes[index].y; }
  protected nodeRadius(): number { return NODE_RADIUS; }

  protected hitNode(h: Unit, index: number): void {
    const n = this.nodes[index];
    if (n.depleted) return;
    // mỗi nhát trừ gatherPower độ bền; nhát cuối không vượt quá độ bền còn lại (tổng mỗi nút cố định)
    const power = Math.min(h.gatherPower, n.durability);
    n.durability -= power;
    this.fhost.onGather(n, power * n.yieldPerHit, h);
    if (n.durability <= 0) {
      n.durability = 0; n.depleted = true; n.respawnT = n.respawnSec;
      this.depletedCount++;
      this.host.emit('node_depleted', n.x, n.y, 0, n.index, n.resource);
    }
  }
}
