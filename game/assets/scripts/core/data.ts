// Bảng dữ liệu của game (JSON trong assets/resources/data) + kiểm tra khi nạp.
// View nạp từng file JSON rồi gọi buildGameData(raw). Test đọc cùng file bằng fs.
// Không có số liệu cân bằng nào nằm trong file này: chỉ có kiểu dữ liệu và validator.

export const DATA_FILES = [
  'tuning', 'heroes', 'skills', 'hero-levels', 'player-levels', 'buildings', 'training-tree',
  'recruit', 'monsters', 'drop-tables', 'dungeon', 'field-layout', 'quests',
];

/** Object thô: khóa là tên file không đuôi (ví dụ raw['hero-levels']). */
export interface RawTables { [file: string]: any; }

export type Rarity = 'N' | 'R' | 'E' | 'L';
export type Attribute = 'STR' | 'AGI' | 'INT';
export type HeroRole = 'tank' | 'bruiser' | 'archer' | 'rogue' | 'healer' | 'mage';
export type SkillType = 'strike' | 'cleave' | 'nova' | 'volley' | 'heal' | 'buff_atk' | 'taunt';
export type MonsterKind = 'normal' | 'elite' | 'boss';
export type ZoneId = 'village' | 'z1' | 'z2' | 'z3';
export type SpawnPattern = 'ring' | 'front' | 'waves' | 'boss';
export type QuestType = 'gather' | 'kill' | 'hero_level' | 'build' | 'recruit' | 'auto_assign' | 'collect'
  | 'upgrade' | 'training' | 'clear_floor' | 'slots';

export const RARITIES: Rarity[] = ['N', 'R', 'E', 'L'];
export const SKILL_TYPES: SkillType[] = ['strike', 'cleave', 'nova', 'volley', 'heal', 'buff_atk', 'taunt'];
export const QUEST_TYPES: QuestType[] = ['gather', 'kill', 'hero_level', 'build', 'recruit', 'auto_assign', 'collect',
  'upgrade', 'training', 'clear_floor', 'slots'];

export interface ResourceMap { [resource: string]: number; }

export interface ZoneDef { id: ZoneId; name: string; dMin: number; dMax: number; }
export interface DifficultyLabel { minRatio: number; label: string; color: string; }

export interface Tuning {
  sim: { fixedStepSec: number; stepsPerSec: number };
  world: {
    mapW: number; mapH: number; villageCenter: number[];
    villageGrid: { x0: number; y0: number; w: number; h: number };
    zones: ZoneDef[]; mapEdgeBlocked: number; zoneRecommendedCp: { [zone: string]: number };
  };
  render: {
    cellW: number; cellH: number; checkerBlock: number; spriteScale: { [key: string]: number };
    groundColorsField: string[]; groundColorsVillage: string[]; groundColorsDungeon: string[];
    pathColor: string; cameraFollowLerp: number;
  };
  squad: {
    moveSpeed: number; followerSpeedMult: number; followerArriveDist: number; heroRadius: number;
    separationDist: number; leashRadius: number; aggroRadius: number; gatherRadius: number;
    attackOnlyWhenIdle: boolean; idleAfterReleaseSec: number; startSlots: number; maxSlots: number;
    formationOffsets: number[][];
  };
  combat: {
    monsterRadius: number; bossRadius: number; meleeRange: number; attackWindupSec: number;
    projectileVisualSec: number; monsterAggroRadiusField: number; monsterAggroRadiusDungeon: number;
    monsterLeashField: number; monsterRegenOutOfCombatPctPerSec: number; hitFlashSec: number;
    knockbackCells: number; retargetSec: number; hitRangeTolerance: number; healThresholdPct: number;
    joystickDeadZonePct: number; bossAbilityStartCooldownPct: number; spatialHashCell: number;
  };
  pickup: {
    magnetRadius: number; autoCollectSec: number; flySpeed: number; scatterRadius: number;
    maxObjectsPerType: number; toastMergeSec: number;
  };
  save: { key: string; autosaveSec: number; welcomeBackMinSec: number };
  field: {
    heroReviveSec: number; wipeRespawnSec: number; monsterRespawnSec: number; eliteRespawnSec: number;
    treeRespawnSec: number; rockRespawnSec: number; storageFullToastCooldownSec: number; collectRadius: number;
    heroRegenPctPerSec: number; outOfCombatDelaySec: number; campRadius: number; wanderSpeedMult: number;
    wanderRetargetSec: number[]; campAggroShared: boolean;
  };
  dungeon: {
    roomW: number; roomH: number; startPos: number[]; exitPos: number[]; maxAlive: number;
    healBetweenFloorsPct: number; floorExitDelaySec: number; floorsPerStage: number; stages: number;
    streakTimeoutSec: number; streakMilestone: number; streakBonusGoldBase: number; exitTouchRadius: number;
    floorFadeSec: number; bossMinionsDespawnOnDeath: boolean; defeatKeepsLootPct: number;
    ringSpawnRadius: number[]; spawnMinDistFromHero: number; difficultyLabels: DifficultyLabel[];
  };
  economy: {
    startResources: ResourceMap; uncapped: string[]; builderSlots: number; offlineCapHours: number;
    productionBufferHours: number;
  };
  hero: {
    maxLevel: number; growthPerLevel: number; rarityMult: { [r: string]: number };
    rarityColor: { [r: string]: string }; attrColor: { [a: string]: string };
  };
  cp: { atkWeight: number; hpWeight: number; refAttackInterval: number; skillCpBonusByType: { [t: string]: number } };
  player: { maxLevel: number };
}

export interface HeroDef {
  id: string; name: string; attribute: Attribute; rarity: Rarity; role: HeroRole;
  baseHp: number; baseAtk: number; attackInterval: number; attackRange: number; ranged: boolean;
  gatherPower: number; skills: string[]; sprite: string; tint: string; flavor: string;
}

export interface SkillDef {
  id: string; name: string; type: SkillType; cooldownSec: number;
  /** Mỗi tham số là một mảng theo sao: params.mult[sao - 1]. */
  params: { [key: string]: number[] }; desc: string;
}

export interface HeroLevelCost { from: number; to: number; meat: number; fragments?: { [r: string]: number }; }
export interface HeroMilestone {
  level: number; type: 'skill_unlock' | 'owned_hp' | 'owned_atk' | 'skill_star';
  skillSlot?: number; pct?: number; desc: string;
}
export interface HeroLevelsTable { maxLevel: number; costs: HeroLevelCost[]; milestones: HeroMilestone[]; }

export interface PlayerLevelsTable { maxLevel: number; levels: { from: number; to: number; exp: number }[]; }

