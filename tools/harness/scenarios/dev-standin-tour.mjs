// Layout tour on stand-in data (no core): every screen once. npm run harness -- harness/scenarios/dev-standin-tour.mjs
import { startGame, until, read, tapName, panel, closePanels, drawCalls } from './lib/view.mjs';
export const options = { query: 'standin=1' };
async function tapCell(h, x, y) { const p = await h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]); await h.tap(p.x, p.y); await h.wait(150); }
export default async function (h) {
  await h.waitForGlobal('__bootstrapReady', 30000);
  await h.wait(300);
  await h.screenshot('00-title');
  await startGame(h);
  await h.screenshot('01-welcome');
  await closePanels(h);
  await h.screenshot('02-village');
  h.note(`village drawCalls=${await drawCalls(h)}`);
  await tapCell(h, 28.5, 32.5); await panel(h, 'tavern'); await h.screenshot('03-tavern');
  await tapName(h, 'tab-exchange'); await h.wait(200); await h.screenshot('04-exchange');
  await tapName(h, 'tab-recruit'); await tapName(h, 'times2'); await tapName(h, 'recruit'); await panel(h, 'reveal');
  await h.wait(800); await h.screenshot('05-reveal-mid');
  await until(h, (g) => g.screen.reveal && g.screen.reveal.done); await h.screenshot('06-reveal-done');
  await h.tap(360, 300); await panel(h, 'tavern'); await closePanels(h);
  await tapName(h, 'hero'); await panel(h, 'heroList'); await h.screenshot('07-herolist');
  await tapName(h, 'hero-se'); await panel(h, 'heroDetail'); await h.screenshot('08-herodetail');
  await closePanels(h);
  await tapName(h, 'squad'); await panel(h, 'squad'); await h.screenshot('09-squad');
  await closePanels(h);
  await tapName(h, 'settings'); await panel(h, 'settings'); await h.screenshot('10-settings'); await closePanels(h);
  await tapCell(h, 32, 28); await panel(h, 'building'); await h.screenshot('11-building'); await closePanels(h);
  await tapCell(h, 30.5, 36.5); await panel(h, 'training'); await h.screenshot('12-training');
  await tapName(h, 'node7'); await h.wait(200); await h.screenshot('13-training-tip'); await closePanels(h);
  await tapName(h, 'build'); await until(h, (g) => g.mode === 'BUILD'); await h.wait(300); await h.screenshot('14-build');
  await h.drag([600, 230], [150, 230], { id: 3, steps: 8 }); await h.wait(100);
  await tapName(h, 'bcard-market'); await h.wait(200); await h.screenshot('15-build-ghost');
  await tapName(h, 'done'); await until(h, (g) => g.mode === 'WORLD');
  await tapCell(h, 25.5, 29.5); await panel(h, 'gate'); await h.screenshot('16-gate');
  await tapName(h, 'enter'); await until(h, (g) => g.dialog); await h.screenshot('17-confirm');
  await tapName(h, 'ok'); await until(h, (g) => g.mode === 'DUNGEON'); await h.wait(1200); await h.screenshot('18-dungeon');
  h.note(`dungeon drawCalls=${await drawCalls(h)}`);
  await tapName(h, 'pause'); await panel(h, 'pause'); await h.screenshot('19-pause');
  await tapName(h, 'leave'); await until(h, (g) => g.dialog); await tapName(h, 'ok');
  await until(h, (g) => g.mode === 'RESULT'); await h.wait(800); await h.screenshot('20-defeat');
  await h.eval(() => { const g = globalThis.__game; g.send({ t: 'resultContinue' }); setTimeout(() => g.standIn.forceResult(true), 100); }); await h.wait(900); await h.screenshot('21-victory');
}
