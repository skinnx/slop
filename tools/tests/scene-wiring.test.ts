// Main.scene must reference Bootstrap by the compressed uuid of Bootstrap.ts.meta (that is how the editor resolves it).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ASSETS } from './paths';
// @ts-expect-error plain JS helper shared with the scripts
import { compressUuid } from '../scripts/lib.mjs';

const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(GAME_ASSETS, rel), 'utf8'));

describe('scene wiring', () => {
  it('compressUuid matches a value taken from an official 3.8 sample scene', () => {
    expect(compressUuid('2c51036c-1861-486e-91f3-79b023854534')).toBe('2c510NsGGFIbpHzebAjhUU0');
  });
  it('Main.scene references Bootstrap by uuid and keeps its own uuid', () => {
    const scene = readJson('scenes/Main.scene');
    const sceneMeta = readJson('scenes/Main.scene.meta');
    const bootMeta = readJson('scripts/Bootstrap.ts.meta');
    expect(scene[1].__type__).toBe('cc.Scene');
    expect(scene[1]._id).toBe(sceneMeta.uuid);
    expect(scene.some((o: any) => o.__type__ === compressUuid(bootMeta.uuid))).toBe(true);
  });
  it('fixed uuids did not change', () => {
    expect(readJson('scenes/Main.scene.meta').uuid).toBe('4a24a7dd-af17-483e-8cfa-f17abbcc6392');
    expect(readJson('scripts/Bootstrap.ts.meta').uuid).toBe('60aebf07-3501-4242-86eb-eae8e528621d');
  });
  it('Bootstrap class name stays "Bootstrap"', () => {
    const src = fs.readFileSync(path.join(GAME_ASSETS, 'scripts/Bootstrap.ts'), 'utf8');
    expect(src).toMatch(/@ccclass\('Bootstrap'\)/);
  });
});
