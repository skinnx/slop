// Type-checks game/ against the real 3.8.8 cc.d.ts, then tools/ (harness + tests).
import fs from 'node:fs';
import path from 'node:path';
import { TOOLS, GAME, ENGINE, StepError, run, log } from './lib.mjs';

try {
  if (!fs.existsSync(path.join(GAME, 'temp/declarations/cc.d.ts'))) {
    if (!fs.existsSync(path.join(ENGINE, 'bin/.declarations/cc.d.ts'))) throw new StepError('cc.d.ts not built. Run "npm run setup" first.');
    run('node', [path.join(TOOLS, 'scripts/gen-declarations.cjs'), ENGINE, GAME]);
  }
  const tsc = path.join(TOOLS, 'node_modules/typescript/bin/tsc');
  run('node', [tsc, '-p', path.join(GAME, 'tsconfig.json'), '--noEmit'], { hint: 'Fix the errors above (game code).' });
  log('game/: OK');
  run('node', [tsc, '-p', path.join(TOOLS, 'tsconfig.json'), '--noEmit'], { hint: 'Fix the errors above (tools code).' });
  log('tools/: OK');
} catch (e) {
  console.error(`[tools] TYPECHECK FAILED: ${e.message}`);
  process.exit(1);
}
