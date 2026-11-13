// Core cell coordinates (x, y in cells) -> screen design units, 01-game-design.md section 4.2:
// screenX = (x - y) * cellW / 2, screenY = (x + y) * cellH / 2 (y up). Bigger x + y = farther = drawn first.
export const CELL_W = 120;
export const CELL_H = 60;

export function isoX(x: number, y: number): number { return ((x - y) * CELL_W) / 2; }
export function isoY(x: number, y: number): number { return ((x + y) * CELL_H) / 2; }
/** Depth key: larger draws later (in front). */
export function depth(x: number, y: number): number { return -(x + y); }

/** Screen (world-root space) -> cell coordinates. */
export function cellFromScreen(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (CELL_W / 2), b = sy / (CELL_H / 2); // a = x - y, b = x + y
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/**
 * Screen-space direction -> cell-space vector of the same length. Used ONLY by the stand-in source; the core
 * source uses the core's joystickToWorld().
 */
export function screenDirToCell(sx: number, sy: number): { x: number; y: number } {
  const len = Math.hypot(sx, sy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const a = sx / (CELL_W / 2), b = sy / (CELL_H / 2); // a = x - y, b = x + y (per screen unit)
  const cx = (a + b) / 2, cy = (b - a) / 2;
  const l = Math.hypot(cx, cy);
  return { x: (cx / l) * len, y: (cy / l) * len };
}
