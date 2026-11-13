// "Người chơi theo thẻ": một người chơi mới chỉ làm đúng điều thẻ nhiệm vụ đang yêu cầu, không farm thêm,
// không tối ưu. Khi một hành động bị khóa, họ đọc lý do game hiện trên nút (Check.text của lõi) và đi lấy đúng
// thứ đang thiếu: thiếu gỗ thì chặt cây, thiếu thịt thì đánh quái rơi thịt, thiếu cấp người chơi thì đánh quái.
// Dùng để đo xem thẻ nhiệm vụ có dẫn người mới đi hết vòng lặp không, và họ phải chờ ở đâu, bao lâu.
// Chỉ dùng core/index và các lệnh của người chơi, như bot chính.
import type { Game, GameEvent, HeroInfo, HeroUnitView, CampView, Check } from '../../game/assets/scripts/core/index';
import { Bot } from './bot';

export interface CardPlayerOptions {
  /**
   * Cách tiêu thịt: 'focused' = dồn cho hero cấp cao nhất trong đội (cách nhanh nhất để xong "nâng một hero lên cấp N");
   * 'spread' = luôn nâng hero cấp thấp nhất trong đội (người chơi chia đều, tốn thịt nhất).
   */
  levelPolicy: 'focused' | 'spread';
  /** Dừng khi đã nhận thưởng nhiệm vụ có id này. */
  stopAfterQuest: string;
}

type Goal =
  | { kind: 'none' }
  | { kind: 'wait' }
  | { kind: 'node'; resource: string }
  | { kind: 'camp'; why: string; match: (c: CampView) => boolean }
  | { kind: 'village'; act: () => void };

export interface QuestTiming { id: string; startSec: number; endSec: number; note: string; }

export class CardPlayer {
  /** Thời điểm bắt đầu và nhận thưởng của từng nhiệm vụ. */
  readonly timings: QuestTiming[] = [];
  /** Lý do bị khóa đã gặp ở từng nhiệm vụ (câu chữ game hiện cho người chơi). */
  readonly blockedTexts: { [questId: string]: { [text: string]: number } } = {};
  dungeonAttempts = 0;
  dungeonDefeats = 0;
  done = false;
  /** Trạng thái lúc q14 ("nâng một hero lên cấp 5") vừa hiện. */
  q14: { meat: number; bestLevel: number; meatMissing: number; fragmentsMissing: number; text: string } | null = null;

  private game: Game;
  private opts: CardPlayerOptions;
  private dungeonBot: Bot;
  private stepIndex = 0;
  private goal: Goal = { kind: 'none' };
  private currentId = '';
  private jx = 0;
  private jy = 0;
  private strengthenUntil = 0;

  constructor(game: Game, opts: CardPlayerOptions) {
    this.game = game;
    this.opts = opts;
    this.dungeonBot = new Bot(game);
  }

  onEvents(events: ReadonlyArray<GameEvent>, count: number): void {
    for (let i = 0; i < count; i++) {
      const e = events[i];
      if (e.type !== 'result') continue;
      this.dungeonAttempts++;
      if (e.data.outcome !== 'victory') {
        this.dungeonDefeats++;
        // màn thua gợi ý: tuyển hero, nâng Sân Tập, nâng cấp hero. Người chơi làm vậy trong 3 phút rồi thử lại.
        this.strengthenUntil = this.game.playSec + 180;
      }
    }
  }

  act(): void {
    const g = this.game;
    this.stepIndex++;
    if (g.mode === 'dungeon' || g.mode === 'result') { this.dungeonBot.act(); this.jx = 0; this.jy = 0; return; }
    if (g.mode === 'build') { g.exitBuildMode(); return; }
    if (this.done) { this.joy(0, 0); return; }
    if (this.stepIndex % 15 === 0) this.plan();
    if (this.stepIndex % 3 === 0) this.move();
  }

  private joy(x: number, y: number): void {
    if (x === this.jx && y === this.jy) return;
    this.jx = x; this.jy = y;
    this.game.setJoystick(x, y);
  }

  private blocked(c: Check): void {
    if (c.ok || !c.text) return;
    const id = this.game.quest.id;
    const row = this.blockedTexts[id] || (this.blockedTexts[id] = {});
    row[c.text] = (row[c.text] || 0) + 1;
  }

