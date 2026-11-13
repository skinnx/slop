// Cổng Xoáy entry, dungeon combat HUD (floor, gold, kill streak, AUTO, squad health), pause menu, boss floor
// with telegraph and boss bar, victory screen, return; then a run left from the pause menu (defeat screen).
// npm run harness -- harness/scenarios/m1-dungeon.mjs --out ../docs/evidence/m1/dungeon
import { boot, until, read, tapName, panel } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';
async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }
const ff = (h, s) => h.eval((s) => globalThis.__game.fastForward(s), s);

export default async function (h) {
  await boot(h);
  await installSave(h, midGame(await pageNow(h)));
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  await tapCell(h, 25.5, 29.5);
  await panel(h, 'gate');
  await h.screenshot('01-gate-stage1');
  await tapName(h, 'next', { wait: 300 });
  await h.screenshot('02-gate-stage2');
  await tapName(h, 'next', { wait: 300 });
  await h.screenshot('03-gate-stage3-locked');
  await tapName(h, 'prev', { wait: 200 });
  await tapName(h, 'prev', { wait: 200 });
  await tapName(h, 'enter');
  if (await read(h, (g) => !!g.dialog)) { await h.screenshot('04-hard-confirm'); await tapName(h, 'ok'); }
  await until(h, (g) => g.mode === 'DUNGEON');
  await h.wait(900);
  await h.screenshot('05-floor1-start');
  await h.wait(2500);
  await h.screenshot('06-floor1-combat');
  h.note('run: ' + JSON.stringify(await read(h, (g) => g.state.run)));
  h.note(`dungeon drawCalls=${(await h.stats()).drawCalls}`);
  await tapName(h, 'auto', { wait: 200 });
  h.note('auto after tap: ' + await read(h, (g) => g.dungeonHud.auto));
  await tapName(h, 'auto', { wait: 200 });
  await tapName(h, 'pause');
  await panel(h, 'pause');
  await h.screenshot('07-pause');
  const t0 = await read(h, (g) => g.state.tick);
  await h.wait(500);
  const t1 = await read(h, (g) => g.state.tick);
  h.assert(t0 === t1, `simulation stops while paused (${t0} -> ${t1})`);
  await tapName(h, 'resume', { wait: 300 });

  // Jump to the boss floor and wait for a telegraph.
  for (let i = 0; i < 60 && (await read(h, (g) => g.state.run && g.state.run.floor)) < 5; i++) await ff(h, 10);
  await until(h, (g) => g.state.run && g.state.run.floor === 5);
  await h.wait(600);
  await h.screenshot('08-boss-floor');
  for (let i = 0; i < 40; i++) {
    if (await h.eval(() => (globalThis.__game.telegraphCount || 0) > 0)) break;
    await h.wait(250);
  }
  await h.screenshot('09-boss-telegraph');
  for (let i = 0; i < 60 && (await read(h, (g) => g.mode)) === 'DUNGEON'; i++) await ff(h, 5);
  await until(h, (g) => g.mode === 'RESULT');
  await h.wait(1200);
  await h.screenshot('10-result');
  h.note('result: ' + JSON.stringify(await read(h, (g) => g.state.result)));
  await h.tap(360, 400);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(600);
  await h.screenshot('11-back-at-gate');

  // A second run left from the pause menu: defeat-style result.
  await tapCell(h, 25.5, 29.5);
  await panel(h, 'gate');
  await tapName(h, 'enter');
  if (await read(h, (g) => !!g.dialog)) await tapName(h, 'ok');
  await until(h, (g) => g.mode === 'DUNGEON');
  await h.wait(1500);
  await tapName(h, 'pause');
  await panel(h, 'pause');
  await tapName(h, 'leave');
  await until(h, (g) => !!g.dialog);
  await h.screenshot('12-leave-confirm');
  await tapName(h, 'ok');
  await until(h, (g) => g.mode === 'RESULT');
  await h.wait(1200);
  await h.screenshot('13-defeat');
}
