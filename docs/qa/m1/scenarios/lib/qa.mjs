// QA helpers (independent of the programmers' scenarios). Import path assumes this file lives in docs/qa/m1/scenarios/lib.
export * from '../../../../../tools/harness/scenarios/lib/view.mjs';
export * from '../../../../../tools/harness/scenarios/lib/saves.mjs';
import { read, until } from '../../../../../tools/harness/scenarios/lib/view.mjs';

export const st = (h) => read(h, (g) => g.state);
export const ui = (h, x, y) => h.eval(([x, y]) => globalThis.__game.cellToUi(x, y), [x, y]);

/** Press the floating joystick (finger id 0) and steer it towards cell (tx,ty) until within `stop` cells or timeout. Releases at the end. */
export async function walkTo(h, tx, ty, { stop = 1.2, maxMs = 20000, until: untilFn } = {}) {
  await h.touchDown(0, 360, 420);
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < maxMs) {
    const s = await st(h);
    if (!s.leader) break;
    const d = Math.hypot(tx - s.leader.x, ty - s.leader.y);
    last = d;
    if (d <= stop) break;
    if (untilFn && (await untilFn(s))) break;
    const a = await ui(h, s.leader.x, s.leader.y);
    const b = await ui(h, tx, ty);
    let dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    await h.touchMove(0, 360 + (dx / n) * 100, 420 + (dy / n) * 100);
    await h.wait(120);
  }
  await h.touchUp(0);
  return last;
}

/** Wait (real time) up to ms until fn(state) is true; the squad is standing still meanwhile. */
export async function waitState(h, fn, ms = 20000, step = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await st(h); if (fn(s)) return true; await h.wait(step); }
  return false;
}
/** Same, but the waiting is done by fast-forwarding the core (the player would just stand there). maxSec = game seconds. */
export async function waitFast(h, fn, maxSec = 600, chunk = 2) {
  await h.frames(4); await h.wait(200); // let the view deliver the joystick release to the core before skipping time
  for (let t = 0; t < maxSec; t += chunk) { const s = await st(h); if (fn(s)) return true; await h.eval((c) => globalThis.__game.fastForward(c), chunk); }
  return fn(await st(h));
}
export const ff = (h, s) => h.eval((s) => globalThis.__game.fastForward(s), s);
export const texts = (h, name) => h.eval((n) => globalThis.__game.texts(n), name);
export const send = (h, cmd) => h.eval((c) => globalThis.__game.send(c), cmd);

/** Soft check: records PASS/FAIL in the notes and goes on (so one failure does not hide the rest). */
export function check(h, cond, desc) { h.note((cond ? 'PASS  ' : 'FAIL  ') + desc); return !!cond; }
export const tap = async (h, name, o) => { try { return await (await import('../../../../../tools/harness/scenarios/lib/view.mjs')).tapName(h, name, o); } catch (e) { h.note('FAIL  could not tap "' + name + '": ' + e.message.split('\n')[0]); return null; } };
export const names = (h) => h.eval(() => globalThis.__game.panels);

/** Walk to a resource cluster and stand still until the player owns at least `amount` of `res` (or quest progress done). */
export async function farm(h, res, amount, spot, ms = 90000) {
  await walkTo(h, spot[0], spot[1], { stop: 1.6 });
  return waitState(h, (x) => x.resources[res] >= amount, ms);
}
export const TREE = [30.8, 20.4];   // tree n022 (30.8,19.0), first z1 tree north of the village
export const ROCK = [42.0, 24.4];   // rock n025 (43.1,24.4)

/** Return to the village with the portal button (waits for the channel). */
export async function goVillage(h) {
  if ((await st(h)).zone === 'village') return true;
  if (await read(h, (g) => g.fieldHud && g.fieldHud.portalBlocked)) { h.note('portal blocked by monsters, walking home'); await walkTo(h, 30, 30, { stop: 2.5, maxMs: 40000 }); if ((await st(h)).zone === 'village') return true; }
  await tap(h, 'portal', { wait: 0 });
  try { await until(h, (g) => g.state.zone === 'village', null, 12000); } catch { return false; }
  await h.wait(500);
  return true;
}

/** Build mode: choose card, accept the proposed ghost position (or move it by dx,dy cells), confirm. Returns the building or null. */
export async function placeNew(h, type, { dx = 0, dy = 0, label } = {}) {
  await tap(h, 'build', { wait: 400 });
  try { await until(h, (g) => g.mode === 'BUILD'); } catch { h.note('FAIL  build mode did not open'); return null; }
  await h.wait(300);
  const w = await h.eval((n) => globalThis.__game.where(n), 'bcard-' + type);
  if (!w || w.x > 600 || w.x < 80) { await h.drag([600, 230], [100, 230], { id: 3, steps: 8 }); await h.wait(300); }
  await tap(h, 'bcard-' + type, { wait: 300 });
  try { await until(h, (g) => !!(g.screen.build && g.screen.build.ghost), null, 4000); } catch { h.note('FAIL  no ghost for ' + type); return null; }
  let gh = await read(h, (g) => g.screen.build.ghost);
  h.note(`ghost ${type} at ${gh.x},${gh.y} valid=${gh.valid} reason="${gh.reason}"`);
  if (dx || dy) {
    const a = await ui(h, gh.x + gh.w / 2, gh.y + gh.h / 2), b = await ui(h, gh.x + gh.w / 2 + dx, gh.y + gh.h / 2 + dy);
    await h.drag([a.x, a.y], [b.x, b.y], { id: 0, steps: 8, keepDown: true }); await h.touchUp(0); await h.wait(150);
    gh = await read(h, (g) => g.screen.build.ghost);
    h.note(`ghost moved to ${gh.x},${gh.y} valid=${gh.valid} reason="${gh.reason}"`);
  }
  if (label) await h.screenshot(label);
  const n0 = (await st(h)).buildings.length;
  await tap(h, 'ghostOk', { wait: 400 });
  const s = await st(h);
  const b = s.buildings.find((q) => q.type === type);
  h.note(`placed ${type}: ${b ? JSON.stringify(b) : 'NOT PLACED'} (buildings ${n0}->${s.buildings.length}) wood=${s.resources.wood}`);
  return b || null;
}
export async function leaveBuild(h) { await tap(h, 'done', { wait: 400 }); try { await until(h, (g) => g.mode === 'WORLD'); } catch {} }

/** Tap the centre of a building (by type) in the world. */
export async function tapBuilding(h, type, { wait = 500 } = {}) {
  const b = (await st(h)).buildings.find((q) => q.type === type);
  if (!b) { h.note('FAIL  no building ' + type); return null; }
  const p = await ui(h, b.x + b.w / 2, b.y + b.h / 2);
  await h.tap(p.x, p.y); await h.wait(wait);
  return b;
}
export async function claim(h) { await tap(h, 'quest', { wait: 400 }); const s = await st(h); h.note(`quest now ${s.quest.id} "${s.quest.text}" ${s.quest.progress}/${s.quest.target} lvl=${s.level} res=${JSON.stringify(s.resources)}`); return s; }