export interface BuildingEffects {
  cap?: ResourceMap; resource?: string; perHour?: number; oddsTier?: number;
  maxSquadSlotsUnlockable?: number; maxStage?: number;
}
export interface BuildingLevelDef {
  level: number; cost: ResourceMap; buildSec: number; reqPlayerLevel: number; effects: BuildingEffects;
}
export interface BuildingDef {
  id: string; name: string; footprint: number[]; maxCount: number; unlockPlayerLevel: number;
  prePlaced?: number[]; desc: string; levels: BuildingLevelDef[];
}

export interface TrainingNodeDef { index: number; stat: 'hp' | 'atk'; value: number; ore: number; reqPlayerLevel: number; }
export interface SlotNodeDef { slot: number; coral: number; reqYardLevel: number; }
export interface TrainingTable { nodes: TrainingNodeDef[]; slotNodes: SlotNodeDef[]; }

export interface OddsRow { tier?: number; N: number; R: number; E: number; L: number; }
export interface TicketExchangeDef { id: string; desc: string; tickets: number; }
export interface RecruitTable {
  costGold: number; multi: number[]; cardCount: number; refreshSec: number; manualRefreshGold: number;
  fragmentsPerDuplicate: number; odds: OddsRow[]; bonusOdds: OddsRow; bonusEvery: number;
  unownedWeight: number; ownedWeight: number; ticketsPerDraw: number; ticketExchange: TicketExchangeDef[];
  /** Suy ra từ firstRecruitScript: bộ thẻ đầu và hero của lượt đầu (xem data.ts). */
  firstCards: string[]; firstHero: string;
}

export interface MonsterDef {
  id: string; name: string; kind: MonsterKind; baseHp: number; baseAtk: number; attackInterval: number;
  attackRange: number; ranged: boolean; moveSpeed: number; radius: number; exp: number; dropTable: string;
  sprite: string; tint: string; scaleKey: string; abilities?: string[];
}
export interface BossAbilityDef {
  name: string; telegraph: 'circle' | 'rect' | 'none'; cooldownSec: number;
  radius?: number; telegraphSec?: number; mult?: number; length?: number; width?: number; count?: number;
}
export interface MonstersTable {
  monsters: MonsterDef[]; abilities: { [id: string]: BossAbilityDef }; fieldZoneMult: { [zone: string]: number };
}

export interface DropRoll { item: string; min: number; max: number; chance: number; }
export interface DropTables { tables: { [id: string]: { rolls: DropRoll[] } }; zoneAmountMult: { [zone: string]: number }; }

export interface StageDef {
  stage: number; name: string; firstFloor: number; bossFloor: number; recommendedCp: number; reqGateLevel: number;
  firstClear: ResourceMap;
  repeatClear: { gold: number; coralChance: number; coralPityEvery: number; tickets: number };
}
export interface FloorGroupDef { monster: string; count: number; pattern: SpawnPattern; delaySec: number; }
export interface FloorDef {
  floor: number; stage: number; isBoss: boolean; groups: FloorGroupDef[]; recommendedCp: number;
  hpMult: number; atkMult: number; goldMult: number; expMult: number; clearGold: number;
}
export interface DungeonTable { dungeonName: string; stages: StageDef[]; floors: FloorDef[]; }

export interface NodeTypeDef {
  resource: string; durability: number; yieldPerHit: number; respawnSec: number; sprite: string; zone: ZoneId;
}
export interface FieldNodeDef { id: string; type: string; pos: number[]; }
export interface CampDef {
  id: string; zone: ZoneId; monster: string; count: number; pos: number[]; radius: number; respawnSec: number;
}
export interface SignpostDef { zone: ZoneId; pos: number[]; recommendedCp: number; }
export interface FieldLayout {
  nodeTypes: { [id: string]: NodeTypeDef }; nodes: FieldNodeDef[]; camps: CampDef[];
  signposts: SignpostDef[]; startPos: number[]; wipeRespawnPos: number[]; paths: number[][][];
}

export interface QuestDef {
  id: string; type: QuestType; params: { [key: string]: any }; text: string; reward: ResourceMap; hint: string;
}
export interface QuestsTable { quests: QuestDef[]; endText: string; }

/** Toàn bộ dữ liệu đã kiểm tra, kèm bảng tra theo id. Không sửa sau khi tạo. */
export interface GameData {
  tuning: Tuning;
  heroes: HeroDef[];
  heroById: { [id: string]: HeroDef };
  skillById: { [id: string]: SkillDef };
  heroLevels: HeroLevelsTable;
  playerLevels: PlayerLevelsTable;
  buildings: BuildingDef[];
  buildingById: { [id: string]: BuildingDef };
  training: TrainingTable;
  recruit: RecruitTable;
  monsterById: { [id: string]: MonsterDef };
  monsters: MonstersTable;
  drops: DropTables;
  dungeon: DungeonTable;
  field: FieldLayout;
  quests: QuestsTable;
}

export class DataError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super('Dữ liệu game không hợp lệ (' + problems.length + ' lỗi):\n- ' + problems.join('\n- '));
    this.name = 'DataError';
    this.problems = problems;
  }
}

// ---------------------------------------------------------------------------------------------
// Validator: gom mọi lỗi thành câu "file.json: đường.dẫn: mô tả" để test báo rõ ràng.
// ---------------------------------------------------------------------------------------------

class Checker {
  problems: string[] = [];
  file = '';
  fail(path: string, msg: string): void { this.problems.push(this.file + '.json: ' + path + ': ' + msg); }
  isObj(v: any): boolean { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  obj(v: any, path: string): boolean {
    if (!this.isObj(v)) { this.fail(path, 'phải là object, nhận ' + describe(v)); return false; }
    return true;
  }
  arr(v: any, path: string, minLen = 0): boolean {
    if (!Array.isArray(v)) { this.fail(path, 'phải là mảng, nhận ' + describe(v)); return false; }
    if (v.length < minLen) { this.fail(path, 'cần ít nhất ' + minLen + ' phần tử, có ' + v.length); return false; }
    return true;
  }
  num(o: any, key: string, path: string, min = -Infinity, max = Infinity, int = false): boolean {
    const v = o ? o[key] : undefined;
    const p = path + '.' + key;
    if (typeof v !== 'number' || !isFinite(v)) { this.fail(p, 'phải là số, nhận ' + describe(v)); return false; }
    if (v < min || v > max) { this.fail(p, 'phải nằm trong [' + min + ', ' + max + '], nhận ' + v); return false; }
    if (int && Math.floor(v) !== v) { this.fail(p, 'phải là số nguyên, nhận ' + v); return false; }
    return true;
  }
  str(o: any, key: string, path: string, oneOf?: string[]): boolean {
    const v = o ? o[key] : undefined;
    const p = path + '.' + key;
    if (typeof v !== 'string' || v.length === 0) { this.fail(p, 'phải là chuỗi khác rỗng, nhận ' + describe(v)); return false; }
    if (oneOf && oneOf.indexOf(v) < 0) { this.fail(p, 'phải là một trong [' + oneOf.join(', ') + '], nhận "' + v + '"'); return false; }
    return true;
  }
  bool(o: any, key: string, path: string): boolean {
    const v = o ? o[key] : undefined;
    if (typeof v !== 'boolean') { this.fail(path + '.' + key, 'phải là true/false, nhận ' + describe(v)); return false; }
    return true;
  }
  pos(v: any, path: string): boolean {
    if (!Array.isArray(v) || v.length !== 2 || typeof v[0] !== 'number' || typeof v[1] !== 'number'
      || !isFinite(v[0]) || !isFinite(v[1])) {
      this.fail(path, 'phải là [x, y], nhận ' + describe(v));
      return false;
    }
    return true;
  }
  resMap(v: any, path: string): boolean {
    if (!this.obj(v, path)) return false;
    let ok = true;
    for (const k of Object.keys(v)) ok = this.num(v, k, path, 0, Infinity, true) && ok;
    return ok;
  }
}

function describe(v: any): string {
  if (v === undefined) return 'không có';
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'mảng';
  if (typeof v === 'string') return '"' + v + '"';
  return typeof v === 'object' ? 'object' : String(v);
}

function indexById<T extends { id: string }>(c: Checker, list: T[], path: string): { [id: string]: T } {
  const out: { [id: string]: T } = {};
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (!it || typeof it.id !== 'string') continue;
    if (out[it.id]) c.fail(path + '[' + i + '].id', 'trùng id "' + it.id + '"');
    out[it.id] = it;
  }
  return out;
}

