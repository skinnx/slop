// GameImpl: cài đặt hợp đồng Game (contract.ts). Ghép đấu trường ngoài đồng, dungeon, làng, quán, hero,
// nhiệm vụ, lưu/tải. View không import file này trực tiếp; dùng createGame() trong index.ts.
import { GameData, HeroDef, ResourceMap, StageDef, ZoneId, QuestDef, RARITIES } from './data';
import {
  Game, GameOptions, Clock, Mode, Check, PlacementCheck, SceneView, FieldView, DungeonRunView, ResultView, PlayerView,
  QuestView, OfflineReport, GameEvent, GameEventType, BuildMenuEntry, BuildingPanelInfo, BuildingView, HeroInfo,
  SkillInfo, MilestoneInfo, SquadInfo, TavernInfo, TavernCard, TicketExchangeInfo, RecruitResult, RecruitDraw,
  TrainingInfo, TrainingNodeInfo, SlotNodeInfo, DungeonInfo, StageInfo, QuestHint, SaveData, SAVE_VERSION,
} from './contract';
import { Arena, HeroSpec, Unit } from './arena';
import { FieldSim, FieldNode, FieldHost } from './field';
import { DungeonSim, DungeonHost } from './dungeon';
import { Village, Building, Bank } from './village';
import { Rng, hashSeed } from './rng';
import { generateCards, drawCardIndex } from './tavern';
import {
  OwnedHero, TeamBonuses, computeBonuses, heroHp, heroAtk, heroCp, skillStars, skillMilestoneLevel, skillParam,
  levelUpCost, nextBreakthroughFragments, difficultyLabel,
} from './formulas';
import { OK, fail, reasonText, resourceName, resourceTitle } from './checks';
import { MAX_EVENTS } from './constants';
import { loadSave } from './save';

class Ev implements GameEvent {
  type: GameEventType = 'toast';
  x = 0; y = 0; n = 0; id = 0; id2 = 0;
  key = ''; text = '';
  data: any = null;
}

class QuestState implements QuestView {
  index = 0;
  id = '';
  type = '';
  text = '';
  progress = 0;
  target = 1;
  complete = false;
  finished = false;
  reward: ResourceMap = {};
  hint = '';
}

class PlayerState implements PlayerView {
  level = 1;
  exp = 0;
  expToNext = 0;
}

export class GameImpl implements Game, FieldHost, DungeonHost, Bank {
  data: GameData;
  stepSec: number;
  tick = 0;
  mode: Mode = 'world';
  scene: SceneView;
  field: FieldSim;
  dungeonScene: DungeonSim;
  run: DungeonRunView | null = null;
  result: ResultView | null = null;
  player = new PlayerState();
  resources: ResourceMap = {};
  squadCp = 0;
  squad: string[] = [];
  squadSlots = 3;
  buildings: Building[];
  buildersFree = 0;
  buildersTotal = 0;
  quest = new QuestState();
  leaderZone: ZoneId = 'village';
  playSec = 0;
  settings = { music: true, sfx: true };
  offlineReport: OfflineReport | null = null;
  events: Ev[] = [];
  eventCount = 0;
  lastRecruit: RecruitResult | null = null;

  private clock: Clock;
  private rng: Rng;
  private seed = 1;
  private dungeonRuns = 0;
  private entityId = 0;
  private village: Village;
  private owned: OwnedHero[] = [];
  private ownedById: { [id: string]: OwnedHero } = {};
  private bonuses: TeamBonuses;
  private nodesUnlocked = 0;
  private tavern = { cards: [] as string[], nextRefreshAt: 0, bonus: 0, totalDraws: 0 };
  private bestStageCleared = 0;
  private bestFloorCleared = 0;
  private repeatClears: { [stage: string]: number } = {};
  private auto = false;
  private createdAt = 0;
  private lastClockMs = 0;
  private kills = 0;
  private storageToastT = 0;
  private autosaveT = 0;
  private preDungeonSave: SaveData | null = null;
  private questWasComplete = false;
  private uncapped: { [res: string]: boolean } = {};
  private inventory: { [key: string]: any } = {};

  constructor(opts: GameOptions) {
    const data = opts.data;
    this.data = data;
    this.clock = opts.clock;
    this.stepSec = 1 / data.tuning.sim.stepsPerSec; // chính xác 1/30; fixedStepSec trong JSON là số đã làm tròn
    this.buildersTotal = data.tuning.economy.builderSlots;
    for (const r of data.tuning.economy.uncapped) this.uncapped[r] = true;
    const now = this.clock.nowMs();
    const save = opts.save ? loadSave(data, opts.save) : null;

    this.village = new Village(data, this);
    this.buildings = this.village.buildings;
    this.bonuses = computeBonuses(data, [], 0);
    let leaderPos = data.field.startPos;

    if (save) {
      this.seed = save.rng.seed;
      this.rng = new Rng(save.rng.state);
      this.dungeonRuns = save.rng.dungeonRuns;
      this.player.level = save.player.level; this.player.exp = save.player.exp;
      for (const k of Object.keys(data.tuning.economy.startResources)) this.resources[k] = save.resources[k] || 0;
      this.village.load(save.buildings, save.nextBuildingUid);
      for (const h of save.heroes) this.addOwned(h.id, h.level, h.fragments);
      this.squadSlots = save.squadSlots;
      this.squad = save.squad.slice(0, this.squadSlots);
      this.nodesUnlocked = save.training.nodesUnlocked;
      this.tavern.cards = save.tavern.cards.slice();
      this.tavern.nextRefreshAt = save.tavern.nextRefreshAt;
      this.tavern.bonus = save.tavern.bonus;
      this.tavern.totalDraws = save.tavern.totalDraws;
      this.bestStageCleared = save.dungeon.bestStageCleared;
      this.bestFloorCleared = save.dungeon.bestFloorCleared;
      for (const k of Object.keys(save.dungeon.repeatClears)) this.repeatClears[k] = save.dungeon.repeatClears[k];
      this.auto = save.dungeon.auto;
      this.quest.index = save.quest.index;
      this.quest.progress = save.quest.progress;
      leaderPos = save.world.leaderPos;
      this.settings.music = save.settings.music; this.settings.sfx = save.settings.sfx;
      this.playSec = save.stats.playSec; this.kills = save.stats.kills;
      this.inventory = save.inventory || {};
      this.createdAt = save.createdAt;
      this.lastClockMs = save.lastSaveAt;
    } else {
      this.seed = (opts.seed === undefined ? 1 : opts.seed) >>> 0;
      this.rng = new Rng(this.seed);
      const start = data.tuning.economy.startResources;
      for (const k of Object.keys(start)) this.resources[k] = start[k];
      this.village.initNew();
      this.squadSlots = data.tuning.squad.startSlots;
      // người chơi bắt đầu với hero đầu tiên trong heroes.json (Bàng) ở cấp 1
      this.addOwned(data.heroes[0].id, 1, 0);
      this.squad = [data.heroes[0].id];
      this.tavern.cards = data.recruit.firstCards.slice();
      this.createdAt = now;
      this.lastClockMs = now;
    }
    this.bonuses = computeBonuses(data, this.owned, this.nodesUnlocked);

    this.field = new FieldSim(this, this.rng);
    this.dungeonScene = new DungeonSim(this, new Rng(0));
    this.scene = this.field;
    if (save && save.world.returnPoint) this.field.returnPoint = save.world.returnPoint.slice(0, 2);
    this.field.setHeroes(this.squadSpecs(), leaderPos[0], leaderPos[1], false);
    this.squadCp = this.computeSquadCp(this.squad);
    this.refreshPlayer();
    this.updateLeaderZone();

    if (save) this.offlineReport = this.applyOffline(now);
    else this.lastClockMs = now;
    this.buildersFree = this.village.buildersFree();
    this.refreshQuest(false);
    this.eventCount = 0; // sự kiện sinh ra lúc tải không phát lại; view dùng offlineReport
  }

  // =========================================================================================
  // dịch vụ cho đấu trường (ArenaHost) và kho (Bank)
  // =========================================================================================

