// Chạy một file TypeScript của tools/sim dưới Node: esbuild gộp file đó (cùng lõi game) thành một file
// ESM tạm rồi import. Cần thiết vì lõi import không ghi đuôi .ts (quy tắc Cocos), Node thuần không chạy được.
//   node sim/run-ts.mjs <file.ts> [tham số...]
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = process.argv[2];
if (!entry) {
  console.error('usage: node sim/run-ts.mjs <file.ts> [args...]');
  process.exit(2);
}
const tmpRoot = path.resolve(here, '../.out');
fs.mkdirSync(tmpRoot, { recursive: true });
const outDir = fs.mkdtempSync(path.join(tmpRoot, 'sim-tmp-'));
const outfile = path.join(outDir, 'bundle.mjs');
await build({
  entryPoints: [path.resolve(entry)],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'inline',
  logLevel: 'error',
  absWorkingDir: path.resolve(here, '..'),
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
process.env.SLOP_REPO = path.resolve(here, '../..');
process.argv.splice(1, 2, path.resolve(entry));
try {
  await import(pathToFileURL(outfile).href);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
