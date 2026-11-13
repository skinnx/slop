// Nạp dữ liệu game từ đĩa cho bot (cùng các file JSON mà game dùng).
import fs from 'node:fs';
import path from 'node:path';
import { buildGameData, DATA_FILES } from '../../game/assets/scripts/core/index';
import type { GameData, RawTables } from '../../game/assets/scripts/core/index';

export function repoRoot(): string {
  return process.env.SLOP_REPO || path.resolve(process.cwd(), '..');
}

export function loadGameData(dir?: string): GameData {
  const d = dir || path.join(repoRoot(), 'game/assets/resources/data');
  const raw: RawTables = {};
  for (const f of DATA_FILES) raw[f] = JSON.parse(fs.readFileSync(path.join(d, f + '.json'), 'utf8'));
  return buildGameData(raw);
}

/**
 * Đồng hồ giả: bot gọi tick() đúng một lần trước mỗi game.step(). Giờ được tính từ số bước (không cộng dồn)
 * để không tích lũy sai số dấu phẩy động.
 */
export class SimClock {
  private base: number;
  private steps = 0;
  private stepMs: number;
  constructor(stepsPerSec = 30, startMs = 1_700_000_000_000) { this.base = startMs; this.stepMs = 1000 / stepsPerSec; }
  nowMs(): number { return this.base + this.steps * this.stepMs; }
  tick(): void { this.steps++; }
}
