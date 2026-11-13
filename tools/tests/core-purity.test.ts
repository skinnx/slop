// Charter rule: game/assets/scripts/core must not depend on the engine or the browser.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CORE, walk } from './paths';

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+['"]cc(\/[^'"]*)?['"]/, "import from 'cc'"],
  [/require\(\s*['"]cc['"]\s*\)/, "require('cc')"],
  [/\b(window|document|localStorage)\./, 'browser global'],
  [/\bMath\.random\s*\(/, 'Math.random (use the seeded RNG)'],
  [/\bconst\s+enum\b/, 'const enum (not supported by Cocos isolatedModules)'],
  [/from\s+['"][^'"]+\.ts['"]/, "import specifier ending in .ts (Cocos forbids it)"],
];

describe('core purity', () => {
  const files = walk(CORE).filter((f) => f.endsWith('.ts'));
  it('scans the core folder', () => {
    expect(fs.existsSync(CORE)).toBe(true);
  });
  for (const f of files) {
    it(path.relative(CORE, f), () => {
      const src = fs.readFileSync(f, 'utf8');
      for (const [re, what] of FORBIDDEN) expect(re.test(src), `${what} in ${f}`).toBe(false);
    });
  }
});