/** Trả về danh sách lỗi (rỗng nếu dữ liệu hợp lệ). Không ném lỗi. */
export function validateRawTables(raw: RawTables): string[] {
  const c = new Checker();
  for (const f of DATA_FILES) {
    c.file = f;
    if (!raw || !c.isObj(raw[f])) { c.fail('(file)', 'thiếu file hoặc không phải object'); continue; }
    if (raw[f].version !== 1) c.fail('version', 'phải là 1, nhận ' + describe(raw[f].version));
  }
  if (c.problems.length > 0) return c.problems;

  const resources = Object.keys(raw.tuning.economy && raw.tuning.economy.startResources || {});
  checkTuning(c, raw.tuning);
  const skills = checkSkills(c, raw.skills);
  const heroes = checkHeroes(c, raw.heroes, skills);
  checkHeroLevels(c, raw['hero-levels'], raw.tuning);
  checkPlayerLevels(c, raw['player-levels'], raw.tuning);
  const buildings = checkBuildings(c, raw.buildings, resources, raw.tuning);
  checkTraining(c, raw['training-tree'], raw.tuning);
  checkRecruit(c, raw.recruit, heroes);
  const drops = checkDrops(c, raw['drop-tables'], resources);
  const monsters = checkMonsters(c, raw.monsters, drops);
  checkDungeon(c, raw.dungeon, monsters, raw.tuning);
  checkField(c, raw['field-layout'], monsters, raw.tuning);
  checkQuests(c, raw.quests, { resources, buildings, monsters, raw });
  return c.problems;
}

function checkTuning(c: Checker, t: any): void {
  c.file = 'tuning';
  const groups: { [g: string]: string[] } = {
    sim: ['fixedStepSec', 'stepsPerSec'],
    squad: ['moveSpeed', 'followerSpeedMult', 'followerArriveDist', 'heroRadius', 'separationDist', 'leashRadius',
      'aggroRadius', 'gatherRadius', 'idleAfterReleaseSec', 'startSlots', 'maxSlots'],
    combat: ['monsterRadius', 'bossRadius', 'meleeRange', 'attackWindupSec', 'projectileVisualSec',
      'monsterAggroRadiusField', 'monsterAggroRadiusDungeon', 'monsterLeashField', 'monsterRegenOutOfCombatPctPerSec',
      'hitFlashSec', 'knockbackCells', 'retargetSec', 'hitRangeTolerance', 'healThresholdPct', 'joystickDeadZonePct',
      'bossAbilityStartCooldownPct', 'spatialHashCell'],
    pickup: ['magnetRadius', 'autoCollectSec', 'flySpeed', 'scatterRadius', 'maxObjectsPerType', 'toastMergeSec'],
    save: ['autosaveSec', 'welcomeBackMinSec'],
    field: ['heroReviveSec', 'wipeRespawnSec', 'monsterRespawnSec', 'eliteRespawnSec', 'treeRespawnSec',
      'rockRespawnSec', 'storageFullToastCooldownSec', 'collectRadius', 'heroRegenPctPerSec', 'outOfCombatDelaySec',
      'campRadius', 'wanderSpeedMult'],
    dungeon: ['roomW', 'roomH', 'maxAlive', 'healBetweenFloorsPct', 'floorExitDelaySec', 'floorsPerStage', 'stages',
      'streakTimeoutSec', 'streakMilestone', 'streakBonusGoldBase', 'exitTouchRadius', 'floorFadeSec',
      'spawnMinDistFromHero'],
    economy: ['builderSlots', 'offlineCapHours', 'productionBufferHours'],
    hero: ['maxLevel', 'growthPerLevel'],
    cp: ['atkWeight', 'hpWeight', 'refAttackInterval'],
    player: ['maxLevel'],
    render: ['cellW', 'cellH', 'checkerBlock', 'cameraFollowLerp'],
    world: ['mapW', 'mapH', 'mapEdgeBlocked'],
  };
  for (const g of Object.keys(groups)) {
    if (!c.obj(t[g], g)) continue;
    for (const k of groups[g]) c.num(t[g], k, g, 0);
  }
  if (c.problems.length > 0) return;
  if (t.sim.fixedStepSec <= 0 || Math.abs(t.sim.fixedStepSec * t.sim.stepsPerSec - 1) > 0.001) {
    c.fail('sim', 'fixedStepSec × stepsPerSec phải bằng 1');
  }
  c.bool(t.squad, 'attackOnlyWhenIdle', 'squad');
  c.bool(t.field, 'campAggroShared', 'field');
  if (c.arr(t.squad.formationOffsets, 'squad.formationOffsets', 1)) {
    if (t.squad.formationOffsets.length < t.squad.maxSlots) {
      c.fail('squad.formationOffsets', 'cần ít nhất maxSlots = ' + t.squad.maxSlots + ' vị trí');
    }
    t.squad.formationOffsets.forEach((p: any, i: number) => c.pos(p, 'squad.formationOffsets[' + i + ']'));
  }
  if (t.squad.startSlots > t.squad.maxSlots || t.squad.startSlots < 1) c.fail('squad.startSlots', 'phải nằm trong 1..maxSlots');
  c.pos(t.world.villageCenter, 'world.villageCenter');
  if (c.obj(t.world.villageGrid, 'world.villageGrid')) {
    for (const k of ['x0', 'y0', 'w', 'h']) c.num(t.world.villageGrid, k, 'world.villageGrid', 0, Infinity, true);
  }
  if (c.arr(t.world.zones, 'world.zones', 1)) {
    t.world.zones.forEach((z: any, i: number) => {
      const p = 'world.zones[' + i + ']';
      c.str(z, 'id', p); c.str(z, 'name', p); c.num(z, 'dMin', p, 0); c.num(z, 'dMax', p, 0);
    });
  }
  c.obj(t.world.zoneRecommendedCp, 'world.zoneRecommendedCp');
  c.pos(t.dungeon.startPos, 'dungeon.startPos');
  c.pos(t.dungeon.exitPos, 'dungeon.exitPos');
  c.pos(t.dungeon.ringSpawnRadius, 'dungeon.ringSpawnRadius');
  c.pos(t.field.wanderRetargetSec, 'field.wanderRetargetSec');
  if (c.arr(t.dungeon.difficultyLabels, 'dungeon.difficultyLabels', 1)) {
    t.dungeon.difficultyLabels.forEach((l: any, i: number) => {
      const p = 'dungeon.difficultyLabels[' + i + ']';
      c.num(l, 'minRatio', p, 0); c.str(l, 'label', p); c.str(l, 'color', p);
    });
  }
  c.resMap(t.economy.startResources, 'economy.startResources');
  c.arr(t.economy.uncapped, 'economy.uncapped');
  c.obj(t.cp.skillCpBonusByType, 'cp.skillCpBonusByType');
  for (const st of SKILL_TYPES) c.num(t.cp.skillCpBonusByType, st, 'cp.skillCpBonusByType', 0);
  for (const k of ['groundColorsField', 'groundColorsVillage', 'groundColorsDungeon']) c.arr(t.render[k], 'render.' + k, 2);
  c.obj(t.render.spriteScale, 'render.spriteScale');
  c.str(t.save, 'key', 'save');
}

