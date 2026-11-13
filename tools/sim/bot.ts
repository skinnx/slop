// Bot chơi thử không hiển thị. Chỉ dùng đúng những gì view có: đọc trạng thái công khai của Game và gọi
// các lệnh của người chơi (joystick, nút, panel). Không đụng vào trạng thái bên trong lõi.
//
// Chính sách theo docs/design/02-balance.md mục 5.2: nhận thưởng nhiệm vụ, đứng yên cho đội đánh khi có quái
// hoặc nút trong tầm, né vùng đỏ trong dungeon, xây theo thứ tự, dành tài nguyên cho Cổng Xoáy / Sân Tập,
// tiêu vàng vào tuyển, lên cấp hero thấp nhất trước, TỰ XẾP, vào chặng kế khi đủ CP, về làng thu sản lượng.
//
// Giới hạn bot tự đặt cho giống người chơi thật:
//   - chỉ dùng panel của công trình (tuyển, Sân Tập, Cổng Xoáy, nâng cấp, thu) khi thủ lĩnh ở trong làng;
//   - panel mở tức thì (0 giây), đúng như 02-balance.md mục 5.1 cho phép.
import type {
  Game, GameEvent, HeroInfo, MonsterUnitView, HeroUnitView, ResourceNodeView, CampView, TelegraphView, ZoneId,
} from '../../game/assets/scripts/core/index';

const BUILD_ORDER = ['lumber_camp', 'tavern', 'ore_mine', 'training_yard', 'market', 'dungeon_gate'];
const ZONES: ZoneId[] = ['z1', 'z2', 'z3'];

type TargetKind = 'camp' | 'tree' | 'rock';
interface Target { kind: TargetKind; index: number; x: number; y: number; }

export interface BotOptions {
  /** Vào chặng kế khi CP đội ≥ tỉ lệ này × CP đề nghị (mặc định 1.0, theo chính sách gợi ý). */
  enterRatio?: number;
  /** In nhật ký quyết định. */
  log?: (msg: string) => void;
}

export interface BotStats {
  dungeonRuns: number;
  dungeonWins: number;
  dungeonLosses: number;
  fieldWipes: number;
  villageTrips: number;
  /** Lượt thua theo chặng, để chẩn đoán cân bằng. */
  lossesByStage: { [stage: number]: number };
  lossFloors: number[];
}

export class Bot {
  readonly stats: BotStats = { dungeonRuns: 0, dungeonWins: 0, dungeonLosses: 0, fieldWipes: 0, villageTrips: 0, lossesByStage: {}, lossFloors: [] };

  private game: Game;
  private opts: BotOptions;
  private stepIndex = 0;
  private target: Target | null = null;
  private targetAge = 0;
  private timeBy: { [k: string]: number } = { camp: 0, tree: 0, rock: 0 };
  private wantVillage = false;
  private wantField = false;
  private lastVillageSec = 0;
  private lastRepeatSec = 0;
  /** CP đội ở lần thua gần nhất của từng chặng: chờ mạnh hơn 5% mới thử lại. */
  private lastLossCp: { [stage: number]: number } = {};
  private holding = false;
  private holdIdle = 0;
  private probeAfter = 0;
  private wipeCp: { [zone: string]: number } = {};
  private lastZone: ZoneId = 'z1';
  private dodge: { x: number; y: number } | null = null;
  private idleInDungeon = 0;
  private jx = 0;
  private jy = 0;
  private zoneCamps: { [zone: string]: number[] } = { z1: [], z2: [], z3: [] };
  private zoneTrees: { [zone: string]: number[] } = { z1: [], z2: [], z3: [] };
  private zoneRocks: { [zone: string]: number[] } = { z1: [], z2: [], z3: [] };

  constructor(game: Game, opts: BotOptions = {}) {
    this.game = game;
    this.opts = opts;
    game.field.camps.forEach((c) => this.zoneCamps[c.zone].push(c.index));
    game.field.nodes.forEach((n) => (n.kind === 'tree' ? this.zoneTrees : this.zoneRocks)[n.zone].push(n.index));
  }

  private log(msg: string): void {
    if (this.opts.log) this.opts.log('[' + fmtTime(this.game.playSec) + '] ' + msg);
  }

