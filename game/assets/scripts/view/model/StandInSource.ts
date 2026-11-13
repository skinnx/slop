// Stand-in data for layout work and screenshots before (or without) the core. It holds NO game rules:
// numbers are fixed samples shaped like the real thing, and commands only switch what is shown.
// Select it with ?standin=1 in the harness page URL, or globalThis.__viewStandIn = true before boot.
import { Source, Cmd, CmdResult } from './Source';
import {
  Mode, WorldV, FieldHudV, DungeonHudV, ViewEvent, BuildingPanelV, TavernV, RevealV, HeroCardV, HeroDetailV, SquadV,
  TrainingV, GateV, ResultV, BuildModeV, WelcomeV, SettingsV, UnitV, Rarity, Attr, MapV,
} from './ViewModel';
import type { RenderCfg } from '../world/WorldRenderer';
import { screenDirToCell } from '../world/Iso';

const HEROES: [string, string, string, string | undefined, Rarity, Attr][] = [
  ['bang', 'Bàng', 'td:0097', undefined, 'N', 'STR'], ['do_neo', 'Đô Neo', 'td:0087', undefined, 'R', 'STR'],
  ['rua_sat', 'Rùa Sắt', 'td:0096', '#9FE3C9', 'E', 'STR'], ['kinh_vuong', 'Kình Vương', 'td:0086', '#8FB8FF', 'L', 'STR'],
  ['se', 'Sẻ', 'td:0088', undefined, 'N', 'AGI'], ['muc', 'Mực', 'td:0112', undefined, 'R', 'AGI'],
  ['en', 'Én', 'td:0098', '#7FE0FF', 'E', 'AGI'], ['dieu', 'Diều', 'td:0099', '#FFE08A', 'L', 'AGI'],
  ['lan', 'Lan', 'td:0100', undefined, 'N', 'INT'], ['dang', 'Đăng', 'td:0084', undefined, 'R', 'INT'],
  ['san', 'San', 'td:0085', '#FF9FB0', 'E', 'INT'], ['trieu', 'Triều', 'td:0111', '#7FA8FF', 'L', 'INT'],
];
const OWNED: Record<string, number> = { bang: 12, se: 9, lan: 7, dang: 5, do_neo: 4, muc: 3, en: 2 };
const MONSTER_ART = ['td:0124', 'td:0120', 'td:0122', 'td:0108', 'td:0121'];
const MONSTER_TINT: (string | undefined)[] = ['#C8B8A0', undefined, undefined, '#9FD8FF', '#BFFFF0'];

function card(i: number, squad: string[]): HeroCardV {
  const [id, name, art, tint, rarity, attr] = HEROES[i];
  const lv = OWNED[id] ?? 0;
  return { id, name, art, tint, rarity, attr, owned: lv > 0, level: lv || 1, cp: lv ? 600 + lv * 95 + i * 13 : 0, inSquad: squad.indexOf(id) >= 0,
    canLevel: lv > 0 && lv % 3 === 0, frag: lv ? (i * 3) % 7 : 0, fragNeed: lv ? (lv < 5 ? 5 : lv < 10 ? 10 : 15) : null };
}

export class StandInSource implements Source {
  readonly kind = 'stand-in';
  private m: Mode = 'TITLE';
  private t = 0;
  private joy = { x: 0, y: 0 };
  private leader = { x: 30, y: 30 };
  private heroesPos: { x: number; y: number }[] = [];
  private monsters: UnitV[] = [];
  private events: ViewEvent[] = [];
  private squadIds = ['bang', 'se', 'lan', 'dang'];
  private paused = false;
  private auto = true;
  private stage = 1;
  private reveal: RevealV | null = null;
  private resultV: ResultV | null = null;
  private music = true; private sfx = true;
  private dmgTimer = 0;
  /** Number of monsters in the stand-in dungeon (crowd test sets 60). */
  crowd = 60;
  private welcomeShown = false;