function checkSkills(c: Checker, s: any): { [id: string]: SkillDef } {
  c.file = 'skills';
  if (!c.arr(s.skills, 'skills', 1)) return {};
  const need: { [t: string]: string[] } = {
    strike: ['mult'], cleave: ['mult', 'radius'], nova: ['mult', 'radius'], volley: ['mult', 'count'],
    heal: ['mult', 'count'], buff_atk: ['pct', 'durationSec'], taunt: ['radius', 'durationSec'],
  };
  s.skills.forEach((k: any, i: number) => {
    const p = 'skills[' + i + ']';
    c.str(k, 'id', p); c.str(k, 'name', p); c.num(k, 'cooldownSec', p, 0.1);
    if (!c.str(k, 'type', p, SKILL_TYPES) || !c.obj(k.params, p + '.params')) return;
    for (const key of need[k.type]) {
      const arr = k.params[key];
      if (!c.arr(arr, p + '.params.' + key, 2)) continue;
      for (let j = 0; j < arr.length; j++) {
        if (typeof arr[j] !== 'number' || !(arr[j] > 0)) c.fail(p + '.params.' + key + '[' + j + ']', 'phải là số dương');
      }
    }
  });
  return indexById(c, s.skills, 'skills');
}

function checkHeroes(c: Checker, h: any, skills: { [id: string]: SkillDef }): { [id: string]: HeroDef } {
  c.file = 'heroes';
  if (!c.arr(h.heroes, 'heroes', 1)) return {};
  h.heroes.forEach((x: any, i: number) => {
    const p = 'heroes[' + i + ']';
    c.str(x, 'id', p); c.str(x, 'name', p);
    c.str(x, 'attribute', p, ['STR', 'AGI', 'INT']); c.str(x, 'rarity', p, RARITIES);
    c.str(x, 'role', p, ['tank', 'bruiser', 'archer', 'rogue', 'healer', 'mage']);
    c.num(x, 'baseHp', p, 1); c.num(x, 'baseAtk', p, 1); c.num(x, 'attackInterval', p, 0.1);
    c.num(x, 'attackRange', p, 0.1); c.bool(x, 'ranged', p); c.num(x, 'gatherPower', p, 1, 99, true);
    if (c.arr(x.skills, p + '.skills', 2)) {
      if (x.skills.length !== 2) c.fail(p + '.skills', 'mỗi hero có đúng 2 kỹ năng');
      x.skills.forEach((sid: any, j: number) => {
        if (!skills[sid]) c.fail(p + '.skills[' + j + ']', 'không có kỹ năng "' + sid + '" trong skills.json');
      });
    }
  });
  return indexById(c, h.heroes, 'heroes');
}

function checkHeroLevels(c: Checker, t: any, tuning: any): void {
  c.file = 'hero-levels';
  c.num(t, 'maxLevel', '', 2, 999, true);
  if (tuning.hero && t.maxLevel !== tuning.hero.maxLevel) c.fail('maxLevel', 'phải bằng tuning.hero.maxLevel');
  if (c.arr(t.costs, 'costs', 1)) {
    if (t.costs.length !== t.maxLevel - 1) c.fail('costs', 'cần đúng maxLevel − 1 = ' + (t.maxLevel - 1) + ' dòng, có ' + t.costs.length);
    t.costs.forEach((x: any, i: number) => {
      const p = 'costs[' + i + ']';
      if (c.num(x, 'from', p, 1, 999, true) && x.from !== i + 1) c.fail(p + '.from', 'phải là ' + (i + 1) + ' (theo thứ tự)');
      if (c.num(x, 'to', p, 2, 999, true) && x.to !== i + 2) c.fail(p + '.to', 'phải là ' + (i + 2));
      c.num(x, 'meat', p, 0, Infinity, true);
      if (x.fragments !== undefined && c.obj(x.fragments, p + '.fragments')) {
        for (const r of RARITIES) c.num(x.fragments, r, p + '.fragments', 0, Infinity, true);
      }
    });
  }
  if (c.arr(t.milestones, 'milestones')) {
    t.milestones.forEach((m: any, i: number) => {
      const p = 'milestones[' + i + ']';
      c.num(m, 'level', p, 1, t.maxLevel, true);
      if (!c.str(m, 'type', p, ['skill_unlock', 'owned_hp', 'owned_atk', 'skill_star'])) return;
      if (m.type === 'owned_hp' || m.type === 'owned_atk') c.num(m, 'pct', p, 0, 10);
      else c.num(m, 'skillSlot', p, 0, 1, true);
    });
  }
}

