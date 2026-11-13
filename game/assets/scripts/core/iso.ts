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

/**
 * Đổi vector joystick trên màn hình (y hướng lên, độ dài = độ lệch 0..1) thành vector cho Game.setJoystick():
 * hướng là hướng tương ứng trên lưới ô, độ dài giữ nguyên. Ghi vào `out`.
 */
export function joystickToWorld(data: GameData, jx: number, jy: number, out: Point): Point {
  const len = Math.sqrt(jx * jx + jy * jy);
  if (!(len > 0)) { out.x = 0; out.y = 0; return out; }
  isoToWorld(data, jx, jy, out);
  const w = Math.sqrt(out.x * out.x + out.y * out.y);
  if (!(w > 0)) { out.x = 0; out.y = 0; return out; }
  const k = len / w;
  out.x *= k; out.y *= k;
  return out;
}

/** Khóa sắp chiều sâu: vật có giá trị lớn hơn vẽ TRƯỚC (xa hơn). */
export function depthKey(x: number, y: number): number { return x + y; }
