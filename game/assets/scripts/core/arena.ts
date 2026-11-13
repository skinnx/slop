// Đấu trường: phần mô phỏng dùng chung cho ngoài đồng và dungeon — đơn vị, di chuyển, tách va chạm,
// đòn đánh, kỹ năng hero, vật rơi. FieldSim và DungeonSim kế thừa lớp này và thêm AI quái riêng.
// Không cấp phát trong step(): đơn vị, vật rơi, vùng báo đòn đều lấy từ pool.
import { GameData, HeroDef, MonsterDef, MonsterKind, SkillDef, Tuning, ZoneId } from './data';
import {
  HeroUnitView, MonsterUnitView, PickupView, TelegraphView, SceneView, UnitAnim, MonsterState, GameEventType,
} from './contract';
import { Rng } from './rng';
import { skillParam } from './formulas';
import { CORPSE_SEC, PICKUP_TOUCH_DIST, VOLLEY_EXTRA_RANGE } from './constants';

export const ACT_NONE = 0;
export const ACT_BASIC = 1;
export const ACT_SKILL0 = 2;
export const ACT_SKILL1 = 3;
export const ACT_NODE = 4;

/** Một đơn vị (hero hoặc quái). Lõi sửa trực tiếp; view chỉ nhìn qua HeroUnitView / MonsterUnitView. */
export class Unit implements HeroUnitView, MonsterUnitView {
  id = 0;
  isHero = false;
  x = 0; y = 0;
  faceX = 1; faceY = 0;
  hp = 1; maxHp = 1;
  atk = 0;
  radius = 0.35;
  alive = true;
  anim: UnitAnim = 'idle';
  windupT = 0;
  hitFlashT = 0;
  targetId = 0;
  moveSpeed = 0;
  attackInterval = 1;
  attackRange = 1;
  ranged = false;
  attackCd = 0;
  /** Hành động sẽ xảy ra khi hết gồng. */
  pending = ACT_NONE;
  target: Unit | null = null;
  /** Vận tốc mong muốn của bước này (ô/giây). */
  vx = 0; vy = 0;
  retargetT = 0;
  pushable = true;

  // ----- hero -----
  heroId = '';
  hdef: HeroDef | null = null;
  level = 1;
  slot = 0;
  isLeader = false;
  reviveT = 0;
  skillCd0 = -1; skillCd1 = -1;
  skill0: SkillDef | null = null; skill1: SkillDef | null = null;
  stars0 = 0; stars1 = 0;
  buffT = 0; buffPct = 0;
  gatherPower = 1;
  nodeTarget = -1;

  // ----- quái -----
  monsterId = '';
  mdef: MonsterDef | null = null;
  kind: MonsterKind = 'normal';
  isBoss = false;
  campIndex = -1;
  campSlot = -1;
  zone: ZoneId = 'z1';
  state: MonsterState = 'wander';
  corpseT = 0;
  tauntT = 0;
  tauntBy: Unit | null = null;
  homeX = 0; homeY = 0;
  wanderX = 0; wanderY = 0;
  wanderT = 0;
  invulnerable = false;
  expValue = 0;
  amountMult = 1;
  goldMult = 1;
  castAbility = '';
  castT = 0;
  castDirX = 0; castDirY = 0;
  castTelegraphId = 0;
  abilityCd: number[] = [];
  dashing = false;
  dashT = 0;
  dashVx = 0; dashVy = 0;
}

export class Pickup implements PickupView {
  id = 0;
  item = '';
  amount = 0;
  x = 0; y = 0;
  flying = false;
  age = 0;
}

export class Telegraph implements TelegraphView {
  id = 0;
  shape: 'circle' | 'rect' = 'circle';
  ability = '';
  sourceId = 0;
  x = 0; y = 0;
  radius = 0;
  dirX = 0; dirY = 0;
  length = 0; width = 0;
  elapsed = 0; duration = 0;
}

/** Dịch vụ mà đấu trường cần từ Game (sự kiện, id, RNG, kho). */
export interface ArenaHost {
  readonly data: GameData;
  nextEntityId(): number;
  emit(type: GameEventType, x: number, y: number, n: number, id: number, key: string): void;
  emit2(type: GameEventType, x: number, y: number, n: number, id: number, key: string, id2: number): void;
  /** Quái vừa chết (EXP, đếm nhiệm vụ, chuỗi hạ gục). */
  onMonsterKilled(arena: Arena, m: Unit): void;
  /** Hero nhặt được vật rơi. */
  onPickup(arena: Arena, item: string, amount: number, x: number, y: number): void;
}

export abstract class Arena implements SceneView {
  kind: 'field' | 'dungeon' = 'field';
  heroes: Unit[] = [];
  /** Mọi quái (sống + xác) để view vẽ. */
  monsters: Unit[] = [];
  /** Quái đang được mô phỏng trong bước này (ngoài đồng: chỉ ổ gần đội). */
  active: Unit[] = [];
  pickups: Pickup[] = [];
  telegraphs: Telegraph[] = [];
  leader: Unit | null = null;
  bounds: number[] = [0, 0, 1, 1];

  joyX = 0; joyY = 0;
  /** Giây kể từ lần cuối joystick được kéo. */
  idleT = 99;
  /** Giây kể từ lần cuối có chiến đấu (gây hoặc nhận sát thương, hoặc có mục tiêu quái). */
  sinceCombat = 99;
  /** Số hero còn sống sau bước gần nhất. */
  aliveHeroes = 0;

  protected host: ArenaHost;
  protected data: GameData;
  protected t: Tuning;
  protected dt: number;
  rng: Rng;