function checkPlayerLevels(c: Checker, t: any, tuning: any): void {
  c.file = 'player-levels';
  c.num(t, 'maxLevel', '', 2, 999, true);
  if (tuning.player && t.maxLevel !== tuning.player.maxLevel) c.fail('maxLevel', 'phải bằng tuning.player.maxLevel');
  if (!c.arr(t.levels, 'levels', 1)) return;
  if (t.levels.length !== t.maxLevel - 1) c.fail('levels', 'cần đúng maxLevel − 1 dòng, có ' + t.levels.length);
  t.levels.forEach((x: any, i: number) => {
    const p = 'levels[' + i + ']';
    if (c.num(x, 'from', p, 1, 999, true) && x.from !== i + 1) c.fail(p + '.from', 'phải là ' + (i + 1));
    c.num(x, 'exp', p, 1, Infinity, true);
  });
}

function checkBuildings(c: Checker, b: any, resources: string[], tuning: any): { [id: string]: BuildingDef } {
  c.file = 'buildings';
  if (!c.arr(b.buildings, 'buildings', 1)) return {};
  const grid = tuning.world && tuning.world.villageGrid;
  b.buildings.forEach((x: any, i: number) => {
    const p = 'buildings[' + i + ']';
    c.str(x, 'id', p); c.str(x, 'name', p);
    c.num(x, 'maxCount', p, 1, 99, true); c.num(x, 'unlockPlayerLevel', p, 1, 999, true);
    const fpOk = c.pos(x.footprint, p + '.footprint');
    if (fpOk && (x.footprint[0] < 1 || x.footprint[1] < 1 || x.footprint[0] % 1 !== 0 || x.footprint[1] % 1 !== 0)) {
      c.fail(p + '.footprint', 'phải là hai số nguyên dương');
    }
    if (x.prePlaced !== undefined && c.pos(x.prePlaced, p + '.prePlaced') && fpOk && grid) {
      if (x.prePlaced[0] < grid.x0 || x.prePlaced[1] < grid.y0 || x.prePlaced[0] + x.footprint[0] > grid.x0 + grid.w
        || x.prePlaced[1] + x.footprint[1] > grid.y0 + grid.h) c.fail(p + '.prePlaced', 'nằm ngoài lưới làng');
    }
    if (!c.arr(x.levels, p + '.levels', 1)) return;
    x.levels.forEach((l: any, j: number) => {
      const q = p + '.levels[' + j + ']';
      if (c.num(l, 'level', q, 1, 999, true) && l.level !== j + 1) c.fail(q + '.level', 'phải là ' + (j + 1) + ' (theo thứ tự)');
      c.num(l, 'buildSec', q, 0); c.num(l, 'reqPlayerLevel', q, 1, 999, true);
      if (c.resMap(l.cost, q + '.cost')) {
        for (const r of Object.keys(l.cost)) if (resources.indexOf(r) < 0) c.fail(q + '.cost.' + r, 'không phải tài nguyên trong tuning.economy.startResources');
      }
      if (!c.obj(l.effects, q + '.effects')) return;
      const e = l.effects;
      if (e.cap !== undefined) c.resMap(e.cap, q + '.effects.cap');
      if (e.resource !== undefined) {
        if (resources.indexOf(e.resource) < 0) c.fail(q + '.effects.resource', 'không phải tài nguyên: ' + describe(e.resource));
        c.num(e, 'perHour', q + '.effects', 0);
      }
      for (const k of ['oddsTier', 'maxSquadSlotsUnlockable', 'maxStage']) {
        if (e[k] !== undefined) c.num(e, k, q + '.effects', 1, 999, true);
      }
    });
  });
  const byId = indexById<BuildingDef>(c, b.buildings, 'buildings');
  const roles: { [id: string]: string } = {
    storage: 'cap', tavern: 'oddsTier', training_yard: 'maxSquadSlotsUnlockable', dungeon_gate: 'maxStage',
  };
  for (const id of Object.keys(roles)) {
    const def = byId[id];
    if (!def) { c.fail('buildings', 'thiếu công trình bắt buộc "' + id + '"'); continue; }
    if (!Array.isArray(def.levels)) continue;
    def.levels.forEach((l: any, j: number) => {
      if (!l || !l.effects || l.effects[roles[id]] === undefined) c.fail('buildings(' + id + ').levels[' + j + '].effects', 'thiếu ' + roles[id]);
    });
  }
  if (byId.storage && !byId.storage.prePlaced) c.fail('buildings(storage)', 'Nhà Kho phải có prePlaced (có sẵn từ đầu)');
  return byId;
}

function checkTraining(c: Checker, t: any, tuning: any): void {
  c.file = 'training-tree';
  if (c.arr(t.nodes, 'nodes', 1)) {
    t.nodes.forEach((n: any, i: number) => {
      const p = 'nodes[' + i + ']';
      if (c.num(n, 'index', p, 0, 9999, true) && n.index !== i) c.fail(p + '.index', 'phải là ' + i + ' (theo thứ tự)');
      c.str(n, 'stat', p, ['hp', 'atk']); c.num(n, 'value', p, 0); c.num(n, 'ore', p, 0, Infinity, true);
      c.num(n, 'reqPlayerLevel', p, 1, 999, true);
    });
  }
  if (c.arr(t.slotNodes, 'slotNodes')) {
    let expect = tuning.squad ? tuning.squad.startSlots + 1 : 0;
    t.slotNodes.forEach((n: any, i: number) => {
      const p = 'slotNodes[' + i + ']';
      if (c.num(n, 'slot', p, 2, 99, true) && n.slot !== expect) c.fail(p + '.slot', 'phải là ' + expect + ' (ô kế tiếp sau startSlots)');
      expect++;
      c.num(n, 'coral', p, 0, Infinity, true); c.num(n, 'reqYardLevel', p, 1, 99, true);
    });
    if (tuning.squad && expect - 1 !== tuning.squad.maxSlots) c.fail('slotNodes', 'ô cuối phải bằng tuning.squad.maxSlots = ' + tuning.squad.maxSlots);
  }
}

function checkOdds(c: Checker, o: any, path: string): void {
  if (!c.obj(o, path)) return;
  let sum = 0;
  let ok = true;
  for (const r of RARITIES) { ok = c.num(o, r, path, 0, 1) && ok; sum += o[r]; }
  if (ok && Math.abs(sum - 1) > 1e-6) c.fail(path, 'tổng tỉ lệ N+R+E+L phải bằng 1, đang là ' + sum.toFixed(4));
}

