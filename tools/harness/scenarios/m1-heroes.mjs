// Hero list (filters), hero detail (level up, skill tooltip, swipe), squad setup (remove/add, hold-and-swap,
// TỰ XẾP with the CP band), training yard (tooltip, unlock node). Mid-game save, real core.
// npm run harness -- harness/scenarios/m1-heroes.mjs --out ../docs/evidence/m1/heroes
import { boot, until, read, tapName, panel, closePanels } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';
async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }

export default async function (h) {
  await boot(h);
  await installSave(h, midGame(await pageNow(h)));
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  await tapName(h, 'hero');
  await panel(h, 'heroList');
  await h.screenshot('01-hero-list');
  await tapName(h, 'filter-AGI', { wait: 300 });
  await h.screenshot('02-filter-agi');
  await tapName(h, 'filter-ALL', { wait: 300 });
  await tapName(h, 'hero-se');
  await panel(h, 'heroDetail');
  await h.screenshot('03-hero-detail');
  const lv0 = await read(h, (g) => g.texts('panel:heroDetail'));
  await tapName(h, 'levelUp', { wait: 400 });
  await h.screenshot('04-after-level-up');
  const meat = await read(h, (g) => g.state.resources.meat);
  h.note(`meat after one level: ${meat}`);
  await tapName(h, 'skill0', { wait: 200 });
  await h.screenshot('05-skill-tooltip');
  // swipe on the portrait to the next hero
  const p = await h.eval(() => globalThis.__game.where('portrait'));
  await h.drag([p.x + 120, p.y], [p.x - 120, p.y], { id: 2, steps: 6 });
  await h.wait(300);
  h.note('swiped to ' + await read(h, (g) => g.screen.heroDetail));
  await h.screenshot('06-swiped');
  void lv0;
  await closePanels(h);

  await tapName(h, 'squad');
  await panel(h, 'squad');
  await h.screenshot('07-squad');
  await tapName(h, 'hero-dang', { wait: 300 }); // remove from squad
  await tapName(h, 'hero-do_neo', { wait: 300 }); // add into the free slot
  await h.screenshot('08-squad-changed');
  await tapName(h, 'hero-muc', { wait: 300 }); // squad full: card is held
  await tapName(h, 'slot1', { wait: 300 }); // swap it with slot 2
  await h.screenshot('09-swap');
  await tapName(h, 'autoAssign', { wait: 300 });
  await h.screenshot('10-auto-assign-cp-band');
  h.note('squad after auto: ' + JSON.stringify(await read(h, (g) => g.state.squad)));
  await closePanels(h);

  await tapCell(h, 31.5, 36.5);
  await panel(h, 'training');
  await h.screenshot('11-training');
  const next = await read(h, (g) => g.texts('panel:training').length);
  void next;
  const ore0 = await read(h, (g) => g.state.resources.ore);
  await tapName(h, 'node10');
  await h.wait(200);
  await h.screenshot('12-training-tooltip');
  await tapName(h, 'unlock', { wait: 400 });
  const ore1 = await read(h, (g) => g.state.resources.ore);
  h.note(`ore ${ore0} -> ${ore1} after unlocking node 10`);
  await h.screenshot('13-training-unlocked');
  await tapName(h, 'slot5');
  await h.wait(200);
  await h.screenshot('14-slot-tooltip');
  await closePanels(h);
}
