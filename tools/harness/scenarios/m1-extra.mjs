// Two states that need a prepared save:
//  1. BONUS: the bar is at 9/10, a 1x recruit fills it: the reveal shows the drawn set, then the new BONUS set.
//  2. Blocked level-up at a breakthrough level (hero level 5, no fragments): the button stays visible, grey,
//     with the core's reason, and the price shows meat + fragments.
// npm run harness -- harness/scenarios/m1-extra.mjs --out ../docs/evidence/m1/extra
import { boot, until, read, tapName, panel, closePanels } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';
async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }

export default async function (h) {
  await boot(h);
  const save = midGame(await pageNow(h));
  save.tavern.bonus = 9;
  save.heroes.push({ id: 'en', level: 5, fragments: 0 });
  await installSave(h, save);
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  await tapName(h, 'hero');
  await panel(h, 'heroList');
  await tapName(h, 'hero-en');
  await panel(h, 'heroDetail');
  await h.screenshot('01-levelup-blocked');
  h.note('detail texts: ' + JSON.stringify(await read(h, (g) => g.texts('panel:heroDetail'))));
  await tapName(h, 'levelUp', { wait: 250 });
  await h.screenshot('02-levelup-blocked-tap');
  h.note('toasts: ' + JSON.stringify(await read(h, (g) => g.toasts.toasts)));
  await closePanels(h);
  await tapCell(h, 28.5, 32.5);
  await panel(h, 'tavern');
  await h.screenshot('03-bonus-9-of-10');
  const before = await read(h, (g) => g.texts('panel:tavern'));
  await tapName(h, 'times1');
  await tapName(h, 'recruit');
  await panel(h, 'reveal');
  await h.wait(500);
  await h.screenshot('04-reveal-drawn-set');
  await until(h, (g) => g.screen.reveal && g.screen.reveal.done, null, 10000);
  await h.wait(200);
  await h.screenshot('05-reveal-bonus-set');
  await h.tap(360, 400);
  await panel(h, 'tavern');
  await h.screenshot('06-tavern-new-set');
  h.note('tavern texts before: ' + JSON.stringify(before.slice(0, 12)));
  h.note('tavern texts after: ' + JSON.stringify((await read(h, (g) => g.texts('panel:tavern'))).slice(0, 12)));

}