function checkRecruit(c: Checker, r: any, heroes: { [id: string]: HeroDef }): void {
  c.file = 'recruit';
  c.num(r, 'costGold', '', 0, Infinity, true); c.num(r, 'cardCount', '', 1, 12, true);
  c.num(r, 'refreshSec', '', 1); c.num(r, 'manualRefreshGold', '', 0, Infinity, true);
  c.num(r, 'fragmentsPerDuplicate', '', 0, Infinity, true); c.num(r, 'bonusEvery', '', 1, 9999, true);
  c.num(r, 'unownedWeight', '', 0.0001); c.num(r, 'ownedWeight', '', 0.0001); c.num(r, 'ticketsPerDraw', '', 0, 99, true);
  if (c.arr(r.multi, 'multi', 1)) {
    r.multi.forEach((m: any, i: number) => { if (typeof m !== 'number' || m < 1 || m % 1 !== 0) c.fail('multi[' + i + ']', 'phải là số nguyên dương'); });
  }
  if (c.arr(r.odds, 'odds', 1)) {
    r.odds.forEach((o: any, i: number) => {
      checkOdds(c, o, 'odds[' + i + ']');
      if (o && o.tier !== i + 1) c.fail('odds[' + i + '].tier', 'phải là ' + (i + 1));
    });
  }
  checkOdds(c, r.bonusOdds, 'bonusOdds');
  const exch: { [id: string]: boolean } = {};
  if (c.arr(r.ticketExchange, 'ticketExchange', 1)) {
    r.ticketExchange.forEach((e: any, i: number) => {
      const p = 'ticketExchange[' + i + ']';
      c.str(e, 'id', p, ['frag5', 'unlockN', 'unlockR', 'unlockE', 'unlockL']); c.num(e, 'tickets', p, 1, Infinity, true);
      if (e) exch[e.id] = true;
    });
  }
  // Bảo đảm "mọi hero luôn lấy được" (01 mục 9.4): mỗi độ hiếm có hero phải xuất hiện trong bảng tỉ lệ
  // của MỌI cấp Quán, và có dòng đổi Vé mở hero của độ hiếm đó.
  const ids = Object.keys(heroes);
  const count: { [r: string]: number } = { N: 0, R: 0, E: 0, L: 0 };
  for (const id of ids) count[heroes[id].rarity]++;
  for (const rar of RARITIES) {
    if (count[rar] === 0) continue;
    if (Array.isArray(r.odds)) {
      r.odds.forEach((o: any, i: number) => {
        if (o && !(o[rar] > 0)) c.fail('odds[' + i + '].' + rar, 'phải > 0: có hero độ hiếm ' + rar + ' nên mọi cấp Quán phải có cơ hội ra nó');
      });
    }
    if (!exch['unlock' + rar]) c.fail('ticketExchange', 'thiếu dòng unlock' + rar + ' (đổi Vé để mở hero ' + rar + ' chưa có)');
  }
  if (!exch.frag5) c.fail('ticketExchange', 'thiếu dòng frag5');
  if (ids.length < r.cardCount) c.fail('cardCount', 'nhiều hơn số hero (' + ids.length + ')');
  // Số hero của các độ hiếm có trong bonusOdds phải đủ lấp một bộ thẻ.
  if (c.isObj(r.bonusOdds)) {
    let pool = 0;
    for (const rar of RARITIES) if (r.bonusOdds[rar] > 0) pool += count[rar];
    if (pool < r.cardCount) c.fail('bonusOdds', 'các độ hiếm có tỉ lệ > 0 chỉ có ' + pool + ' hero, không đủ ' + r.cardCount + ' thẻ');
  }
  if (c.arr(r.firstCards, 'firstCards', 1)) {
    if (r.firstCards.length !== r.cardCount) c.fail('firstCards', 'cần đúng cardCount thẻ');
    r.firstCards.forEach((id: any, i: number) => { if (!heroes[id]) c.fail('firstCards[' + i + ']', 'không có hero "' + id + '"'); });
    if (c.str(r, 'firstHero', '') && r.firstCards.indexOf(r.firstHero) < 0) c.fail('firstHero', 'phải nằm trong firstCards');
  }
}

function checkDrops(c: Checker, d: any, resources: string[]): { [id: string]: boolean } {
  c.file = 'drop-tables';
  const out: { [id: string]: boolean } = {};
  if (!c.obj(d.tables, 'tables')) return out;
  for (const id of Object.keys(d.tables)) {
    out[id] = true;
    const t = d.tables[id];
    if (!t || !c.arr(t.rolls, 'tables.' + id + '.rolls')) continue;
    t.rolls.forEach((r: any, i: number) => {
      const p = 'tables.' + id + '.rolls[' + i + ']';
      if (c.str(r, 'item', p) && resources.indexOf(r.item) < 0) c.fail(p + '.item', 'không phải tài nguyên: "' + r.item + '"');
      c.num(r, 'min', p, 0, Infinity, true); c.num(r, 'max', p, 0, Infinity, true); c.num(r, 'chance', p, 0, 1);
      if (r && r.max < r.min) c.fail(p, 'max < min');
    });
  }
  if (c.obj(d.zoneAmountMult, 'zoneAmountMult')) for (const z of Object.keys(d.zoneAmountMult)) c.num(d.zoneAmountMult, z, 'zoneAmountMult', 0);
  return out;
}

function checkMonsters(c: Checker, m: any, drops: { [id: string]: boolean }): { [id: string]: MonsterDef } {
  c.file = 'monsters';
  if (!c.arr(m.monsters, 'monsters', 1)) return {};
  const abilities = c.obj(m.abilities, 'abilities') ? m.abilities : {};
  for (const id of Object.keys(abilities)) {
    const a = abilities[id];
    const p = 'abilities.' + id;
    if (!c.str(a, 'telegraph', p, ['circle', 'rect', 'none'])) continue;
    c.num(a, 'cooldownSec', p, 0.1);
    if (a.telegraph === 'circle') { c.num(a, 'radius', p, 0.1); c.num(a, 'telegraphSec', p, 0); c.num(a, 'mult', p, 0); }
    if (a.telegraph === 'rect') { c.num(a, 'length', p, 0.1); c.num(a, 'width', p, 0.1); c.num(a, 'telegraphSec', p, 0); c.num(a, 'mult', p, 0); }
    if (a.telegraph === 'none') c.num(a, 'count', p, 1, 99, true);
  }
  m.monsters.forEach((x: any, i: number) => {
    const p = 'monsters[' + i + ']';
    c.str(x, 'id', p); c.str(x, 'name', p); c.str(x, 'kind', p, ['normal', 'elite', 'boss']);
    c.num(x, 'baseHp', p, 1); c.num(x, 'baseAtk', p, 0); c.num(x, 'attackInterval', p, 0.1);
    c.num(x, 'attackRange', p, 0.1); c.bool(x, 'ranged', p); c.num(x, 'moveSpeed', p, 0); c.num(x, 'radius', p, 0.05);
    c.num(x, 'exp', p, 0, Infinity, true);
    if (c.str(x, 'dropTable', p) && !drops[x.dropTable]) c.fail(p + '.dropTable', 'không có bảng rơi "' + x.dropTable + '"');
    if (x && x.abilities !== undefined && c.arr(x.abilities, p + '.abilities')) {
      x.abilities.forEach((a: any, j: number) => { if (!abilities[a]) c.fail(p + '.abilities[' + j + ']', 'không có kỹ năng boss "' + a + '"'); });
    }
  });
  if (c.obj(m.fieldZoneMult, 'fieldZoneMult')) for (const z of Object.keys(m.fieldZoneMult)) c.num(m.fieldZoneMult, z, 'fieldZoneMult', 0);
  return indexById(c, m.monsters, 'monsters');
}

