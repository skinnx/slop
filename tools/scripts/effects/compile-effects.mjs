// Compiles the engine's builtin .effect files inside Chromium (shdc needs the built cc.js for its mappings).
// Usage: node compile-effects.mjs <engineDir> <engineWebDir containing cc.js + effect-compiler.js> <out.json> <effect...>
import fs from 'node:fs';
import path from 'node:path';
import { serve, launchChromium } from '../../harness/lib/browser.mjs';

const [engine, webDir, out, ...effects] = process.argv.slice(2);
const chunksDir = path.join(engine, 'editor/assets/chunks');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const chunks = {};
for (const f of walk(chunksDir).filter((f) => f.endsWith('.chunk'))) {
  const rel = path.relative(chunksDir, f).replace(/\\/g, '/').replace(/\.chunk$/, '');
  const src = fs.readFileSync(f, 'utf8');
  chunks[rel] = src;
  if (!(path.basename(rel) in chunks)) chunks[path.basename(rel)] = src;
}
const effSrc = Object.fromEntries(effects.map((e) => [e.replace(/\.effect$/, ''), fs.readFileSync(path.join(engine, 'editor/assets/effects', e), 'utf8')]));
const page0 = `<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"cc":"/cc.js"}}</script></head>
<body><div id="GameDiv"><div id="Cocos3dGameContainer"><canvas id="GameCanvas" width="64" height="64"></canvas></div></div></body></html>`;
const tmp = fs.mkdtempSync(path.join(webDir, '.tmp-'));
fs.writeFileSync(path.join(tmp, 'index.html'), page0);
const server = await serve({ '/p/': tmp, '/': path.resolve(webDir) });
const browser = await launchChromium();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[browser]', e.message));
  await page.goto(`${server.url}/p/index.html`);
  const result = await page.evaluate(async ({ effSrc, chunks }) => {
    await import('/effect-compiler.js');
    return window.__compileEffects(effSrc, chunks);
  }, { effSrc, chunks });
  for (const e of result) {
    const sh = e.shaders[0];
    if (!sh.glsl1 || !sh.glsl3) throw new Error(`effect ${e.name} lacks glsl1/glsl3 output`);
    console.log(`[tools] effect ${e.name}: ${e.techniques.length} technique(s), ${e.shaders.length} shader(s)`);
  }
  fs.writeFileSync(out, JSON.stringify(result));
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
