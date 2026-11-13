// QA 05: main screens from a mid-game save, for viewport checks. Run with --viewport WxH.
import { boot, until, read, st, tap, panel, closePanels, texts, midGame, installSave, pageNow, tapBuilding } from './lib/qa.mjs';
export default async function (h) {
  await boot(h);
  await h.screenshot('00-title');
  await installSave(h, midGame(await pageNow(h)));
  await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(600);
  h.note('H=' + await read(h, (g) => g.H));
  await h.screenshot('01-village');
  await tap(h, 'hero', { wait: 500 }); await h.screenshot('02-hero-list');
  await tap(h, 'hero-bang', { wait: 500 }); await h.screenshot('03-hero-detail'); await closePanels(h);
  await tap(h, 'squad', { wait: 500 }); await h.screenshot('04-squad'); await closePanels(h);
  await tapBuilding(h, 'tavern'); await h.wait(500); await h.screenshot('05-tavern'); await closePanels(h);
  await tapBuilding(h, 'training_yard'); await h.wait(500); await h.screenshot('06-training'); await closePanels(h);
  await tapBuilding(h, 'dungeon_gate'); await h.wait(500); await h.screenshot('07-gate');
  await tap(h, 'enter', { wait: 1500 }); await h.screenshot('08-dungeon');
}