  nextEntityId(): number { return ++this.entityId; }

  emit(type: GameEventType, x: number, y: number, n: number, id: number, key: string): void {
    this.emit2(type, x, y, n, id, key, 0);
  }

  emit2(type: GameEventType, x: number, y: number, n: number, id: number, key: string, id2: number): Ev {
    if (this.eventCount >= MAX_EVENTS) this.eventCount = 0; // không ai đọc: bỏ sự kiện cũ
    let e = this.events[this.eventCount];
    if (!e) { e = new Ev(); this.events.push(e); }
    this.eventCount++;
    e.type = type; e.x = x; e.y = y; e.n = n; e.id = id; e.id2 = id2; e.key = key; e.text = ''; e.data = null;
    return e;
  }

  private toast(key: string, text: string, n = 0): void {
    const e = this.emit2('toast', 0, 0, n, 0, key, 0);
    e.text = text;
  }

  clearEvents(): void {
    // nhả tham chiếu tới dữ liệu kèm theo để không giữ rác
    for (let i = 0; i < this.eventCount; i++) this.events[i].data = null;
    this.eventCount = 0;
  }

  playerLevel(): number { return this.player.level; }

  storageCap(resource: string): number { return this.cap(resource); }

  cap(resource: string): number {
    if (this.uncapped[resource]) return Infinity;
    const lv = this.village.levelDef('storage');
    if (!lv || !lv.effects.cap || lv.effects.cap[resource] === undefined) return Infinity;
    return lv.effects.cap[resource];
  }

  missing(cost: ResourceMap): ResourceMap {
    const out: ResourceMap = {};
    for (const k in cost) {
      const have = this.resources[k] || 0;
      if (cost[k] > have) out[k] = cost[k] - have;
    }
    return out;
  }

  spend(cost: ResourceMap): void {
    for (const k in cost) this.resources[k] = (this.resources[k] || 0) - cost[k];
  }

  refund(cost: ResourceMap): void {
    for (const k in cost) this.resources[k] = (this.resources[k] || 0) + cost[k];
  }

  /** Cộng tài nguyên theo trần kho. Trả về số thực sự cộng được; phần vượt trần bị bỏ (có toast, tối đa 30 s một lần). */
  private gain(resource: string, amount: number): number {
    if (amount <= 0) return 0;
    const have = this.resources[resource] || 0;
    const room = this.cap(resource) - have;
    const add = room >= amount ? amount : (room > 0 ? room : 0);
    this.resources[resource] = have + add;
    if (add < amount) this.storageFull();
    return add;
  }

  private storageFull(): void {
    if (this.storageToastT > 0) return;
    this.storageToastT = this.data.tuning.field.storageFullToastCooldownSec;
    this.toast('storage_full', reasonText('storage_full', 0, ''));
  }

  onGather(node: FieldNode, amount: number, hero: Unit): void {
    const added = this.gain(node.resource, amount);
    if (added > 0) this.emit('gather', node.x, node.y, added, node.index, node.resource);
    const q = this.currentQuest();
    if (q && q.type === 'gather' && q.params.resource === node.resource) this.quest.progress += amount;
  }

  onMonsterKilled(arena: Arena, m: Unit): void {
    this.kills++;
    if (m.expValue > 0) {
      this.emit('exp', m.x, m.y, m.expValue, 0, '');
      this.addExp(m.expValue);
    }
    const q = this.currentQuest();
    if (q && q.type === 'kill') {
      if (q.params.monster !== undefined) { if (q.params.monster === m.monsterId) this.quest.progress++; }
      else if (arena.kind === 'field' && q.params.zone === m.zone) this.quest.progress++;
    }
  }

  onPickup(arena: Arena, item: string, amount: number, x: number, y: number): void {
    if (arena.kind === 'dungeon') {
      const loot = this.dungeonScene.loot;
      loot[item] = (loot[item] || 0) + amount;
      this.emit('pickup', x, y, amount, 0, item);
      return;
    }
    const added = this.gain(item, amount);
    if (added > 0) this.emit('pickup', x, y, added, 0, item);
  }

  onFloorCleared(floor: number): void {
    if (floor > this.bestFloorCleared) this.bestFloorCleared = floor;
  }

  private addExp(n: number): void {
    const p = this.player;
    const table = this.data.playerLevels;
    if (p.level >= table.maxLevel) return;
    p.exp += n;
    while (p.level < table.maxLevel && p.exp >= table.levels[p.level - 1].exp) {
      p.exp -= table.levels[p.level - 1].exp;
      p.level++;
      this.emit('player_level', 0, 0, p.level, 0, '');
      this.toast('player_level', 'Lên cấp!', p.level);
    }
    if (p.level >= table.maxLevel) p.exp = 0;
    this.refreshPlayer();
  }

  private refreshPlayer(): void {
    const p = this.player;
    const table = this.data.playerLevels;
    p.expToNext = p.level >= table.maxLevel ? 0 : table.levels[p.level - 1].exp;
  }

  // =========================================================================================
  // vòng lặp
  // =========================================================================================

  step(): void {
    this.tick++;
    const dt = this.stepSec;
    const now = this.clock.nowMs();
    if (this.mode === 'dungeon') {
      this.dungeonScene.step();
      if (this.dungeonScene.outcome !== '') this.finishRun(this.dungeonScene.outcome);
    } else if (this.mode === 'world' || this.mode === 'build') {
      const out = this.field.step(this.mode === 'world');
      if (out === 'channel_done') this.finishChannel();
      else if (out === 'channel_cancel') this.emit('return_cancel', 0, 0, 0, 0, '');
      else if (out === 'wipe_respawn') {
        const p = this.data.field.wipeRespawnPos;
        this.field.sendMonstersHome();
        this.field.restoreSquad();
        this.field.placeSquad(p[0], p[1]);
        this.emit('teleport', p[0], p[1], 0, 0, 'wipe');
      }
      this.updateLeaderZone();
      this.autoCollect();
    }
    this.advanceClock(now, null);
    if (this.storageToastT > 0) this.storageToastT -= dt;
    this.playSec += dt;
    if (this.mode === 'world' || this.mode === 'build') {
      this.autosaveT += dt;
      if (this.autosaveT >= this.data.tuning.save.autosaveSec) this.savePoint();
    }
    this.refreshQuest(true);
  }

  private savePoint(): void {
    this.autosaveT = 0;
    if (this.mode !== 'dungeon') this.emit('save_point', 0, 0, 0, 0, '');
  }

  private updateLeaderZone(): void {
    const l = this.field.leader;
    if (l) this.leaderZone = this.zoneAt(l.x, l.y);
  }