function checkDungeon(c: Checker, d: any, monsters: { [id: string]: MonsterDef }, tuning: any): void {
  c.file = 'dungeon';
  const per = tuning.dungeon ? tuning.dungeon.floorsPerStage : 5;
  const nStages = tuning.dungeon ? tuning.dungeon.stages : 6;
  if (c.arr(d.stages, 'stages', 1)) {
    if (d.stages.length !== nStages) c.fail('stages', 'cần đúng tuning.dungeon.stages = ' + nStages + ' chặng, có ' + d.stages.length);
    d.stages.forEach((s: any, i: number) => {
      const p = 'stages[' + i + ']';
      if (c.num(s, 'stage', p, 1, 99, true) && s.stage !== i + 1) c.fail(p + '.stage', 'phải là ' + (i + 1));
      c.str(s, 'name', p);
      if (c.num(s, 'firstFloor', p, 1, 999, true) && s.firstFloor !== i * per + 1) c.fail(p + '.firstFloor', 'phải là ' + (i * per + 1));
      if (c.num(s, 'bossFloor', p, 1, 999, true) && s.bossFloor !== (i + 1) * per) c.fail(p + '.bossFloor', 'phải là ' + ((i + 1) * per));
      c.num(s, 'recommendedCp', p, 1); c.num(s, 'reqGateLevel', p, 1, 99, true);
      c.resMap(s.firstClear, p + '.firstClear');
      if (c.obj(s.repeatClear, p + '.repeatClear')) {
        c.num(s.repeatClear, 'gold', p + '.repeatClear', 0, Infinity, true); c.num(s.repeatClear, 'coralChance', p + '.repeatClear', 0, 1);
        c.num(s.repeatClear, 'coralPityEvery', p + '.repeatClear', 1, 999, true); c.num(s.repeatClear, 'tickets', p + '.repeatClear', 0, Infinity, true);
      }
    });
  }
  if (!c.arr(d.floors, 'floors', 1)) return;
  if (d.floors.length !== nStages * per) c.fail('floors', 'cần đúng ' + (nStages * per) + ' tầng, có ' + d.floors.length);
  d.floors.forEach((f: any, i: number) => {
    const p = 'floors[' + i + ']';
    if (c.num(f, 'floor', p, 1, 999, true) && f.floor !== i + 1) c.fail(p + '.floor', 'phải là ' + (i + 1) + ' (theo thứ tự)');
    if (c.num(f, 'stage', p, 1, 99, true) && f.stage !== Math.floor(i / per) + 1) c.fail(p + '.stage', 'phải là ' + (Math.floor(i / per) + 1));
    c.bool(f, 'isBoss', p);
    if (f && typeof f.isBoss === 'boolean' && f.isBoss !== ((i + 1) % per === 0)) c.fail(p + '.isBoss', 'tầng boss là tầng cuối mỗi chặng');
    c.num(f, 'recommendedCp', p, 1); c.num(f, 'hpMult', p, 0.001); c.num(f, 'atkMult', p, 0.001);
    c.num(f, 'goldMult', p, 0); c.num(f, 'expMult', p, 0); c.num(f, 'clearGold', p, 0, Infinity, true);
    if (!c.arr(f.groups, p + '.groups', 1)) return;
    let bosses = 0;
    let normals = 0;
    f.groups.forEach((g: any, j: number) => {
      const q = p + '.groups[' + j + ']';
      c.num(g, 'count', q, 1, 999, true); c.num(g, 'delaySec', q, 0);
      c.str(g, 'pattern', q, ['ring', 'front', 'waves', 'boss']);
      if (!c.str(g, 'monster', q)) return;
      const def = monsters[g.monster];
      if (!def) { c.fail(q + '.monster', 'không có quái "' + g.monster + '" trong monsters.json'); return; }
      if (def.kind === 'boss') { bosses += g.count; if (g.pattern !== 'boss') c.fail(q + '.pattern', 'boss phải dùng pattern "boss"'); }
      else { normals++; if (g.pattern === 'boss') c.fail(q + '.pattern', 'chỉ boss dùng pattern "boss"'); }
    });
    if (f.isBoss === true && bosses !== 1) c.fail(p + '.groups', 'tầng boss cần đúng 1 boss, có ' + bosses);
    if (f.isBoss === false && bosses !== 0) c.fail(p + '.groups', 'tầng thường không được có boss');
    if (f.isBoss === true && normals === 0) c.fail(p + '.groups', 'tầng boss cần ít nhất một nhóm quái thường (cho Gọi Bầy)');
  });
}

function checkField(c: Checker, f: any, monsters: { [id: string]: MonsterDef }, tuning: any): void {
  c.file = 'field-layout';
  const w = tuning.world ? tuning.world.mapW : 60;
  const h = tuning.world ? tuning.world.mapH : 60;
  const inMap = (pos: number[]) => pos[0] >= 1 && pos[1] >= 1 && pos[0] <= w - 1 && pos[1] <= h - 1;
  const types = c.obj(f.nodeTypes, 'nodeTypes') ? f.nodeTypes : {};
  for (const id of Object.keys(types)) {
    const p = 'nodeTypes.' + id;
    c.str(types[id], 'resource', p, ['wood', 'ore']); c.num(types[id], 'durability', p, 1, 9999, true);
    c.num(types[id], 'yieldPerHit', p, 1, 9999, true); c.num(types[id], 'respawnSec', p, 0);
  }
  if (c.arr(f.nodes, 'nodes', 1)) {
    f.nodes.forEach((n: any, i: number) => {
      const p = 'nodes[' + i + ']';
      c.str(n, 'id', p);
      if (c.str(n, 'type', p) && !types[n.type]) c.fail(p + '.type', 'không có loại nút "' + n.type + '"');
      if (c.pos(n.pos, p + '.pos') && !inMap(n.pos)) c.fail(p + '.pos', 'nằm ngoài bản đồ');
    });
  }
  if (c.arr(f.camps, 'camps', 1)) {
    f.camps.forEach((k: any, i: number) => {
      const p = 'camps[' + i + ']';
      c.str(k, 'id', p); c.str(k, 'zone', p, ['z1', 'z2', 'z3']); c.num(k, 'count', p, 1, 99, true);
      c.num(k, 'radius', p, 0); c.num(k, 'respawnSec', p, 0);
      if (c.str(k, 'monster', p)) {
        const def = monsters[k.monster];
        if (!def) c.fail(p + '.monster', 'không có quái "' + k.monster + '"');
        else if (def.kind === 'boss') c.fail(p + '.monster', 'boss không được đặt ngoài đồng');
      }
      if (c.pos(k.pos, p + '.pos') && !inMap(k.pos)) c.fail(p + '.pos', 'nằm ngoài bản đồ');
    });
  }
  if (c.arr(f.signposts, 'signposts')) {
    f.signposts.forEach((s: any, i: number) => { c.str(s, 'zone', 'signposts[' + i + ']'); c.pos(s.pos, 'signposts[' + i + '].pos'); c.num(s, 'recommendedCp', 'signposts[' + i + ']', 0); });
  }
  if (c.pos(f.startPos, 'startPos') && !inMap(f.startPos)) c.fail('startPos', 'nằm ngoài bản đồ');
  if (c.pos(f.wipeRespawnPos, 'wipeRespawnPos') && !inMap(f.wipeRespawnPos)) c.fail('wipeRespawnPos', 'nằm ngoài bản đồ');
  c.arr(f.paths, 'paths');
}

