// Quán Mỏ Neo: recruit tab (1x/2x/3x, card detail), reveal screen, ticket exchange with hero picker.
// npm run harness -- harness/scenarios/m1-tavern.mjs --out ../docs/evidence/m1/tavern
import { boot, until, read, tapName, panel, closePanels } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';
async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }

export default async function (h) {
  await boot(h);
  await installSave(h, midGame(await pageNow(h)));
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  await tapCell(h, 28.5, 32.5);
  await panel(h, 'tavern');
  await h.screenshot('01-recruit-tab');
  await tapName(h, 'card1');
  await panel(h, 'heroDetail');
  await h.screenshot('02-card-detail-view-only');
  await tapName(h, 'back', { wait: 300 });
  await tapName(h, 'times3');
  await h.screenshot('03-times-3x');
  const gold0 = await read(h, (g) => g.state.resources.gold);
  await tapName(h, 'recruit');
  await panel(h, 'reveal');
  await h.wait(700);
  await h.screenshot('04-reveal-drawing');
  await until(h, (g) => g.screen.reveal && g.screen.reveal.done, null, 8000);
  await h.screenshot('05-reveal-done');
  const gold1 = await read(h, (g) => g.state.resources.gold);
  h.note(`gold ${gold0} -> ${gold1} after 3x recruit`);
  await h.tap(360, 400);
  await panel(h, 'tavern');
  await h.screenshot('06-after-recruit');
  await tapName(h, 'refresh');
  await until(h, (g) => !!g.dialog);
  await h.screenshot('07-refresh-confirm');
  await tapName(h, 'cancel', { wait: 200 });
  await tapName(h, 'tab-exchange', { wait: 300 });
  await h.screenshot('08-exchange-tab');
  await tapName(h, 'exchange-frag5');
  await panel(h, 'heroPick');
  await h.screenshot('09-hero-picker');
  await tapName(h, 'pick-bang');
  await until(h, (g) => !!g.dialog);
  await h.screenshot('10-exchange-confirm');
  const t0 = await read(h, (g) => g.state.resources.tickets);
  await tapName(h, 'ok', { wait: 400 });
  const t1 = await read(h, (g) => g.state.resources.tickets);
  h.note(`tickets ${t0} -> ${t1} after exchange`);
  await h.screenshot('11-after-exchange');
  await closePanels(h);
}