  render(): RenderCfg {
    return {
      spriteScale: { hero: 4, monster: 3, elite: 5, boss: 10, node: 4, pickup: 2 },
      groundColorsField: ['#5DBB63', '#52A957'], groundColorsVillage: ['#6CC46F', '#60B565'], groundColorsDungeon: ['#3B3F5C', '#34374F'],
      pathColor: '#D9B07A', cameraFollowLerp: 0.15,
    };
  }

  tick(dt: number): void {
    if (this.paused && this.m === 'DUNGEON') return;
    this.t += dt;
    const sp = 3;
    if (this.m === 'WORLD' || this.m === 'DUNGEON') {
      this.leader.x += this.joy.x * sp * dt; this.leader.y += this.joy.y * sp * dt;
    }
    if (this.m === 'DUNGEON') {
      this.leader.x = Math.max(1, Math.min(15, this.leader.x)); this.leader.y = Math.max(1, Math.min(23, this.leader.y));
      for (const u of this.monsters) {
        const dx = this.leader.x - u.x, dy = this.leader.y - u.y, d = Math.hypot(dx, dy);
        if (d > 1.2) { u.x += (dx / d) * 1.2 * dt; u.y += (dy / d) * 1.2 * dt; u.act = 'move'; } else u.act = 'idle';
      }
      this.dmgTimer += dt;
      while (this.dmgTimer > 0.1) {
        this.dmgTimer -= 0.1;
        const u = this.monsters[Math.floor(Math.random() * this.monsters.length)];
        if (u) this.events.push({ t: 'damage', x: u.x, y: u.y, amount: 20 + Math.floor(Math.random() * 40), onHero: false, targetId: u.id });
      }
    }
  }

  mode(): Mode { return this.m; }

  private mapV: MapV = (() => {
    const paths: [number, number][] = [];
    for (let i = 2; i <= 20; i++) { paths.push([30, i], [i, 30], [60 - i, 30], [30, 60 - i]); }
    return { w: 60, h: 60, village: { x0: 20, y0: 20, w: 20, h: 20 }, paths, zoneEdges: [17, 24] };
  })();

  world(): WorldV {
    const dungeon = this.m === 'DUNGEON' || (this.m === 'RESULT' && false);
    const units: UnitV[] = [];
    const offs = [[0, 0], [-0.9, -0.5], [0.5, -0.9], [-1.4, -1.3], [-0.2, -1.6], [0.9, -1.9], [-1, -2.3], [0.3, -2.7]];
    this.squadIds.forEach((id, i) => {
      const h = HEROES.find((q) => q[0] === id)!;
      const o = offs[i];
      units.push({ id: 1 + i, kind: 'hero', art: h[2], tint: h[3], x: this.leader.x + o[0], y: this.leader.y + o[1], hp: i === 1 ? 300 : 1000, hpMax: 1000,
        act: this.joy.x || this.joy.y ? 'move' : 'idle', leader: i === 0, weapon: i === 0 ? 'td:0104' : undefined });
    });
    if (dungeon) units.push(...this.monsters);
    else {
      for (let i = 0; i < 4; i++) units.push({ id: 100 + i, kind: 'monster', art: 'td:0110', x: 42.5 + Math.cos(this.t * 0.5 + i) * 1.2, y: 30 + Math.sin(this.t * 0.5 + i * 2) * 1.2, hp: 1, hpMax: 1, act: 'move' });
    }
    return {
      area: dungeon ? 'dungeon' : 'field',
      focusX: this.leader.x, focusY: this.leader.y,
      units,
      nodes: dungeon ? [] : [
        { id: 1, kind: 'tree', art: 'urban:0260', x: 18.9, y: 18.6, depleted: false, respawnPct: 0 },
        { id: 2, kind: 'tree', art: 'urban:0260', x: 17.3, y: 17.1, depleted: true, respawnPct: 0.4 },
        { id: 3, kind: 'rock', art: '', x: 19.5, y: 16.5, depleted: false, respawnPct: 0 },
        { id: 4, kind: 'tree', art: 'urban:0291', tint: '#9FD8A0', x: 26, y: 18.2, depleted: false, respawnPct: 0 },
      ],
      pickups: dungeon ? this.monsters.slice(0, 12).map((u, i) => ({ id: i, kind: i % 3 === 0 ? 'meat' : 'gold', x: u.x + 0.4, y: u.y - 0.3 })) : [{ id: 1, kind: 'gold', x: 31.5, y: 28 }, { id: 2, kind: 'meat', x: 32, y: 28.5 }],
      buildings: dungeon ? [] : [
        { uid: 1, type: 'storage', name: 'Nhà Kho', level: 2, x: 25, y: 25, w: 3, h: 3, job: null },
        { uid: 2, type: 'lumber_camp', name: 'Trại Gỗ', level: 3, x: 31, y: 27, w: 2, h: 2, job: null, buffer: { res: 'wood', amount: 120, cap: 480 } },
        { uid: 3, type: 'tavern', name: 'Quán Mỏ Neo', level: 1, x: 27, y: 31, w: 3, h: 3, job: null, badge: 'exclaim' },
        { uid: 4, type: 'ore_mine', name: 'Mỏ Quặng', level: 1, x: 33, y: 32, w: 2, h: 2, job: { kind: 'upgrade', pct: 0.4, remainSec: 151 } },
        { uid: 5, type: 'training_yard', name: 'Sân Tập', level: 1, x: 29, y: 35, w: 3, h: 3, job: { kind: 'build', pct: 0.7, remainSec: 42 } },
        { uid: 6, type: 'dungeon_gate', name: 'Cổng Xoáy', level: 1, x: 24, y: 28, w: 3, h: 3, job: null, badge: 'check' },
      ],
      signs: dungeon ? [] : [{ x: 30, y: 40.5, name: 'Bãi Vỏ Sò', cp: 1050, weak: false }],
      telegraphs: dungeon && this.stage === 99 ? [{ kind: 'circle', x: 8, y: 19, radius: 3, pct: (this.t % 1.5) / 1.5 }] : [],
      room: dungeon ? { w: 16, h: 24, exit: null, floor: 1 } : undefined,
      map: dungeon ? undefined : this.mapV,
    };
  }

