// Bundles shdc-lib (cocos-cli, MIT) + the engine's editor/exports/offline-mappings.ts for the browser.
// offline-mappings imports engine internals; we redirect them to the matching exports of the built cc.js.
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [engine, shdcFile, out] = process.argv.slice(2).map((p) => path.resolve(p));
const offline = path.join(engine, 'editor/exports/offline-mappings.ts');
await esbuild.build({
  entryPoints: [path.join(here, 'browser-entry.js')],
  bundle: true, platform: 'browser', format: 'esm', outfile: out, external: ['cc'], logLevel: 'warning',
  nodePaths: [path.join(here, '../../node_modules')],
  plugins: [{
    name: 'cocos-shims',
    setup(b) {
      b.onResolve({ filter: /^shdc-lib$/ }, () => ({ path: shdcFile }));
      b.onResolve({ filter: /^gl$/ }, () => ({ path: path.join(here, 'gl-stub.js') }));
      b.onResolve({ filter: /^(\.\/offline-mappings|cc\/editor\/offline-mappings)$/ }, () => ({ path: offline }));
      b.onResolve({ filter: /^\.\.\/\.\.\/cocos\/gfx$/ }, () => ({ path: path.join(here, 'shim-gfx.js') }));
      b.onResolve({ filter: /^\.\.\/\.\.\/cocos\/rendering\/define$/ }, () => ({ path: path.join(here, 'shim-pipeline.js') }));
      b.onResolve({ filter: /^\.\.\/\.\.\/cocos\/core$/ }, () => ({ path: path.join(here, 'shim-core.js') }));
    },
  }],
});
console.log('[tools] effect compiler bundled -> ' + out);
