// Every JSON under resources parses; every atlas frame map matches its PNG.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { RESOURCES, walk } from './paths';

describe('resources', () => {
  const jsons = walk(RESOURCES).filter((f) => f.endsWith('.json'));
  for (const f of jsons) {
    it(`parses ${path.relative(RESOURCES, f)}`, () => {
      expect(() => JSON.parse(fs.readFileSync(f, 'utf8'))).not.toThrow();
    });
  }
  for (const f of jsons.filter((j) => j.endsWith('-frames.json'))) {
    it(`atlas ${path.relative(RESOURCES, f)} fits its image`, () => {
      const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
      const png = PNG.sync.read(fs.readFileSync(path.join(path.dirname(f), meta.image)));
      expect([png.width, png.height]).toEqual([meta.width, meta.height]);
      for (const [name, r] of Object.entries<any>(meta.frames)) {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= png.width && r.y + r.h <= png.height, name).toBe(true);
      }
    });
  }
  it('has no resource names with spaces (paths are used in code)', () => {
    expect(walk(RESOURCES).filter((f) => /\s/.test(path.relative(RESOURCES, f)))).toEqual([]);
  });
});
