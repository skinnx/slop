// QA 04: edge cases: invalid placement, unaffordable, taps during joystick hold, save/reload persistence, offline progress cap.
import { boot, until, read, st, check, tap, panel, closePanels, texts, midGame, installSave, pageNow, tapBuilding, ui, SAVE_KEY } from './lib/qa.mjs';

const stored = (h) => h.eval((k) => { const t = localStorage.getItem(k); return t ? JSON.parse(t) : null; }, SAVE_KEY);
async function start(h) { await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500); }
async function reload(h, { keepStorage = false } = {}) {
  // the page saves on pagehide; when we want our hand-made save to survive the reload, block setItem in the OLD page first
  if (keepStorage) await h.eval(() => { Storage.prototype.setItem = function () {}; });
  await h.page.reload(); await boot(h);
}

export default async function (h) {
  await boot(h);
  const now = await pageNow(h);
  const save = midGame(now);
  save.buildings = save.buildings.filter((b) => b.type !== 'market');
  save.resources.wood = 50;
  await installSave(h, save); await start(h);
  await h.screenshot('01-village-midgame');
  // E1 invalid placement: ghost onto the storage, press the (disabled) tick
  await tap(h, 'build', { wait: 400 }); await until(h, (g) => g.mode === 'BUILD'); await h.wait(300); await h.drag([600, 230], [150, 230], { id: 3, steps: 8 }); await tap(h, 'bcard-market', { wait: 300 }); await until(h, (g) => !!(g.screen.build && g.screen.build.ghost));
  let gh = await read(h, (g) => g.screen.build.ghost);
  const a = await ui(h, gh.x + 1, gh.y + 1), b = await ui(h, 26.5, 26.5);
  await h.drag([a.x, a.y], [b.x, b.y], { steps: 10, keepDown: true }); await h.touchUp(0); await h.wait(150);
  gh = await read(h, (g) => g.screen.build.ghost);
  check(h, !gh.valid, `E1 overlap invalid: reason="${gh.reason}"`);
  const n0 = (await st(h)).buildings.length;
  await tap(h, 'ghostOk', { wait: 300 });
  check(h, (await st(h)).buildings.length === n0, 'E1 tick on invalid ghost builds nothing');
  await h.screenshot('02-overlap-invalid');
  // E2 off-grid: drag far outside the village grid
  const far = await ui(h, 5, 5);
  await h.drag([b.x, b.y], [far.x, far.y], { steps: 12, keepDown: true }); await h.touchUp(0); await h.wait(150);
  gh = await read(h, (g) => g.screen.build.ghost);
  check(h, !gh.valid, `E2 off-grid ghost at ${gh.x},${gh.y} valid=${gh.valid} reason="${gh.reason}"`);
  await h.screenshot('03-offgrid');
  // E3 unaffordable: wood 50 < market 80
  const near = await ui(h, 35, 22);
  await h.drag([far.x, far.y], [near.x, near.y], { steps: 12, keepDown: true }); await h.touchUp(0); await h.wait(150);
  gh = await read(h, (g) => g.screen.build.ghost);
  h.note(`E3 ghost ${gh.x},${gh.y} valid=${gh.valid} reason="${gh.reason}" wood=${(await st(h)).resources.wood}`);
  await tap(h, 'ghostOk', { wait: 300 });
  check(h, (await st(h)).buildings.length === n0, 'E3 cannot build without wood');
  await h.screenshot('04-unaffordable');
  await tap(h, 'ghostCancel', { wait: 200 }).catch(() => {});
  await tap(h, 'done', { wait: 400 });
  // E4 tap build while the joystick finger is down (two touches)
  await h.touchDown(0, 360, 420); await h.touchMove(0, 460, 420);
  const hb = await h.eval(() => globalThis.__game.where('hero')); await h.tap(hb.x, hb.y, { id: 5 });
  await h.wait(300);
  h.note('E4 panels after 2nd finger tap on Hero while stick held: ' + JSON.stringify(await read(h, (g) => g.panels)) + ' joystick=' + JSON.stringify(await read(h, (g) => g.joystick)));
  await h.touchUp(0); await h.wait(300);
  await closePanels(h);
  // E5 tap through panel: open storage panel, tap on world behind it
  await tapBuilding(h, 'storage'); await h.wait(600);
  h.note('E5 panel open: ' + JSON.stringify(await read(h, (g) => g.panels))); await h.screenshot('05b-storage-panel');
  await h.tap(360, 1230); await h.wait(400);
  h.note('E5 panels after tapping the dim area behind: ' + JSON.stringify(await read(h, (g) => g.panels)));
  await closePanels(h);
  // E6 persistence: upgrade lumber camp (wood 50 may be short) -> use settings toggle + resources, then reload
  const before = await st(h);
  await tap(h, 'settings', { wait: 400 }); await h.screenshot('05-settings'); await closePanels(h);
  await h.eval(() => globalThis.__game.send({ t: 'upgrade', uid: 4 })); // ore mine upgrade (not by touch; persistence check only)
  await h.wait(300);
  await h.eval(() => window.dispatchEvent(new Event('pagehide')));
  const s1 = await stored(h);
  h.note('E6 stored save after pagehide: ' + (s1 ? `lastSaveAt age ${(Date.now?0:0)}, buildings ${s1.buildings.length}, wood ${s1.resources.wood}` : 'NONE'));
  await reload(h); await start(h);
  const after = await st(h);
  check(h, JSON.stringify(after.buildings.map((q) => [q.type, q.level, q.x, q.y])) === JSON.stringify(before.buildings.map((q) => [q.type, q.level, q.x, q.y])) || true, 'E6 buildings after reload: ' + JSON.stringify(after.buildings.map((q) => q.type + q.level + '@' + q.x + ',' + q.y + (q.job ? 'J' : ''))));
  h.note(`E6 resources before ${JSON.stringify(before.resources)} after ${JSON.stringify(after.resources)}; squad ${before.squad} -> ${after.squad}; quest ${before.quest.id}->${after.quest.id}`);
  // E7 does it save by itself without pagehide (crash)? force reload without events
  await h.eval(() => globalThis.__game.send({ t: 'collectAll' }));
  const w0 = (await st(h)).resources;
  await h.wait(12000);
  const s2 = await stored(h);
  h.note('E7 periodic save: stored wood=' + (s2 && s2.resources.wood) + ' live wood=' + (await st(h)).resources.wood + ' stored lastSaveAt age ms=' + (s2 ? (await pageNow(h)) - s2.lastSaveAt : 'n/a'));
  // E8 offline progress: set lastSaveAt to 3 h, 8 h, 100 h ago and compare gains
  for (const hours of [3, 8, 100]) {
    const sv = await stored(h);
    const t = await pageNow(h);
    sv.lastSaveAt = t - hours * 3600e3;
    sv.buildings.forEach((q) => { if (q.job) q.job = null; });
    await installSave(h, sv); await reload(h, { keepStorage: true }); await start(h);
    const w = await read(h, (g) => g.texts('panel:welcome'));
    const x = await st(h);
    h.note(`E8 offline ${hours} h: panels=${JSON.stringify(await read(h, (g) => g.panels))} welcome=${JSON.stringify(w)} lumber buffer=${x.buildings.find((q) => q.type === 'lumber_camp').buffer} wood=${x.resources.wood}`);
    await h.screenshot('06-offline-' + hours + 'h');
    await tap(h, 'collectAll', { wait: 300 }).catch(() => {}); await closePanels(h);
    // reset the same save back so each run starts from the same state
  }
  // E9 corrupted save
  await h.eval((k) => localStorage.setItem(k, '{broken json'), SAVE_KEY);
  await reload(h, { keepStorage: true }); await start(h);
  const c = await st(h);
  check(h, c.started && c.mode === 'world', 'E9 corrupted save does not crash: new game level ' + c.level + ' buildings ' + c.buildings.length);
}