function checkQuests(c: Checker, q: any, ctx: { resources: string[]; buildings: { [id: string]: BuildingDef };
  monsters: { [id: string]: MonsterDef }; raw: RawTables }): void {
  c.file = 'quests';
  c.str(q, 'endText', '');
  if (!c.arr(q.quests, 'quests', 1)) return;
  const floors = Array.isArray(ctx.raw.dungeon.floors) ? ctx.raw.dungeon.floors.length : 0;
  const heroMax = ctx.raw['hero-levels'].maxLevel;
  const nodes = Array.isArray(ctx.raw['training-tree'].nodes) ? ctx.raw['training-tree'].nodes.length : 0;
  const maxSlots = ctx.raw.tuning.squad ? ctx.raw.tuning.squad.maxSlots : 8;
  const seen: { [id: string]: boolean } = {};
  q.quests.forEach((x: any, i: number) => {
    const p = 'quests[' + i + ']';
    if (c.str(x, 'id', p)) { if (seen[x.id]) c.fail(p + '.id', 'trùng id "' + x.id + '"'); seen[x.id] = true; }
    c.str(x, 'text', p); c.str(x, 'hint', p);
    if (c.resMap(x.reward, p + '.reward')) {
      for (const r of Object.keys(x.reward)) if (ctx.resources.indexOf(r) < 0) c.fail(p + '.reward.' + r, 'không phải tài nguyên');
    }
    if (!c.str(x, 'type', p, QUEST_TYPES) || !c.obj(x.params, p + '.params')) return;
    const pp = p + '.params';
    const a = x.params;
    const needBuilding = () => { if (c.str(a, 'building', pp) && !ctx.buildings[a.building]) c.fail(pp + '.building', 'không có công trình "' + a.building + '"'); };
    switch (x.type as QuestType) {
      case 'gather':
        c.str(a, 'resource', pp, ['wood', 'ore']); c.num(a, 'count', pp, 1, Infinity, true); break;
      case 'kill':
        c.num(a, 'count', pp, 1, Infinity, true);
        if (a.monster !== undefined) { if (!ctx.monsters[a.monster]) c.fail(pp + '.monster', 'không có quái "' + a.monster + '"'); }
        else if (a.zone !== undefined) c.str(a, 'zone', pp, ['z1', 'z2', 'z3']);
        else c.fail(pp, 'cần monster hoặc zone');
        break;
      case 'hero_level': c.num(a, 'level', pp, 2, heroMax, true); break;
      case 'build': needBuilding(); break;
      case 'recruit': c.num(a, 'count', pp, 1, Infinity, true); break;
      case 'auto_assign': break;
      case 'collect': needBuilding(); c.num(a, 'count', pp, 1, Infinity, true); break;
      case 'upgrade':
        needBuilding();
        if (c.num(a, 'level', pp, 2, 99, true) && ctx.buildings[a.building] && Array.isArray(ctx.buildings[a.building].levels)
          && a.level > ctx.buildings[a.building].levels.length) c.fail(pp + '.level', 'vượt cấp tối đa của ' + a.building);
        break;
      case 'training': c.num(a, 'count', pp, 1, nodes, true); break;
      case 'clear_floor': c.num(a, 'floor', pp, 1, floors, true); break;
      case 'slots': c.num(a, 'count', pp, 2, maxSlots, true); break;
    }
  });
}

/**
 * Kiểm tra và đóng gói dữ liệu. Ném DataError (liệt kê mọi lỗi) nếu bảng nào sai.
 * `raw` có khóa là tên file không đuôi: tuning, heroes, skills, 'hero-levels', ...
 */
export function buildGameData(raw: RawTables): GameData {
  const input: RawTables = {};
  for (const k of Object.keys(raw || {})) input[k] = raw[k];
  // recruit.json mô tả lượt tuyển đầu bằng chữ (firstRecruitScript). Nếu bảng chưa có trường máy đọc
  // được thì suy ra từ câu chữ đó để không phải gõ lại id trong code.
  if (input.recruit && typeof input.recruit === 'object' && !Array.isArray(input.recruit) && !input.recruit.firstCards) {
    const copy: any = {};
    for (const k of Object.keys(input.recruit)) copy[k] = input.recruit[k];
    const script = String(copy.firstRecruitScript || '');
    const hero = /'([a-z_]+)'/.exec(script);
    const cards = /\[([a-z_,\s]+)\]/.exec(script);
    if (hero && cards) {
      copy.firstHero = hero[1];
      copy.firstCards = cards[1].split(',').map((s: string) => s.trim());
    }
    input.recruit = copy;
  }
  const problems = validateRawTables(input);
  if (problems.length > 0) throw new DataError(problems);

  const heroes: HeroDef[] = input.heroes.heroes;
  const heroById: { [id: string]: HeroDef } = {};
  for (const h of heroes) heroById[h.id] = h;
  const skillById: { [id: string]: SkillDef } = {};
  for (const s of input.skills.skills as SkillDef[]) skillById[s.id] = s;
  const buildingById: { [id: string]: BuildingDef } = {};
  for (const b of input.buildings.buildings as BuildingDef[]) buildingById[b.id] = b;
  const monsterById: { [id: string]: MonsterDef } = {};
  for (const m of input.monsters.monsters as MonsterDef[]) monsterById[m.id] = m;
  return {
    tuning: input.tuning,
    heroes, heroById, skillById,
    heroLevels: input['hero-levels'],
    playerLevels: input['player-levels'],
    buildings: input.buildings.buildings, buildingById,
    training: input['training-tree'],
    recruit: input.recruit,
    monsterById, monsters: input.monsters,
    drops: input['drop-tables'],
    dungeon: input.dungeon,
    field: input['field-layout'],
    quests: input.quests,
  };
}