  // ------------------------------------------------------------------------------------------
  // kế hoạch: thẻ nhiệm vụ đang yêu cầu gì, và thứ gì đang chặn
  // ------------------------------------------------------------------------------------------

  private plan(): void {
    const g = this.game;
    const q = g.quest;
    if (q.finished) { this.done = true; return; }
    if (q.id !== this.currentId) {
      const last = this.timings[this.timings.length - 1];
      if (last && last.endSec < 0) last.endSec = g.playSec;
      if (last && last.id === this.opts.stopAfterQuest) { this.done = true; return; }
      this.currentId = q.id;
      this.timings.push({ id: q.id, startSec: g.playSec, endSec: -1, note: '' });
      if (q.id === 'q14') this.snapshotQ14();
    }
    if (q.complete) { g.claimQuest(); this.goal = { kind: 'none' }; return; }
    this.goal = this.goalFor();
  }

  private snapshotQ14(): void {
    const g = this.game;
    const target = g.data.quests.quests[g.quest.index].params.level;
    const hero = this.heroToLevel();
    // tổng thịt và mảnh phải trả, theo đúng thứ tự bấm của cách tiêu thịt đã chọn, cho tới khi có một hero đạt cấp đích
    const squad = g.squad.map((id) => g.getHeroInfo(id)!).map((h) => ({ level: h.level, rarity: h.rarity, fragments: h.fragments }));
    let meatNeed = 0;
    let fragMissing = 0;
    for (let guard = 0; guard < 400 && !squad.some((h) => h.level >= target); guard++) {
      let pick = squad[0];
      for (const h of squad) if (this.opts.levelPolicy === 'focused' ? h.level > pick.level : h.level < pick.level) pick = h;
      const row = g.data.heroLevels.costs[pick.level - 1];
      meatNeed += row.meat;
      const frag = row.fragments ? row.fragments[pick.rarity] : 0;
      if (frag > pick.fragments) fragMissing += frag - pick.fragments;
      pick.fragments = Math.max(0, pick.fragments - frag);
      pick.level++;
    }
    const meat = g.resources.meat || 0;
    this.q14 = {
      meat, bestLevel: hero.level, meatMissing: Math.max(0, meatNeed - meat), fragmentsMissing: fragMissing,
      text: hero.canLevelUp.ok ? '' : hero.canLevelUp.text,
    };
  }

  /** Hero mà người chơi sẽ bấm NÂNG CẤP theo cách tiêu thịt đã chọn. */
  private heroToLevel(): HeroInfo {
    const g = this.game;
    let pick: HeroInfo | null = null;
    for (const id of g.squad) {
      const h = g.getHeroInfo(id)!;
      if (!pick) { pick = h; continue; }
      if (this.opts.levelPolicy === 'focused' ? h.level > pick.level : h.level < pick.level) pick = h;
    }
    return pick!;
  }

  /** Bấm NÂNG CẤP cho tới khi thẻ xong hoặc nút bị khóa. Trả về lý do khóa cuối cùng. */
  private levelUp(): Check | null {
    const g = this.game;
    for (let guard = 0; guard < 40 && !this.questDone(); guard++) {
      const h = this.heroToLevel();
      const c = g.levelUpHero(h.id);
      if (!c.ok) return c;
    }
    return null;
  }

  private questDone(): boolean {
    const g = this.game;
    const q = g.data.quests.quests[g.quest.index];
    if (!q) return true;
    if (q.type === 'hero_level') return g.getHeroList().some((h) => h.owned && h.level >= q.params.level);
    return g.quest.complete;
  }

  private farm(why: string, table: string | null): Goal {
    const data = this.game.data;
    return { kind: 'camp', why, match: (c) => c.zone === 'z1' && (table === null || data.monsterById[c.monsterId].dropTable === table) };
  }

  /** Thiếu tài nguyên `key`: đi lấy đúng thứ đó. */
  private fetch(c: Check): Goal {
    if (c.key === 'wood' || c.key === 'ore') return { kind: 'node', resource: c.key };
    if (c.key === 'meat') return this.farm('thịt', 'field_meat');
    if (c.key === 'gold') return this.farm('vàng', 'field_gold');
    return { kind: 'wait' };
  }