  private unitPool: Unit[] = [];
  private pickupPool: Pickup[] = [];
  private telePool: Telegraph[] = [];
  // lưới băm cho tách va chạm
  private gridCell: number;
  private gridCols = 1;
  private gridRows = 1;
  private gridHead: Int32Array = new Int32Array(1);
  private gridNext: Int32Array = new Int32Array(256);
  private gridUnits: Unit[] = [];
  private scratch: Unit[] = [];

  constructor(host: ArenaHost, rng: Rng) {
    this.host = host;
    this.data = host.data;
    this.t = host.data.tuning;
    this.dt = this.t.sim.fixedStepSec;
    this.rng = rng;
    this.gridCell = this.t.combat.spatialHashCell;
  }

  protected setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.bounds[0] = minX; this.bounds[1] = minY; this.bounds[2] = maxX; this.bounds[3] = maxY;
    this.gridCols = Math.max(1, Math.ceil((maxX - minX) / this.gridCell) + 1);
    this.gridRows = Math.max(1, Math.ceil((maxY - minY) / this.gridCell) + 1);
    this.gridHead = new Int32Array(this.gridCols * this.gridRows);
  }

  // ------------------------------------------------------------------------------------------
  // tạo / hủy
  // ------------------------------------------------------------------------------------------

  protected allocUnit(): Unit {
    const u = this.unitPool.length > 0 ? this.unitPool.pop() : new Unit();
    u.id = this.host.nextEntityId();
    u.alive = true; u.anim = 'idle'; u.windupT = 0; u.hitFlashT = 0; u.targetId = 0; u.attackCd = 0;
    u.pending = ACT_NONE; u.target = null; u.vx = 0; u.vy = 0; u.retargetT = 0; u.pushable = true;
    u.faceX = 1; u.faceY = 0;
    u.reviveT = 0; u.buffT = 0; u.buffPct = 0; u.nodeTarget = -1; u.isLeader = false;
    u.corpseT = 0; u.tauntT = 0; u.tauntBy = null; u.invulnerable = false; u.castAbility = ''; u.castT = 0;
    u.castTelegraphId = 0; u.dashing = false; u.dashT = 0; u.abilityCd.length = 0; u.isBoss = false;
    u.campIndex = -1; u.campSlot = -1; u.state = 'wander'; u.wanderT = 0;
    u.hdef = null; u.mdef = null; u.skill0 = null; u.skill1 = null; u.heroId = ''; u.monsterId = '';
    u.stars0 = 0; u.stars1 = 0; u.skillCd0 = -1; u.skillCd1 = -1; u.isHero = false;
    return u;
  }

  protected freeUnit(u: Unit): void {
    u.target = null; u.tauntBy = null;
    this.unitPool.push(u);
  }

  /** Tạo quái. HP/ATK/EXP đã nhân hệ số do lớp con truyền vào. */
  protected spawnMonster(def: MonsterDef, x: number, y: number, hp: number, atk: number, exp: number): Unit {
    const m = this.allocUnit();
    m.isHero = false;
    m.mdef = def; m.monsterId = def.id; m.kind = def.kind; m.isBoss = def.kind === 'boss';
    m.x = x; m.y = y; m.homeX = x; m.homeY = y; m.wanderX = x; m.wanderY = y;
    m.maxHp = hp; m.hp = hp; m.atk = atk; m.expValue = exp;
    m.radius = def.radius; m.moveSpeed = def.moveSpeed; m.attackInterval = def.attackInterval;
    m.attackRange = def.attackRange; m.ranged = def.ranged;
    m.pushable = !m.isBoss;
    m.amountMult = 1; m.goldMult = 1;
    // lệch pha chọn mục tiêu để 60 quái không cùng tính lại trong một bước
    m.retargetT = (m.id % 15) * this.dt;
    this.monsters.push(m);
    return m;
  }

  protected clearMonsters(): void {
    for (const m of this.monsters) this.freeUnit(m);
    this.monsters.length = 0;
    if (this.active !== this.monsters) this.active.length = 0;
    for (const tg of this.telegraphs) this.telePool.push(tg);
    this.telegraphs.length = 0;
  }

  protected clearPickups(): void {
    for (const p of this.pickups) this.pickupPool.push(p);
    this.pickups.length = 0;
  }

  /** Dựng lại các hero của đội. `spec[i]` mô tả hero ở ô i. Giữ tỉ lệ máu của hero đã có (theo heroId). */
  setHeroes(specs: HeroSpec[], x: number, y: number, keepState: boolean): void {
    const old = this.heroes.slice();
    const offs = this.t.squad.formationOffsets;
    this.heroes.length = 0;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      let u: Unit = null;
      if (keepState) {
        for (let j = 0; j < old.length; j++) if (old[j] && old[j].heroId === s.def.id) { u = old[j]; old[j] = null; break; }
      }
      const fresh = !u;
      if (fresh) {
        u = this.allocUnit();
        u.isHero = true;
        u.x = x + offs[Math.min(i, offs.length - 1)][0];
        u.y = y + offs[Math.min(i, offs.length - 1)][1];
        this.clampToBounds(u);
      }
      const ratio = fresh ? 1 : (u.maxHp > 0 ? u.hp / u.maxHp : 1);
      applyHeroSpec(u, s, this.t);
      u.slot = i;
      if (fresh) { u.hp = u.maxHp; this.resetSkillCooldowns(u); }
      else if (u.alive) u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * ratio)));
      this.heroes.push(u);
    }
    for (const o of old) if (o) this.freeUnit(o);
    this.updateLeader();
  }

  resetSkillCooldowns(u: Unit): void {
    u.skillCd0 = u.stars0 > 0 ? u.skill0.cooldownSec : -1;
    u.skillCd1 = u.stars1 > 0 ? u.skill1.cooldownSec : -1;
  }

  protected updateLeader(): void {
    let leader: Unit = null;
    let alive = 0;
    for (const h of this.heroes) {
      h.isLeader = false;
      if (h.alive) { alive++; if (!leader) leader = h; }
    }
    if (leader) leader.isLeader = true;
    this.leader = leader;
    this.aliveHeroes = alive;
  }

  protected clampToBounds(u: Unit): void {
    const b = this.bounds;
    if (u.x < b[0] + u.radius) u.x = b[0] + u.radius; else if (u.x > b[2] - u.radius) u.x = b[2] - u.radius;
    if (u.y < b[1] + u.radius) u.y = b[1] + u.radius; else if (u.y > b[3] - u.radius) u.y = b[3] - u.radius;
  }

  // ------------------------------------------------------------------------------------------
  // hero
  // ------------------------------------------------------------------------------------------

  /** Bước (1)–(2): joystick và AI hero. `joystickEnabled` = false trong chế độ xây hoặc khi đang gồng về làng. */
  protected stepHeroes(joystickEnabled: boolean, autoX: number, autoY: number): void {
    const t = this.t;
    const dt = this.dt;
    let jx = joystickEnabled ? this.joyX : 0;
    let jy = joystickEnabled ? this.joyY : 0;
    let mag = Math.sqrt(jx * jx + jy * jy);
    const dead = t.combat.joystickDeadZonePct;
    let playerMoving = mag >= dead;
    if (!playerMoving && (autoX !== 0 || autoY !== 0)) {
      // tự đi (AUTO trong dungeon): coi như joystick đẩy hết cỡ
      jx = autoX; jy = autoY; mag = 1; playerMoving = true;
    }
    if (playerMoving) this.idleT = 0; else this.idleT += dt;
    const idleOnly = t.squad.attackOnlyWhenIdle;
    const canAttack = !idleOnly || this.idleT >= t.squad.idleAfterReleaseSec;

    this.updateLeader();
    const leader = this.leader;
    if (!leader) return;
    const speed = t.squad.moveSpeed;
    const followSpeed = speed * t.squad.followerSpeedMult;
    const offs = t.squad.formationOffsets;
    let formIndex = 0;
    let anyMonsterTarget = false;

    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (!h.alive) continue;
      const fi = formIndex++;
      h.vx = 0; h.vy = 0;
      if (h.attackCd > 0) h.attackCd -= dt;
      if (h.skillCd0 > 0) { h.skillCd0 -= dt; if (h.skillCd0 < 0) h.skillCd0 = 0; }
      if (h.skillCd1 > 0) { h.skillCd1 -= dt; if (h.skillCd1 < 0) h.skillCd1 = 0; }
      if (h.buffT > 0) { h.buffT -= dt; if (h.buffT <= 0) { h.buffT = 0; h.buffPct = 0; } }

      // hồi máu: dùng được cả khi đang đi, không cần mục tiêu
      if (h.windupT <= 0) this.tryStartHeal(h);

      if (h.windupT > 0) {
        const isHeal = this.pendingIsHeal(h);
        if (playerMoving && idleOnly && !isHeal) {
          // đòn đang gồng bị hủy khi người chơi kéo joystick
          h.windupT = 0; h.pending = ACT_NONE; h.attackCd = 0;
        } else if (!(isHeal && playerMoving)) {
          h.anim = 'windup';
          continue; // đứng yên khi gồng
        }
      }

      if (playerMoving) {
        h.target = null; h.nodeTarget = -1; h.targetId = 0; h.retargetT = 0;
        if (h === leader) {
          const k = speed * Math.min(1, mag) / mag;
          h.vx = jx * k; h.vy = jy * k;
        } else {
          this.steerTo(h, leader.x + offs[fi][0], leader.y + offs[fi][1], followSpeed, t.squad.followerArriveDist);
        }
        if (!idleOnly) this.attackInRangeWhileMoving(h);
        continue;
      }
      if (!canAttack) {
        if (h !== leader) this.steerTo(h, leader.x + offs[fi][0], leader.y + offs[fi][1], followSpeed, t.squad.followerArriveDist);
        continue;
      }

      // đứng yên: chọn mục tiêu, lại gần, đánh
      h.retargetT -= dt;
      if (h.target && (!h.target.alive || h.target.invulnerable)) { h.target = null; h.retargetT = 0; }
      if (h.nodeTarget >= 0 && !this.nodeAvailable(h.nodeTarget)) { h.nodeTarget = -1; h.retargetT = 0; }
      if (h.retargetT <= 0) {
        h.retargetT = t.combat.retargetSec;
        this.pickHeroTarget(h, leader);
      }
      if (h.target) {
        anyMonsterTarget = true;
        h.targetId = h.target.id;
        this.approachAndAttack(h, h.target.x, h.target.y, h.target.radius, h === leader ? speed : followSpeed, leader, false);
      } else if (h.nodeTarget >= 0) {
        h.targetId = -(h.nodeTarget + 1);
        this.approachAndAttack(h, this.nodeX(h.nodeTarget), this.nodeY(h.nodeTarget), this.nodeRadius(), h === leader ? speed : followSpeed, leader, true);
      } else {
        h.targetId = 0;
        if (h !== leader) this.steerTo(h, leader.x + offs[fi][0], leader.y + offs[fi][1], followSpeed, t.squad.followerArriveDist);
      }
    }
    if (anyMonsterTarget) this.noteCombat();
  }

  /** Ghi nhận "đang chiến đấu". Ngoài đồng: vào trận sau một quãng nghỉ thì hồi chiêu đặt lại đầy (01 mục 8.4). */
  protected noteCombat(): void {
    if (this.kind === 'field' && this.sinceCombat >= this.t.field.outOfCombatDelaySec) {
      for (const h of this.heroes) this.resetSkillCooldowns(h);
    }
    this.sinceCombat = 0;
  }

  private steerTo(u: Unit, tx: number, ty: number, speed: number, arrive: number): void {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= arrive) return;
    const step = speed * this.dt;
    const k = (d < step ? d / this.dt : speed) / d;
    u.vx = dx * k; u.vy = dy * k;
  }

  private pickHeroTarget(h: Unit, leader: Unit): void {
    const t = this.t.squad;
    const aggro2 = t.aggroRadius * t.aggroRadius;
    let best: Unit = null;
    let bestD = Infinity;
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive || m.invulnerable) continue;
      const lx = m.x - leader.x;
      const ly = m.y - leader.y;
      const dl2 = lx * lx + ly * ly;
      if (dl2 > aggro2) continue;
      // phải đi xa thủ lĩnh hơn leashRadius mới với tới thì bỏ
      if (h !== leader && Math.sqrt(dl2) - m.radius - h.attackRange > t.leashRadius) continue;
      const dx = m.x - h.x;
      const dy = m.y - h.y;
      const d = dx * dx + dy * dy;
      if (d < bestD || (d === bestD && best && m.id < best.id)) { best = m; bestD = d; }
    }
    h.target = best;
    h.nodeTarget = best ? -1 : this.pickNodeTarget(h, leader);
  }

  private approachAndAttack(h: Unit, tx: number, ty: number, tRadius: number, speed: number, leader: Unit, isNode: boolean): void {
    const dx = tx - h.x;
    const dy = ty - h.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const reach = h.attackRange + tRadius;
    if (d > 1e-6) { h.faceX = dx / d; h.faceY = dy / d; }
    if (d <= reach) {
      if (h.attackCd <= 0) this.startHeroAttack(h, isNode);
      return;
    }
    const want = d - reach + 0.02;
    const step = speed * this.dt;
    const k = (want < step ? want / this.dt : speed) / d;
    h.vx = dx * k; h.vy = dy * k;
    if (h !== leader) {
      // không rời thủ lĩnh quá leashRadius
      const nx = h.x + h.vx * this.dt - leader.x;
      const ny = h.y + h.vy * this.dt - leader.y;
      const leash = this.t.squad.leashRadius;
      if (nx * nx + ny * ny > leash * leash) { h.vx = 0; h.vy = 0; }
    }
  }

  /** Cờ attackOnlyWhenIdle = false: vừa đi vừa đánh mục tiêu đã nằm trong tầm, không đuổi. */
  private attackInRangeWhileMoving(h: Unit): void {
    if (h.attackCd > 0 || h.windupT > 0) return;
    let best: Unit = null;
    let bestD = Infinity;
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive || m.invulnerable) continue;
      const dx = m.x - h.x;
      const dy = m.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy) - m.radius;
      if (d <= h.attackRange && (d < bestD || (d === bestD && best && m.id < best.id))) { best = m; bestD = d; }
    }
    if (!best) return;
    h.target = best; h.targetId = best.id;
    this.noteCombat();
    this.startHeroAttack(h, false);
  }

  private startHeroAttack(h: Unit, isNode: boolean): void {
    h.windupT = this.t.combat.attackWindupSec;
    h.attackCd = h.attackInterval;
    h.anim = 'windup';
    if (isNode) { h.pending = ACT_NODE; return; }
    h.pending = ACT_BASIC;
    // kỹ năng sẵn sàng thay cho đòn thường (kỹ năng 1 trước)
    if (h.stars0 > 0 && h.skillCd0 === 0 && h.skill0.type !== 'heal' && this.skillUsable(h, h.skill0, h.stars0)) h.pending = ACT_SKILL0;
    else if (h.stars1 > 0 && h.skillCd1 === 0 && h.skill1.type !== 'heal' && this.skillUsable(h, h.skill1, h.stars1)) h.pending = ACT_SKILL1;
  }

  /** nova và taunt chỉ dùng khi có ít nhất một quái trong bán kính quanh hero (không phí chiêu). */
  private skillUsable(h: Unit, s: SkillDef, stars: number): boolean {
    if (s.type !== 'nova' && s.type !== 'taunt') return true;
    const r = skillParam(s, 'radius', stars);
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive || m.invulnerable) continue;
      const dx = m.x - h.x;
      const dy = m.y - h.y;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  private pendingIsHeal(h: Unit): boolean {
    return (h.pending === ACT_SKILL0 && h.skill0.type === 'heal') || (h.pending === ACT_SKILL1 && h.skill1.type === 'heal');
  }

  private tryStartHeal(h: Unit): void {
    let slot = -1;
    if (h.stars0 > 0 && h.skillCd0 === 0 && h.skill0.type === 'heal') slot = 0;
    else if (h.stars1 > 0 && h.skillCd1 === 0 && h.skill1.type === 'heal') slot = 1;
    if (slot < 0) return;
    const thr = this.t.combat.healThresholdPct;
    let need = false;
    for (const o of this.heroes) if (o.alive && o.hp < o.maxHp * thr) { need = true; break; }
    if (!need) return;
    h.windupT = this.t.combat.attackWindupSec;
    h.attackCd = h.attackInterval;
    h.pending = slot === 0 ? ACT_SKILL0 : ACT_SKILL1;
  }

  // ------------------------------------------------------------------------------------------
  // nút tài nguyên (ngoài đồng ghi đè)
  // ------------------------------------------------------------------------------------------
  protected pickNodeTarget(h: Unit, leader: Unit): number { return -1; }
  protected nodeAvailable(index: number): boolean { return false; }
  protected nodeX(index: number): number { return 0; }
  protected nodeY(index: number): number { return 0; }
  protected nodeRadius(): number { return 0; }
  protected hitNode(h: Unit, index: number): void { /* ngoài đồng ghi đè */ }

  // ------------------------------------------------------------------------------------------
  // quái: phần dùng chung
  // ------------------------------------------------------------------------------------------

  protected nearestHero(x: number, y: number): Unit {
    let best: Unit = null;
    let bestD = Infinity;
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (!h.alive) continue;
      const dx = h.x - x;
      const dy = h.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD || (d === bestD && best && h.id < best.id)) { best = h; bestD = d; }
    }
    return best;
  }

  /** Quái đuổi và đánh mục tiêu hiện tại (đã được lớp con chọn). */
  protected monsterChase(m: Unit): void {
    const dt = this.dt;
    if (m.attackCd > 0) m.attackCd -= dt;
    if (m.tauntT > 0) {
      m.tauntT -= dt;
      if (m.tauntT <= 0 || !m.tauntBy || !m.tauntBy.alive) { m.tauntT = 0; m.tauntBy = null; }
      else m.target = m.tauntBy;
    }
    m.retargetT -= dt;
    if (m.tauntT <= 0 && (m.retargetT <= 0 || !m.target || !m.target.alive)) {
      m.retargetT = this.t.combat.retargetSec;
      m.target = this.nearestHero(m.x, m.y);
    }
    const tg = m.target;
    if (!tg || !tg.alive) { m.target = null; m.targetId = 0; return; }
    m.targetId = tg.id;
    if (m.windupT > 0) { m.anim = 'windup'; return; }
    const dx = tg.x - m.x;
    const dy = tg.y - m.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1e-6) { m.faceX = dx / d; m.faceY = dy / d; }
    const reach = m.attackRange + tg.radius;
    if (d <= reach) {
      if (m.attackCd <= 0) {
        m.windupT = this.t.combat.attackWindupSec;
        m.attackCd = m.attackInterval;
        m.pending = ACT_BASIC;
        m.anim = 'windup';
      }
      return;
    }
    const want = d - reach + 0.02;
    const step = m.moveSpeed * dt;
    const k = (want < step ? want / dt : m.moveSpeed) / d;
    m.vx = dx * k; m.vy = dy * k;
  }

  // ------------------------------------------------------------------------------------------
  // (4) di chuyển và tách va chạm
  // ------------------------------------------------------------------------------------------

  protected stepMovement(): void {
    const dt = this.dt;
    const units = this.gridUnits;
    units.length = 0;
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (!h.alive) continue;
      this.moveUnit(h, dt);
      units.push(h);
    }
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive) continue;
      this.moveUnit(m, dt);
      units.push(m);
    }
    this.separate(units);
  }

  private moveUnit(u: Unit, dt: number): void {
    if (u.vx !== 0 || u.vy !== 0) {
      u.x += u.vx * dt; u.y += u.vy * dt;
      const sp = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
      if (!u.target && u.nodeTarget < 0) { u.faceX = u.vx / sp; u.faceY = u.vy / sp; }
      this.clampToBounds(u);
      u.anim = 'move';
    } else if (u.windupT > 0) u.anim = u.castAbility ? 'cast' : 'windup';
    else u.anim = u.castAbility ? 'cast' : 'idle';
    if (u.hitFlashT > 0) u.hitFlashT -= dt;
  }

  private separate(units: Unit[]): void {
    const n = units.length;
    if (n < 2) return;
    const cell = this.gridCell;
    const cols = this.gridCols;
    const rows = this.gridRows;
    const head = this.gridHead;
    if (this.gridNext.length < n) this.gridNext = new Int32Array(n * 2);
    const next = this.gridNext;
    head.fill(-1);
    const bx = this.bounds[0];
    const by = this.bounds[1];
    for (let i = 0; i < n; i++) {
      const u = units[i];
      let cx = Math.floor((u.x - bx) / cell);
      let cy = Math.floor((u.y - by) / cell);
      if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      const c = cy * cols + cx;
      next[i] = head[c];
      head[c] = i;
    }
    const heroMin = this.t.squad.separationDist;
    for (let i = 0; i < n; i++) {
      const a = units[i];
      let cx = Math.floor((a.x - bx) / cell);
      let cy = Math.floor((a.y - by) / cell);
      if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      const x0 = cx > 0 ? cx - 1 : 0;
      const x1 = cx < cols - 1 ? cx + 1 : cols - 1;
      const y0 = cy > 0 ? cy - 1 : 0;
      const y1 = cy < rows - 1 ? cy + 1 : rows - 1;
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          for (let j = head[gy * cols + gx]; j >= 0; j = next[j]) {
            if (j <= i) continue;
            const b = units[j];
            const min = a.isHero && b.isHero ? heroMin : a.radius + b.radius;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            let d = Math.sqrt(d2);
            if (d < 1e-6) {
              // trùng tâm: tách theo hướng tất định dựa trên id
              const ang = ((a.id * 31 + b.id * 17) % 360) * 0.017453292519943295;
              dx = Math.cos(ang); dy = Math.sin(ang); d = 1;
            }
            const overlap = min - d;
            const ux = dx / d;
            const uy = dy / d;
            if (a.pushable && b.pushable) {
              const half = overlap * 0.5;
              a.x -= ux * half; a.y -= uy * half;
              b.x += ux * half; b.y += uy * half;
            } else if (a.pushable) { a.x -= ux * overlap; a.y -= uy * overlap; }
            else if (b.pushable) { b.x += ux * overlap; b.y += uy * overlap; }
          }
        }
      }
    }
    for (let i = 0; i < n; i++) this.clampToBounds(units[i]);
  }

  // ------------------------------------------------------------------------------------------
  // (5) gồng, sát thương, kỹ năng
  // ------------------------------------------------------------------------------------------

  protected stepAttacks(): void {
    const dt = this.dt;
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (!h.alive || h.windupT <= 0) continue;
      h.windupT -= dt;
      if (h.windupT <= 0) { h.windupT = 0; this.resolveHeroAction(h); }
    }
    const list = this.active;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive || m.windupT <= 0) continue;
      m.windupT -= dt;
      if (m.windupT <= 0) { m.windupT = 0; this.resolveMonsterAttack(m); }
    }
  }

  private heroAtkNow(h: Unit): number { return h.buffT > 0 ? h.atk * (1 + h.buffPct) : h.atk; }

  private targetStillValid(u: Unit, tg: Unit): boolean {
    if (!tg || !tg.alive || tg.invulnerable) return false;
    const dx = tg.x - u.x;
    const dy = tg.y - u.y;
    const lim = u.attackRange + this.t.combat.hitRangeTolerance + tg.radius;
    return dx * dx + dy * dy <= lim * lim;
  }

  private resolveMonsterAttack(m: Unit): void {
    const act = m.pending;
    m.pending = ACT_NONE;
    if (act !== ACT_BASIC) return;
    const tg = m.target;
    if (!this.targetStillValid(m, tg)) return;
    this.host.emit2('attack', m.x, m.y, m.ranged ? 1 : 0, m.id, '', tg.id);
    this.damage(tg, Math.max(1, Math.round(m.atk)), m.x, m.y);
  }

  private resolveHeroAction(h: Unit): void {
    const act = h.pending;
    h.pending = ACT_NONE;
    if (act === ACT_NODE) {
      if (h.nodeTarget >= 0 && this.nodeAvailable(h.nodeTarget)) {
        const dx = this.nodeX(h.nodeTarget) - h.x;
        const dy = this.nodeY(h.nodeTarget) - h.y;
        const lim = h.attackRange + this.t.combat.hitRangeTolerance + this.nodeRadius();
        if (dx * dx + dy * dy <= lim * lim) {
          this.host.emit2('attack', h.x, h.y, h.ranged ? 1 : 0, h.id, '', -(h.nodeTarget + 1));
          this.hitNode(h, h.nodeTarget);
        }
      }
      return;
    }
    if (act === ACT_BASIC) {
      const tg = h.target;
      if (!this.targetStillValid(h, tg)) return;
      this.host.emit2('attack', h.x, h.y, h.ranged ? 1 : 0, h.id, '', tg.id);
      this.damage(tg, Math.max(1, Math.round(this.heroAtkNow(h))), h.x, h.y);
      return;
    }
    if (act !== ACT_SKILL0 && act !== ACT_SKILL1) return;
    const slot = act === ACT_SKILL0 ? 0 : 1;
    const s = slot === 0 ? h.skill0 : h.skill1;
    const stars = slot === 0 ? h.stars0 : h.stars1;
    if (this.castHeroSkill(h, s, stars)) {
      if (slot === 0) h.skillCd0 = s.cooldownSec; else h.skillCd1 = s.cooldownSec;
    }
  }

  /** Thực hiện kỹ năng. Trả về false nếu trượt (mục tiêu đã chết/ra khỏi tầm): khi đó hồi chiêu không bị tính. */
  private castHeroSkill(h: Unit, s: SkillDef, stars: number): boolean {
    const atk = this.heroAtkNow(h);
    const list = this.active;
    const tg = h.target;
    switch (s.type) {
      case 'strike': {
        if (!this.targetStillValid(h, tg)) return false;
        this.host.emit2('attack', h.x, h.y, h.ranged ? 1 : 0, h.id, s.id, tg.id);
        this.host.emit('skill', h.x, h.y, 0, h.id, s.id);
        this.damage(tg, Math.max(1, Math.round(atk * skillParam(s, 'mult', stars))), h.x, h.y);
        return true;
      }
      case 'cleave': {
        if (!this.targetStillValid(h, tg)) return false;
        const r = skillParam(s, 'radius', stars);
        const dmg = Math.max(1, Math.round(atk * skillParam(s, 'mult', stars)));
        const cx = tg.x;
        const cy = tg.y;
        this.host.emit2('attack', h.x, h.y, h.ranged ? 1 : 0, h.id, s.id, tg.id);
        this.host.emit('skill', cx, cy, r, h.id, s.id);
        for (let i = 0; i < list.length; i++) {
          const m = list[i];
          if (!m.alive || m.invulnerable) continue;
          const dx = m.x - cx;
          const dy = m.y - cy;
          if (dx * dx + dy * dy <= r * r) this.damage(m, dmg, h.x, h.y);
        }
        return true;
      }
      case 'nova': {
        const r = skillParam(s, 'radius', stars);
        const dmg = Math.max(1, Math.round(atk * skillParam(s, 'mult', stars)));
        let hit = false;
        for (let i = 0; i < list.length; i++) {
          const m = list[i];
          if (!m.alive || m.invulnerable) continue;
          const dx = m.x - h.x;
          const dy = m.y - h.y;
          if (dx * dx + dy * dy <= r * r) { this.damage(m, dmg, h.x, h.y); hit = true; }
        }
        if (hit) this.host.emit('skill', h.x, h.y, r, h.id, s.id);
        return hit;
      }
      case 'volley': {
        const count = skillParam(s, 'count', stars);
        const range = h.attackRange + VOLLEY_EXTRA_RANGE;
        const dmg = Math.max(1, Math.round(atk * skillParam(s, 'mult', stars)));
        // chọn `count` quái gần hero nhất trong tầm (chọn lặp, không cấp phát)
        const picked = this.scratch;
        picked.length = 0;
        for (let k = 0; k < count; k++) {
          let best: Unit = null;
          let bestD = Infinity;
          for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (!m.alive || m.invulnerable || picked.indexOf(m) >= 0) continue;
            const dx = m.x - h.x;
            const dy = m.y - h.y;
            const d = Math.sqrt(dx * dx + dy * dy) - m.radius;
            if (d <= range && (d < bestD || (d === bestD && best && m.id < best.id))) { best = m; bestD = d; }
          }
          if (!best) break;
          picked.push(best);
        }
        if (picked.length === 0) return false;
        this.host.emit('skill', h.x, h.y, range, h.id, s.id);
        for (let i = 0; i < picked.length; i++) {
          this.host.emit2('attack', h.x, h.y, 1, h.id, s.id, picked[i].id);
          this.damage(picked[i], dmg, h.x, h.y);
        }
        picked.length = 0;
        return true;
      }
      case 'heal': {
        const count = skillParam(s, 'count', stars);
        const amount = Math.round(atk * skillParam(s, 'mult', stars));
        const picked = this.scratch;
        picked.length = 0;
        for (let k = 0; k < count; k++) {
          let best: Unit = null;
          let bestR = 1;
          for (let i = 0; i < this.heroes.length; i++) {
            const o = this.heroes[i];
            if (!o.alive || o.hp >= o.maxHp || picked.indexOf(o) >= 0) continue;
            const r = o.hp / o.maxHp;
            if (r < bestR || (r === bestR && best && o.id < best.id)) { best = o; bestR = r; }
          }
          if (!best) break;
          picked.push(best);
        }
        if (picked.length === 0) return false;
        this.host.emit('skill', h.x, h.y, 0, h.id, s.id);
        for (let i = 0; i < picked.length; i++) {
          const o = picked[i];
          const before = o.hp;
          o.hp = Math.min(o.maxHp, o.hp + amount);
          this.host.emit('heal', o.x, o.y, o.hp - before, o.id, s.id);
        }
        picked.length = 0;
        return true;
      }
      case 'buff_atk': {
        if (!this.targetStillValid(h, tg)) return false;
        const pct = skillParam(s, 'pct', stars);
        const dur = skillParam(s, 'durationSec', stars);
        for (let i = 0; i < this.heroes.length; i++) {
          const o = this.heroes[i];
          if (!o.alive) continue;
          // không cộng dồn: giữ mức cao hơn, làm mới thời gian
          if (o.buffT > 0 && o.buffPct > pct) { if (o.buffT < dur) o.buffT = dur; } else { o.buffPct = pct; o.buffT = dur; }
        }
        this.host.emit('skill', h.x, h.y, 0, h.id, s.id);
        return true;
      }
      case 'taunt': {
        const r = skillParam(s, 'radius', stars);
        const dur = skillParam(s, 'durationSec', stars);
        let hit = false;
        for (let i = 0; i < list.length; i++) {
          const m = list[i];
          if (!m.alive || m.invulnerable) continue;
          const dx = m.x - h.x;
          const dy = m.y - h.y;
          if (dx * dx + dy * dy <= r * r) { m.tauntT = dur; m.tauntBy = h; m.target = h; hit = true; }
        }
        if (hit) this.host.emit('skill', h.x, h.y, r, h.id, s.id);
        return hit;
      }
    }
    return false;
  }

  /** Gây sát thương. (fromX, fromY) = vị trí kẻ đánh, dùng cho đẩy lùi. */
  damage(target: Unit, amount: number, fromX: number, fromY: number): void {
    if (!target.alive || target.invulnerable) return;
    target.hp -= amount;
    target.hitFlashT = this.t.combat.hitFlashSec;
    this.sinceCombat = 0;
    this.host.emit('damage', target.x, target.y, amount, target.id, target.isHero ? 'hero' : 'monster');
    if (!target.isHero) this.onMonsterHit(target);
    if (target.hp <= 0) {
      target.hp = 0;
      this.kill(target);
      return;
    }
    if (target.pushable && !target.dashing) {
      const dx = target.x - fromX;
      const dy = target.y - fromY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1e-6) {
        const k = this.t.combat.knockbackCells / d;
        target.x += dx * k; target.y += dy * k;
        this.clampToBounds(target);
      }
    }
  }

  protected onMonsterHit(m: Unit): void { /* ngoài đồng: cả ổ gây hấn */ }

  protected kill(u: Unit): void {
    u.alive = false;
    u.anim = 'dead';
    u.windupT = 0; u.pending = ACT_NONE; u.target = null; u.targetId = 0; u.vx = 0; u.vy = 0;
    this.host.emit('death', u.x, u.y, 0, u.id, u.isHero ? 'hero' : 'monster');
    if (u.isHero) {
      u.buffT = 0; u.buffPct = 0; u.nodeTarget = -1;
      this.onHeroKilled(u);
      return;
    }
    u.state = 'corpse';
    u.corpseT = CORPSE_SEC;
    u.tauntT = 0; u.tauntBy = null; u.castAbility = ''; u.castT = 0; u.dashing = false;
    if (u.castTelegraphId) { this.removeTelegraph(u.castTelegraphId); u.castTelegraphId = 0; }
    this.dropLoot(u);
    this.onMonsterDied(u);
    this.host.onMonsterKilled(this, u);
  }

  protected onHeroKilled(h: Unit): void { /* lớp con */ }
  protected onMonsterDied(m: Unit): void { /* lớp con */ }

  // ------------------------------------------------------------------------------------------
  // (6)–(7) rơi đồ và nhặt
  // ------------------------------------------------------------------------------------------

  private dropLoot(m: Unit): void {
    const table = this.data.drops.tables[m.mdef.dropTable];
    if (!table) return;
    const rng = this.rng;
    const pk = this.t.pickup;
    for (const roll of table.rolls) {
      if (!(rng.next() < roll.chance)) continue;
      const base = rng.int(roll.min, roll.max);
      if (base <= 0) continue;
      const mult = this.kind === 'dungeon' ? (roll.item === 'gold' ? m.goldMult : 1) : m.amountMult;
      const amount = Math.max(1, Math.floor(base * mult + 1e-9));
      const objects = Math.min(pk.maxObjectsPerType, amount);
      const each = Math.floor(amount / objects);
      let extra = amount - each * objects;
      for (let i = 0; i < objects; i++) {
        const ang = rng.next() * 6.283185307179586;
        const r = rng.next() * pk.scatterRadius;
        const p = this.pickupPool.length > 0 ? this.pickupPool.pop() : new Pickup();
        p.id = this.host.nextEntityId();
        p.item = roll.item;
        p.amount = each + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        p.x = m.x + Math.cos(ang) * r;
        p.y = m.y + Math.sin(ang) * r;
        const b = this.bounds;
        if (p.x < b[0]) p.x = b[0]; else if (p.x > b[2]) p.x = b[2];
        if (p.y < b[1]) p.y = b[1]; else if (p.y > b[3]) p.y = b[3];
        p.flying = false; p.age = 0;
        this.pickups.push(p);
      }
    }
  }

  /** Mọi vật rơi bay về thủ lĩnh ngay (hết quái của tầng). */
  protected flyAllPickups(): void {
    for (const p of this.pickups) { p.flying = true; p.age = this.t.pickup.autoCollectSec; }
  }

  protected stepPickups(): void {
    const n = this.pickups.length;
    if (n === 0) return;
    const pk = this.t.pickup;
    const dt = this.dt;
    const magnet2 = pk.magnetRadius * pk.magnetRadius;
    const step = pk.flySpeed * dt;
    let w = 0;
    for (let i = 0; i < n; i++) {
      const p = this.pickups[i];
      p.age += dt;
      let tg: Unit = null;
      if (p.age >= pk.autoCollectSec) {
        // quá 6 s: tự bay về thủ lĩnh
        tg = this.leader;
        if (tg) p.flying = true;
      } else {
        const near = this.nearestHero(p.x, p.y);
        if (near) {
          const dx = near.x - p.x;
          const dy = near.y - p.y;
          if (p.flying || dx * dx + dy * dy <= magnet2) { tg = near; p.flying = true; }
        }
      }
      if (tg) {
        const dx = tg.x - p.x;
        const dy = tg.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= PICKUP_TOUCH_DIST + step) {
          this.host.onPickup(this, p.item, p.amount, tg.x, tg.y);
          this.pickupPool.push(p);
          continue;
        }
        p.x += dx / d * step; p.y += dy / d * step;
      }
      this.pickups[w++] = p;
    }
    this.pickups.length = w;
  }

  // ------------------------------------------------------------------------------------------
  // vùng báo đòn
  // ------------------------------------------------------------------------------------------

  protected addTelegraph(shape: 'circle' | 'rect', ability: string, source: Unit, duration: number): Telegraph {
    const tg = this.telePool.length > 0 ? this.telePool.pop() : new Telegraph();
    tg.id = this.host.nextEntityId();
    tg.shape = shape; tg.ability = ability; tg.sourceId = source.id;
    tg.x = source.x; tg.y = source.y;
    tg.radius = 0; tg.dirX = 0; tg.dirY = 0; tg.length = 0; tg.width = 0;
    tg.elapsed = 0; tg.duration = duration;
    this.telegraphs.push(tg);
    return tg;
  }

  protected removeTelegraph(id: number): void {
    for (let i = 0; i < this.telegraphs.length; i++) {
      if (this.telegraphs[i].id === id) {
        this.telePool.push(this.telegraphs[i]);
        this.telegraphs.splice(i, 1);
        return;
      }
    }
  }

  protected findTelegraph(id: number): Telegraph {
    for (let i = 0; i < this.telegraphs.length; i++) if (this.telegraphs[i].id === id) return this.telegraphs[i];
    return null;
  }

  /** Dọn xác đã hết giờ khỏi danh sách. Gọi onCorpseGone cho từng con để lớp con hẹn giờ mọc lại. */
  protected stepCorpses(): void {
    const list = this.monsters;
    const dt = this.dt;
    let w = 0;
    let removed = false;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive) {
        m.corpseT -= dt;
        if (m.corpseT <= 0) {
          this.onCorpseGone(m);
          this.freeUnit(m);
          removed = true;
          continue;
        }
      }
      list[w++] = m;
    }
    list.length = w;
    if (removed) this.onMonsterListChanged();
  }

  protected onCorpseGone(m: Unit): void { /* lớp con */ }
  protected onMonsterListChanged(): void { /* lớp con */ }
}

