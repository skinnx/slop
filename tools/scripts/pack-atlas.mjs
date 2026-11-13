// Packs art-source PNGs into atlases for game/assets/resources (deterministic output).
// Usage (from tools/): npm run atlas [-- <atlasName>]
// Each frame gets `padding` px of space and its edge pixels are copied outward `extrude` px,
// so NEAREST sampling at fractional screen positions never picks up a neighbour frame.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { TOOLS, REPO, GAME, log } from './lib.mjs';

const cfg = JSON.parse(fs.readFileSync(path.join(TOOLS, 'atlas/atlases.json'), 'utf8'));
const only = process.argv[2];
const pot = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

for (const a of cfg.atlases) {
  if (only && a.name !== only) continue;
  const items = [];
  for (const s of a.sources) {
    for (const f of s.files) {
      const file = path.join(REPO, s.dir, f);
      if (!fs.existsSync(file)) throw new Error(`Atlas ${a.name}: missing ${path.relative(REPO, file)}`);
      items.push({ name: s.prefix + f.replace(/\.png$/, ''), png: PNG.sync.read(fs.readFileSync(file)) });
    }
  }
  const pad = a.padding ?? 2;
  const ext = Math.min(a.extrude ?? 1, Math.floor(pad / 2) || 0);
  // Shelf packing, tallest first, name as tie-break for determinism.
  items.sort((p, q) => q.png.height - p.png.height || p.name.localeCompare(q.name));
  let x = pad, y = pad, shelf = 0, width = 0;
  for (const it of items) {
    if (x + it.png.width + pad > a.maxWidth) { x = pad; y += shelf + pad; shelf = 0; }
    it.x = x; it.y = y;
    x += it.png.width + pad; shelf = Math.max(shelf, it.png.height); width = Math.max(width, x);
  }
  const W = pot(width), H = pot(y + shelf + pad);
  const out = new PNG({ width: W, height: H });
  out.data.fill(0);
  const frames = {};
  for (const it of items) {
    const { width: w, height: h, data } = it.png;
    for (let dy = -ext; dy < h + ext; dy++) {
      for (let dx = -ext; dx < w + ext; dx++) {
        const sx = Math.min(w - 1, Math.max(0, dx)), sy = Math.min(h - 1, Math.max(0, dy));
        const si = (sy * w + sx) * 4, di = ((it.y + dy) * W + (it.x + dx)) * 4;
        data.copy(out.data, di, si, si + 4);
      }
    }
    frames[it.name] = { x: it.x, y: it.y, w, h };
  }
  const sortedFrames = Object.fromEntries(Object.keys(frames).sort().map((k) => [k, frames[k]]));
  const base = path.join(GAME, 'assets/resources', a.out);
  fs.mkdirSync(path.dirname(base), { recursive: true });
  fs.writeFileSync(base + '.png', PNG.sync.write(out, { colorType: 6 }));
  fs.writeFileSync(base + '-frames.json', JSON.stringify({ image: path.basename(a.out) + '.png', width: W, height: H, frames: sortedFrames }, null, 1) + '\n');
  log(`atlas ${a.name}: ${items.length} frames -> ${path.relative(REPO, base)}.png (${W}x${H}) + -frames.json`);
}