  fieldHud(): FieldHudV {
    const inVillage = Math.max(Math.abs(this.leader.x - 30), Math.abs(this.leader.y - 30)) <= 10;
    return {
      level: 6, expPct: 0.48, cp: 5873, gold: 277, coral: 20,
      res: { meat: 99, wood: 290, ore: 8, cap: 300, storageLevel: 1 },
      quest: { text: 'Xây: Sân Tập', icon: 'icon/structure_house', cur: 0, need: 1, done: false, finished: false },
      inVillage, portal: inVillage ? 'field' : 'village', portalBlocked: false,
      squadCount: this.squadIds.length, squadSlots: 4, leaderArt: 'td:0097', squadHint: true, channelPct: null,
    };
  }

  dungeonHud(): DungeonHudV {
    return {
      floor: 1, runGold: 43, streak: 43, streakPct: 0.7,
      boss: this.stage === 99 ? { name: 'Rương Nhai', hp: 6200, hpMax: 9000 } : null,
      squad: this.squadIds.map((id, i) => { const h = HEROES.find((q) => q[0] === id)!; return { art: h[2], tint: h[3], hpPct: i === 1 ? 0.3 : i === 3 ? 0 : 1, dead: i === 3 }; }),
      auto: this.auto, paused: this.paused,
    };
  }

  drainEvents(): ViewEvent[] { const e = this.events; this.events = []; return e; }

