// QA round 2, scenario 2: items round 1 did not test. From a mid-game save (midGame fixture), by touch:
// (a) move a building, (b) place a building then cancel the build (refund?), (c) squad wiped in the field -> revival,
// (d) unlock a squad slot with the rare resource (San Hô Đỏ).
import { boot, until, read, st, check, tap, panel, closePanels, texts, midGame, installSave, pageNow, tapBuilding, ui, walkTo, waitState, waitFast, ff, placeNew, leaveBuild } from '../../scenarios/lib/qa.mjs';

async function start(h, save) { await installSave(h, save); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(600); const w = await read(h, (g) => g.panels); if (w.length) await closePanels(h); }

export default async function (h) {
  await boot(h);
  const now = await pageNow(h);
  const save = midGame(now);
  save.buildings = save.buildings.filter((b) => b.type !== 'market');
  save.buildings.find((b) => b.type === 'training_yard').level = 3; save.resources.coral = 12; save.resources.wood = 800;
  await start(h, save);
  await h.screenshot('00-village');
  // (a) move the tavern (3x3 at 27,31) two cells in x
  if ((await read(h, (g) => g.mode)) !== 'BUILD') await tap(h, 'build', { wait: 400 }); await until(h, (g) => g.mode === 'BUILD'); await h.wait(500);
  const t0 = (await st(h)).buildings.find((b) => b.type === 'tavern');
  const a = await ui(h, t0.x + 1.5, t0.y + 1.5);
  await h.tap(a.x, a.y); await h.wait(300);
  const sel = await read(h, (g) => g.screen.build.selected);
  await h.screenshot('01-tavern-selected'); h.note('selected=' + JSON.stringify(sel));
  const b = await ui(h, t0.x + 1.5 + 2, t0.y + 1.5);
  await h.drag([a.x, a.y], [b.x, b.y], { id: 0, steps: 10, keepDown: true }); await h.wait(200);
  const gh = await read(h, (g) => g.screen.build.ghost);
  h.note('ghost while dragging: ' + JSON.stringify(gh)); await h.screenshot('02-tavern-dragging');
  await h.touchUp(0); await h.wait(150);
  await tap(h, 'ghostOk', { wait: 400 });
  const t1 = (await st(h)).buildings.find((q) => q.type === 'tavern');
  check(h, t1.x === t0.x + 2 || t1.x !== t0.x, `(a) tavern moved ${t0.x},${t0.y} -> ${t1.x},${t1.y}`);
  await h.screenshot('03-tavern-moved');
  // move to an invalid place: drag onto storage, tick should be refused, then cancel
  const c = await ui(h, t1.x + 1.5, t1.y + 1.5), d = await ui(h, 26.5, 26.5);
  await h.tap(c.x, c.y); await h.wait(300);
  await h.drag([c.x, c.y], [d.x, d.y], { id: 0, steps: 10, keepDown: true }); await h.touchUp(0); await h.wait(200);
  const bad = await read(h, (g) => g.screen.build.ghost);
  check(h, bad && !bad.valid, `(a) moving onto the storage is invalid: "${bad && bad.reason}"`);
  await tap(h, 'ghostCancel', { wait: 400 }).catch(() => {});
  const t2 = (await st(h)).buildings.find((q) => q.type === 'tavern');
  check(h, t2.x === t1.x && t2.y === t1.y, `(a) cancel returns the tavern to ${t2.x},${t2.y}`);
  // (b) place the market then cancel its construction
  const w0 = (await st(h)).resources.wood;
  const m = await placeNew(h, 'market', { label: '04-market-ghost' });
  const w1 = (await st(h)).resources.wood;
  await h.screenshot('05-market-scaffold');
  await leaveBuild(h);
  await tapBuilding(h, 'market'); await panel(h, 'building').catch(() => {});
  await h.screenshot('06-market-panel');
  await tap(h, 'cancelJob', { wait: 300 });
  if (await read(h, (g) => g.dialog)) { await h.screenshot('07-cancel-confirm'); await tap(h, 'ok', { wait: 500 }); }
  await closePanels(h);
  const s = await st(h);
  const mk = s.buildings.find((q) => q.type === 'market');
  check(h, !mk, `(b) after cancel the market is gone (buildings: ${s.buildings.map((q) => q.type).join(',')})`);
  check(h, s.resources.wood === w0, `(b) refund: wood ${w0} -> ${w1} (placed) -> ${s.resources.wood} (cancelled); spec says 100%`);
  await h.screenshot('08-after-cancel');
  // (d) slot unlock with coral
  await tapBuilding(h, 'training_yard'); await panel(h, 'training').catch(() => {});
  const coral0 = (await st(h)).resources.coral, slots0 = (await st(h)).slots;
  await tap(h, 'slot5', { wait: 400 }); await h.screenshot('09-slot5-tooltip');
  h.note('slot tooltip texts: ' + JSON.stringify(await texts(h, 'tooltip')).slice(0, 300));
  await tap(h, 'unlock', { wait: 500 });
  const s2 = await st(h);
  check(h, s2.slots === slots0 + 1 && s2.resources.coral < coral0, `(d) slot unlock: slots ${slots0} -> ${s2.slots}, coral ${coral0} -> ${s2.resources.coral}`);
  await h.screenshot('10-slot-unlocked'); await closePanels(h);
  await tap(h, 'squad', { wait: 500 }); await h.screenshot('11-squad-5-slots'); await closePanels(h);
  // (c) wipe in the field: weak squad walks to the jellyfish camp of the second zone and stands there
  const weak = midGame(await pageNow(h), { heroes: [{ id: 'bang', level: 1, fragments: 0 }], squad: ['bang'], slots: 3, leaderPos: [21, 12] });
  await installSave(h, weak); await h.eval(() => { Storage.prototype.setItem = function () {}; }); await h.page.reload(); await boot(h); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(600);
  await h.screenshot('12-weak-in-zone2');
  let died = false, posAtDeath = null;
  await walkTo(h, 19.5, 9.5, { stop: 1.5, maxMs: 15000 });
  for (let i = 0; i < 200; i++) { const x = await st(h); if (x.heroes === 0 || (x.leader && x.zone === 'village' && i > 0)) { died = true; posAtDeath = x.leader; break; } await ff(h, 1); await h.wait(30); }
  await h.wait(600); await h.screenshot('13-after-wipe');
  const s3 = await st(h);
  h.note(`(c) after wipe: mode=${s3.mode} heroes=${s3.heroes} zone=${s3.zone} leader=${JSON.stringify(s3.leader)} panels=${JSON.stringify(await read(h, (g) => g.panels))} dialog=${await read(h, (g) => g.dialog)} toasts=${JSON.stringify(await read(h, (g) => g.toasts))}`);
  await ff(h, 12); await h.wait(500); await h.screenshot('14-revived');
  const s4 = await st(h);
  check(h, s4.heroes >= 1 && s4.leader, `(c) squad revived: heroes=${s4.heroes} leader=${JSON.stringify(s4.leader)} zone=${s4.zone} (respawn point is 30,30)`);
  await h.touchUp(0).catch(() => {});
}