  private upgradeGoal(type: string): Goal {
    const g = this.game;
    const b = g.findBuilding(type);
    if (!b) return { kind: 'wait' };
    if (b.job) return { kind: 'village', act: () => undefined };
    const c = g.getBuildingPanel(b.uid)!.canUpgrade;
    if (c.ok) return { kind: 'village', act: () => { g.upgradeBuilding(b.uid); } };
    this.blocked(c);
    if (c.reason === 'need_player_level') return this.farm('cấp người chơi', null);
    if (c.reason === 'need_storage_level') return type === 'storage' ? { kind: 'wait' } : this.upgradeGoal('storage');
    if (c.reason === 'missing_resources') return this.fetch(c);
    return { kind: 'village', act: () => undefined }; // hết thợ: chờ
  }

  private goalFor(): Goal {
    const g = this.game;
    const q = g.data.quests.quests[g.quest.index];
    const p = q.params;
    switch (q.type) {
      case 'gather': return { kind: 'node', resource: p.resource };
      case 'kill':
        return { kind: 'camp', why: 'nhiệm vụ', match: (c) => (p.monster !== undefined ? c.monsterId === p.monster : c.zone === p.zone) };
      case 'hero_level': {
        const c = this.levelUp();
        if (!c) return { kind: 'none' };
        this.blocked(c);
        if (c.reason === 'missing_resources') return this.fetch(c);
        if (c.reason === 'missing_fragments') return this.fragmentGoal();
        return { kind: 'wait' };
      }
      case 'auto_assign': g.autoAssign(); return { kind: 'none' };
      case 'build': {
        if (g.findBuilding(p.building)) return { kind: 'village', act: () => undefined }; // đang xây: chờ trong làng
        const entry = g.getBuildMenu().find((m) => m.type === p.building)!;
        if (entry.check.ok) {
          return { kind: 'village', act: () => {
            const c = g.data.tuning.world.villageCenter;
            const cell = g.findFreeCell(p.building, c[0] + 3, c[1] + 3);
            if (cell && g.enterBuildMode().ok) { g.placeBuilding(p.building, cell.x, cell.y); g.exitBuildMode(); }
          } };
        }
        this.blocked(entry.check);
        if (entry.check.reason === 'need_player_level') return this.farm('cấp người chơi', null);
        if (entry.check.reason === 'missing_resources') return this.fetch(entry.check);
        return { kind: 'village', act: () => undefined };
      }
      case 'recruit': {
        const c = g.getTavernInfo().recruitOptions[0].check;
        if (c.ok) return { kind: 'village', act: () => { g.recruit(1); } };
        this.blocked(c);
        return c.reason === 'missing_resources' ? this.fetch(c) : { kind: 'wait' };
      }
      case 'collect': {
        const b = g.findBuilding(p.building);
        if (!b) return { kind: 'wait' };
        return { kind: 'village', act: () => { if (b.buffer >= 1) g.collectBuilding(b.uid); } };
      }
      case 'upgrade': return this.upgradeGoal(p.building);
      case 'training': {
        const c = g.getTrainingInfo().canUnlockNext;
        if (c.ok) return { kind: 'village', act: () => { g.unlockTrainingNode(); } };
        this.blocked(c);
        if (c.reason === 'need_player_level') return this.farm('cấp người chơi', null);
        if (c.reason === 'missing_resources') return this.fetch(c);
        return { kind: 'wait' };
      }
      case 'clear_floor': {
        if (g.playSec < this.strengthenUntil) return this.strengthen();
        const stage = Math.ceil(p.floor / g.data.tuning.dungeon.floorsPerStage);
        const c = g.getDungeonInfo().stages[stage - 1].canEnter;
        if (c.ok) return { kind: 'village', act: () => { g.autoAssign(); g.enterDungeon(stage); } };
        this.blocked(c);
        return c.reason === 'need_gate_level' ? this.upgradeGoal('dungeon_gate') : { kind: 'wait' };
      }
      case 'slots': {
        const c = g.getTrainingInfo().slotNodes.find((s) => s.slot === g.squadSlots + 1)!.check;
        if (c.ok) return { kind: 'village', act: () => { g.unlockSquadSlot(); g.autoAssign(); } };
        this.blocked(c);
        if (c.reason === 'need_yard_level') return this.upgradeGoal('training_yard');
        return { kind: 'wait' }; // thiếu San Hô Đỏ: chỉ có từ dungeon và nhiệm vụ
      }
    }
    return { kind: 'wait' };
  }

