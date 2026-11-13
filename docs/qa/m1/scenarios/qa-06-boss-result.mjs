// QA 06: boss telegraph, victory result, defeat result, result -> village; then a weak squad loses.
import { boot, until, read, st, check, tap, panel, texts, midGame, strongSquad, installSave, pageNow, tapBuilding, ff, send } from './lib/qa.mjs';
async function enter(h, stage, viaTouch = true) {
  if (!viaTouch) { await send(h, { t: 'enterDungeon', stage }); await until(h, (g) => g.mode === 'DUNGEON'); return; }
  await tapBuilding(h, 'dungeon_gate'); await panel(h, 'gate').catch(() => {}); await h.screenshot('gate-' + Date.now() % 100000); await tap(h, 'enter', { wait: 700 });
  if (await read(h, (g) => g.dialog)) { h.note('dialog on enter: ' + await read(h, (g) => g.dialog)); await h.screenshot('enter-dialog-' + Date.now() % 100000); await tap(h, 'ok', { wait: 500 }); }
  await until(h, (g) => g.mode === 'DUNGEON');
}
async function toFloor(h, f) {
  for (let g = 0; g < 400; g++) {
    const s = await st(h);
    if (s.mode !== 'dungeon' || s.run.floor >= f) return;
    await send(h, { t: 'setAuto', on: true }); await ff(h, 2);
  }
}
export default async function (h) {
  await boot(h);
  const now = await pageNow(h);
  await installSave(h, strongSquad(now)); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500);
  await enter(h, 1, false);
  await toFloor(h, 5);
  await h.wait(300); await h.screenshot('01-boss-floor');
  let seen = 0;
  for (let i = 0; i < 80 && seen < 1; i++) {
    await send(h, { t: 'setAuto', on: false });
    await ff(h, 0.5); await h.frames(2);
    if ((await read(h, (g) => g.telegraphCount)) > 0) { seen++; await h.screenshot('02-boss-telegraph'); }
  }
  check(h, seen > 0, 'boss telegraph (red zone) appeared');
  for (let i = 0; i < 200 && (await read(h, (g) => g.mode)) === 'DUNGEON'; i++) await ff(h, 2);
  await h.wait(600); h.note('mode after boss=' + await read(h, (g) => g.mode)); await h.screenshot('03-victory');
  h.note('result texts ' + JSON.stringify(await texts(h)).slice(0, 500));
  await h.tap(360, 640); await h.wait(800);
  h.note('after tap mode=' + await read(h, (g) => g.mode)); await h.screenshot('04-after-result');
  // weak squad
  await h.page.reload(); await boot(h);
  const w = midGame(await pageNow(h), { heroes: [{ id: 'bang', level: 1, fragments: 0 }], squad: ['bang'], slots: 3, bestStage: 0 });
  await installSave(h, w); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500);
  await enter(h, 1);
  for (let i = 0; i < 300 && (await read(h, (g) => g.mode)) === 'DUNGEON'; i++) { await send(h, { t: 'setAuto', on: true }); await ff(h, 2); }
  await h.wait(800); h.note('weak squad mode=' + await read(h, (g) => g.mode) + ' result=' + JSON.stringify((await st(h)).result)); await h.screenshot('05-defeat');
  await h.tap(360, 900); await h.wait(800); await h.screenshot('06-after-defeat');
  h.note('after defeat mode=' + await read(h, (g) => g.mode));
}
