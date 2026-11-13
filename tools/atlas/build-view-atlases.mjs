// Builds the two atlases the view layer uses (deterministic output):
//   textures/world.png + world-frames.json  : sampled NEAREST in game (pixel art at integer scale, ground, units, pickups)
//   textures/ui.png    + ui-frames.json     : sampled LINEAR in game (UI pack 9-slices, 64 px icons, pre-scaled portraits)
// Both also contain the code-drawn shapes of docs/design/04-placeholder-art.md section 0.1 ("proc:"),
// rasterised here instead of at start-up so they share the texture with everything else (one batch).
// Config: tools/atlas/view-atlases.json. Usage (from tools/): npm run atlas:view
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { TOOLS, REPO, GAME, log } from '../scripts/lib.mjs';

const cfg = JSON.parse(fs.readFileSync(path.join(TOOLS, 'atlas/view-atlases.json'), 'utf8'));
const pot = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

function blank(w, h) { const p = new PNG({ width: w, height: h }); p.data.fill(0); return p; }

/** Resize: nearest when growing by an integer factor, box average (premultiplied) when shrinking. */
function resize(src, w, h) {
  if (src.width === w && src.height === h) return src;
  const out = blank(w, h);
  if (w >= src.width) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = Math.floor((x * src.width) / w), sy = Math.floor((y * src.height) / h);
      src.data.copy(out.data, (y * w + x) * 4, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
    }
    return out;
  }
  const fx = src.width / w, fy = src.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(y * fy); sy < Math.floor((y + 1) * fy); sy++) for (let sx = Math.floor(x * fx); sx < Math.floor((x + 1) * fx); sx++) {
      const i = (sy * src.width + sx) * 4, al = src.data[i + 3] / 255;
      r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al; a += al; n++;
    }
    const o = (y * w + x) * 4;
    if (a > 0) { out.data[o] = Math.round(r / a); out.data[o + 1] = Math.round(g / a); out.data[o + 2] = Math.round(b / a); }
    out.data[o + 3] = Math.round((a / n) * 255);
  }
  return out;
}

/** White shape with 4x4 supersampled coverage as alpha. inside(u, v) gets coordinates in pixels. */
function shape(w, h, inside) {
  const p = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (inside(x + (i + 0.5) / 4, y + (j + 0.5) / 4)) c++;
    const o = (y * w + x) * 4;
    p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = Math.round((c / 16) * 255);
  }
  return p;
}

const PROC = {
  pixel: (s) => shape(s, s, () => true),
  diamond: (w) => shape(w, w / 2, (u, v) => Math.abs(u - w / 2) / (w / 2) + Math.abs(v - w / 4) / (w / 4) <= 1),
  circle: (s) => shape(s, s, (u, v) => (u - s / 2) ** 2 + (v - s / 2) ** 2 <= (s / 2) ** 2),
  ring: (s, t) => shape(s, s, (u, v) => { const d = Math.hypot(u - s / 2, v - s / 2); return d <= s / 2 && d >= s / 2 - t; }),
  // Crescent opening to the left: big disc minus a disc shifted left. Used as the white slash mark.
  arc: (s) => shape(s, s, (u, v) => (u - s / 2) ** 2 + (v - s / 2) ** 2 <= (s / 2) ** 2 && (u - s * 0.3) ** 2 + (v - s / 2) ** 2 > (s * 0.42) ** 2),
  // Soft spotlight cone (top narrow, bottom wide), white, alpha fades downward.
  cone: (w, h) => { const p = shape(w, h, (u, v) => Math.abs(u - w / 2) <= (w * 0.15) + (w * 0.35) * (v / h)); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; p.data[o + 3] = Math.round(p.data[o + 3] * (0.9 - 0.6 * y / h)); } return p; },
  // Rounded rectangle with radius r (for 9-slice panels drawn in code).
  rrect: (s, r) => shape(s, s, (u, v) => { const cx = Math.min(Math.max(u, r), s - r), cy = Math.min(Math.max(v, r), s - r); return (u - cx) ** 2 + (v - cy) ** 2 <= r * r; }),
};

function loadItem(src, atlasDir) {
  if (src.proc) {
    const [kind, ...args] = src.proc;
    return PROC[kind](...args);
  }
  const file = path.join(REPO, src.file);
  if (!fs.existsSync(file)) throw new Error(`missing ${src.file}`);
  let png = PNG.sync.read(fs.readFileSync(file));
  if (src.scale) png = resize(png, png.width * src.scale, png.height * src.scale);
  if (src.size) png = resize(png, src.size[0], src.size[1]);
  return png;
}

function expand(atlas) {
  const out = [];
  for (const g of atlas.groups) {
    for (const entry of g.items) {
      const [name, rel] = Array.isArray(entry) ? entry : [entry, entry];
      if (g.proc) out.push({ name: g.prefix + name, proc: rel, border: g.border?.[name] });
      else out.push({ name: g.prefix + name, file: g.dir.replace('{}', rel) + (rel.endsWith('.png') ? '' : '.png'), scale: g.scale, size: g.size, border: g.border?.[name] ?? g.borderAll });
    }
  }
  return out;
}

for (const a of cfg.atlases) {
  const items = expand(a).map((s) => ({ ...s, png: loadItem(s) }));
  const pad = a.padding, ext = a.extrude;
  items.sort((p, q) => q.png.height - p.png.height || p.name.localeCompare(q.name));
  let x = pad, y = pad, shelf = 0, width = 0;
  for (const it of items) {
    if (x + it.png.width + pad > a.maxWidth) { x = pad; y += shelf + pad; shelf = 0; }
    it.x = x; it.y = y; x += it.png.width + pad; shelf = Math.max(shelf, it.png.height); width = Math.max(width, x);
  }
  const W = pot(width), H = pot(y + shelf + pad);
  const out = blank(W, H);
  const frames = {};
  for (const it of items) {
    const { width: w, height: h, data } = it.png;
    for (let dy = -ext; dy < h + ext; dy++) for (let dx = -ext; dx < w + ext; dx++) {
      const sx = Math.min(w - 1, Math.max(0, dx)), sy = Math.min(h - 1, Math.max(0, dy));
      data.copy(out.data, ((it.y + dy) * W + (it.x + dx)) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
    }
    frames[it.name] = { x: it.x, y: it.y, w, h, ...(it.border ? { border: it.border } : {}) };
  }
  const sorted = Object.fromEntries(Object.keys(frames).sort().map((k) => [k, frames[k]]));
  const base = path.join(GAME, 'assets/resources', a.out);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(base + '.png', PNG.sync.write(out, { colorType: 6 }));
  fs.writeFileSync(base + '-frames.json', JSON.stringify({ image: path.basename(a.out) + '.png', width: W, height: H, filter: a.filter, frames: sorted }, null, 1) + '\n');
  log(`atlas ${a.name}: ${items.length} frames -> ${path.relative(REPO, base)}.png (${W}x${H})`);
}