  send(c: Cmd): CmdResult {
    switch (c.t) {
      case 'title': this.m = 'WORLD'; return { ok: true };
      case 'joystick': this.joy = screenDirToCell(c.x, c.y); return { ok: true };
      case 'enterBuild': this.m = 'BUILD'; return { ok: true };
      case 'exitBuild': this.m = 'WORLD'; return { ok: true };
      case 'enterDungeon':
        this.m = 'DUNGEON'; this.stage = c.stage; this.leader = { x: 8, y: 6 };
        this.monsters = [];
        for (let i = 0; i < this.crowd; i++) {
          const a = (i / this.crowd) * Math.PI * 2, r = 4 + (i % 4);
          const k = i % MONSTER_ART.length;
          this.monsters.push({ id: 1000 + i, kind: 'monster', art: MONSTER_ART[k], tint: MONSTER_TINT[k], x: Math.max(1, Math.min(15, 8 + Math.cos(a) * r)), y: Math.max(1, Math.min(23, 10 + Math.sin(a) * r * 1.4)), hp: 1, hpMax: 1, act: 'move' });
        }
        if (c.stage === 99) this.monsters.push({ id: 999, kind: 'boss', art: 'td:0092', x: 8, y: 19, hp: 6200, hpMax: 9000, act: 'idle' });
        this.events.push({ t: 'floor', floor: 1 });
        return { ok: true };
      case 'setAuto': this.auto = c.on; return { ok: true };
      case 'pause': this.paused = c.on; return { ok: true };
      case 'leaveDungeon': this.m = 'RESULT'; this.resultV = this.makeResult(false); this.paused = false; return { ok: true };
      case 'resultContinue': this.m = 'WORLD'; this.leader = { x: 26, y: 32 }; return { ok: true };
      case 'recruit':
        this.reveal = { cards: this.tavern().cards, draws: Array.from({ length: c.count }, (_, i) => ({ cardIndex: (i * 2) % 3, isNew: i === 0, frags: i === 0 ? 0 : 5 })), cardsAfter: null };
        return { ok: true };
      case 'claimQuest': this.events.push({ t: 'toast', text: 'Nhận thưởng: 50 Vàng' }); return { ok: true };
      case 'setting': if (c.key === 'music') this.music = c.on; else this.sfx = c.on; return { ok: true };
      case 'portal': this.leader = this.fieldHud().inVillage ? { x: 30, y: 44 } : { x: 30, y: 30 }; return { ok: true };
      default: return { ok: true };
    }
  }

  /** Stand-in only: forces the result screen (victory or defeat). */
  forceResult(victory: boolean): void { this.m = 'RESULT'; this.resultV = this.makeResult(victory); }
  private makeResult(v: boolean): ResultV {
    return { victory: v, rewards: v ? [{ res: 'gold', amount: 343 }, { res: 'coral', amount: 2 }, { res: 'tickets', amount: 3 }, { res: 'meat', amount: 12 }] : [{ res: 'gold', amount: 21 }, { res: 'meat', amount: 4 }],
      firstClearText: v ? 'Lần đầu vượt chặng 1!' : null, leaderArt: 'td:0097' };
  }

  building(uid: number): BuildingPanelV | null {
    const b = this.world().buildings.find((q) => q.uid === uid);
    if (!b) return null;
    const npc: Record<string, string> = { storage: 'urban:0320', lumber_camp: 'urban:0023', tavern: 'urban:0104', ore_mine: 'urban:0266', training_yard: 'urban:0131', market: 'urban:0158', dungeon_gate: 'urban:0185' };
    const rows = b.type === 'lumber_camp'
      ? [{ icon: 'icon/hourglass', label: 'Sản lượng / giờ', value: '180', delta: '+60' }, { icon: 'icon/resource_wood', label: 'Bộ đệm tối đa', value: '1.440', delta: '+480' },
        { icon: 'icon/hourglass', label: 'Đang chờ thu', value: '120', action: { label: 'Thu', enabled: true, cmd: 'collect' } }]
      : [{ icon: 'icon/structure_house', label: 'Sức chứa mỗi loại', value: '500', delta: '+300' }];
    return { uid, type: b.type, name: b.name, npc: npc[b.type], art: b.type, level: b.level, maxLevel: 10, job: b.job, rows,
      note: b.type === 'lumber_camp' ? 'Nâng cấp để sản xuất nhiều hơn.' : 'Nâng cấp để chứa thêm tài nguyên.',
      cost: [{ res: 'wood', amount: 125, lack: false }, { res: 'ore', amount: 82, lack: true }], buildSec: 120, blocked: null };
  }
  buildingAt(x: number, y: number): number | null {
    const b = this.world().buildings.find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
    return b ? b.uid : null;
  }

