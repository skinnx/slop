// Runs one harness scenario against the real game code on the real Cocos 3.8.8 engine (Chromium + WebGL/SwiftShader).
// Usage (from tools/):
//   npm run harness -- harness/scenarios/example.mjs [--out <dir>] [--viewport 540x960] [--query standin=1] [--verbose]
// Output: screenshots in --out (default tools/.out/<scenario-name>/), summary.json there, summary on stdout.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOOLS, GAME, ENGINE_WEB, CACHE, REPO } from '../scripts/lib.mjs';
import { serve, launchChromium } from './lib/browser.mjs';
import { bundleHarness } from './lib/bundle.mjs';
import { createApi } from './lib/api.mjs';

function parseArgs(argv) {
  const a = { scenario: null, out: null, viewport: '540x960', verbose: false, query: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') a.out = argv[++i];
    else if (argv[i] === '--viewport') a.viewport = argv[++i];
    else if (argv[i] === '--verbose') a.verbose = true;
    else if (argv[i] === '--query') a.query = argv[++i];
    else if (!a.scenario) a.scenario = argv[i];
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.scenario) {
  console.error('Usage: npm run harness -- <scenario.mjs> [--out dir] [--viewport WxH] [--verbose]');
  process.exit(2);
}
for (const f of ['cc.js', 'builtin-2d-effects.json']) {
  if (!fs.existsSync(path.join(ENGINE_WEB, f))) {
    console.error(`[harness] Missing ${path.join(ENGINE_WEB, f)}. Run "npm run setup" in tools/ first.`);
    process.exit(2);
  }
}
const scenarioPath = path.resolve(process.cwd(), args.scenario);
const name = path.basename(scenarioPath).replace(/\.m?js$/, '');
const outDir = path.resolve(process.cwd(), args.out ?? path.join(TOOLS, '.out', name));
const [vw, vh] = args.viewport.split('x').map(Number);
fs.mkdirSync(outDir, { recursive: true });

const bundleDir = path.join(CACHE, 'harness');
const t0 = Date.now();
const b = await bundleHarness(bundleDir).catch((e) => { console.error('[harness] bundle FAILED\n' + e.message); process.exit(1); });

const server = await serve({
  '/engine/': ENGINE_WEB,
  '/bundle/': bundleDir,
  '/game/': path.join(GAME, 'assets'),
  '/': path.join(TOOLS, 'harness/page'),
});
const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const consoleLines = [];
page.on('console', (m) => {
  const line = `[${m.type()}] ${m.text()}`;
  consoleLines.push(line);
  if (args.verbose || m.type() === 'error' || m.type() === 'warning') console.log(`[browser] ${line}`);
});
page.on('pageerror', (e) => { consoleLines.push(`[pageerror] ${e.message}`); console.log(`[browser] [pageerror] ${e.message}`); });

let ok = false;
let failure = null;
const { h, notes, shots } = createApi(page, await ctx.newCDPSession(page), outDir);
try {
  // A scenario may export `options = { query: 'standin=1' }` (page URL query, read by the game before boot).
  const mod = await import(pathToFileURL(scenarioPath).href);
  const query = args.query ?? mod.options?.query ?? '';
  await page.goto(`${server.url}/index.html${query ? '?' + query : ''}`);
  await page.waitForFunction(() => window.__harness && (window.__harness.ready || window.__harness.error), null, { timeout: 30000 });
  const bootErr = await page.evaluate(() => window.__harness.error);
  if (bootErr) throw new Error('Harness boot failed:\n' + bootErr);
  await mod.default(h);
  ok = true;
} catch (e) {
  failure = String(e && e.stack ? e.stack : e);
  console.error(`[harness] scenario FAILED: ${failure}`);
  try { shots.push(await h.screenshot('FAILED')); } catch { /* page may be gone */ }
}
const stats = await page.evaluate(() => (window.__harness && window.__harness.stats ? window.__harness.stats() : null)).catch(() => null);
const summary = {
  scenario: path.relative(REPO, scenarioPath), ok, failure, viewport: args.viewport, scripts: b.scriptCount,
  seconds: +((Date.now() - t0) / 1000).toFixed(1), lastFrame: stats, notes,
  screenshots: shots.map((s) => path.relative(REPO, s)),
  consoleErrors: consoleLines.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]')),
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ ...summary, console: consoleLines }, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
await server.close();
process.exit(ok ? 0 : 1);
