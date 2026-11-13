// Đọc bản lưu: kiểm tra phiên bản, chuyển đổi định dạng cũ, sửa/loại dữ liệu không hợp lệ.
import { GameData, ResourceMap } from './data';
import { SaveData, SaveBuilding, SAVE_VERSION } from './contract';

export class SaveError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SaveError';
  }
}

function num(v: any, def: number, min = -Infinity, max = Infinity): number {
  if (typeof v !== 'number' || !isFinite(v)) return def;
  return v < min ? min : (v > max ? max : v);
}
function int(v: any, def: number, min = -Infinity, max = Infinity): number { return Math.floor(num(v, def, min, max)); }

/**
 * Các bước chuyển đổi định dạng: MIGRATIONS[v] nhận save phiên bản v và trả về phiên bản v + 1.
 * Khi đổi định dạng: tăng SAVE_VERSION trong contract.ts và thêm một hàm ở đây.
 */
const MIGRATIONS: { [from: number]: (old: any) => any } = {};

/**
 * Trả về bản lưu đã làm sạch (bản sao; không sửa `raw`). Ném SaveError nếu không dùng được
 * (không phải object, phiên bản mới hơn bản game, thiếu phần cốt lõi). View bắt lỗi và hỏi người chơi.
 */
export function loadSave(data: GameData, raw: any): SaveData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SaveError('Bản lưu không phải object');
  let s: any = raw;
  let v = s.saveVersion;
  if (typeof v !== 'number' || v < 1 || Math.floor(v) !== v) throw new SaveError('Bản lưu thiếu saveVersion');
  if (v > SAVE_VERSION) throw new SaveError('Bản lưu phiên bản ' + v + ' mới hơn bản game (' + SAVE_VERSION + ')');
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError('Không có bước chuyển đổi từ phiên bản ' + v);
    s = step(s);
    v++;
  }
  if (!s.player || !s.resources || !Array.isArray(s.heroes) || !Array.isArray(s.buildings)) {
    throw new SaveError('Bản lưu thiếu player / resources / heroes / buildings');
  }
  const t = data.tuning;

  const resources: ResourceMap = {};
  for (const k of Object.keys(t.economy.startResources)) resources[k] = int(s.resources[k], 0, 0);

  const heroes: { id: string; level: number; fragments: number }[] = [];
  const seen: { [id: string]: boolean } = {};
  for (const h of s.heroes) {
    if (!h || !data.heroById[h.id] || seen[h.id]) continue;
    seen[h.id] = true;
    heroes.push({ id: h.id, level: int(h.level, 1, 1, data.heroLevels.maxLevel), fragments: int(h.fragments, 0, 0) });
  }
  if (heroes.length === 0) throw new SaveError('Bản lưu không có hero nào hợp lệ');

  const squadSlots = int(s.squadSlots, t.squad.startSlots, t.squad.startSlots, t.squad.maxSlots);
  const squad: string[] = [];
  if (Array.isArray(s.squad)) {
    for (const id of s.squad) if (seen[id] && squad.indexOf(id) < 0 && squad.length < squadSlots) squad.push(id);
  }
  if (squad.length === 0) squad.push(heroes[0].id);

  const buildings: SaveBuilding[] = [];
  const uids: { [uid: number]: boolean } = {};
  for (const b of s.buildings) {
    if (!b || !data.buildingById[b.type]) continue;
    const def = data.buildingById[b.type];
    const uid = int(b.uid, 0, 1);
    if (uid < 1 || uids[uid]) continue;
    uids[uid] = true;
    let job: SaveBuilding['job'] = null;
    if (b.job && (b.job.kind === 'build' || b.job.kind === 'upgrade')) {
      const endsAt = num(b.job.endsAt, 0);
      job = {
        kind: b.job.kind, targetLevel: int(b.job.targetLevel, 1, 1, def.levels.length),
        startedAt: num(b.job.startedAt, endsAt), endsAt,
      };
    }
    const level = int(b.level, job && job.kind === 'build' ? 0 : 1, 0, def.levels.length);
    if (level === 0 && !job) continue; // công trình chưa xây mà không có việc: bỏ
    buildings.push({ uid, type: b.type, level, x: int(b.x, 0), y: int(b.y, 0), job, buffer: num(b.buffer, 0, 0) });
  }
  // Nhà Kho luôn phải có (có sẵn từ đầu)
  for (const def of data.buildings) {
    if (!def.prePlaced) continue;
    let has = false;
    for (const b of buildings) if (b.type === def.id) has = true;
    if (has) continue;
    let uid = 1;
    while (uids[uid]) uid++;
    uids[uid] = true;
    buildings.push({ uid, type: def.id, level: 1, x: def.prePlaced[0], y: def.prePlaced[1], job: null, buffer: 0 });
  }
  let maxUid = 0;
  for (const b of buildings) if (b.uid > maxUid) maxUid = b.uid;

  const tv = s.tavern || {};
  let cards: string[] = [];
  if (Array.isArray(tv.cards)) for (const id of tv.cards) if (data.heroById[id] && cards.indexOf(id) < 0) cards.push(id);
  if (cards.length !== data.recruit.cardCount) cards = data.recruit.firstCards.slice();

  const dg = s.dungeon || {};
  const stages = data.dungeon.stages.length;
  const bestStage = int(dg.bestStageCleared, 0, 0, stages);
  const repeats: { [stage: string]: number } = {};
  if (dg.repeatClears && typeof dg.repeatClears === 'object') {
    for (const k of Object.keys(dg.repeatClears)) repeats[k] = int(dg.repeatClears[k], 0, 0);
  }
  const lastSaveAt = num(s.lastSaveAt, 0, 0);
  const w = s.world || {};
  const b0 = t.world.mapEdgeBlocked;
  const pos = (p: any, def: number[]): number[] => (Array.isArray(p) && p.length >= 2
    ? [num(p[0], def[0], b0, t.world.mapW - b0), num(p[1], def[1], b0, t.world.mapH - b0)] : [def[0], def[1]]);
  const rng = s.rng || {};
  const seed = int(rng.seed, 1, 0) >>> 0;

  return {
    saveVersion: SAVE_VERSION,
    createdAt: num(s.createdAt, lastSaveAt, 0),
    lastSaveAt,
    rng: { seed, state: (typeof rng.state === 'number' && isFinite(rng.state) ? rng.state : seed) >>> 0, dungeonRuns: int(rng.dungeonRuns, 0, 0) },
    player: { level: int(s.player.level, 1, 1, data.playerLevels.maxLevel), exp: int(s.player.exp, 0, 0) },
    resources,
    buildings,
    nextBuildingUid: Math.max(int(s.nextBuildingUid, 1, 1), maxUid + 1),
    heroes,
    squad,
    squadSlots,
    training: { nodesUnlocked: int(s.training && s.training.nodesUnlocked, 0, 0, data.training.nodes.length) },
    tavern: { cards, nextRefreshAt: num(tv.nextRefreshAt, 0, 0), bonus: int(tv.bonus, 0, 0, data.recruit.bonusEvery - 1), totalDraws: int(tv.totalDraws, 0, 0) },
    dungeon: {
      bestStageCleared: bestStage,
      // bản lưu theo mẫu thiết kế không có bestFloorCleared: suy ra từ chặng đã vượt
      bestFloorCleared: int(dg.bestFloorCleared, bestStage * t.dungeon.floorsPerStage, bestStage * t.dungeon.floorsPerStage, data.dungeon.floors.length),
      repeatClears: repeats,
      auto: dg.auto === true,
    },
    quest: { index: int(s.quest && s.quest.index, 0, 0, data.quests.quests.length), progress: int(s.quest && (s.quest.progress !== undefined ? s.quest.progress : s.quest.baseValue), 0, 0) },
    world: { leaderPos: pos(w.leaderPos, data.field.startPos), returnPoint: Array.isArray(w.returnPoint) ? pos(w.returnPoint, data.field.startPos) : null },
    settings: { music: !s.settings || s.settings.music !== false, sfx: !s.settings || s.settings.sfx !== false },
    stats: { playSec: num(s.stats && s.stats.playSec, 0, 0), kills: int(s.stats && s.stats.kills, 0, 0) },
    inventory: s.inventory && typeof s.inventory === 'object' ? s.inventory : {},
  };
}