  tavern(): TavernV {
    const ids = [8, 4, 9];
    return {
      cards: ids.map((i, k) => ({ ...card(i, this.squadIds), isNew: k === 2 && false, dupFrags: 5, highlight: HEROES[i][4] === 'E' || HEROES[i][4] === 'L' }))
        .map((c, k) => ({ ...c, isNew: k === 1 ? false : !c.owned })),
      bonus: 4, bonusMax: 10, refreshSec: 1772, refreshCost: 50, drawCost: 100, gold: 277, tickets: 23,
      exchange: [
        { id: 'frags', label: '5 mảnh của một hero đã có', price: 8, enabled: true, reason: '', eligible: ['bang', 'se', 'lan'] },
        { id: 'N', label: 'Mở một hero Thường chưa có', price: 15, enabled: true, reason: '', eligible: ['lan'] },
        { id: 'R', label: 'Mở một hero Hiếm chưa có', price: 30, enabled: false, reason: 'Thiếu 7 Vé Quán', eligible: [] },
        { id: 'E', label: 'Mở một hero Sử Thi chưa có', price: 80, enabled: false, reason: 'Thiếu 57 Vé Quán', eligible: [] },
        { id: 'L', label: 'Mở một hero Huyền Thoại chưa có', price: 150, enabled: false, reason: 'Thiếu 127 Vé Quán', eligible: [] },
      ],
      recruitBlocked: [null, null, 'Thiếu 23 Vàng'], recruitCost: [100, 200, 300], refreshBlocked: null,
    };
  }
  lastReveal(): RevealV | null { return this.reveal; }
  heroes(): HeroCardV[] { return HEROES.map((_, i) => card(i, this.squadIds)); }
  hero(id: string): HeroDetailV | null {
    const i = HEROES.findIndex((h) => h[0] === id);
    if (i < 0) return null;
    const c = card(i, this.squadIds);
    return {
      card: c, atk: 408, hp: 1754, atkNext: 6, hpNext: 26, meat: 99,
      milestones: [
        { level: 5, text: 'Nhanh Nhẹn HP +5% (sở hữu)', reached: c.level >= 5 }, { level: 10, text: 'Mở kỹ năng Mưa Tên', reached: c.level >= 10 },
        { level: 15, text: 'Nhanh Nhẹn ATK +5% (sở hữu)', reached: c.level >= 15 }, { level: 20, text: 'Bắn Đôi lên 2 sao', reached: c.level >= 20 },
        { level: 25, text: 'Nhanh Nhẹn HP +5% (sở hữu)', reached: c.level >= 25 }, { level: 30, text: 'Mưa Tên lên 2 sao', reached: c.level >= 30 },
      ],
      skills: [
        { name: 'Bắn Đôi', stars: 1, maxStars: 3, unlocked: true, unlockLevel: 1, desc: 'Bắn hai mũi tên vào mục tiêu.', kind: 'Đánh đơn', cooldownSec: 6 },
        { name: 'Mưa Tên', stars: 0, maxStars: 3, unlocked: c.level >= 10, unlockLevel: 10, desc: 'Mưa tên rơi lên nhiều quái gần nhất.', kind: 'Loạt bắn', cooldownSec: 10 },
      ],
      cost: c.owned ? { meat: 100, frags: c.level % 5 === 0 ? 5 : 0, lackMeat: false, lackFrags: false, blocked: null } : null, maxed: false,
    };
  }
  squad(): SquadV { return { slots: 4, members: this.squadIds.slice(), cards: this.heroes(), cp: 2949 }; }
  training(): TrainingV {
    const nodes = Array.from({ length: 30 }, (_, k) => ({ index: k, stat: (k % 2 ? 'ATK' : 'HP') as 'HP' | 'ATK', amount: k % 2 ? 3 : 12, cost: 6 + k * 3,
      state: (k < 7 ? 'done' : k === 7 ? 'open' : 'locked') as 'done' | 'open' | 'locked', reqPlayerLevel: Math.floor(k / 3) + 1 }));
    return { ore: 15, coral: 0, playerLevel: 3, nodes,
      slots: [4, 5, 6, 7, 8].map((s, i) => ({ slot: s, cost: [2, 4, 6, 9, 12][i], reqYardLevel: i + 2, state: (i === 0 ? 'open' : 'locked') as 'open' | 'locked', lockText: `Cần Sân Tập cấp ${i + 2}`, blocked: i === 0 ? 'Thiếu 2 San Hô Đỏ' : `Cần Sân Tập cấp ${i + 2}` })), nextBlocked: 'Thiếu 12 Quặng' };
  }
  gate(stage: number | null): GateV {
    const s = stage ?? 1;
    const names = ['Hang Rương Cũ', 'Hang Càng Thép', 'Hang Mắt Đá', 'Hang Rắn Biển', 'Hang Tàu Ma', 'Hang Vua Nhện'];
    return { stage: s, stageName: names[s - 1], floors: `Tầng ${s * 5 - 4}–${s * 5}`, recommendedCp: 4550, teamCp: 2949,
      difficulty: { label: 'Khó', color: '#C77DFF' }, rewardsFirst: [{ res: 'gold', amount: 300 }, { res: 'coral', amount: 2 }, { res: 'tickets', amount: 3 }],
      rewardsRepeat: [{ res: 'gold', amount: 75 }, { res: 'tickets', amount: 1 }], cleared: false, locked: s > 1 ? 'Cần Cổng Xoáy cấp 2' : null,
      canPrev: s > 1, canNext: s < 6, bossArt: 'td:0092' };
  }
  result(): ResultV | null { return this.resultV; }
  buildMode(): BuildModeV {
    const cards = [
      ['storage', 'Nhà Kho', 'built'], ['lumber_camp', 'Trại Gỗ', 'built'], ['tavern', 'Quán Mỏ Neo', 'built'], ['ore_mine', 'Mỏ Quặng', 'built'],
      ['training_yard', 'Sân Tập', 'built'], ['market', 'Chợ Bến', 'ok'], ['dungeon_gate', 'Cổng Xoáy', 'locked'],
    ];
    return { freeBuilders: 1, builders: 2, ghost: null, selected: null,
      cards: cards.map(([type, name, st], i) => ({ type, name, art: type, w: type === 'storage' || type === 'tavern' || type === 'training_yard' || type === 'dungeon_gate' ? 3 : 2, h: type === 'storage' || type === 'tavern' || type === 'training_yard' || type === 'dungeon_gate' ? 3 : 2, cost: [{ res: 'wood' as const, amount: 60 + i * 40, lack: i === 5 }, { res: 'ore' as const, amount: 20, lack: false }], buildSec: 60 * (i + 1),
        state: st as 'ok' | 'built' | 'locked', lockLevel: 6 })) };
  }
  canPlace(_type: string, x: number, y: number, uid: number | null): CmdResult {
    const occupied = this.world().buildings.some((b) => b.uid !== uid && x < b.x + b.w && x + 2 > b.x && y < b.y + b.h && y + 2 > b.y);
    if (x < 20 || y < 20 || x > 38 || y > 38) return { ok: false, reason: 'Ra ngoài làng' };
    return occupied ? { ok: false, reason: 'Chồng lên Nhà Kho' } : { ok: true };
  }
  nearestFree(): { x: number; y: number } | null { return { x: 29, y: 29 }; }
  welcome(): WelcomeV | null {
    if (this.welcomeShown) return null;
    this.welcomeShown = true;
    return { awaySec: 3 * 3600 + 12 * 60, capHours: 8, lines: ['Trại Gỗ: 480 gỗ chờ thu', 'Xây xong: Mỏ Quặng cấp 3', 'Quán đã đổi hero mới'] };
  }
  questHint(): { kind: 'world' | 'ui' | 'none'; x: number; y: number; ui: string } { return { kind: 'world', x: 19, y: 18, ui: '' }; }
  settings(): SettingsV { return { music: this.music, sfx: this.sfx, version: 'M1 (dev)' }; }
  debug(): Record<string, unknown> { return { monsters: this.monsters.length, leader: this.leader }; }
}
