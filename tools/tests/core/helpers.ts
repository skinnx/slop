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

/** Đồng hồ giả: mỗi bước mô phỏng tăng đúng một bước thời gian. */
export class SimClock {
  ms: number;
  constructor(start = 1_700_000_000_000) { this.ms = start; }
  nowMs(): number { return this.ms; }
  advanceSec(sec: number): void { this.ms += sec * 1000; }
}

export interface TestGame { game: Game; clock: SimClock; step(n?: number): void; stepSec(sec: number): void; }

export function newGame(opts: { seed?: number; save?: SaveData | null; clock?: SimClock; data?: GameData } = {}): TestGame {
  const clock = opts.clock ?? new SimClock();
  const data = opts.data ?? loadData();
  const game = createGame({ data, clock, seed: opts.seed ?? 1, save: opts.save ?? null });
  const stepMs = 1000 / data.tuning.sim.stepsPerSec;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) { clock.ms += stepMs; game.step(); }
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
