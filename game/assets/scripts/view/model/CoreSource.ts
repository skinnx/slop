// Binds the view to the core (game/assets/scripts/core, entry core/index.ts). Every number shown comes from the
// core's state or panel queries; this file only reshapes it into the view model and maps art/colours.
// Anything the view needed that the contract does not give is listed in view/README.md ("Hợp đồng còn thiếu").
import { sys, game as ccGame, Game as CCGame } from 'cc';
import { getLoader } from '../../AssetLoader';
import {
  buildGameData, createGame, DATA_FILES, Game, GameData, GameEvent, HeroInfo, Check, RawTables, ResourceMap, UnitAnim,
  MonsterUnitView, HeroUnitView, SceneView, resourceName, joystickToWorld,
} from '../../core/index';
import { Source, Cmd, CmdResult } from './Source';
import {
  Mode, WorldV, FieldHudV, DungeonHudV, ViewEvent, BuildingPanelV, TavernV, RevealV, HeroCardV, HeroDetailV, SquadV,
  TrainingV, GateV, ResultV, BuildModeV, WelcomeV, SettingsV, UnitV, NodeV, PickupV, BuildingV, TelegraphV, MapV, Res, StatRowV,
} from './ViewModel';
import type { RenderCfg } from '../world/WorldRenderer';
import { useDataColors } from '../kit/Theme';

// ---- art mapping (04-placeholder-art.md): presentation only ----
const NPC: Record<string, string> = { storage: 'urban:0320', lumber_camp: 'urban:0023', tavern: 'urban:0104', ore_mine: 'urban:0266', training_yard: 'urban:0131', market: 'urban:0158', dungeon_gate: 'urban:0185' };
const WEAPON: Record<string, string> = { bang: 'td:0104', rua_sat: 'td:0104', muc: 'td:0103', do_neo: 'td:0118', kinh_vuong: 'td:0118' };
const MAGIC: Record<string, string> = { dang: '#FFB347', trieu: '#7FD4FF' };

const tint = (t: string | undefined) => (!t || t.toUpperCase() === '#FFFFFF' ? undefined : t);
const fail = (c: Check): CmdResult => ({ ok: c.ok, reason: c.ok ? '' : c.text });

/** "Hệ số 1.8 ▶ 2.2" lines from the core's current/next star parameters and their names (tooltip of 03-ux-spec.md 8.2). */
function paramText(p: { [k: string]: number }, next: { [k: string]: number } | null, names: { [k: string]: string }): string {
  return Object.keys(p).map((k) => `${names[k] ?? k} ${p[k]}${next && next[k] !== undefined ? ' ▶ ' + next[k] : ''}`).join(' · ');
}

function animToAct(a: UnitAnim, alive: boolean): UnitV['act'] {
  if (!alive || a === 'dead') return 'dead';
  return a === 'cast' ? 'windup' : a;
}

export async function loadCore(): Promise<CoreSource> {
  const loader = getLoader();
  const raw: RawTables = {};
  await Promise.all(DATA_FILES.map(async (f) => { raw[f] = await loader.json('data/' + f); }));
  const data = buildGameData(raw);
  useDataColors(data.tuning.hero.rarityColor, data.tuning.hero.attrColor);
  return new CoreSource(data);
}

export class CoreSource implements Source {
  readonly kind = 'core';
  g: Game | null = null;
  private paused = false;
  private events: ViewEvent[] = [];
  private acc = 0;
  /** Real clock + the time skipped by fastForward, so clock-driven rules (production, build timers, tavern) move too. */
  private skippedMs = 0;
  private clock = { nowMs: () => Date.now() + this.skippedMs };
  private joy = { x: 0, y: 0 };
  // reused per-frame objects (no allocation per unit per frame)
  private unitPool: UnitV[] = [];
  private units: UnitV[] = [];
  private nodePool: NodeV[] = [];
  private pickPool: PickupV[] = [];
  private bPool: BuildingV[] = [];
  private telPool: TelegraphV[] = [];
  private worldV: WorldV;
  private mapV: MapV;
  private slow = { t: -1, squadHint: false };
  private welcomeTaken = false;
  private lastReport: Game['offlineReport'] = null;

