// Colours, font sizes and draw-order bands of the view. Values come from docs/design/03-ux-spec.md section 2.1
// and 04-placeholder-art.md. Game numbers (costs, stats...) never live here: those come from the core.
import { Color } from 'cc';

const cache = new Map<string, Color>();
/** '#RRGGBB' or '#RRGGBBAA' -> Color (cached, do not mutate the result). */
export function hex(s: string, alpha?: number): Color {
  const key = alpha === undefined ? s : s + '/' + alpha;
  let c = cache.get(key);
  if (!c) {
    const v = s.replace('#', '');
    c = new Color(parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16),
      alpha !== undefined ? Math.round(alpha * 255) : v.length >= 8 ? parseInt(v.slice(6, 8), 16) : 255);
    cache.set(key, c);
  }
  return c;
}

export const C = {
  panel: '#1B3A6B',
  panelEdge: '#0E2347',
  ribbon: '#2E6FD8',
  topBar: '#173A73',
  green: '#4CD137',
  greenDark: '#1E6B12',
  grey: '#9AA0A6',
  blue: '#2E6FD8',
  red: '#E5484D',
  gold: '#FFC531',
  white: '#FFFFFF',
  black: '#000000',
  lack: '#FF5A5A',
  cpLack: '#C77DFF',
  cyan: '#4FD3FF',
  questBg: '#E8EAEE',
  questIcon: '#4FB3FF',
  yellow: '#FFD34D',
  bonus: '#8A4FFF',
  darkText: '#1B2233',
};

/**
 * Rarity / attribute colours. Filled from tuning.hero.rarityColor / attrColor when the core data loads
 * (useDataColors); the values below are only the stand-in source's fallback (same as the data today).
 */
export const RARITY: Record<string, string> = { N: '#9AA0A6', R: '#3D8BFF', E: '#B455F5', L: '#FFB020' };
export const ATTR: Record<string, string> = { STR: '#E5484D', AGI: '#46C35A', INT: '#F2C230' };
export function useDataColors(rarity: Record<string, string>, attr: Record<string, string>): void {
  Object.assign(RARITY, rarity);
  Object.assign(ATTR, attr);
}
export const ATTR_ICON: Record<string, string> = { STR: 'icon/shield', AGI: 'icon/bow', INT: 'icon/flask_full' };

export const FS = { title: 40, big: 32, body: 26, small: 22, min: 20 };

/**
 * Draw-order bands (Sorting2D sortingOrder = band * 2, labels + 1). Every renderer created through the kit
 * gets the band of its nearest banded ancestor, so all sprites of one layer draw before all its labels and
 * batch together, whatever the node hierarchy. Without the "2D Rendering Sorting" feature the hierarchy order
 * is used instead: same picture, more draw calls.
 */
export const BAND = {
  ground: 0,
  units: 1,
  worldText: 2,
  hud: 4,
  joystick: 5,
  panel0: 8, // panels stack: panel0 + 2 * depth
  dialog: 40,
  toast: 44,
  fade: 48,
};
