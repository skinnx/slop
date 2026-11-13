import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const GAME_ASSETS = path.join(REPO, 'game/assets');
export const CORE = path.join(GAME_ASSETS, 'scripts/core');
export const RESOURCES = path.join(GAME_ASSETS, 'resources');

export function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
