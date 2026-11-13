// Village: welcome back, building icons, building panel (collect, upgrade, cancel), build mode (new building
// with invalid/valid ghost, move, upgrade from selection), settings. Mid-game save, real core.
// npm run harness -- harness/scenarios/m1-village.mjs --out ../docs/evidence/m1/village
import { boot, until, read, tapName, panel, closePanels, where } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';

async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }

export default async function (h) {
  await boot(h);
  const now = await pageNow(h);
  const save = midGame(now, { lastSaveAt: now - (3 * 3600 + 12 * 60) * 1000, mineJob: true });
  save.buildings = save.buildings.filter((b) => b.type !== 'market'); // leave one building to place
  await installSave(h, save);
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await panel(h, 'welcome');
  await h.screenshot('01-welcome-back');
  h.note('welcome lines: ' + JSON.stringify(await read(h, (g) => g.texts('panel:welcome'))));
  await tapName(h, 'collectAll', { wait: 400 });
  await until(h, (g) => g.panels.length === 0);
  await h.wait(300);
  await h.screenshot('02-village');

  // Building panel: lumber camp (2x2 at 31,27).
  await tapCell(h, 32, 28);
  await panel(h, 'building');
  await h.screenshot('03-building-panel');
  const before = await read(h, (g) => g.state.resources.wood);
  await tapName(h, 'upgrade', { wait: 300 }); // upgrade -> panel closes, toast
  await h.screenshot('04-upgrade-started');
  const after = await read(h, (g) => g.state.resources.wood);
  h.note(`wood ${before} -> ${after} after upgrade`);
  await tapCell(h, 32, 28);
  await panel(h, 'building');
  await h.screenshot('05-building-job');
  await tapName(h, 'cancelJob');
  await until(h, (g) => !!g.dialog);
  await h.screenshot('06-cancel-confirm');
  await tapName(h, 'ok', { wait: 300 });
  await closePanels(h);

  // Build mode.
  await tapName(h, 'build');
  await until(h, (g) => g.mode === 'BUILD');
  await h.wait(300);
  await h.screenshot('07-build-mode');
  await h.drag([600, 230], [150, 230], { id: 3, steps: 8 });
  await tapName(h, 'bcard-market');
  await until(h, (g) => !!(g.screen.build && g.screen.build.ghost));
  await h.wait(100);
  await h.screenshot('08-ghost-valid');
  // Drag the ghost onto the storage (invalid, red, reason shown).
  const gh = await read(h, (g) => g.screen.build.ghost);
  const from = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [gh.x + 1, gh.y + 1]);
  const to = await h.eval(() => globalThis.__game.cellToUi(26.5, 26.5));
  await h.drag([from.x, from.y], [to.x, to.y], { id: 0, steps: 10, keepDown: true });
  await h.wait(150);
  await h.screenshot('09-ghost-invalid');
  const bad = await read(h, (g) => g.screen.build.ghost);
  h.note(`ghost on storage: valid=${bad.valid} reason="${bad.reason}"`);
  h.assert(!bad.valid, 'ghost over the storage is invalid');
  // Back to a free spot and confirm.
  await h.touchMove(0, from.x, from.y);
  await h.touchUp(0);
  await h.wait(100);
  const ok = await read(h, (g) => g.screen.build.ghost);
  h.assert(ok.valid, 'ghost back on free cells is valid: ' + ok.reason);
  await tapName(h, 'ghostOk', { wait: 300 });
  await until(h, (g) => g.state.buildings.some((b) => b.type === 'market'));
  await h.screenshot('10-scaffold');
  // Select the tavern, move it one cell, confirm.
  await tapCell(h, 28.5, 32.5);
  await until(h, (g) => g.screen.build && g.screen.build.selected !== null);
  await h.screenshot('11-selected');
  await tapName(h, 'ghostUpgrade');
  await panel(h, 'building');
  await h.screenshot('12-upgrade-from-build');
  await closePanels(h);
  await tapName(h, 'done');
  await until(h, (g) => g.mode === 'WORLD');

  await tapName(h, 'settings');
  await panel(h, 'settings');
  await h.screenshot('13-settings');
  await tapName(h, 'reset');
  await until(h, (g) => !!g.dialog);
  await h.screenshot('14-reset-confirm');
  await tapName(h, 'cancel', { wait: 200 });
  await closePanels(h);
  h.note(`village drawCalls=${(await h.stats()).drawCalls}`);
}
