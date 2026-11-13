// Bundles harness/boot/main.ts + every script under game/assets/scripts with esbuild ('cc' stays external).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { GAME, TOOLS, compressUuid } from '../../scripts/lib.mjs';

const SCRIPTS = path.join(GAME, 'assets/scripts');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

export async function bundleHarness(outDir) {
  const files = walk(SCRIPTS).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts')).sort();
  const lines = [];
  const entries = [];
  files.forEach((f, i) => {
    lines.push(`import * as m${i} from ${JSON.stringify(f)};`);
    const meta = f + '.meta';
    const cid = fs.existsSync(meta) ? compressUuid(JSON.parse(fs.readFileSync(meta, 'utf8')).uuid) : '';
    entries.push(`{ file: ${JSON.stringify(path.relative(SCRIPTS, f).replace(/\\/g, '/'))}, cid: ${JSON.stringify(cid)}, mod: m${i} }`);
  });
  const virtual = `${lines.join('\n')}\nexport const scripts = [${entries.filter((e) => !e.includes('cid: ""')).join(',\n')}];\n`;
  const result = await esbuild.build({
    entryPoints: [path.join(TOOLS, 'harness/boot/main.ts')],
    bundle: true, format: 'esm', platform: 'browser', target: 'chrome100', external: ['cc'],
    outfile: path.join(outDir, 'main.js'), sourcemap: 'inline', logLevel: 'silent',
    // Editor-like TS options: legacy decorators; class fields with define semantics (3.8 project default).
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: true } },
    plugins: [{
      name: 'game-scripts',
      setup(b) {
        b.onResolve({ filter: /^harness:game-scripts$/ }, () => ({ path: 'game-scripts', namespace: 'harness' }));
        b.onLoad({ filter: /.*/, namespace: 'harness' }, () => ({ contents: virtual, loader: 'js', resolveDir: SCRIPTS }));
        // Cocos forbids Node built-ins and resolves only ESM-compatible packages; fail loudly like the editor would.
        b.onResolve({ filter: /^(node:|fs$|path$|child_process$)/ }, (a) => ({ errors: [{ text: `Node built-in "${a.path}" is not available in Cocos scripts` }] }));
      },
    }],
  });
  return { scriptCount: files.length, warnings: result.warnings.length };
}