/** Thông số một hero để đưa vào đấu trường (đã tính cấp, Sân Tập, hiệu ứng sở hữu). */
export interface HeroSpec {
  def: HeroDef;
  level: number;
  hp: number;
  atk: number;
  skill0: SkillDef; skill1: SkillDef;
  stars0: number; stars1: number;
}

export function applyHeroSpec(u: Unit, s: HeroSpec, t: Tuning): void {
  u.hdef = s.def; u.heroId = s.def.id; u.level = s.level;
  u.maxHp = s.hp; u.atk = s.atk;
  u.radius = t.squad.heroRadius;
  u.moveSpeed = t.squad.moveSpeed;
  u.attackInterval = s.def.attackInterval;
  u.attackRange = s.def.attackRange;
  u.ranged = s.def.ranged;
  u.gatherPower = s.def.gatherPower;
  u.skill0 = s.skill0; u.skill1 = s.skill1;
  const had0 = u.stars0 > 0 && u.skillCd0 >= 0;
  const had1 = u.stars1 > 0 && u.skillCd1 >= 0;
  u.stars0 = s.stars0; u.stars1 = s.stars1;
  // kỹ năng vừa mở: bắt đầu hồi chiêu đầy; kỹ năng đã có: giữ nguyên đồng hồ
  if (u.stars0 <= 0) u.skillCd0 = -1; else if (!had0) u.skillCd0 = s.skill0.cooldownSec;
  if (u.stars1 <= 0) u.skillCd1 = -1; else if (!had1) u.skillCd1 = s.skill1.cooldownSec;
}
