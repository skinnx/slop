// Dùng chung cho test lõi: nạp JSON thật trong game/assets/resources/data và tạo ván chơi với đồng hồ giả.
import fs from 'node:fs';
import path from 'node:path';
import { RESOURCES } from '../paths';
import { buildGameData, createGame, DATA_FILES } from '../../../game/assets/scripts/core/index';
import type { Game, GameData, RawTables, SaveData } from '../../../game/assets/scripts/core/index';

export const DATA_DIR = path.join(RESOURCES, 'data');

export function readRawTables(dir: string = DATA_DIR): RawTables {
  const raw: RawTables = {};
  for (const f of DATA_FILES) raw[f] = JSON.parse(fs.readFileSync(path.join(dir, f + '.json'), 'utf8'));
  return raw;
}

let cached: GameData | null = null;
export function loadData(): GameData {
  if (!cached) cached = buildGameData(readRawTables());
  return cached;
}

/**
 * Đồng hồ giả: mỗi bước mô phỏng tăng đúng một bước thời gian. Giờ được tính từ số bước (không cộng dồn)
 * để không tích lũy sai số dấu phẩy động ở mốc thời gian lớn.
 */
export class SimClock {
  private base: number;
  private steps = 0;
  private extraMs = 0;
  private stepMs = 1000 / 30;
  constructor(start = 1_700_000_000_000) { this.base = start; }
  get ms(): number { return this.base + this.extraMs + this.steps * this.stepMs; }
  nowMs(): number { return this.ms; }
  /** Một bước mô phỏng trôi qua. */
  tick(): void { this.steps++; }
  /** Thời gian thật trôi qua mà game không chạy (ứng dụng bị ẩn, tắt máy...). Âm = đồng hồ lùi. */
  advanceSec(sec: number): void { this.extraMs += Math.round(sec * 1000); }
}

export interface TestGame { game: Game; clock: SimClock; step(n?: number): void; stepSec(sec: number): void; }

export function newGame(opts: { seed?: number; save?: SaveData | null; clock?: SimClock; data?: GameData } = {}): TestGame {
  const clock = opts.clock ?? new SimClock();
  const data = opts.data ?? loadData();
  const game = createGame({ data, clock, seed: opts.seed ?? 1, save: opts.save ?? null });
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) { clock.tick(); game.step(); }
  };
  return { game, clock, step, stepSec: (sec: number) => step(Math.round(sec * data.tuning.sim.stepsPerSec)) };
}

/** Sửa trực tiếp trạng thái bên trong để dựng tình huống test (CHỈ dùng trong test; bot không được làm vậy). */
export function cheat(game: Game): any { return game as any; }

/** Cho tài nguyên, bỏ qua trần kho. */
export function give(game: Game, res: { [k: string]: number }): void {
  const r = cheat(game).resources;
  for (const k of Object.keys(res)) r[k] = (r[k] || 0) + res[k];
}

/** Đặt cấp người chơi. */
export function setPlayerLevel(game: Game, level: number): void {
  const g = cheat(game);
  g.player.level = level; g.player.exp = 0; g.refreshPlayer();
}

/** Xây ngay một công trình ở cấp cho trước (không tốn tài nguyên, không chờ). */
export function instantBuilding(t: TestGame, type: string, x: number, y: number, level = 1): number {
  const g = cheat(t.game);
  const def = t.game.data.buildingById[type];
  const b = g.village.add(def, x, y, level, null, 0);
  return b.uid;
}

/** Thêm hero vào danh sách sở hữu ở cấp cho trước. */
export function grantHero(game: Game, id: string, level = 1, fragments = 0): void {
  const g = cheat(game);
  if (g.ownedById[id]) { g.ownedById[id].level = level; g.ownedById[id].fragments = fragments; }
  else g.addOwned(id, level, fragments);
  g.syncSquad();
}

/** Đưa cả đội tới (x, y) ngoài đồng. */
export function teleport(game: Game, x: number, y: number): void {
  const g = cheat(game);
  g.field.placeSquad(x, y);
  g.updateLeaderZone();
}

