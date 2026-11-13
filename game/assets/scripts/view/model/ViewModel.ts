// The read model of the view: plain data the screens draw. Nothing here is computed by the view.
// A "source" (model/Source.ts) fills these from the core (CoreSource) or from fixed stand-in data (StandInSource,
// used for layout screenshots before/without the core). Screens only ever see these types.

export type Mode = 'TITLE' | 'WORLD' | 'BUILD' | 'DUNGEON' | 'RESULT';
export type Res = 'gold' | 'meat' | 'wood' | 'ore' | 'coral' | 'tickets';
export type Rarity = 'N' | 'R' | 'E' | 'L';
export type Attr = 'STR' | 'AGI' | 'INT';

// ---------- world (per frame) ----------
export type UnitKind = 'hero' | 'monster' | 'elite' | 'boss';
export type UnitAct = 'idle' | 'move' | 'windup' | 'attack' | 'dead';
export interface UnitV {
  id: number;
  kind: UnitKind;
  /** Art spec 'td:0097' and tint '#RRGGBB' from heroes.json / monsters.json. */
  art: string;
  tint?: string;
  x: number; y: number;
  hp: number; hpMax: number;
  act: UnitAct;
  /** Cell position of the current attack target, if any (to face it and lunge towards it). */
  tx?: number; ty?: number;
  ranged?: boolean;
  /** Weapon art swung on melee attacks ('td:0104'), heroes only. */
  weapon?: string;
  leader?: boolean;
}
export interface NodeV { id: number; kind: 'tree' | 'rock'; art: string; tint?: string; x: number; y: number; depleted: boolean; respawnPct: number; }
export interface PickupV { id: number; kind: 'gold' | 'meat' | 'coral'; x: number; y: number; }
export interface SignV { x: number; y: number; name: string; cp: number; weak: boolean; }
export interface JobV { kind: 'build' | 'upgrade'; pct: number; remainSec: number; }
export interface BuildingV {
  uid: number; type: string; name: string; level: number;
  x: number; y: number; w: number; h: number;
  job: JobV | null;
  /** Buffer of a production building (shown when >= 1). */
  buffer?: { res: Res; amount: number; cap: number };
  badge?: 'exclaim' | 'check' | null;
}
export interface TelegraphV { kind: 'circle' | 'rect'; x: number; y: number; radius?: number; len?: number; width?: number; dirX?: number; dirY?: number; pct: number; }
export interface WorldV {
  area: 'field' | 'dungeon';
  /** Cell the camera follows (the leader). */
  focusX: number; focusY: number;
  units: UnitV[];
  nodes: NodeV[];
  pickups: PickupV[];
  buildings: BuildingV[];
  signs: SignV[];
  telegraphs: TelegraphV[];
  /** Dungeon room size in cells and exit (when shown). */
  room?: { w: number; h: number; exit: { x: number; y: number } | null; floor: number };
  /** Field map description (static): size, village grid, paths. */
  map?: MapV;
}
export interface MapV { w: number; h: number; village: { x0: number; y0: number; w: number; h: number }; paths: [number, number][]; zoneEdges: number[]; }

// ---------- HUD ----------
export interface QuestV { text: string; icon: string; cur: number; need: number; done: boolean; finished: boolean; }
export interface FieldHudV {
  level: number; expPct: number; cp: number;
  gold: number; coral: number;
  res: { meat: number; wood: number; ore: number; cap: number; storageLevel: number };
  quest: QuestV | null;
  inVillage: boolean;
  /** Return/portal button: 'village' (go home), 'field' (go out), null (hidden). */
  portal: 'village' | 'field' | null;
  portalBlocked: boolean;
  squadCount: number; squadSlots: number; leaderArt: string; squadHint: boolean;
  channelPct: number | null;
}
export interface DungeonHudV {
  floor: number; runGold: number;
  streak: number; streakPct: number;
  boss: { name: string; hp: number; hpMax: number } | null;
  squad: { art: string; tint?: string; hpPct: number; dead: boolean }[];
  auto: boolean;
  paused: boolean;
}

