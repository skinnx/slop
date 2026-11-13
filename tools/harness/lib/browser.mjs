// Static file server + Chromium launcher shared by setup (effect compile) and the harness.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
  '.ttf': 'font/ttf', '.scene': 'application/json', '.meta': 'application/json' };

/** mounts: { '/url-prefix/': '/abs/dir' }. Returns { url, close }. */
export async function serve(mounts) {
  const entries = Object.entries(mounts).sort((a, b) => b[0].length - a[0].length);
  const srv = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    for (const [prefix, dir] of entries) {
      if (!urlPath.startsWith(prefix)) continue;
      const file = path.join(dir, urlPath.slice(prefix.length));
      if (!file.startsWith(dir)) break;
      return fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    }
    res.writeHead(404); res.end('not found');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise((r) => srv.close(r)) };
}

export async function launchChromium() {
  try {
    return await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    });
  } catch (e) {
    throw new Error(
      `Cannot start Chromium for playwright-core ${JSON.parse(fs.readFileSync(new URL('../../node_modules/playwright-core/package.json', import.meta.url))).version}.\n` +
      `  PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH ?? '(unset)'}\n` +
      '  Fix: install the matching browser (npx playwright-core install chromium) or set PLAYWRIGHT_BROWSERS_PATH.\n' + e.message);
  }
}