  /** Gọi sau mỗi game.step() với các sự kiện của bước đó (trước clearEvents). */
  onEvents(events: ReadonlyArray<GameEvent>, count: number): void {
    for (let i = 0; i < count; i++) {
      const e = events[i];
      if (e.type === 'result') {
        this.stats.dungeonRuns++;
        const r = e.data;
        if (r.outcome === 'victory') this.stats.dungeonWins++;
        else {
          this.stats.dungeonLosses++;
          this.stats.lossesByStage[r.stage] = (this.stats.lossesByStage[r.stage] || 0) + 1;
          this.stats.lossFloors.push(r.floorReached);
          this.lastLossCp[r.stage] = this.game.squadCp;
        }
        this.log('dungeon chặng ' + r.stage + ': ' + r.outcome + ' ở tầng ' + r.floorReached + ', CP ' + this.game.squadCp
          + ', ' + Math.round(r.durationSec) + ' s');
      } else if (e.type === 'wipe') {
        // cả đội gục ngoài đồng: nhớ CP lúc đó, chờ mạnh hơn 10% mới quay lại vùng ấy
        this.stats.fieldWipes++;
        this.wipeCp[this.lastZone] = this.game.squadCp;
        this.target = null;
      }
    }
  }

  /** Gọi trước mỗi game.step(): quyết định joystick và bấm nút. */
  act(): void {
    const g = this.game;
    this.stepIndex++;
    if (g.mode === 'result') { g.closeResult(); this.afterDungeon(); return; }
    if (g.mode === 'dungeon') { if (this.stepIndex % 2 === 0) this.dungeonTick(); return; }
    if (g.mode === 'build') { g.exitBuildMode(); return; }
    if (this.stepIndex % 30 === 0) this.manage();
    if (this.stepIndex % 3 === 0) this.fieldTick();
  }

  private joy(x: number, y: number): void {
    if (x === this.jx && y === this.jy) return;
    this.jx = x; this.jy = y;
    this.game.setJoystick(x, y);
  }