  constructor(readonly data: GameData) {
    const t = data.tuning;
    const paths: [number, number][] = [];
    for (const seg of data.field.paths) {
      const [a, b] = seg;
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let i = 0; i <= n; i++) paths.push([Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n)]);
    }
    const zoneEdges = t.world.zones.filter((z) => z.id === 'z1' || z.id === 'z2').map((z) => z.dMax);
    this.mapV = { w: t.world.mapW, h: t.world.mapH, village: t.world.villageGrid, paths, zoneEdges };
    this.worldV = { area: 'field', focusX: 30, focusY: 30, units: [], nodes: [], pickups: [], buildings: [], signs: [], telegraphs: [], map: this.mapV };
    // Save when the app goes to the background (01-game-design.md section 15.1).
    ccGame.on(CCGame.EVENT_HIDE, () => this.save());
  }

  render(): RenderCfg { return this.data.tuning.render as unknown as RenderCfg; }

  /** TITLE tap: load the save (or start fresh) and apply offline progress. */
  private start(): void {
    const key = this.data.tuning.save.key;
    let text: string | null = null;
    try { text = sys.localStorage.getItem(key); } catch { text = null; }
    try {
      this.g = createGame({ data: this.data, clock: this.clock, save: text ? JSON.parse(text) : null, seed: Date.now() >>> 0 });
    } catch (e) {
      console.warn('[view] save rejected, new game', e);
      this.g = createGame({ data: this.data, clock: this.clock, seed: Date.now() >>> 0 });
    }
    this.lastReport = this.g.offlineReport;
    this.welcomeTaken = false;
  }
  private save(): void {
    if (!this.g) return;
    try { sys.localStorage.setItem(this.data.tuning.save.key, JSON.stringify(this.g.save())); } catch (e) { console.warn('[view] save failed', e); }
  }

  tick(dt: number): void {
    const g = this.g;
    if (!g) return;
    if (!this.paused) {
      this.acc = Math.min(this.acc + dt, 0.25);
      while (this.acc >= g.stepSec) { g.step(); this.acc -= g.stepSec; }
    }
    for (let i = 0; i < g.eventCount; i++) this.mapEvent(g.events[i]);
    g.clearEvents();
  }

  mode(): Mode {
    const g = this.g;
    if (!g) return 'TITLE';
    return g.mode === 'world' ? 'WORLD' : g.mode === 'build' ? 'BUILD' : g.mode === 'dungeon' ? 'DUNGEON' : 'RESULT';
  }

  // ---------------- world ----------------
  private unit(i: number): UnitV {
    let u = this.unitPool[i];
    if (!u) { u = { id: 0, kind: 'hero', art: '', x: 0, y: 0, hp: 0, hpMax: 1, act: 'idle' }; this.unitPool[i] = u; }
    return u;
  }

  world(): WorldV {
    const g = this.g!;
    const w = this.worldV;
    const scene: SceneView = g.scene;
    const dungeon = scene.kind === 'dungeon';
    w.area = dungeon ? 'dungeon' : 'field';
    const lead = scene.leader ?? scene.heroes[0];
    if (lead) { w.focusX = lead.x; w.focusY = lead.y; }
    let n = 0;
    const byId = (id: number) => {
      for (const m of scene.monsters) if (m.id === id) return m;
      for (const h of scene.heroes) if (h.id === id) return h;
      return null;
    };
    for (const h of scene.heroes) {
      const def = this.data.heroById[h.heroId];
      const u = this.unit(n++);
      this.fillUnit(u, h, 'hero', def.sprite, tint(def.tint));
      u.leader = h.isLeader; u.ranged = def.ranged; u.weapon = WEAPON[h.heroId];
      this.target(u, h.targetId, byId);
    }
    for (const m of scene.monsters) {
      const def = this.data.monsterById[m.monsterId];
      const u = this.unit(n++);
      this.fillUnit(u, m, m.kind === 'normal' ? 'monster' : m.kind, def.sprite, tint(def.tint));
      u.leader = false; u.ranged = def.ranged; u.weapon = undefined;
      if ((m as MonsterUnitView).state === 'corpse') u.act = 'dead';
      this.target(u, m.targetId, byId);
    }
    this.units.length = n;
    for (let i = 0; i < n; i++) this.units[i] = this.unitPool[i];
    w.units = this.units;
    // pickups
    w.pickups.length = 0;
    scene.pickups.forEach((p, i) => {
      const v = this.pickPool[i] ?? (this.pickPool[i] = { id: 0, kind: 'gold', x: 0, y: 0 });
      v.id = p.id; v.kind = p.item === 'meat' ? 'meat' : p.item === 'coral' ? 'coral' : 'gold'; v.x = p.x; v.y = p.y;
      w.pickups.push(v);
    });
    w.telegraphs.length = 0;
    scene.telegraphs.forEach((t, i) => {
      const v = this.telPool[i] ?? (this.telPool[i] = { kind: 'circle', x: 0, y: 0, pct: 0 });
      v.kind = t.shape; v.x = t.x; v.y = t.y; v.radius = t.radius; v.len = t.length; v.width = t.width; v.dirX = t.dirX; v.dirY = t.dirY;
      v.pct = t.duration > 0 ? Math.min(1, t.elapsed / t.duration) : 1;
      w.telegraphs.push(v);
    });
    w.nodes.length = 0; w.buildings.length = 0; w.signs.length = 0;
    if (dungeon) {
      const r = g.run!;
      w.room = { w: r.roomW, h: r.roomH, exit: r.exitOpen ? { x: r.exitX, y: r.exitY } : null, floor: r.floor };
      w.map = undefined;
    } else {
      w.room = undefined;
      w.map = this.mapV;
      g.field.nodes.forEach((nd, i) => {
        const v = this.nodePool[i] ?? (this.nodePool[i] = { id: 0, kind: 'tree', art: '', x: 0, y: 0, depleted: false, respawnPct: 0 });
        const def = this.data.field.nodeTypes[nd.type];
        v.id = nd.index; v.kind = nd.kind; v.art = def.sprite; v.tint = tint((def as any).tint); v.x = nd.x; v.y = nd.y; v.depleted = nd.depleted;
        v.respawnPct = nd.respawnSec > 0 ? 1 - nd.respawnT / nd.respawnSec : 1;
        v.inReach = nd.inReach;
        w.nodes.push(v);
      });
      this.refreshSlow();
      const now = this.clock.nowMs();
      g.buildings.forEach((b, i) => {
        const v = this.bPool[i] ?? (this.bPool[i] = { uid: 0, type: '', name: '', level: 0, x: 0, y: 0, w: 0, h: 0, job: null });
        v.uid = b.uid; v.type = b.type; v.name = b.name; v.level = b.level; v.x = b.x; v.y = b.y; v.w = b.w; v.h = b.h;
        v.job = b.job ? { kind: b.job.kind, pct: Math.max(0, Math.min(1, (now - b.job.startedAt) / Math.max(1, b.job.endsAt - b.job.startedAt))), remainSec: Math.max(0, (b.job.endsAt - now) / 1000) } : null;
        v.buffer = b.bufferCap > 0 ? { res: b.bufferResource as Res, amount: b.buffer, cap: b.bufferCap } : undefined;
        v.badge = b.marker === 'alert' ? 'exclaim' : b.marker === 'check' ? 'check' : null; // core picks the marker
        w.buildings.push(v);
      });
      const zones = this.data.tuning.world.zones;
      for (const s of this.data.field.signposts) {
        const z = zones.find((q) => q.id === s.zone);
        w.signs.push({ x: s.pos[0], y: s.pos[1], name: z ? z.name : s.zone, cp: s.recommendedCp, weak: g.squadCp < s.recommendedCp });
      }
    }
    return w;
  }

  private fillUnit(u: UnitV, s: HeroUnitView | MonsterUnitView, kind: UnitV['kind'], art: string, t: string | undefined): void {
    u.id = s.id; u.kind = kind; u.art = art; u.tint = t; u.x = s.x; u.y = s.y; u.hp = s.hp; u.hpMax = s.maxHp;
    u.act = animToAct(s.anim, s.alive);
  }
  private target(u: UnitV, targetId: number, byId: (id: number) => { x: number; y: number } | null): void {
    u.tx = undefined; u.ty = undefined;
    if (targetId > 0) { const t = byId(targetId); if (t) { u.tx = t.x; u.ty = t.y; } }
    else if (targetId < 0 && this.g!.scene.kind === 'field') { const nd = this.g!.field.nodes[-targetId - 1]; if (nd) { u.tx = nd.x; u.ty = nd.y; } }
  }

  /** The squad arrow needs getSquadInfo() (it allocates): refreshed once per second. */
  private refreshSlow(): void {
    const g = this.g!;
    const now = g.playSec;
    if (now - this.slow.t < 1 && this.slow.t >= 0) return;
    this.slow.t = now;
    this.slow.squadHint = g.getSquadInfo().canImprove;
  }

  // ---------------- HUD ----------------
  fieldHud(): FieldHudV {
    const g = this.g!;
    this.refreshSlow();
    const p = g.player;
    const st = g.findBuilding('storage');
    const inVillage = g.leaderZone === 'village';
    const q = g.quest;
    const leader = g.squad[0];
    return {
      level: p.level, expPct: p.expToNext > 0 ? p.exp / p.expToNext : 1, cp: g.squadCp,
      gold: g.resources.gold ?? 0, coral: g.resources.coral ?? 0,
      res: { meat: Math.floor(g.resources.meat ?? 0), wood: Math.floor(g.resources.wood ?? 0), ore: Math.floor(g.resources.ore ?? 0), cap: g.storageCap('wood'), storageLevel: st ? st.level : 0 },
      quest: { text: q.text, icon: q.icon || 'icon/flag_triangle', cur: Math.min(q.progress, q.target), need: q.target, done: q.complete, finished: q.finished },
      inVillage,
      portal: inVillage ? (g.field.returnPoint ? 'field' : null) : 'village',
      portalBlocked: inVillage ? false : !g.canReturnToVillage().ok,
      squadCount: g.squad.length, squadSlots: g.squadSlots,
      leaderArt: leader ? this.data.heroById[leader].sprite : 'td:0097',
      squadHint: this.slow.squadHint,
      channelPct: g.field.returnChannelT > 0 ? 1 - g.field.returnChannelT : null,
    };
  }

  dungeonHud(): DungeonHudV {
    const g = this.g!;
    const r = g.run!;
    let boss: DungeonHudV['boss'] = null;
    if (r.bossId) {
      const b = g.scene.monsters.find((m) => m.id === r.bossId);
      if (b) boss = { name: r.bossName, hp: b.hp, hpMax: b.maxHp };
    }
    return {
      floor: r.floor, runGold: r.loot.gold ?? 0, streak: r.streak, streakPct: r.streakT / this.data.tuning.dungeon.streakTimeoutSec,
      boss,
      squad: g.scene.heroes.map((h) => { const d = this.data.heroById[h.heroId]; return { art: d.sprite, tint: tint(d.tint), hpPct: h.maxHp > 0 ? h.hp / h.maxHp : 0, dead: !h.alive }; }),
      auto: r.auto, paused: this.paused,
    };
  }

  // ---------------- events ----------------
  drainEvents(): ViewEvent[] { const e = this.events; this.events = []; return e; }

  private mapEvent(e: GameEvent): void {
    const E = this.events;
    switch (e.type) {
      case 'attack': {
        const sk = e.key ? this.data.skillById[e.key] : null;
        const target = this.findUnit(e.id2);
        const heroId = this.heroIdOf(e.id);
        E.push({ t: 'attack', unitId: e.id, ranged: e.n === 1, tx: target ? target.x : e.x, ty: target ? target.y : e.y, // skill name/ring come with the 'skill' event
          color: heroId && MAGIC[heroId] ? MAGIC[heroId] : sk && heroId ? this.data.tuning.hero.attrColor[this.data.heroById[heroId].attribute] : undefined });
        break;
      }
      case 'damage': E.push({ t: 'damage', x: e.x, y: e.y, amount: Math.round(e.n), onHero: e.key === 'hero', targetId: e.id }); break;
      case 'heal': E.push({ t: 'heal', x: e.x, y: e.y, amount: Math.round(e.n) }); break;
      case 'skill': {
        const heroId = this.heroIdOf(e.id);
        const sk = this.data.skillById[e.key];
        E.push({ t: 'skill', unitId: e.id, x: e.x, y: e.y, name: sk ? sk.name : '', radius: e.n, color: heroId ? this.data.tuning.hero.attrColor[this.data.heroById[heroId].attribute] : '#FFFFFF' });
        break;
      }
      case 'death': E.push({ t: 'death', unitId: e.id }); break;
      case 'exp': E.push({ t: 'exp', x: e.x, y: e.y, amount: Math.round(e.n) }); break;
      case 'gather':
        E.push({ t: 'gather', x: e.x, y: e.y, amount: Math.round(e.n), res: e.key as Res, nodeId: e.id });
        E.push({ t: 'sound', name: e.key === 'wood' ? 'chop-wood-hit-01' : 'mine-rock-hit-01' });
        break;
      case 'node_depleted': E.push({ t: 'sound', name: 'tree-fall-01' }); break;
      case 'pickup': E.push({ t: 'pickup', res: e.key as Res, amount: Math.round(e.n) }); break;
      case 'collect': E.push({ t: 'sound', name: 'confirm-01' }); break;
      case 'player_level': E.push({ t: 'big', text: 'Lên cấp!' }, { t: 'sound', name: 'level-up' }); break;
      case 'streak_bonus': E.push({ t: 'streakBonus', amount: Math.round(e.n) }); break;
      case 'telegraph': E.push({ t: 'sound', name: 'switch-b' }); break;
      case 'floor_start': E.push({ t: 'floor', floor: e.n }); break;
      case 'build_started': E.push({ t: 'sound', name: 'build-drop' }); break;
      case 'build_done': E.push({ t: 'big', text: 'Xây xong' }, { t: 'sound', name: 'menu-confirm' }); break;
      case 'building_moved': E.push({ t: 'sound', name: 'drop-01' }); break;
      case 'quest_complete': E.push({ t: 'sound', name: 'select-01' }); break;
      case 'teleport': E.push({ t: 'teleport' }); break;
      case 'wipe': E.push({ t: 'fade' }); break;
      case 'toast': if (e.text) E.push({ t: 'toast', text: e.text, error: e.key === 'storage_full' || e.key === 'monsters_near' || e.key === 'need_village' || e.key === 'blocked' }); break;
      case 'save_point': this.save(); break;
      default:
    }
  }
  private findUnit(id: number): { x: number; y: number } | null {
    const s = this.g!.scene;
    for (const m of s.monsters) if (m.id === id) return m;
    for (const h of s.heroes) if (h.id === id) return h;
    return null;
  }
  private heroIdOf(id: number): string | null {
    for (const h of this.g!.scene.heroes) if (h.id === id) return h.heroId;
    return null;
  }

  // ---------------- commands ----------------
  send(c: Cmd): CmdResult {
    if (c.t === 'title') { this.start(); return { ok: true }; }
    const g = this.g;
    if (!g) return { ok: false, reason: '' };
    switch (c.t) {
      case 'joystick': { const w = joystickToWorld(this.data, c.x, c.y, this.joy); g.setJoystick(w.x, w.y); return { ok: true }; }
      case 'portal': return fail(g.leaderZone === 'village' ? g.goToField() : g.returnToVillage());
      case 'enterBuild': return fail(g.enterBuildMode());
      case 'exitBuild': return fail(g.exitBuildMode());
      case 'place': return fail(g.placeBuilding(c.type, c.x, c.y));
      case 'move': return fail(g.moveBuilding(c.uid, c.x, c.y));
      case 'upgrade': return fail(g.upgradeBuilding(c.uid));
      case 'cancelJob': return fail(g.cancelBuildingJob(c.uid));
      case 'collect': return fail(g.collectBuilding(c.uid));
      case 'recruit': return fail(g.recruit(c.count));
      case 'refreshCards': return fail(g.refreshCards());
      case 'exchange': return fail(g.exchangeTickets(c.id, c.heroId ?? ''));
      case 'heroLevelUp': return fail(g.levelUpHero(c.id));
      case 'squadAdd': return fail(g.squadAdd(c.id));
      case 'squadRemove': return fail(g.squadRemove(c.id));
      case 'squadSwap': return fail(g.squadSwap(c.a, c.b));
      case 'squadReplace': return fail(g.squadReplace(c.slot, c.id));
      case 'autoAssign': return fail(g.autoAssign());
      case 'trainingUnlock': return fail(g.unlockTrainingNode());
      case 'slotUnlock': return fail(g.unlockSquadSlot());
      case 'enterDungeon': return fail(g.enterDungeon(c.stage));
      case 'setAuto': g.setAuto(c.on); return { ok: true };
      case 'pause': this.paused = c.on; if (c.on) g.setJoystick(0, 0); return { ok: true };
      case 'leaveDungeon': this.paused = false; return fail(g.leaveDungeon());
      case 'resultContinue': return fail(g.closeResult());
      case 'claimQuest': return fail(g.claimQuest());
      case 'guide': return { ok: true };
      case 'setting': g.setSetting(c.key, c.on); this.save(); return { ok: true };
      case 'resetSave':
        try { sys.localStorage.removeItem(this.data.tuning.save.key); } catch { /* storage unavailable */ }
        this.g = null; this.paused = false;
        return { ok: true };
      case 'collectAll': g.collectAll(); this.save(); return { ok: true };
      default: return { ok: false, reason: '' };
    }
  }

  // ---------------- panel queries ----------------
  building(uid: number): BuildingPanelV | null {
    const g = this.g!;
    const p = g.getBuildingPanel(uid);
    if (!p) return null;
    const fmt = (v: number, pct: boolean) => (pct ? `${Math.round(v * 1000) / 10}%` : String(Math.floor(v)));
    const rows: StatRowV[] = p.rows.map((r) => ({
      icon: r.icon, label: r.label, value: fmt(r.value, r.percent),
      delta: r.delta ? '+' + fmt(r.delta, r.percent) : undefined,
      action: r.key === 'buffer' ? { label: 'Thu', enabled: p.canCollect.ok, cmd: 'collect' } : undefined,
    }));
    const now = this.clock.nowMs();
    const job = p.job ? { kind: p.job.kind, pct: Math.max(0, Math.min(1, (now - p.job.startedAt) / Math.max(1, p.job.endsAt - p.job.startedAt))), remainSec: p.jobRemainingSec } : null;
    const cost = p.upgradeCost ? Object.keys(p.upgradeCost.cost).filter((k) => p.upgradeCost!.cost[k] > 0).map((k) => ({ res: k as Res, amount: p.upgradeCost!.cost[k], lack: (p.upgradeCost!.missing[k] ?? 0) > 0 })) : [];
    return { uid, type: p.type, name: p.name, npc: NPC[p.type] ?? 'urban:0320', art: p.type, level: p.level, maxLevel: p.maxLevel, job, rows, note: p.desc,
      cost, buildSec: p.upgradeSec, blocked: p.canUpgrade.ok ? null : p.canUpgrade.text };
  }
  buildingAt(x: number, y: number): number | null {
    const b = this.g!.buildingAt(x + 0.5, y + 0.5);
    return b ? b.uid : null;
  }

  private heroCard(h: HeroInfo): HeroCardV {
    return { id: h.id, name: h.name, art: h.sprite, tint: tint(h.tint), rarity: h.rarity, attr: h.attribute, owned: h.owned, level: h.level, cp: h.cp,
      inSquad: h.inSquad, canLevel: h.owned && h.canLevelUp.ok, frag: h.fragments, fragNeed: h.fragmentsForNextBreakthrough || null };
  }

  tavern(): TavernV {
    const g = this.g!;
    const t = g.getTavernInfo();
    const list = g.getHeroList();
    const byId = (id: string) => list.find((h) => h.id === id)!;
    return {
      cards: t.cards.map((c) => ({ ...this.heroCard(byId(c.heroId)), isNew: !c.owned, dupFrags: c.duplicateFragments, highlight: c.rarity === 'E' || c.rarity === 'L' })),
      bonus: t.bonus, bonusMax: t.bonusEvery, refreshSec: t.refreshInSec, refreshCost: t.manualRefreshGold, drawCost: t.costGold,
      gold: g.resources.gold ?? 0, tickets: t.tickets,
      exchange: t.exchanges.map((e) => ({ id: e.id, label: e.desc, price: e.tickets, enabled: e.check.ok, reason: e.check.text, eligible: e.eligibleHeroIds.slice() })),
      recruitBlocked: t.recruitOptions.map((o) => (o.check.ok ? null : o.check.text)),
      recruitCost: t.recruitOptions.map((o) => o.costGold),
      refreshBlocked: t.canRefresh.ok ? null : t.canRefresh.text,
    };
  }
  lastReveal(): RevealV | null {
    const r = this.g!.lastRecruit;
    if (!r || !r.draws.length) return null;
    const list = this.g!.getHeroList();
    const card = (id: string) => this.heroCard(list.find((h) => h.id === id)!);
    // v2: every draw of one press comes from r.cards; a BONUS set (cardsAfter) applies after the press.
    return {
      cards: r.cards.map(card),
      draws: r.draws.map((d) => ({ cardIndex: d.pickIndex, isNew: d.isNew, frags: d.fragmentsGained, fragsAfter: d.fragmentsAfter })),
      cardsAfter: r.bonusRefreshed ? r.cardsAfter.map(card) : null,
    };
  }
  heroes(): HeroCardV[] { return this.g!.getHeroList().map((h) => this.heroCard(h)); }
  hero(id: string): HeroDetailV | null {
    const g = this.g!;
    const h = g.getHeroInfo(id);
    if (!h) return null;
    const maxed = h.level >= h.maxLevel;
    const c = h.canLevelUp;
    return {
      card: this.heroCard(h), atk: Math.round(h.atk), hp: Math.round(h.hp), atkNext: Math.round(h.atkNext), hpNext: Math.round(h.hpNext), meat: Math.floor(g.resources.meat ?? 0),
      milestones: h.milestones.map((m) => ({ level: m.level, text: m.desc, reached: m.reached })),
      skills: h.skills.map((s) => ({ name: s.name, stars: s.stars, maxStars: 3, unlocked: s.unlocked, unlockLevel: s.unlockLevel, desc: s.desc, kind: s.typeName, cooldownSec: s.cooldownSec, params: paramText(s.params, s.nextParams, s.paramNames) })),
      cost: h.owned && !maxed ? { meat: h.levelUpMeat, frags: h.levelUpFragments, lackMeat: !c.ok && c.reason === 'missing_resources', lackFrags: !c.ok && c.reason === 'missing_fragments', blocked: c.ok ? null : c.text } : null,
      maxed,
    };
  }
  squad(): SquadV {
    const g = this.g!;
    const s = g.getSquadInfo();
    return { slots: s.slots, members: s.heroIds.slice(), cards: this.heroes(), cp: s.cp };
  }
  training(): TrainingV {
    const g = this.g!;
    const t = g.getTrainingInfo();
    const st = (s: string) => (s === 'unlocked' ? 'done' : s === 'available' ? 'open' : 'locked') as 'done' | 'open' | 'locked';
    return {
      ore: Math.floor(g.resources.ore ?? 0), coral: g.resources.coral ?? 0, playerLevel: g.player.level,
      nodes: t.nodes.map((n) => ({ index: n.index, stat: n.stat === 'hp' ? 'HP' : 'ATK', amount: n.value, cost: n.ore, state: st(n.state), reqPlayerLevel: n.reqPlayerLevel })),
      slots: t.slotNodes.map((s) => ({ slot: s.slot, cost: s.coral, reqYardLevel: s.reqYardLevel, state: st(s.state), lockText: s.check.text || `Cần Sân Tập cấp ${s.reqYardLevel}`, blocked: s.check.ok ? null : s.check.text })),
      nextBlocked: t.canUnlockNext.ok ? null : t.canUnlockNext.text,
    };
  }
  gate(stage: number | null): GateV {
    const g = this.g!;
    const d = g.getDungeonInfo();
    const s = d.stages[Math.max(1, Math.min(d.stages.length, stage ?? d.defaultStage)) - 1];
    const boss = this.data.monsterById[s.bossId];
    const resList = (m: ResourceMap) => Object.keys(m).filter((k) => m[k] > 0).map((k) => ({ res: k as Res, amount: m[k] }));
    return {
      stage: s.stage, stageName: s.name, floors: `Tầng ${s.firstFloor}–${s.bossFloor}`, recommendedCp: s.recommendedCp, teamCp: s.squadCp,
      difficulty: { label: s.label, color: s.color }, rewardsFirst: resList(s.firstClear),
      rewardsRepeat: [{ res: 'gold', amount: s.repeatClear.gold }, { res: 'tickets', amount: s.repeatClear.tickets }],
      cleared: s.cleared, locked: s.canEnter.ok ? null : s.canEnter.text,
      canPrev: s.stage > 1, canNext: s.stage < d.stages.length, bossArt: boss ? boss.sprite : 'td:0092', bossTint: boss ? tint(boss.tint) : undefined,
    };
  }
  result(): ResultV | null {
    const g = this.g!;
    const r = g.result;
    if (!r) return null;
    const order = ['gold', 'coral', 'tickets', 'meat'];
    const rewards = Object.keys(r.total).filter((k) => r.total[k] > 0).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((k) => ({ res: k as Res, amount: r.total[k] }));
    const lead = this.data.heroById[g.squad[0]];
    return { victory: r.outcome === 'victory', rewards, firstClearText: r.firstClear ? `Lần đầu vượt chặng ${r.stage}!` : null, leaderArt: lead ? lead.sprite : 'td:0097', leaderTint: lead ? tint(lead.tint) : undefined };
  }
  buildMode(): BuildModeV {
    const g = this.g!;
    return {
      freeBuilders: g.buildersFree, builders: g.buildersTotal, ghost: null, selected: null,
      cards: g.getBuildMenu().map((b) => ({
        type: b.type, name: b.name, art: b.type, w: b.w, h: b.h,
        cost: Object.keys(b.cost.cost).filter((k) => b.cost.cost[k] > 0).map((k) => ({ res: k as Res, amount: b.cost.cost[k], lack: (b.cost.missing[k] ?? 0) > 0 })),
        buildSec: b.buildSec, state: b.state === 'available' ? 'ok' : b.state, lockLevel: b.unlockPlayerLevel,
      })),
    };
  }
  canPlace(type: string, x: number, y: number, uid: number | null): CmdResult {
    return fail(uid !== null ? this.g!.checkMove(uid, x, y) : this.g!.checkPlacement(type, x, y));
  }
  nearestFree(type: string, x: number, y: number): { x: number; y: number } | null { return this.g!.findFreeCell(type, x, y); }
  questHint(): { kind: 'world' | 'ui' | 'none'; x: number; y: number; ui: string } { const h = this.g!.getQuestHint(); return { kind: h.kind, x: h.x, y: h.y, ui: h.ui }; }
  welcome(): WelcomeV | null {
    const r = this.lastReport;
    if (!r || !r.showPanel || this.welcomeTaken) return null;
    this.welcomeTaken = true;
    const lines = [
      ...r.buffers.filter((b) => b.amount >= 1).map((b) => `${b.name}: ${Math.floor(b.amount)} ${resourceName(b.resource)} chờ thu`),
      ...r.finished.map((f) => `Xây xong: ${f.name} cấp ${f.level}`),
      ...(r.tavernRefreshed ? ['Quán đã đổi hero mới'] : []),
    ];
    return { awaySec: r.offlineSec, capHours: this.data.tuning.economy.offlineCapHours, lines };
  }
  settings(): SettingsV {
    const s = this.g ? this.g.settings : { music: true, sfx: true };
    return { music: s.music, sfx: s.sfx, version: 'M1 · hợp đồng lõi v1' };
  }
  /**
   * Harness only (via globalThis.__game.fastForward): runs the core `sec` seconds at once, events included, and
   * moves the clock injected into the core forward by the same time (production, build timers, tavern refresh).
   */
  fastForward(sec: number): void {
    const g = this.g;
    if (!g) return;
    const n = Math.round(sec / g.stepSec);
    for (let i = 0; i < n; i++) {
      this.skippedMs += g.stepSec * 1000; // the injected clock advances with every step run
      g.step();
      for (let k = 0; k < g.eventCount; k++) this.mapEvent(g.events[k]);
      g.clearEvents();
      if (this.events.length > 300) {
        // Keep every state event (floor, toast, big...); drop only old cosmetic ones (numbers, swings, sounds).
        const cosmetic = (e: ViewEvent) => e.t === 'damage' || e.t === 'exp' || e.t === 'attack' || e.t === 'heal' || e.t === 'skill' || e.t === 'sound' || e.t === 'gather' || e.t === 'death';
        const old = this.events.slice(0, -150).filter((e) => !cosmetic(e));
        this.events = old.concat(this.events.slice(-150));
      }
    }
  }

  debug(): Record<string, unknown> {
    const g = this.g;
    if (!g) return { started: false };
    const s = g.scene;
    return {
      started: true, mode: g.mode, tick: g.tick, playSec: g.playSec, zone: g.leaderZone,
      leader: s.leader ? { x: s.leader.x, y: s.leader.y } : null,
      heroes: s.heroes.length, monsters: s.monsters.filter((m) => m.alive).length, pickups: s.pickups.length,
      resources: { ...g.resources }, level: g.player.level, cp: g.squadCp, squad: g.squad.slice(), slots: g.squadSlots,
      quest: { index: g.quest.index, id: g.quest.id, text: g.quest.text, progress: g.quest.progress, target: g.quest.target, complete: g.quest.complete },
      buildings: g.buildings.map((b) => ({ uid: b.uid, type: b.type, level: b.level, x: b.x, y: b.y, w: b.w, h: b.h, job: !!b.job, buffer: b.buffer })),
      run: g.run ? { stage: g.run.stage, floor: g.run.floor, streak: g.run.streak, remaining: g.run.remaining, cleared: g.run.cleared, exitOpen: g.run.exitOpen, auto: g.run.auto } : null,
      result: g.result ? { outcome: g.result.outcome } : null,
      paused: this.paused,
    };
  }
}