export interface Ev { step: number; type: string; x: number; y: number; n: number; id: number; id2: number; key: string; text: string; data: any; }

/** Chạy `steps` bước, gom mọi sự kiện (bản sao) kèm số thứ tự bước. `each` được gọi trước mỗi bước. */
export function run(t: TestGame, steps: number, each?: (i: number) => void): Ev[] {
  const out: Ev[] = [];
  const g = t.game;
  for (let i = 0; i < steps; i++) {
    if (each) each(i);
    t.step();
    for (let k = 0; k < g.eventCount; k++) {
      const e = g.events[k];
      out.push({ step: i, type: e.type, x: e.x, y: e.y, n: e.n, id: e.id, id2: e.id2, key: e.key, text: e.text, data: e.data });
    }
    g.clearEvents();
  }
  return out;
}

/** Bản sao sâu của dữ liệu thật với một chỉnh sửa (để thử cờ dữ liệu). */
export function dataWith(mutate: (raw: RawTables) => void): GameData {
  const raw = readRawTables();
  mutate(raw);
  return buildGameData(raw);
}

/** Một điểm vắng trong vùng cho trước: xa mọi nút tài nguyên (> 4 ô) và mọi ổ quái (> 7 ô). */
export function quietSpot(game: Game, zone: string): { x: number; y: number } {
  const f = game.field;
  let best = { x: 0, y: 0 };
  let bestScore = -1;
  for (let y = 3; y <= 57; y += 0.5) {
    for (let x = 3; x <= 57; x += 0.5) {
      if (game.zoneAt(x, y) !== zone || game.zoneAt(x + 1, y + 1) !== zone || game.zoneAt(x - 1, y - 1) !== zone) continue;
      let dn = Infinity;
      for (const n of f.nodes) dn = Math.min(dn, Math.hypot(n.x - x, n.y - y));
      let dc = Infinity;
      for (const c of f.camps) dc = Math.min(dc, Math.hypot(c.x - x, c.y - y));
      const score = Math.min(dn - 4, dc - 7);
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
  }
  if (bestScore <= 0) throw new Error('không tìm được điểm vắng trong ' + zone);
  return best;
}

/** Các quái còn sống của một ổ ngoài đồng (đơn vị bên trong lõi, sửa được). */
export function campMonsters(game: Game, campId: string): any[] {
  const f = cheat(game).field;
  const camp = f.camps.find((c: any) => c.id === campId);
  return f.monsters.filter((m: any) => m.alive && m.campIndex === camp.index);
}

/** Biến quái của một ổ thành bao cát: máu rất nhiều, không gây sát thương. */
export function makeDummies(game: Game, campId: string, hp = 1_000_000): any[] {
  const list = campMonsters(game, campId);
  for (const m of list) { m.maxHp = hp; m.hp = hp; m.atk = 0; }
  return list;
}

/** Đội mạnh nhất có thể: mọi hero ở cấp `level`, 8 ô đội, đủ `nodes` nấc Sân Tập, đã TỰ XẾP. */
export function strongSquad(game: Game, level = 30, slots = 8, nodes = 90): void {
  const g = cheat(game);
  for (const h of game.data.heroes) {
    if (g.ownedById[h.id]) g.ownedById[h.id].level = level; else g.addOwned(h.id, level, 0);
  }
  g.nodesUnlocked = nodes; g.squadSlots = slots;
  g.syncSquad();
  game.autoAssign();
}

/** Dựng Cổng Xoáy cấp 6 và coi như đã vượt các chặng trước `stage`, rồi vào chặng đó. */
export function enterStage(t: TestGame, stage: number): void {
  const g = cheat(t.game);
  if (!t.game.findBuilding('dungeon_gate')) instantBuilding(t, 'dungeon_gate', 30, 34, 6);
  if (g.bestStageCleared < stage - 1) { g.bestStageCleared = stage - 1; g.bestFloorCleared = (stage - 1) * 5; }
  const r = t.game.enterDungeon(stage);
  if (!r.ok) throw new Error('không vào được chặng ' + stage + ': ' + r.reason);
}
