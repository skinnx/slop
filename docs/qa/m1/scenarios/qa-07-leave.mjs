// QA 07: leave a dungeon run mid-way (pause -> leave -> confirm), then reload and check state; tap outside a panel.
import { boot, until, read, st, check, tap, panel, closePanels, midGame, installSave, pageNow, tapBuilding, ff, send } from './lib/qa.mjs';
export default async function (h) {
  await boot(h);
  await installSave(h, midGame(await pageNow(h))); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500);
  const g0 = (await st(h)).resources.gold;
  await tapBuilding(h, 'dungeon_gate'); await panel(h, 'gate'); await tap(h, 'enter', { wait: 800 });
  if (await read(h, (g) => g.dialog)) await tap(h, 'ok', { wait: 400 });
  await until(h, (g) => g.mode === 'DUNGEON'); await ff(h, 6); await h.wait(300);
  await tap(h, 'pause', { wait: 400 }); await h.screenshot('01-pause');
  await tap(h, 'leave', { wait: 200 }); await until(h, (g) => !!g.dialog); await h.wait(300); await h.screenshot('02-leave-dialog');
  h.note('dialog=' + await read(h, (g) => g.dialog));
  await tap(h, 'ok', { wait: 900 });
  h.note('mode after confirm=' + await read(h, (g) => g.mode)); await h.screenshot('03-after-confirm');
  if ((await read(h, (g) => g.mode)) === 'RESULT') { await h.tap(360, 640); await h.wait(700); }
  const s = await st(h);
  h.note(`back: mode=${s.mode} zone=${s.zone} gold ${g0} -> ${s.resources.gold}`);
  // tap outside panel (top bar / dim area) to close
  await tapBuilding(h, 'storage'); await h.wait(600);
  const before = await read(h, (g) => g.panels);
  await h.tap(360, 1150); await h.wait(400);
  h.note(`tap on dim area above panel (y=1150): panels ${JSON.stringify(before)} -> ${JSON.stringify(await read(h, (g) => g.panels))}`);
  await h.tap(40, 600); await h.wait(400);
  h.note(`tap left strip x=40: -> ${JSON.stringify(await read(h, (g) => g.panels))}`);
}
