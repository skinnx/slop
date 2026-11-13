// Đổi tọa độ ô (lõi) <-> tọa độ màn hình iso 2:1 (01 mục 4.2). Thuần toán học, view dùng để vẽ và để
// đổi điểm chạm thành ô. Y màn hình hướng lên.
import { GameData } from './data';

export interface Point { x: number; y: number; }

/** screenX = (x − y) × cellW / 2, screenY = (x + y) × cellH / 2. Ghi vào `out` (không cấp phát). */
export function worldToIso(data: GameData, x: number, y: number, out: Point): Point {
  const r = data.tuning.render;
  out.x = (x - y) * r.cellW * 0.5;
  out.y = (x + y) * r.cellH * 0.5;
  return out;
}

/** Ngược của worldToIso. */
export function isoToWorld(data: GameData, sx: number, sy: number, out: Point): Point {
  const r = data.tuning.render;
  const a = sx / (r.cellW * 0.5);
  const b = sy / (r.cellH * 0.5);
  out.x = (a + b) * 0.5;
  out.y = (b - a) * 0.5;
  return out;
}

/** Khóa sắp chiều sâu: vật có giá trị lớn hơn vẽ TRƯỚC (xa hơn). */
export function depthKey(x: number, y: number): number { return x + y; }
