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

/** Đồng hồ giả: bot tăng nó đúng một bước mô phỏng trước mỗi game.step(). */
export class SimClock {
  ms: number;
  constructor(startMs = 1_700_000_000_000) { this.ms = startMs; }
  nowMs(): number { return this.ms; }
}