  /** Thiếu mảnh để đột phá: đổi Vé lấy 5 mảnh nếu đủ Vé; không thì tuyển tiếp (trùng hero được mảnh, mỗi lượt thêm 1 Vé). */
  private fragmentGoal(): Goal {
    const g = this.game;
    const hero = this.heroToLevel();
    const tv = g.getTavernInfo();
    const ex = tv.exchanges.find((e) => e.id === 'frag5');
    if (ex && tv.tickets >= ex.tickets) return { kind: 'village', act: () => { g.exchangeTickets('frag5', hero.id); } };
    const c = tv.recruitOptions[0].check;
    if (c.ok) return { kind: 'village', act: () => { g.recruit(1); } };
    this.blocked(c);
    return c.reason === 'missing_resources' ? this.fetch(c) : { kind: 'wait' };
  }

  /** Sau khi thua: làm theo gợi ý của màn thua (tuyển, Sân Tập, nâng cấp hero) rồi đánh quái lấy thịt. */
  private strengthen(): Goal {
    const g = this.game;
    for (let guard = 0; guard < 40; guard++) {
      const h = this.heroToLevel();
      if (!g.levelUpHero(h.id).ok) break;
    }
    const tv = g.getTavernInfo();
    const tr = g.getTrainingInfo();
    if ((tv.built && tv.recruitOptions[0].check.ok) || (tr.built && tr.canUnlockNext.ok)) {
      return { kind: 'village', act: () => {
        while (g.recruit(1).ok) { /* tiêu hết vàng */ }
        while (g.unlockTrainingNode().ok) { /* tiêu quặng */ }
        g.autoAssign();
      } };
    }
    return this.farm('thịt', 'field_meat');
  }

  // ------------------------------------------------------------------------------------------
  // di chuyển
  // ------------------------------------------------------------------------------------------

  private move(): void {
    const g = this.game;
    const f = g.field;
    const leader = f.leader;
    if (!leader || f.wipeT > 0 || f.returnChannelT > 0) { this.joy(0, 0); return; }
    const sq = g.data.tuning.squad;
    if (this.monsterNear(leader, sq.aggroRadius - 0.4)) { this.joy(0, 0); return; } // có quái: đứng yên cho đội đánh
    const goal = this.goal;
    if (goal.kind === 'none' || goal.kind === 'wait') { this.joy(0, 0); return; }
    if (goal.kind === 'village') {
      if (g.leaderZone === 'village') {
        this.joy(0, 0);
        goal.act();
        this.goal = { kind: 'none' }; // mỗi lần lập kế hoạch chỉ bấm một lần
        return;
      }
      if (g.returnToVillage().ok) { this.joy(0, 0); return; }
      const c = g.data.tuning.world.villageCenter;
      this.walk(leader, c[0], c[1], 0);
      return;
    }
    if (goal.kind === 'node') {
      let best = -1;
      let bestD = Infinity;
      for (const n of f.nodes) {
        if (n.depleted || n.resource !== goal.resource) continue;
        const d = (n.x - leader.x) * (n.x - leader.x) + (n.y - leader.y) * (n.y - leader.y);
        if (d < bestD) { bestD = d; best = n.index; }
      }
      if (best < 0) { this.joy(0, 0); return; }
      this.walk(leader, f.nodes[best].x, f.nodes[best].y, 1.2);
      return;
    }
    // ổ quái: tới ổ còn quái gần nhất; nếu các ổ đều trống thì đứng chờ cạnh ổ gần nhất
    let best: CampView | null = null;
    let bestD = Infinity;
    for (const pass of [0, 1]) {
      for (const c of f.camps) {
        if (!goal.match(c) || (pass === 0 && c.alive <= 0)) continue;
        const d = (c.x - leader.x) * (c.x - leader.x) + (c.y - leader.y) * (c.y - leader.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) break;
    }
    if (!best) { this.joy(0, 0); return; }
    this.walk(leader, best.x, best.y, best.alive > 0 ? 1.0 : 3.0);
  }

  private walk(leader: HeroUnitView, tx: number, ty: number, stop: number): void {
    const dx = tx - leader.x;
    const dy = ty - leader.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= stop || d < 1e-6) { this.joy(0, 0); return; }
    this.joy(dx / d, dy / d);
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
}