  /** Thủ lĩnh đi tới cách footprint ≤ collectRadius thì thu sản lượng (01 mục 7.6). */
  private autoCollect(): void {
    const l = this.field.leader;
    if (!l || this.leaderZone !== 'village') return;
    const r = this.data.tuning.field.collectRadius;
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      if (b.buffer < 1) continue;
      if (this.village.distToFootprint(b, l.x, l.y) <= r) this.collect(b, false);
    }
  }

  // =========================================================================================
  // đồng hồ thật: sản xuất, timer xây, Quán, ngoại tuyến
  // =========================================================================================

  private advanceClock(now: number, report: { finished: Building[]; tavernRefreshed: boolean } | null): number {
    let elapsed = now - this.lastClockMs;
    if (elapsed < 0) {
      // đồng hồ lùi: không có tiến độ; giữ nguyên thời gian còn lại của mọi timer
      this.shiftTimestamps(elapsed);
      elapsed = 0;
    }
    const capMs = this.data.tuning.economy.offlineCapHours * 3600000;
    if (elapsed > capMs) {
      // vắng mặt quá trần: chỉ tính capMs, phần dư không làm timer chạy
      this.shiftTimestamps(elapsed - capMs);
      elapsed = capMs;
    }
    this.lastClockMs = now;
    if (elapsed <= 0) return 0;
    this.village.advance(now - elapsed, now, (b) => {
      this.onBuildingDone(b, now);
      if (report) report.finished.push(b);
    });
    const tv = this.tavern;
    // đồng hồ đổi thẻ bắt đầu chạy khi Quán đã xây xong
    if (tv.nextRefreshAt <= 0 && this.village.levelOf('tavern') >= 1) tv.nextRefreshAt = now + this.data.recruit.refreshSec * 1000;
    if (tv.nextRefreshAt > 0 && now >= tv.nextRefreshAt) {
      const period = this.data.recruit.refreshSec * 1000;
      tv.nextRefreshAt = now + period - ((now - tv.nextRefreshAt) % period);
      if (tv.totalDraws > 0) { // bộ thẻ đầu tiên giữ nguyên tới lượt tuyển đầu
        this.rerollCards(false);
        if (report) report.tavernRefreshed = true;
      }
    }
    this.buildersFree = this.village.buildersFree();
    return elapsed;
  }

  private shiftTimestamps(deltaMs: number): void {
    this.village.shiftTimestamps(deltaMs);
    if (this.tavern.nextRefreshAt > 0) this.tavern.nextRefreshAt += deltaMs;
  }

  private onBuildingDone(b: Building, now: number): void {
    this.emit('build_done', b.x + b.w / 2, b.y + b.h / 2, b.level, b.uid, b.type);
    this.toast('build_done', 'Xây xong: ' + b.name + ' cấp ' + b.level, b.level);
    if (b.type === 'tavern' && this.tavern.nextRefreshAt <= 0) {
      this.tavern.nextRefreshAt = now + this.data.recruit.refreshSec * 1000;
    }
    this.savePoint();
  }

  private applyOffline(now: number): OfflineReport {
    const rep = { finished: [] as Building[], tavernRefreshed: false };
    const raw = now - this.lastClockMs;
    const elapsed = this.advanceClock(now, rep);
    const buffers: { uid: number; type: string; name: string; resource: string; amount: number }[] = [];
    for (const b of this.buildings) {
      if (b.buffer >= 1) buffers.push({ uid: b.uid, type: b.type, name: b.name, resource: b.bufferResource, amount: b.buffer });
    }
    const sec = elapsed / 1000;
    return {
      offlineSec: sec,
      showPanel: sec >= this.data.tuning.save.welcomeBackMinSec,
      capped: raw > elapsed,
      buffers,
      finished: rep.finished.map((b) => ({ uid: b.uid, type: b.type, name: b.name, level: b.level })),
      tavernRefreshed: rep.tavernRefreshed,
    };
  }

  // =========================================================================================
  // di chuyển
  // =========================================================================================

  setJoystick(x: number, y: number): void {
    let jx = x;
    let jy = y;
    const m = Math.sqrt(jx * jx + jy * jy);
    if (!(m >= 0)) { jx = 0; jy = 0; } // NaN
    else if (m > 1) { jx /= m; jy /= m; }
    this.field.joyX = jx; this.field.joyY = jy;
    this.dungeonScene.joyX = jx; this.dungeonScene.joyY = jy;
  }

  canReturnToVillage(): Check {
    if (this.mode !== 'world') return fail('wrong_mode');
    if (!this.field.leader || this.field.wipeT > 0) return fail('invalid');
    if (this.leaderZone === 'village') return fail('invalid');
    if (this.field.chasing > 0) return fail('monsters_near');
    return OK;
  }

  returnToVillage(): Check {
    const c = this.canReturnToVillage();
    if (!c.ok) return c;
    const l = this.field.leader;
    this.field.returnPoint = [l.x, l.y];
    this.field.startChannel('village');
    this.emit('return_start', l.x, l.y, this.field.returnChannelT, 0, 'village');
    return OK;
  }

  canGoToField(): Check {
    if (this.mode !== 'world') return fail('wrong_mode');
    if (!this.field.leader) return fail('invalid');
    if (this.leaderZone !== 'village') return fail('invalid');
    if (!this.field.returnPoint) return fail('no_return_point');
    return OK;
  }

  goToField(): Check {
    const c = this.canGoToField();
    if (!c.ok) return c;
    const l = this.field.leader;
    this.field.startChannel('field');
    this.emit('return_start', l.x, l.y, this.field.returnChannelT, 0, 'field');
    return OK;
  }

  private finishChannel(): void {
    const f = this.field;
    if (f.returnTarget === 'village') {
      const c = this.data.tuning.world.villageCenter;
      f.placeSquad(c[0], c[1]);
      this.emit('teleport', c[0], c[1], 0, 0, 'village');
    } else if (f.returnPoint) {
      f.placeSquad(f.returnPoint[0], f.returnPoint[1]);
      this.emit('teleport', f.returnPoint[0], f.returnPoint[1], 0, 0, 'field');
    }
    this.updateLeaderZone();
  }

  // =========================================================================================
  // xây dựng
  // =========================================================================================

  canEnterBuildMode(): Check {
    if (this.mode !== 'world') return fail('wrong_mode');
    if (this.leaderZone !== 'village') return fail('not_in_village');
    return OK;
  }

  enterBuildMode(): Check {
    const c = this.canEnterBuildMode();
    if (!c.ok) return c;
    this.setMode('build');
    return OK;
  }

  exitBuildMode(): Check {
    if (this.mode !== 'build') return fail('wrong_mode');
    this.setMode('world');
    return OK;
  }

  private setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.scene = mode === 'dungeon' ? this.dungeonScene : this.field;
    this.run = mode === 'dungeon' ? this.dungeonScene : null;
    if (mode !== 'result') this.result = null;
    this.setJoystick(0, 0);
    this.emit('mode', 0, 0, 0, 0, mode);
  }

  getBuildMenu(): BuildMenuEntry[] { return this.village.buildMenu(); }

  checkPlacement(type: string, x: number, y: number): PlacementCheck { return this.village.checkPlacement(type, x, y); }

  checkMove(uid: number, x: number, y: number): PlacementCheck { return this.village.checkMove(uid, x, y); }

  findFreeCell(type: string, nearX: number, nearY: number, ignoreUid?: number): { x: number; y: number } | null {
    return this.village.findFreeCell(type, nearX, nearY, ignoreUid || 0);
  }

  placeBuilding(type: string, x: number, y: number): PlacementCheck {
    if (this.mode !== 'build') return { ok: false, reason: 'wrong_mode', n: 0, key: '', text: reasonText('wrong_mode', 0, ''), blockerUid: 0 };
    const c = this.village.checkPlacement(type, x, y);
    if (!c.ok) return c;
    const now = this.clock.nowMs();
    const b = this.village.place(type, x, y, now);
    this.buildersFree = this.village.buildersFree();
    this.emit('build_started', b.x + b.w / 2, b.y + b.h / 2, 1, b.uid, b.type);
    this.savePoint();
    return c;
  }

  moveBuilding(uid: number, x: number, y: number): PlacementCheck {
    if (this.mode !== 'build') return { ok: false, reason: 'wrong_mode', n: 0, key: '', text: reasonText('wrong_mode', 0, ''), blockerUid: 0 };
    const c = this.village.checkMove(uid, x, y);
    if (!c.ok) return c;
    const b = this.village.byUid(uid);
    b.x = x; b.y = y;
    this.emit('building_moved', b.x + b.w / 2, b.y + b.h / 2, 0, b.uid, b.type);
    this.savePoint();
    return c;
  }

  upgradeBuilding(uid: number): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    const b = this.village.byUid(uid);
    if (!b) return fail('invalid');
    const c = this.village.checkUpgrade(b);
    if (!c.ok) return c;
    this.village.upgrade(b, this.clock.nowMs());
    this.buildersFree = this.village.buildersFree();
    this.emit('build_started', b.x + b.w / 2, b.y + b.h / 2, b.job.targetLevel, b.uid, b.type);
    this.toast('build_started', 'Bắt đầu nâng ' + b.name + ' lên cấp ' + b.job.targetLevel, b.job.targetLevel);
    this.savePoint();
    return OK;
  }

  cancelBuildingJob(uid: number): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    const b = this.village.byUid(uid);
    if (!b || !b.job) return fail('invalid');
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    this.village.cancel(b);
    this.buildersFree = this.village.buildersFree();
    this.emit('build_cancelled', cx, cy, 0, uid, b.type);
    this.savePoint();
    return OK;
  }

  private checkCollect(b: Building): Check {
    if (!b.bufferResource || b.level < 1) return fail('invalid');
    if (b.buffer < 1) return fail('nothing_to_collect');
    const room = this.cap(b.bufferResource) - (this.resources[b.bufferResource] || 0);
    if (room < 1) return fail('storage_full');
    return OK;
  }

  /** Chuyển min(bộ đệm, trần kho − đang có) vào kho; phần còn lại ở lại bộ đệm. */
  private collect(b: Building, viaPanel: boolean): number {
    const c = this.checkCollect(b);
    if (!c.ok) {
      if (c.reason === 'storage_full') this.storageFull();
      return 0;
    }
    const res = b.bufferResource;
    const room = this.cap(res) - (this.resources[res] || 0);
    const amount = Math.min(b.buffer, Math.floor(room));
    this.village.takeFromBuffer(b, amount);
    this.resources[res] = (this.resources[res] || 0) + amount;
    this.emit('collect', b.x + b.w / 2, b.y + b.h / 2, amount, b.uid, res);
    this.toast('collect', 'Thu ' + resourceName(res) + ' +' + amount, amount);
    const q = this.currentQuest();
    if (q && q.type === 'collect' && q.params.building === b.type) this.quest.progress++;
    if (viaPanel) this.savePoint();
    return amount;
  }

  collectBuilding(uid: number): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    const b = this.village.byUid(uid);
    if (!b) return fail('invalid');
    const c = this.checkCollect(b);
    if (!c.ok) return c;
    this.collect(b, true);
    return OK;
  }

  collectAll(): ResourceMap {
    const out: ResourceMap = {};
    if (this.mode !== 'world' && this.mode !== 'build') return out;
    for (const b of this.buildings) {
      if (b.buffer < 1) continue;
      const got = this.collect(b, false);
      if (got > 0) out[b.bufferResource] = (out[b.bufferResource] || 0) + got;
    }
    this.savePoint();
    return out;
  }

  getBuildingPanel(uid: number): BuildingPanelInfo | null {
    const b = this.village.byUid(uid);
    if (!b) return null;
    return this.village.panel(b, this.clock.nowMs(), this.checkCollect(b));
  }

  findBuilding(type: string): BuildingView | null { return this.village.byType(type); }

  buildingAt(x: number, y: number): BuildingView | null { return this.village.at(x, y); }

  // =========================================================================================
  // hero và đội
  // =========================================================================================

  private addOwned(id: string, level: number, fragments: number): OwnedHero {
    const o: OwnedHero = { id, level, fragments };
    this.owned.push(o);
    this.ownedById[id] = o;
    return o;
  }

  private heroSpec(o: OwnedHero): HeroSpec {
    const def = this.data.heroById[o.id];
    return {
      def, level: o.level,
      hp: heroHp(this.data, def, o.level, this.bonuses),
      atk: heroAtk(this.data, def, o.level, this.bonuses),
      skill0: this.data.skillById[def.skills[0]], skill1: this.data.skillById[def.skills[1]],
      stars0: skillStars(this.data, o.level, 0), stars1: skillStars(this.data, o.level, 1),
    };
  }

  private squadSpecs(): HeroSpec[] {
    const out: HeroSpec[] = [];
    for (const id of this.squad) out.push(this.heroSpec(this.ownedById[id]));
    return out;
  }

  private cpOf(id: string): number {
    const o = this.ownedById[id];
    const def = this.data.heroById[id];
    return heroCp(this.data, def, o ? o.level : 1, this.bonuses);
  }

  private computeSquadCp(ids: ReadonlyArray<string>): number {
    let cp = 0;
    for (const id of ids) cp += this.cpOf(id);
    return cp;
  }

  /** Sau mọi thay đổi về chỉ số hoặc đội hình: tính lại bonus, dựng lại đơn vị ngoài đồng, cập nhật CP. */
  private syncSquad(): void {
    this.bonuses = computeBonuses(this.data, this.owned, this.nodesUnlocked);
    const l = this.field.leader;
    const p = l ? l : (this.field.heroes.length > 0 ? this.field.heroes[0] : null);
    const x = p ? p.x : this.data.field.startPos[0];
    const y = p ? p.y : this.data.field.startPos[1];
    this.field.setHeroes(this.squadSpecs(), x, y, true);
    this.squadCp = this.computeSquadCp(this.squad);
  }

  private unlockHero(id: string): boolean {
    this.addOwned(id, 1, 0);
    let joined = false;
    if (this.squad.length < this.squadSlots) { this.squad.push(id); joined = true; }
    this.syncSquad();
    this.emit('hero_unlocked', 0, 0, 0, 0, id);
    return joined;
  }

  private checkLevelUp(o: OwnedHero): Check {
    if (!o) return fail('not_owned');
    const def = this.data.heroById[o.id];
    const cost = levelUpCost(this.data, def, o.level);
    if (!cost) return fail('max_level');
    const meat = this.resources.meat || 0;
    if (cost.meat > this.cap('meat')) {
      const need = this.village.storageLevelNeeded({ meat: cost.meat });
      return fail('need_storage_level', need > 0 ? need : 0);
    }
    if (meat < cost.meat) return fail('missing_resources', cost.meat - meat, 'meat');
    if (o.fragments < cost.fragments) return fail('missing_fragments', cost.fragments - o.fragments);
    return OK;
  }

  levelUpHero(heroId: string): Check {
    if (this.mode === 'dungeon' || this.mode === 'result') return fail('wrong_mode');
    const o = this.ownedById[heroId];
    const c = this.checkLevelUp(o);
    if (!c.ok) return c;
    const cost = levelUpCost(this.data, this.data.heroById[heroId], o.level);
    this.resources.meat -= cost.meat;
    o.fragments -= cost.fragments;
    o.level++;
    this.syncSquad();
    this.emit('hero_level', 0, 0, o.level, 0, heroId);
    this.savePoint();
    return OK;
  }

  getHeroInfo(heroId: string): HeroInfo | null {
    const def = this.data.heroById[heroId];
    if (!def) return null;
    const data = this.data;
    const o = this.ownedById[heroId];
    const level = o ? o.level : 1;
    const max = data.heroLevels.maxLevel;
    const hp = heroHp(data, def, level, this.bonuses);
    const atk = heroAtk(data, def, level, this.bonuses);
    const cost = levelUpCost(data, def, level);
    const skills: SkillInfo[] = [];
    for (let slot = 0; slot < def.skills.length; slot++) {
      const s = data.skillById[def.skills[slot]];
      const stars = o ? skillStars(data, level, slot) : 0;
      const shown = Math.max(1, stars);
      const params: { [k: string]: number } = {};
      const next: { [k: string]: number } = {};
      for (const k of Object.keys(s.params)) { params[k] = skillParam(s, k, shown); next[k] = skillParam(s, k, shown + 1); }
      skills.push({
        id: s.id, name: s.name, type: s.type, desc: s.desc, cooldownSec: s.cooldownSec, unlocked: stars > 0, stars,
        unlockLevel: skillMilestoneLevel(data, slot, 'skill_unlock'), star2Level: skillMilestoneLevel(data, slot, 'skill_star'),
        params, nextParams: shown >= 2 ? null : next,
      });
    }
    const milestones: MilestoneInfo[] = data.heroLevels.milestones.map((m) => ({
      level: m.level, type: m.type, desc: m.desc, reached: !!o && level >= m.level,
    }));
    const squadIndex = this.squad.indexOf(heroId);
    return {
      id: def.id, name: def.name, attribute: def.attribute, rarity: def.rarity, role: def.role, ranged: def.ranged,
      flavor: def.flavor, sprite: def.sprite, tint: def.tint,
      owned: !!o, inSquad: squadIndex >= 0, squadIndex, level, maxLevel: max, hp, atk,
      cp: heroCp(data, def, level, this.bonuses),
      hpNext: level < max ? heroHp(data, def, level + 1, this.bonuses) - hp : 0,
      atkNext: level < max ? heroAtk(data, def, level + 1, this.bonuses) - atk : 0,
      attackInterval: def.attackInterval, attackRange: def.attackRange, gatherPower: def.gatherPower,
      fragments: o ? o.fragments : 0,
      fragmentsForNextBreakthrough: nextBreakthroughFragments(data, def, level),
      levelUpMeat: cost ? cost.meat : 0, levelUpFragments: cost ? cost.fragments : 0,
      canLevelUp: this.checkLevelUp(o),
      milestones, skills,
    };
  }

  /** Thứ tự: trong đội (theo ô), rồi hero đã có theo CP giảm dần, rồi hero chưa có. */
  getHeroList(): HeroInfo[] {
    const out: HeroInfo[] = [];
    for (const id of this.squad) out.push(this.getHeroInfo(id));
    const rest: HeroInfo[] = [];
    for (const o of this.owned) if (this.squad.indexOf(o.id) < 0) rest.push(this.getHeroInfo(o.id));
    rest.sort((a, b) => (b.cp - a.cp) || (a.id < b.id ? -1 : 1));
    for (const r of rest) out.push(r);
    for (const def of this.data.heroes) if (!this.ownedById[def.id]) out.push(this.getHeroInfo(def.id));
    return out;
  }

  /** Thuật toán TỰ XẾP (01 mục 10.3). */
  private computeAutoAssign(): string[] {
    const n = this.squadSlots;
    const data = this.data;
    const all = this.owned.map((o) => ({ id: o.id, cp: this.cpOf(o.id), def: data.heroById[o.id] }));
    all.sort((a, b) => (b.cp - a.cp) || (a.id < b.id ? -1 : 1));
    const picked: typeof all = [];
    const take = (role: string) => {
      for (const h of all) if (h.def.role === role && picked.indexOf(h) < 0) { picked.push(h); return; }
    };
    if (n >= 3) take('healer');
    if (n >= 4) take('tank');
    for (const h of all) {
      if (picked.length >= n) break;
      if (picked.indexOf(h) < 0) picked.push(h);
    }
    picked.sort((a, b) => (b.cp - a.cp) || (a.id < b.id ? -1 : 1));
    // thủ lĩnh: tank (nếu có), không thì cận chiến CP cao nhất, không thì CP cao nhất
    let lead = -1;
    for (let i = 0; i < picked.length && lead < 0; i++) if (picked[i].def.role === 'tank') lead = i;
    for (let i = 0; i < picked.length && lead < 0; i++) if (!picked[i].def.ranged) lead = i;
    if (lead > 0) picked.unshift(picked.splice(lead, 1)[0]);
    return picked.map((h) => h.id);
  }

  getSquadInfo(): SquadInfo {
    const auto = this.computeAutoAssign();
    let weakest = Infinity;
    for (const id of this.squad) weakest = Math.min(weakest, this.cpOf(id));
    let canImprove = false;
    for (const o of this.owned) {
      if (this.squad.indexOf(o.id) >= 0) continue;
      if (this.squad.length < this.squadSlots || this.cpOf(o.id) > weakest) { canImprove = true; break; }
    }
    return {
      slots: this.squadSlots, maxSlots: this.data.tuning.squad.maxSlots, heroIds: this.squad.slice(), cp: this.squadCp,
      autoHeroIds: auto, autoCp: this.computeSquadCp(auto), canImprove,
    };
  }

  private applySquad(ids: string[]): Check {
    if (this.mode === 'dungeon' || this.mode === 'result') return fail('wrong_mode');
    if (ids.length < 1) return fail('squad_min');
    if (ids.length > this.squadSlots) return fail('squad_full');
    for (let i = 0; i < ids.length; i++) {
      if (!this.ownedById[ids[i]]) return fail('not_owned');
      if (ids.indexOf(ids[i]) !== i) return fail('invalid');
    }
    const old = this.squadCp;
    this.squad = ids.slice();
    this.syncSquad();
    this.emit('squad_changed', 0, 0, this.squadCp, old, '');
    this.savePoint();
    return OK;
  }

  setSquad(heroIds: string[]): Check { return this.applySquad(heroIds); }

  squadAdd(heroId: string): Check {
    if (this.squad.indexOf(heroId) >= 0) return fail('invalid');
    if (this.squad.length >= this.squadSlots) return fail('squad_full');
    return this.applySquad(this.squad.concat([heroId]));
  }

  squadRemove(heroId: string): Check {
    const i = this.squad.indexOf(heroId);
    if (i < 0) return fail('invalid');
    if (this.squad.length <= 1) return fail('squad_min');
    const ids = this.squad.slice();
    ids.splice(i, 1);
    return this.applySquad(ids);
  }

  squadSwap(slotA: number, slotB: number): Check {
    const n = this.squad.length;
    if (!(slotA >= 0 && slotA < n && slotB >= 0 && slotB < n)) return fail('invalid');
    const ids = this.squad.slice();
    const tmp = ids[slotA]; ids[slotA] = ids[slotB]; ids[slotB] = tmp;
    return this.applySquad(ids);
  }

  squadReplace(slot: number, heroId: string): Check {
    if (!(slot >= 0 && slot < this.squad.length) || this.squad.indexOf(heroId) >= 0) return fail('invalid');
    const ids = this.squad.slice();
    ids[slot] = heroId;
    return this.applySquad(ids);
  }

  autoAssign(): Check {
    const c = this.applySquad(this.computeAutoAssign());
    if (!c.ok) return c;
    const q = this.currentQuest();
    if (q && q.type === 'auto_assign') this.quest.progress++;
    return OK;
  }

  // =========================================================================================
  // Quán Mỏ Neo
  // =========================================================================================

  private ownedSet(): { [id: string]: boolean } {
    const s: { [id: string]: boolean } = {};
    for (const o of this.owned) s[o.id] = true;
    return s;
  }

  private tavernOdds() {
    const lv = this.village.levelDef('tavern');
    const tier = lv ? lv.effects.oddsTier : 1;
    const odds = this.data.recruit.odds;
    return odds[Math.max(0, Math.min(odds.length - 1, tier - 1))];
  }

  private rerollCards(bonus: boolean): void {
    this.tavern.cards = generateCards(this.data, this.rng, bonus ? this.data.recruit.bonusOdds : this.tavernOdds(), this.ownedSet());
    this.emit('cards_refreshed', 0, 0, bonus ? 1 : 0, 0, '');
  }

  private checkTavern(): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    if (this.village.levelOf('tavern') < 1) return fail('not_built', 0, this.data.buildingById.tavern.name);
    return OK;
  }

  private checkRecruit(times: number): Check {
    const c = this.checkTavern();
    if (!c.ok) return c;
    if (this.data.recruit.multi.indexOf(times) < 0) return fail('invalid');
    const cost = this.data.recruit.costGold * times;
    const gold = this.resources.gold || 0;
    if (gold < cost) return fail('missing_resources', cost - gold, 'gold');
    return OK;
  }

  private checkRefresh(): Check {
    const c = this.checkTavern();
    if (!c.ok) return c;
    if (this.tavern.totalDraws === 0) return fail('first_draw_pending');
    const cost = this.data.recruit.manualRefreshGold;
    const gold = this.resources.gold || 0;
    if (gold < cost) return fail('missing_resources', cost - gold, 'gold');
    return OK;
  }

  recruit(times: number): Check {
    const c = this.checkRecruit(times);
    if (!c.ok) return c;
    const rec = this.data.recruit;
    const tv = this.tavern;
    const now = this.clock.nowMs();
    const draws: RecruitDraw[] = [];
    this.resources.gold -= rec.costGold * times;
    for (let i = 0; i < times; i++) {
      const cards = tv.cards.slice();
      let idx = drawCardIndex(this.rng, cards.length);
      // lượt tuyển đầu tiên trong đời save luôn ra hero được chỉ định (Sẻ)
      if (tv.totalDraws === 0 && cards.indexOf(rec.firstHero) >= 0) idx = cards.indexOf(rec.firstHero);
      const heroId = cards[idx];
      const o = this.ownedById[heroId];
      const before = o ? o.fragments : 0;
      let joined = false;
      if (o) o.fragments += rec.fragmentsPerDuplicate;
      else joined = this.unlockHero(heroId);
      const after = this.ownedById[heroId].fragments;
      this.resources.tickets = (this.resources.tickets || 0) + rec.ticketsPerDraw;
      tv.totalDraws++;
      tv.bonus++;
      let bonusTriggered = false;
      if (tv.bonus >= rec.bonusEvery) {
        tv.bonus = 0;
        tv.nextRefreshAt = now + rec.refreshSec * 1000;
        this.rerollCards(true);
        bonusTriggered = true;
      }
      draws.push({
        cards, pickIndex: idx, heroId, isNew: !o, fragmentsGained: o ? rec.fragmentsPerDuplicate : 0,
        fragmentsBefore: before, fragmentsAfter: after, bonusTriggered, joinedSquad: joined,
      });
    }
    const q = this.currentQuest();
    if (q && q.type === 'recruit') this.quest.progress += times;
    this.lastRecruit = { draws, goldSpent: rec.costGold * times, ticketsGained: rec.ticketsPerDraw * times };
    const e = this.emit2('recruit', 0, 0, times, 0, '', 0);
    e.data = this.lastRecruit;
    this.savePoint();
    return OK;
  }

  refreshCards(): Check {
    const c = this.checkRefresh();
    if (!c.ok) return c;
    this.resources.gold -= this.data.recruit.manualRefreshGold;
    this.tavern.nextRefreshAt = this.clock.nowMs() + this.data.recruit.refreshSec * 1000;
    this.rerollCards(false);
    this.savePoint();
    return OK;
  }

  private exchangeEligible(exchangeId: string): string[] {
    const out: string[] = [];
    if (exchangeId === 'frag5') { for (const o of this.owned) out.push(o.id); return out; }
    for (const rar of RARITIES) {
      if (exchangeId !== 'unlock' + rar) continue;
      for (const h of this.data.heroes) if (h.rarity === rar && !this.ownedById[h.id]) out.push(h.id);
    }
    return out;
  }

  private checkExchange(exchangeId: string, heroId: string | null): Check {
    const c = this.checkTavern();
    if (!c.ok) return c;
    let row = null;
    for (const r of this.data.recruit.ticketExchange) if (r.id === exchangeId) row = r;
    if (!row) return fail('invalid');
    const eligible = this.exchangeEligible(exchangeId);
    if (eligible.length === 0) return fail(exchangeId === 'frag5' ? 'not_owned' : 'already_owned');
    if (heroId !== null && eligible.indexOf(heroId) < 0) {
      return fail(this.ownedById[heroId] ? 'already_owned' : (this.data.heroById[heroId] ? (exchangeId === 'frag5' ? 'not_owned' : 'invalid') : 'invalid'));
    }
    const have = this.resources.tickets || 0;
    if (have < row.tickets) return fail('missing_resources', row.tickets - have, 'tickets');
    return OK;
  }

  exchangeTickets(exchangeId: string, heroId: string): Check {
    const c = this.checkExchange(exchangeId, heroId);
    if (!c.ok) return c;
    let cost = 0;
    for (const r of this.data.recruit.ticketExchange) if (r.id === exchangeId) cost = r.tickets;
    this.resources.tickets -= cost;
    if (exchangeId === 'frag5') this.ownedById[heroId].fragments += this.data.recruit.fragmentsPerDuplicate;
    else this.unlockHero(heroId);
    this.savePoint();
    return OK;
  }

  getTavernInfo(): TavernInfo {
    const rec = this.data.recruit;
    const tv = this.tavern;
    const now = this.clock.nowMs();
    const cards: TavernCard[] = tv.cards.map((id) => {
      const def = this.data.heroById[id];
      const o = this.ownedById[id];
      return {
        heroId: id, name: def.name, rarity: def.rarity, attribute: def.attribute, owned: !!o, level: o ? o.level : 1,
        fragments: o ? o.fragments : 0,
        fragmentsForNextBreakthrough: nextBreakthroughFragments(this.data, def, o ? o.level : 1),
        duplicateFragments: rec.fragmentsPerDuplicate,
      };
    });
    const exchanges: TicketExchangeInfo[] = rec.ticketExchange.map((r) => ({
      id: r.id, desc: r.desc, tickets: r.tickets, eligibleHeroIds: this.exchangeEligible(r.id), check: this.checkExchange(r.id, null),
    }));
    const odds = this.tavernOdds();
    return {
      built: this.village.levelOf('tavern') >= 1, level: this.village.levelOf('tavern'), cards,
      refreshInSec: tv.nextRefreshAt > 0 ? Math.max(0, (tv.nextRefreshAt - now) / 1000) : rec.refreshSec,
      manualRefreshGold: rec.manualRefreshGold, canRefresh: this.checkRefresh(),
      bonus: tv.bonus, bonusEvery: rec.bonusEvery, costGold: rec.costGold, multi: rec.multi.slice(),
      canRecruit: rec.multi.map((m) => this.checkRecruit(m)),
      tickets: this.resources.tickets || 0, exchanges, totalDraws: tv.totalDraws,
      odds: { N: odds.N, R: odds.R, E: odds.E, L: odds.L },
    };
  }

  // =========================================================================================
  // Sân Tập
  // =========================================================================================

  private checkTrainingNode(): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    if (this.village.levelOf('training_yard') < 1) return fail('not_built', 0, this.data.buildingById.training_yard.name);
    const node = this.data.training.nodes[this.nodesUnlocked];
    if (!node) return fail('max_level');
    if (this.player.level < node.reqPlayerLevel) return fail('need_player_level', node.reqPlayerLevel);
    if (node.ore > this.cap('ore')) {
      const need = this.village.storageLevelNeeded({ ore: node.ore });
      return fail('need_storage_level', need > 0 ? need : 0);
    }
    const ore = this.resources.ore || 0;
    if (ore < node.ore) return fail('missing_resources', node.ore - ore, 'ore');
    return OK;
  }

  unlockTrainingNode(): Check {
    const c = this.checkTrainingNode();
    if (!c.ok) return c;
    const node = this.data.training.nodes[this.nodesUnlocked];
    this.resources.ore -= node.ore;
    this.nodesUnlocked++;
    this.syncSquad();
    this.emit('training_unlocked', 0, 0, node.index, 0, node.stat);
    this.savePoint();
    return OK;
  }

  private nextSlotNode() {
    for (const s of this.data.training.slotNodes) if (s.slot === this.squadSlots + 1) return s;
    return null;
  }

  private checkSlot(): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    const s = this.nextSlotNode();
    if (!s) return fail('max_level');
    const yard = this.village.levelOf('training_yard');
    if (yard < 1) return fail('not_built', 0, this.data.buildingById.training_yard.name);
    const lv = this.village.levelDef('training_yard');
    if (yard < s.reqYardLevel || (lv.effects.maxSquadSlotsUnlockable || 0) < s.slot) return fail('need_yard_level', s.reqYardLevel);
    const coral = this.resources.coral || 0;
    if (coral < s.coral) return fail('missing_resources', s.coral - coral, 'coral');
    return OK;
  }

  unlockSquadSlot(): Check {
    const c = this.checkSlot();
    if (!c.ok) return c;
    const s = this.nextSlotNode();
    this.resources.coral -= s.coral;
    this.squadSlots = s.slot;
    this.emit('slot_unlocked', 0, 0, this.squadSlots, 0, '');
    this.savePoint();
    return OK;
  }

  getTrainingInfo(): TrainingInfo {
    const t = this.data.training;
    const next = this.checkTrainingNode();
    const nodes: TrainingNodeInfo[] = t.nodes.map((n) => ({
      index: n.index, stat: n.stat, value: n.value, ore: n.ore, reqPlayerLevel: n.reqPlayerLevel,
      state: n.index < this.nodesUnlocked ? 'unlocked' : (n.index === this.nodesUnlocked && next.ok ? 'available' : 'locked'),
    }));
    const slotCheck = this.checkSlot();
    const slotNodes: SlotNodeInfo[] = t.slotNodes.map((s) => {
      const isNext = s.slot === this.squadSlots + 1;
      return {
        slot: s.slot, coral: s.coral, reqYardLevel: s.reqYardLevel,
        state: s.slot <= this.squadSlots ? 'unlocked' : (isNext && slotCheck.ok ? 'available' : 'locked'),
        check: s.slot <= this.squadSlots ? OK : (isNext ? slotCheck : (this.village.levelOf('training_yard') < s.reqYardLevel
          ? fail('need_yard_level', s.reqYardLevel) : fail('invalid'))),
      };
    });
    return {
      built: this.village.levelOf('training_yard') >= 1, yardLevel: this.village.levelOf('training_yard'),
      nodesUnlocked: this.nodesUnlocked, totalNodes: t.nodes.length, flatHp: this.bonuses.flatHp, flatAtk: this.bonuses.flatAtk,
      nodes, canUnlockNext: next, slotNodes, squadSlots: this.squadSlots,
    };
  }

  // =========================================================================================
  // dungeon
  // =========================================================================================

  private checkEnter(stage: StageDef): Check {
    if (this.mode !== 'world') return fail('wrong_mode');
    const lv = this.village.levelDef('dungeon_gate');
    if (!lv) return fail('not_built', 0, this.data.buildingById.dungeon_gate.name);
    if (stage.stage > lv.effects.maxStage) return fail('need_gate_level', stage.reqGateLevel);
    if (stage.stage > this.bestStageCleared + 1) return fail('need_prev_stage', stage.stage - 1);
    if (this.field.aliveHeroes === 0) return fail('invalid');
    return OK;
  }

  getDungeonInfo(): DungeonInfo {
    const d = this.data.dungeon;
    const stages: StageInfo[] = d.stages.map((s) => {
      const ratio = this.squadCp / s.recommendedCp;
      const label = difficultyLabel(this.data, ratio);
      const repeats = this.repeatClears[String(s.stage)] || 0;
      let bossId = '';
      for (const g of d.floors[s.bossFloor - 1].groups) if (this.data.monsterById[g.monster].kind === 'boss') bossId = g.monster;
      return {
        stage: s.stage, name: s.name, firstFloor: s.firstFloor, bossFloor: s.bossFloor, recommendedCp: s.recommendedCp,
        squadCp: this.squadCp, ratio, label: label.label, color: label.color, hard: label.hard,
        cleared: s.stage <= this.bestStageCleared, repeatClears: repeats, firstClear: s.firstClear,
        repeatClear: s.repeatClear, nextRepeatGuaranteesCoral: (repeats + 1) % s.repeatClear.coralPityEvery === 0,
        bossId, bossName: bossId ? this.data.monsterById[bossId].name : '', canEnter: this.checkEnter(s),
      };
    });
    return {
      built: this.village.levelOf('dungeon_gate') >= 1, gateLevel: this.village.levelOf('dungeon_gate'),
      bestStageCleared: this.bestStageCleared, bestFloorCleared: this.bestFloorCleared,
      defaultStage: Math.min(d.stages.length, this.bestStageCleared + 1), stages,
    };
  }

  enterDungeon(stage: number): Check {
    const def = this.data.dungeon.stages[stage - 1];
    if (!def) return fail('invalid');
    const c = this.checkEnter(def);
    if (!c.ok) return c;
    // save giữ trạng thái trước khi vào hang; thoát app giữa lượt thì lượt bị hủy
    this.field.returnChannelT = 0;
    this.preDungeonSave = this.save();
    this.dungeonRuns++;
    const rng = new Rng(hashSeed(this.seed, this.dungeonRuns));
    this.dungeonScene.start(def, this.squadSpecs(), rng, this.auto);
    this.setMode('dungeon');
    return OK;
  }

  leaveDungeon(): Check {
    if (this.mode !== 'dungeon') return fail('wrong_mode');
    this.finishRun('left');
    return OK;
  }

  setAuto(on: boolean): void {
    this.auto = !!on;
    this.dungeonScene.setAuto(this.auto);
  }

  private finishRun(outcome: 'victory' | 'defeat' | 'left'): void {
    const d = this.dungeonScene;
    const stage = this.data.dungeon.stages[d.stage - 1];
    const loot: ResourceMap = {};
    // thua hoặc rời hang: giữ defeatKeepsLootPct phần vật đã nhặt (M1: 100%)
    const keep = outcome === 'victory' ? 1 : this.data.tuning.dungeon.defeatKeepsLootPct;
    for (const k of Object.keys(d.loot)) {
      const n = Math.floor(d.loot[k] * keep + 1e-9);
      if (n > 0) loot[k] = n;
    }
    const reward: ResourceMap = {};
    let first = false;
    if (outcome === 'victory') {
      if (stage.stage > this.bestStageCleared) {
        first = true;
        this.bestStageCleared = stage.stage;
        for (const k of Object.keys(stage.firstClear)) reward[k] = stage.firstClear[k];
      } else {
        const key = String(stage.stage);
        const n = (this.repeatClears[key] || 0) + 1;
        this.repeatClears[key] = n;
        const rc = stage.repeatClear;
        if (rc.gold > 0) reward.gold = rc.gold;
        if (rc.tickets > 0) reward.tickets = rc.tickets;
        // bảo hiểm: lần lặp thứ 3, 6, 9… chắc chắn có San Hô Đỏ; các lần khác theo tỉ lệ
        if (n % rc.coralPityEvery === 0 || d.rng.next() < rc.coralChance) reward.coral = 1;
      }
    }
    const total: ResourceMap = {};
    for (const k of Object.keys(loot)) total[k] = (total[k] || 0) + loot[k];
    for (const k of Object.keys(reward)) total[k] = (total[k] || 0) + reward[k];
    for (const k of Object.keys(total)) this.gain(k, total[k]);
    this.result = {
      outcome, stage: stage.stage, floorReached: d.floor, firstClear: first, loot, stageReward: reward, total,
      kills: d.kills, bestStreak: d.bestStreak, durationSec: d.durationSec,
    };
    d.stop();
    this.preDungeonSave = null;
    // về làng, đội đứng cạnh Cổng Xoáy, máu đầy
    const gate = this.village.byType('dungeon_gate');
    const gx = gate ? gate.x + gate.w / 2 : this.data.tuning.world.villageCenter[0];
    const gy = gate ? gate.y - 1 : this.data.tuning.world.villageCenter[1];
    this.field.restoreSquad();
    this.field.placeSquad(gx, gy);
    this.field.sinceCombat = 99;
    this.updateLeaderZone();
    this.mode = 'dungeon'; // để setMode phát sự kiện đổi chế độ
    const res = this.result;
    this.setMode('result');
    this.result = res;
    const e = this.emit2('result', 0, 0, 0, 0, outcome, 0);
    e.data = res;
    this.emit('teleport', gx, gy, 0, 0, 'gate');
    this.emit('save_point', 0, 0, 0, 0, '');
    this.autosaveT = 0;
  }

  closeResult(): Check {
    if (this.mode !== 'result') return fail('wrong_mode');
    this.setMode('world');
    return OK;
  }

  // =========================================================================================
  // nhiệm vụ
  // =========================================================================================

  private currentQuest(): QuestDef {
    return this.data.quests.quests[this.quest.index] || null;
  }

  private maxHeroLevel(): number {
    let m = 0;
    for (const o of this.owned) if (o.level > m) m = o.level;
    return m;
  }

  /** Cập nhật thẻ nhiệm vụ. Với loại "so trạng thái hiện tại" thì tính lại từ trạng thái. */
  private refreshQuest(announce: boolean): void {
    const qs = this.quest;
    const q = this.currentQuest();
    if (!q) {
      qs.finished = true; qs.id = ''; qs.type = ''; qs.text = this.data.quests.endText; qs.progress = 0; qs.target = 0;
      qs.complete = false; qs.hint = ''; qs.reward = {};
      qs.index = this.data.quests.quests.length;
      return;
    }
    if (qs.id !== q.id) {
      qs.id = q.id; qs.type = q.type; qs.text = q.text; qs.hint = q.hint; qs.reward = q.reward; qs.finished = false;
      this.questWasComplete = false;
    }
    const p = q.params;
    let target = 1;
    let progress = qs.progress;
    switch (q.type) {
      case 'gather': case 'kill': case 'recruit': case 'collect': target = p.count; break;
      case 'auto_assign': target = 1; break;
      case 'hero_level': progress = this.maxHeroLevel() >= p.level ? 1 : 0; break;
      case 'build': progress = this.village.levelOf(p.building) >= 1 ? 1 : 0; break;
      case 'upgrade': progress = this.village.levelOf(p.building) >= p.level ? 1 : 0; break;
      case 'training': target = p.count; progress = this.nodesUnlocked; break;
      case 'clear_floor': progress = this.bestFloorCleared >= p.floor ? 1 : 0; break;
      case 'slots': progress = this.squadSlots >= p.count ? 1 : 0; break;
    }
    if (progress > target) progress = target;
    qs.progress = progress; qs.target = target;
    qs.complete = progress >= target;
    if (qs.complete && !this.questWasComplete) {
      this.questWasComplete = true;
      if (announce) this.emit('quest_complete', 0, 0, qs.index, 0, q.id);
    }
  }

  claimQuest(): Check {
    if (this.mode !== 'world' && this.mode !== 'build') return fail('wrong_mode');
    const q = this.currentQuest();
    if (!q) return fail('no_quest');
    this.refreshQuest(false);
    if (!this.quest.complete) return fail('quest_not_done');
    // thưởng nhiệm vụ không bị trần kho cắt (README: Quyết định khi cài đặt)
    let text = '';
    for (const k of Object.keys(q.reward)) {
      this.resources[k] = (this.resources[k] || 0) + q.reward[k];
      text += (text ? ', ' : '') + resourceTitle(k) + ' +' + q.reward[k];
    }
    const e = this.emit2('quest_claimed', 0, 0, this.quest.index, 0, q.id, 0);
    e.data = q.reward;
    this.toast('quest_reward', text);
    this.quest.index++;
    this.quest.progress = 0;
    this.quest.id = '';
    this.refreshQuest(true);
    this.savePoint();
    return OK;
  }

  getQuestHint(): QuestHint {
    const q = this.currentQuest();
    const none: QuestHint = { kind: 'none', x: 0, y: 0, ui: '', raw: q ? q.hint : '' };
    if (!q) return none;
    const raw = q.hint;
    const sep = raw.indexOf(':');
    const kind = sep >= 0 ? raw.slice(0, sep) : raw;
    const arg = sep >= 0 ? raw.slice(sep + 1) : '';
    const l = this.field.leader;
    const lx = l ? l.x : this.data.field.startPos[0];
    const ly = l ? l.y : this.data.field.startPos[1];
    const ui = (name: string): QuestHint => ({ kind: 'ui', x: 0, y: 0, ui: name, raw });
    if (kind === 'ui') return ui(arg);
    if (kind === 'building') {
      const b = this.village.byType(arg);
      if (!b) return ui('build_button');
      return { kind: 'world', x: b.x + b.w / 2, y: b.y + b.h / 2, ui: '', raw };
    }
    let bx = 0;
    let by = 0;
    let best = Infinity;
    const consider = (x: number, y: number) => {
      const d = (x - lx) * (x - lx) + (y - ly) * (y - ly);
      if (d < best) { best = d; bx = x; by = y; }
    };
    if (kind === 'node') {
      const want = arg === 'tree' ? 'tree' : 'rock';
      for (const n of this.field.nodes) if (n.kind === want && !n.depleted) consider(n.x, n.y);
      if (best === Infinity) for (const n of this.field.nodes) if (n.kind === want) consider(n.x, n.y);
    } else if (kind === 'camp') {
      for (const c of this.field.camps) if (c.monsterId === arg && c.alive > 0) consider(c.x, c.y);
      if (best === Infinity) for (const c of this.field.camps) if (c.monsterId === arg) consider(c.x, c.y);
    } else if (kind === 'zone') {
      for (const c of this.field.camps) if (c.zone === arg && c.alive > 0) consider(c.x, c.y);
      if (best === Infinity) for (const c of this.field.camps) if (c.zone === arg) consider(c.x, c.y);
    }
    if (best === Infinity) return none;
    return { kind: 'world', x: bx, y: by, ui: '', raw };
  }

  // =========================================================================================
  // cài đặt, lưu, tọa độ
  // =========================================================================================

  setSetting(key: 'music' | 'sfx', on: boolean): void {
    if (key === 'music') this.settings.music = !!on; else if (key === 'sfx') this.settings.sfx = !!on;
    this.savePoint();
  }

  private buildSave(): SaveData {
    const l = this.field.leader || this.field.heroes[0];
    const start = this.data.field.startPos;
    const res: ResourceMap = {};
    for (const k of Object.keys(this.resources)) res[k] = this.resources[k];
    const repeats: { [s: string]: number } = {};
    for (const k of Object.keys(this.repeatClears)) repeats[k] = this.repeatClears[k];
    return {
      saveVersion: SAVE_VERSION,
      createdAt: this.createdAt,
      lastSaveAt: this.lastClockMs,
      rng: { seed: this.seed, state: this.rng.state, dungeonRuns: this.dungeonRuns },
      player: { level: this.player.level, exp: this.player.exp },
      resources: res,
      buildings: this.village.toSave(),
      nextBuildingUid: this.village.nextUid,
      heroes: this.owned.map((o) => ({ id: o.id, level: o.level, fragments: o.fragments })),
      squad: this.squad.slice(),
      squadSlots: this.squadSlots,
      training: { nodesUnlocked: this.nodesUnlocked },
      tavern: { cards: this.tavern.cards.slice(), nextRefreshAt: this.tavern.nextRefreshAt, bonus: this.tavern.bonus, totalDraws: this.tavern.totalDraws },
      dungeon: { bestStageCleared: this.bestStageCleared, bestFloorCleared: this.bestFloorCleared, repeatClears: repeats, auto: this.auto },
      quest: { index: this.quest.index, progress: this.quest.progress },
      world: { leaderPos: l ? [l.x, l.y] : [start[0], start[1]], returnPoint: this.field.returnPoint ? this.field.returnPoint.slice(0, 2) : null },
      settings: { music: this.settings.music, sfx: this.settings.sfx },
      stats: { playSec: this.playSec, kills: this.kills },
      inventory: this.inventory,
    };
  }

  save(): SaveData {
    if (this.mode === 'dungeon' && this.preDungeonSave) return this.preDungeonSave;
    this.advanceClock(this.clock.nowMs(), null); // sản xuất và timer khớp đúng mốc lastSaveAt
    return this.buildSave();
  }

  zoneAt(x: number, y: number): ZoneId {
    const w = this.data.tuning.world;
    const d = Math.max(Math.abs(x - w.villageCenter[0]), Math.abs(y - w.villageCenter[1]));
    const zones = w.zones;
    for (let i = 0; i < zones.length; i++) if (d <= zones[i].dMax) return zones[i].id;
    return zones[zones.length - 1].id;
  }

  cellAt(x: number, y: number): { cx: number; cy: number } {
    return { cx: Math.floor(x), cy: Math.floor(y) };
  }

  inVillageGrid(cx: number, cy: number): boolean {
    const g = this.data.tuning.world.villageGrid;
    return cx >= g.x0 && cy >= g.y0 && cx < g.x0 + g.w && cy < g.y0 + g.h;
  }
}