  private joyToward(fx: number, fy: number, tx: number, ty: number): void {
    const dx = tx - fx;
    const dy = ty - fy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1e-6) { this.joy(0, 0); return; }
    this.joy(dx / d, dy / d);
  }

  // =========================================================================================
  // quản lý (mỗi giây): nhiệm vụ, hero, chuyến về làng
  // =========================================================================================

  private manage(): void {
    const g = this.game;
    if (g.quest.complete) g.claimQuest();
    this.levelHeroes();
    if (g.quest.type === 'auto_assign' && !g.quest.complete) g.autoAssign();

    if (g.leaderZone === 'village') {
      const trip = this.wantVillage;
      this.villageActions();
      this.wantVillage = false;
      if (g.mode !== 'world') return; // đã vào dungeon
      this.lastVillageSec = g.playSec;
      if (trip) this.wantField = true; // về làng bằng nút thì xong việc lại bấm "Ra đồng"
    } else if (!this.wantVillage && this.stepIndex % 150 === 0 && this.shouldVisitVillage()) {
      this.wantVillage = true;
      this.stats.villageTrips++;
    }
  }

  /** Lên cấp hero trong đội, cấp thấp nhất trước; TỰ XẾP sau mỗi lần lên cấp. */
  private levelHeroes(): void {
    const g = this.game;
    if ((g.resources.meat || 0) < 15) return;
    let changed = false;
    for (let guard = 0; guard < 60; guard++) {
      let best: HeroInfo | null = null;
      for (const id of g.squad) {
        const h = g.getHeroInfo(id)!;
        if (!h.canLevelUp.ok) continue;
        if (!best || h.level < best.level) best = h;
      }
      if (!best) break;
      if (!g.levelUpHero(best.id).ok) break;
      changed = true;
    }
    if (changed) g.autoAssign();
  }

  private gateMaxStage(): number {
    const b = this.game.findBuilding('dungeon_gate');
    if (!b || b.level < 1) return 0;
    return this.game.data.buildingById.dungeon_gate.levels[b.level - 1].effects.maxStage || 0;
  }

  /** Chặng nên vào ngay bây giờ (0 = không). */
  private stageToEnter(): number {
    const g = this.game;
    const info = g.getDungeonInfo();
    if (!info.built) return 0;
    const ratio = this.opts.enterRatio === undefined ? 1.0 : this.opts.enterRatio;
    const next = info.bestStageCleared + 1;
    const st = info.stages[next - 1];
    // nhiệm vụ "Vượt tầng 1": người mới vào thử ngay khi có cổng
    const questFloor1 = g.quest.type === 'clear_floor' && info.bestFloorCleared === 0;
    if (st && st.canEnter.reason !== 'need_gate_level' && st.canEnter.reason !== 'need_prev_stage' && st.canEnter.reason !== 'not_built') {
      const lossCp = this.lastLossCp[next] || 0;
      const strongEnough = g.squadCp >= st.recommendedCp * ratio || (questFloor1 && lossCp === 0);
      if (strongEnough && g.squadCp >= lossCp * 1.05) return next;
    }
    // mỗi 30 phút đánh lại chặng cao nhất đã vượt một lần (San Hô Đỏ, vàng)
    if (info.bestStageCleared >= 1 && g.playSec - this.lastRepeatSec >= 1800) return info.bestStageCleared;
    return 0;
  }

  private shouldVisitVillage(): boolean {
    const g = this.game;
    if (g.playSec - this.lastVillageSec >= 1200) return true; // thu sản lượng ít nhất mỗi 20 phút
    const menu = g.getBuildMenu();
    for (const m of menu) if (m.state === 'available' && m.check.ok) return true;
    if (this.pickUpgrade() !== 0) return true;
    const gold = g.resources.gold || 0;
    const tavern = g.findBuilding('tavern');
    if (tavern && tavern.level >= 1 && gold >= (g.quest.type === 'recruit' ? 100 : 300)) return true;
    const tr = g.getTrainingInfo();
    if (tr.built) {
      const next = tr.nodes[tr.nodesUnlocked];
      if (next && g.player.level >= next.reqPlayerLevel && (g.resources.ore || 0) - this.oreReserve() >= next.ore) return true;
      for (const s of tr.slotNodes) if (s.slot === tr.squadSlots + 1 && (g.resources.coral || 0) >= s.coral && tr.yardLevel >= s.reqYardLevel) return true;
    }
    if (g.quest.type === 'collect' && !g.quest.complete) {
      const b = g.findBuilding(g.data.quests.quests[g.quest.index].params.building);
      if (b && b.buffer >= 1) return true;
    }
    if (this.stageToEnter() !== 0) return true;
    return false;
  }

  // =========================================================================================
  // làng: xây, nâng, tuyển, Sân Tập, vào hang
  // =========================================================================================

  private villageActions(): void {
    const g = this.game;
    // thu sản lượng
    for (const b of g.buildings) if (b.buffer >= 1) g.collectBuilding(b.uid);

    // xây công trình mới đã mở, theo thứ tự
    for (const type of BUILD_ORDER) {
      if (g.findBuilding(type)) continue;
      const entry = g.getBuildMenu().find((m) => m.type === type);
      if (!entry || entry.state !== 'available' || !entry.check.ok) continue;
      const c = g.data.tuning.world.villageCenter;
      const cell = g.findFreeCell(type, c[0] + 3, c[1] + 3);
      if (!cell) continue;
      if (!g.enterBuildMode().ok) break;
      const r = g.placeBuilding(type, cell.x, cell.y);
      g.exitBuildMode();
      if (r.ok) this.log('xây ' + type + ' tại (' + cell.x + ', ' + cell.y + ')');
    }

    // mở ô đội khi đủ San Hô Đỏ
    while (g.unlockSquadSlot().ok) { this.log('mở ô đội ' + g.squadSlots); g.autoAssign(); }

    // nâng cấp
    for (let guard = 0; guard < 4; guard++) {
      const uid = this.pickUpgrade();
      if (uid === 0) break;
      const b = g.buildings.find((x) => x.uid === uid)!;
      if (!g.upgradeBuilding(uid).ok) break;
      this.log('nâng ' + b.type + ' lên cấp ' + (b.level + 1));
    }

    // Sân Tập: mở nấc khi còn quặng sau khi chừa phần cho công trình định nâng
    for (let guard = 0; guard < 90; guard++) {
      const tr = g.getTrainingInfo();
      const next = tr.nodes[tr.nodesUnlocked];
      if (!tr.built || !next || !tr.canUnlockNext.ok) break;
      if ((g.resources.ore || 0) - this.oreReserve() < next.ore) break;
      if (!g.unlockTrainingNode().ok) break;
    }

    // tuyển: tiêu hết vàng
    const tv = g.getTavernInfo();
    if (tv.built) {
      let pulled = 0;
      while ((g.resources.gold || 0) >= tv.costGold && g.recruit(1).ok) pulled++;
      if (pulled > 0) g.autoAssign();
      this.spendTickets();
    }
    this.levelHeroes();

    const stage = this.stageToEnter();
    if (stage !== 0) {
      const best = g.getDungeonInfo().bestStageCleared;
      if (stage <= best) this.lastRepeatSec = g.playSec;
      g.autoAssign();
      const r = g.enterDungeon(stage);
      if (r.ok) {
        this.log('vào chặng ' + stage + ' với CP ' + g.squadCp + ' (' + g.squad.length + ' hero)');
        this.dodge = null; this.idleInDungeon = 0; this.jx = 0; this.jy = 0;
        return;
      }
    }
  }

  /** Dùng Vé: mở hero Sử Thi/Huyền Thoại chưa có; đổi mảnh cho hero trong đội đang kẹt đột phá. */
  private spendTickets(): void {
    const g = this.game;
    for (let guard = 0; guard < 20; guard++) {
      const tv = g.getTavernInfo();
      let done = false;
      for (const id of ['unlockL', 'unlockE']) {
        const ex = tv.exchanges.find((e) => e.id === id);
        if (ex && ex.check.ok && ex.eligibleHeroIds.length > 0 && g.exchangeTickets(id, ex.eligibleHeroIds[0]).ok) {
          this.log('đổi Vé mở ' + ex.eligibleHeroIds[0]);
          g.autoAssign();
          done = true;
          break;
        }
      }
      if (done) continue;
      const frag = tv.exchanges.find((e) => e.id === 'frag5');
      if (!frag || tv.tickets < frag.tickets) break;
      // giữ Vé cho hero Sử Thi/Huyền Thoại nếu sắp đủ; còn lại đổi mảnh cho hero trong đội đang cần
      let needy: HeroInfo | null = null;
      for (const id of g.squad) {
        const h = g.getHeroInfo(id)!;
        if (h.levelUpFragments > 0 && h.fragments < h.levelUpFragments && (!needy || h.cp > needy.cp)) needy = h;
      }
      if (!needy || !g.exchangeTickets('frag5', needy.id).ok) break;
    }
  }

  /** Số quặng phải chừa lại: 1/3 giá quặng của công trình đang định nâng. */
  private oreReserve(): number {
    const goal = this.goalUpgrade();
    if (!goal) return 0;
    return Math.ceil((goal.cost.ore || 0) / 3);
  }

  /** Công trình ưu tiên phải nâng (nhiệm vụ, Cổng Xoáy cho chặng kế, Sân Tập cho ô đội kế, Nhà Kho nếu giá vượt trần). */
  private goalUpgrade(): { uid: number; cost: { [k: string]: number }; ok: boolean } | null {
    const g = this.game;
    const wants: string[] = [];
    const q = g.quest;
    if (q.type === 'upgrade' && !q.complete) wants.push(g.data.quests.quests[q.index].params.building);
    const info = g.getDungeonInfo();
    const next = info.stages[info.bestStageCleared];
    if (info.built && next && this.gateMaxStage() < next.stage && g.squadCp >= next.recommendedCp * 0.8) wants.push('dungeon_gate');
    const tr = g.getTrainingInfo();
    for (const s of tr.slotNodes) {
      if (s.slot === tr.squadSlots + 1 && tr.built && tr.yardLevel < s.reqYardLevel && (g.resources.coral || 0) >= s.coral) wants.push('training_yard');
    }
    // nhiều mục tiêu cùng lúc: làm cái rẻ hơn trước (nhiệm vụ luôn đứng đầu)
    let best: { uid: number; cost: { [k: string]: number }; ok: boolean } | null = null;
    let bestTotal = Infinity;
    for (let i = 0; i < wants.length; i++) {
      const b = g.findBuilding(wants[i]);
      if (!b || b.level < 1) continue;
      let p = g.getBuildingPanel(b.uid)!;
      if (!p.upgradeCost || p.job) continue;
      let uid = b.uid;
      if (p.canUpgrade.reason === 'need_storage_level') {
        // giá lớn hơn trần kho: nâng Nhà Kho trước
        const st = g.findBuilding('storage')!;
        p = g.getBuildingPanel(st.uid)!;
        if (!p.upgradeCost || p.job) continue;
        uid = st.uid;
      }
      if (p.canUpgrade.reason === 'need_player_level') continue;
      const c = p.upgradeCost.cost;
      const total = (c.wood || 0) + (c.ore || 0);
      const cand = { uid, cost: c, ok: p.canUpgrade.ok };
      if (i === 0 && q.type === 'upgrade' && !q.complete) return cand;
      if (total < bestTotal) { bestTotal = total; best = cand; }
    }
    return best;
  }

  /** uid công trình nên nâng ngay (0 = không có). */
  private pickUpgrade(): number {
    const g = this.game;
    if (g.buildersFree <= 0) return 0;
    const goal = this.goalUpgrade();
    if (goal && goal.ok) return goal.uid;
    // nâng công trình rẻ nhất còn nâng được, miễn là không ăn vào phần đang dành cho mục tiêu
    let best = 0;
    let bestCost = Infinity;
    for (const b of g.buildings) {
      if (b.level < 1 || b.job) continue;
      const p = g.getBuildingPanel(b.uid)!;
      if (!p.canUpgrade.ok || !p.upgradeCost) continue;
      const c = p.upgradeCost.cost;
      const total = (c.wood || 0) + (c.ore || 0);
      if (goal) {
        const woodLeft = (g.resources.wood || 0) - (c.wood || 0);
        const oreLeft = (g.resources.ore || 0) - (c.ore || 0);
        if (woodLeft < (goal.cost.wood || 0) || oreLeft < (goal.cost.ore || 0)) continue;
      }
      if (total < bestCost) { bestCost = total; best = b.uid; }
    }
    return best;
  }

  private afterDungeon(): void {
    this.target = null;
    this.holding = false;
    this.wantField = true;
    this.jx = 0; this.jy = 0;
    this.lastVillageSec = this.game.playSec;
  }

  // =========================================================================================
  // ngoài đồng
  // =========================================================================================

  private farmZone(): ZoneId {
    const g = this.game;
    const rec = g.data.tuning.world.zoneRecommendedCp;
    let zone: ZoneId = 'z1';
    for (const z of ZONES) if (g.squadCp >= rec[z] && g.squadCp >= (this.wipeCp[z] || 0) * 1.1) zone = z;
    return zone;
  }

  private capFull(res: string): boolean {
    const g = this.game;
    return (g.resources[res] || 0) >= g.storageCap(res) * 0.97;
  }

  private fieldTick(): void {
    const g = this.game;
    const f = g.field;
    const leader = f.leader;
    if (!leader || f.wipeT > 0) { this.joy(0, 0); return; }
    if (f.returnChannelT > 0) { this.joy(0, 0); return; }
    if (g.leaderZone !== 'village') this.lastZone = g.leaderZone;

    const sq = g.data.tuning.squad;
    // (2) có quái hoặc nút trong tầm: đứng yên cho đội đánh. Khi đã dừng thì đứng tới lúc không hero nào còn
    // việc để làm (tránh vừa dừng vừa đi khi đội tự bước về phía mục tiêu).
    if (this.holding) {
      if (this.squadBusy()) this.holdIdle = 0; else this.holdIdle += 0.1;
      if (this.holdIdle < 0.45) { this.joy(0, 0); return; }
      this.holding = false;
      this.probeAfter = g.playSec + 1.0; // đi ít nhất 1 s rồi mới dừng lại vì nút tài nguyên
    }
    if (this.monsterNear(leader, sq.aggroRadius - 0.4)) { this.hold(); return; }

    if (this.wantVillage) {
      if (g.leaderZone === 'village') { this.joy(0, 0); return; } // đã về tới: chờ lượt quản lý làm việc trong làng
      if (g.returnToVillage().ok) { this.joy(0, 0); return; }
    }
    if (this.wantField && g.leaderZone === 'village') {
      this.wantField = false;
      const rp = f.returnPoint;
      // quay lại điểm cũ nếu nó vẫn nằm trong vùng định farm
      if (rp && this.zoneOk(g.zoneAt(rp[0], rp[1])) && g.goToField().ok) { this.target = null; this.joy(0, 0); return; }
    }

    // nút tài nguyên trong tầm thu thập: đứng yên (trừ khi kho đã đầy loại đó, hoặc đang đi tìm quái cho nhiệm vụ)
    const questKill = g.quest.type === 'kill' && !g.quest.complete;
    if (!questKill && g.playSec >= this.probeAfter && this.nodeNear(leader, sq.gatherRadius - 0.3)) { this.hold(); return; }

    // đi tới mục tiêu kế tiếp
    this.targetAge += 0.1;
    if (this.target && !this.targetValid(this.target)) this.target = null;
    if (!this.target || this.targetAge > 60) { this.target = this.pickTarget(leader); this.targetAge = 0; }
    const t = this.target;
    if (!t) { this.joy(0, 0); return; }
    this.timeBy[t.kind] += 0.1;
    // quên dần lịch sử (nửa đời khoảng 10 phút) để tỉ lệ thời gian phản ứng khi nhu cầu đổi
    this.timeBy.camp *= 0.99988; this.timeBy.tree *= 0.99988; this.timeBy.rock *= 0.99988;
    const dx = t.x - leader.x;
    const dy = t.y - leader.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const arrive = t.kind === 'camp' ? 1.0 : 1.2;
    if (d <= arrive) { this.target = null; this.joy(0, 0); return; } // tới nơi mà không có gì: chọn mục tiêu khác
    this.joy(dx / d, dy / d);
  }

  private hold(): void {
    this.holding = true;
    this.holdIdle = 0;
    this.joy(0, 0);
  }

  /** Có hero đang đánh quái, hoặc đang thu thập loại tài nguyên mà kho còn chỗ. */
  private squadBusy(): boolean {
    const f = this.game.field;
    for (const h of f.heroes) {
      if (!h.alive || h.targetId === 0) continue;
      if (h.targetId > 0) return true;
      const n = f.nodes[-h.targetId - 1];
      if (n && !this.capFull(n.resource)) return true;
    }
    return false;
  }

  private zoneOk(zone: ZoneId): boolean {
    if (zone === 'village') return false;
    const q = this.game.quest;
    if (!q.complete && (q.type === 'kill' || q.type === 'gather')) return true; // mục tiêu nhiệm vụ tự chọn lại
    return zone === this.farmZone();
  }

  private monsterNear(leader: HeroUnitView, radius: number): boolean {
    const list = this.game.field.monsters;
    const r2 = radius * radius;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive || m.state === 'return') continue;
      const dx = m.x - leader.x;
      const dy = m.y - leader.y;
      if (dx * dx + dy * dy <= r2) return true;
    }
    return false;
  }

  private nodeNear(leader: HeroUnitView, radius: number): boolean {
    const nodes = this.game.field.nodes;
    const r2 = radius * radius;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.depleted) continue;
      const dx = n.x - leader.x;
      const dy = n.y - leader.y;
      if (dx * dx + dy * dy <= r2 && !this.capFull(n.resource)) return true;
    }
    return false;
  }

  private targetValid(t: Target): boolean {
    const f = this.game.field;
    if (t.kind === 'camp') return f.camps[t.index].alive > 0;
    const n = f.nodes[t.index];
    return !n.depleted && !this.capFull(n.resource);
  }

  private nearestCamp(leader: HeroUnitView, pred: (c: CampView) => boolean): Target | null {
    let best: CampView | null = null;
    let bestD = Infinity;
    for (const c of this.game.field.camps) {
      if (c.alive <= 0 || !pred(c)) continue;
      const d = (c.x - leader.x) * (c.x - leader.x) + (c.y - leader.y) * (c.y - leader.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best ? { kind: 'camp', index: best.index, x: best.x, y: best.y } : null;
  }

  private nearestNode(leader: HeroUnitView, kind: 'tree' | 'rock', zone: ZoneId | null): Target | null {
    let best: ResourceNodeView | null = null;
    let bestD = Infinity;
    for (const n of this.game.field.nodes) {
      if (n.depleted || n.kind !== kind || (zone && n.zone !== zone)) continue;
      const d = (n.x - leader.x) * (n.x - leader.x) + (n.y - leader.y) * (n.y - leader.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best ? { kind, index: best.index, x: best.x, y: best.y } : null;
  }

  private pickTarget(leader: HeroUnitView): Target | null {
    const g = this.game;
    const q = g.quest;
    // nhiệm vụ hiện tại yêu cầu thứ gì ngoài đồng thì làm thứ đó trước
    if (!q.complete && !q.finished) {
      const p = g.data.quests.quests[q.index].params;
      if (q.type === 'gather') {
        const t = this.nearestNode(leader, p.resource === 'wood' ? 'tree' : 'rock', null);
        if (t) return t;
      } else if (q.type === 'kill') {
        const t = p.monster !== undefined ? this.nearestCamp(leader, (c) => c.monsterId === p.monster)
          : this.nearestCamp(leader, (c) => c.zone === p.zone);
        if (t) return t;
        // ổ đang trống: đứng chờ gần ổ gần nhất của loại đó
        let wait: CampView | null = null;
        let bestD = Infinity;
        for (const c of g.field.camps) {
          if (p.monster !== undefined ? c.monsterId !== p.monster : c.zone !== p.zone) continue;
          const d = (c.x - leader.x) * (c.x - leader.x) + (c.y - leader.y) * (c.y - leader.y);
          if (d < bestD) { bestD = d; wait = c; }
        }
        if (wait && bestD > 9) return { kind: 'camp', index: wait.index, x: wait.x, y: wait.y };
      }
    }
    // farm vùng cao nhất có CP đề nghị ≤ CP đội: chia thời gian 40% quái, 35% cây, 25% đá
    const zone = this.farmZone();
    const share: { [k: string]: number } = { camp: 0.40, tree: 0.35, rock: 0.25 };
    // đang thiếu gỗ hoặc quặng cho công trình định nâng thì dành thêm thời gian cho thứ đang thiếu
    const goal = this.goalUpgrade();
    if (goal && !goal.ok) {
      const needOre = (goal.cost.ore || 0) - (g.resources.ore || 0);
      const needWood = (goal.cost.wood || 0) - (g.resources.wood || 0);
      if (needOre > 0 && needOre >= needWood) { share.rock = 0.55; share.tree = 0.15; share.camp = 0.30; }
      else if (needWood > 0) { share.tree = 0.55; share.rock = 0.15; share.camp = 0.30; }
    }
    if (this.capFull('wood')) share.tree = 0;
    if (this.capFull('ore')) share.rock = 0;
    const total = this.timeBy.camp + this.timeBy.tree + this.timeBy.rock + 1;
    const order: TargetKind[] = (['camp', 'tree', 'rock'] as TargetKind[])
      .filter((k) => share[k] > 0)
      .sort((a, b) => (this.timeBy[a] / total - share[a]) - (this.timeBy[b] / total - share[b]));
    for (const kind of order) {
      const t = kind === 'camp' ? this.nearestCamp(leader, (c) => c.zone === zone) : this.nearestNode(leader, kind, zone);
      if (t) return t;
    }
    return this.nearestCamp(leader, () => true);
  }

  // =========================================================================================
  // dungeon
  // =========================================================================================

  private dungeonTick(): void {
    const g = this.game;
    const run = g.run;
    const scene = g.scene;
    const leader = scene.leader;
    if (!run || !leader) { this.joy(0, 0); return; }
    if (run.fadeT > 0) { this.joy(0, 0); return; }

    // (3) né vùng đỏ: thủ lĩnh hoặc phần lớn đội nằm trong vùng thì đi thẳng ra, rồi đứng lại
    const tg = this.dangerousTelegraph(scene.telegraphs, scene.heroes, leader);
    if (tg) {
      this.escape(tg, leader);
      return;
    }
    this.dodge = null;

    if (run.cleared && run.exitOpen) {
      this.joyToward(leader.x, leader.y, run.exitX, run.exitY);
      return;
    }
    // đứng yên cho đội đánh; nếu quái không lại gần trong 3 s thì đi tới con gần nhất
    const sq = g.data.tuning.squad;
    let near: MonsterUnitView | null = null;
    let nearD = Infinity;
    const list = scene.monsters;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m.alive) continue;
      const d = (m.x - leader.x) * (m.x - leader.x) + (m.y - leader.y) * (m.y - leader.y);
      if (d < nearD) { nearD = d; near = m; }
    }
    if (!near) { this.joy(0, 0); return; }
    if (nearD <= (sq.aggroRadius - 0.5) * (sq.aggroRadius - 0.5)) { this.idleInDungeon = 0; this.joy(0, 0); return; }
    this.idleInDungeon += 2 * g.stepSec;
    if (this.idleInDungeon > 3) this.joyToward(leader.x, leader.y, near.x, near.y);
    else this.joy(0, 0);
  }

  private inTelegraph(t: TelegraphView, x: number, y: number, margin: number): boolean {
    if (t.shape === 'circle') {
      const r = t.radius + margin;
      return (x - t.x) * (x - t.x) + (y - t.y) * (y - t.y) <= r * r;
    }
    const dx = x - t.x;
    const dy = y - t.y;
    const along = dx * t.dirX + dy * t.dirY;
    const side = Math.abs(-dx * t.dirY + dy * t.dirX);
    return along >= -margin && along <= t.length + margin && side <= t.width / 2 + margin;
  }

  private dangerousTelegraph(list: ReadonlyArray<TelegraphView>, heroes: ReadonlyArray<HeroUnitView>, leader: HeroUnitView): TelegraphView | null {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      let inside = 0;
      let alive = 0;
      for (const h of heroes) {
        if (!h.alive) continue;
        alive++;
        if (this.inTelegraph(t, h.x, h.y, 0.35)) inside++;
      }
      if (this.inTelegraph(t, leader.x, leader.y, 0.35) || inside * 2 > alive) return t;
    }
    return null;
  }

  private escape(t: TelegraphView, leader: HeroUnitView): void {
    if (t.shape === 'circle') {
      let dx = leader.x - t.x;
      let dy = leader.y - t.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1e-3) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
      // nếu hướng ra xa tâm đâm vào tường thì chạy dọc tường
      const b = this.game.scene.bounds;
      const tx = leader.x + dx * 2;
      const ty = leader.y + dy * 2;
      if (tx < b[0] + 0.5 || tx > b[2] - 0.5) { dx = 0; dy = dy >= 0 ? 1 : -1; if (leader.y + dy * 2 < b[1] + 0.5 || leader.y + dy * 2 > b[3] - 0.5) dy = -dy; }
      else if (ty < b[1] + 0.5 || ty > b[3] - 0.5) { dy = 0; dx = dx >= 0 ? 1 : -1; if (leader.x + dx * 2 < b[0] + 0.5 || leader.x + dx * 2 > b[2] - 0.5) dx = -dx; }
      this.joy(dx, dy);
      return;
    }
    // hình chữ nhật: đi vuông góc với hướng lao, về phía gần mép hơn
    const dx = leader.x - t.x;
    const dy = leader.y - t.y;
    const side = -dx * t.dirY + dy * t.dirX;
    let px = -t.dirY;
    let py = t.dirX;
    if (side < 0) { px = -px; py = -py; }
    const b = this.game.scene.bounds;
    const tx = leader.x + px * 1.5;
    const ty = leader.y + py * 1.5;
    if (tx < b[0] + 0.5 || tx > b[2] - 0.5 || ty < b[1] + 0.5 || ty > b[3] - 0.5) { px = -px; py = -py; }
    this.joy(px, py);
  }
}

export function fmtTime(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h + ':' + (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
}