// ---------- panels ----------
export interface StatRowV { icon: string; label: string; value: string; delta?: string; action?: { label: string; enabled: boolean; cmd: string } }
export interface BuildingPanelV {
  uid: number; type: string; name: string; npc: string; art: string; level: number; maxLevel: number;
  job: JobV | null;
  rows: StatRowV[];
  note: string;
  cost: { res: Res; amount: number; lack: boolean }[];
  buildSec: number;
  /** null = can upgrade; otherwise the reason shown on the grey button. */
  blocked: string | null;
}
export interface HeroCardV {
  id: string; name: string; art: string; tint?: string; rarity: Rarity; attr: Attr;
  owned: boolean; level: number; cp: number;
  inSquad: boolean; canLevel: boolean;
  frag: number; fragNeed: number | null;
}
export interface TavernV {
  cards: (HeroCardV & { isNew: boolean; dupFrags: number; highlight: boolean })[];
  bonus: number; bonusMax: number;
  refreshSec: number; refreshCost: number;
  drawCost: number; gold: number; tickets: number;
  exchange: { id: string; label: string; price: number; enabled: boolean; reason: string; eligible: string[] }[];
  /** Check of 1x/2x/3x (index 0..2): null = can recruit, otherwise the reason. Price per option. */
  recruitBlocked: (string | null)[];
  recruitCost: number[];
  refreshBlocked: string | null;
}
export interface RevealV { cards: HeroCardV[]; draws: { cardIndex: number; isNew: boolean; frags: number }[]; }
export interface MilestoneV { level: number; text: string; reached: boolean; }
export interface SkillV { name: string; stars: number; maxStars: number; unlocked: boolean; unlockLevel: number; desc: string; kind: string; cooldownSec: number; params?: string; }
export interface HeroDetailV {
  card: HeroCardV;
  atk: number; hp: number; atkNext: number; hpNext: number;
  meat: number;
  milestones: MilestoneV[];
  skills: SkillV[];
  cost: { meat: number; frags: number; lackMeat: boolean; lackFrags: boolean; blocked: string | null } | null;
  maxed: boolean;
}
export interface SquadV { slots: number; members: string[]; cards: HeroCardV[]; cp: number; }
export interface TrainingNodeV { index: number; stat: 'HP' | 'ATK'; amount: number; cost: number; state: 'done' | 'open' | 'locked'; reqPlayerLevel: number; }
export interface TrainingV {
  ore: number; coral: number; playerLevel: number;
  nodes: TrainingNodeV[];
  slots: { slot: number; cost: number; reqYardLevel: number; state: 'done' | 'open' | 'locked'; lockText: string; blocked: string | null }[];
  /** Why the next node cannot be unlocked now (null = it can). */
  nextBlocked: string | null;
}
export interface GateV {
  stage: number; stageName: string; floors: string; recommendedCp: number; teamCp: number;
  difficulty: { label: string; color: string };
  rewardsFirst: { res: Res; amount: number }[]; rewardsRepeat: { res: Res; amount: number }[];
  cleared: boolean; locked: string | null;
  canPrev: boolean; canNext: boolean; bossArt: string; bossTint?: string;
}
export interface ResultV { victory: boolean; rewards: { res: Res; amount: number }[]; firstClearText: string | null; leaderArt: string; leaderTint?: string; }
export interface BuildCardV { type: string; name: string; art: string; w: number; h: number; cost: { res: Res; amount: number; lack: boolean }[]; buildSec: number; state: 'ok' | 'built' | 'locked'; lockLevel: number; }
export interface BuildModeV {
  freeBuilders: number; builders: number;
  cards: BuildCardV[];
  ghost: { type: string; x: number; y: number; w: number; h: number; valid: boolean; reason: string; moving: boolean; uid: number } | null;
  selected: number | null;
}
export interface WelcomeV { awaySec: number; capHours: number; lines: string[]; }
export interface SettingsV { music: boolean; sfx: boolean; version: string; }

// ---------- one-shot events ----------
export type ViewEvent =
  | { t: 'damage'; x: number; y: number; amount: number; onHero: boolean; targetId: number }
  | { t: 'heal'; x: number; y: number; amount: number }
  | { t: 'exp'; x: number; y: number; amount: number }
  | { t: 'gather'; x: number; y: number; amount: number; res: Res; nodeId: number }
  | { t: 'pickup'; res: Res; amount: number }
  | { t: 'attack'; unitId: number; ranged: boolean; tx: number; ty: number; skill?: string; color?: string }
  | { t: 'death'; unitId: number }
  | { t: 'toast'; text: string; error?: boolean }
  | { t: 'big'; text: string }
  | { t: 'streakBonus'; amount: number }
  | { t: 'floor'; floor: number }
  | { t: 'sound'; name: string }
  | { t: 'skill'; unitId: number; x: number; y: number; name: string; radius: number; color: string }
  | { t: 'teleport' }
  | { t: 'fade' };
