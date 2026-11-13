// QA 02: a new player from a FRESH save follows the main quest card up to "boss of floor 5" and beyond if possible.
// Moves with the joystick (touch), opens panels and builds with taps. Pure waiting (gathering, fighting while standing,
// construction timers) is fast-forwarded with __game.fastForward; each one is logged as "ff".
import { boot, until, read, st, walkTo, waitFast, check, tap, panel, closePanels, texts, ui, placeNew, leaveBuild, tapBuilding, goVillage, send, TREE, ROCK } from './lib/qa.mjs';

const CRAB = [40.6, 30.2], RAT = [20.4, 25.2], SLIME_Z2 = null;
let log = [];
const L = (h, m) => { h.note(m); };

async function claimNow(h) {
  const s = await st(h);
  if (!s.quest.complete) return s;
  await tap(h, 'quest', { wait: 450 });
  return st(h);
}
async function stand(h, spot, fn, sec = 600) {
  await walkTo(h, spot[0], spot[1], { stop: 1.5 });
  return waitFast(h, fn, sec);
}
async function ensureRes(h, res, n) {
  let s = await st(h);
  if (s.resources[res] >= n) return true;
  if (res === 'wood') return stand(h, TREE, (x) => x.resources.wood >= n);
  if (res === 'ore') return stand(h, ROCK, (x) => x.resources.ore >= n);
  return stand(h, CRAB, (x) => x.resources[res] >= n, 1200);   // gold, meat
}
async function buildType(h, type, label) {
  const cost = { lumber_camp: 30, tavern: 60, ore_mine: 60, training_yard: 100, market: 80, dungeon_gate: 150 }[type];
  await ensureRes(h, 'wood', cost + 2);
  await goVillage(h);
  const b = await placeNew(h, type, { label });
  await leaveBuild(h);
  await waitFast(h, (x) => x.buildings.find((q) => q.type === type && !q.job), 120);
  await h.screenshot(label + '-done');
  return b;
}
async function recruitOnce(h) {
  await ensureRes(h, 'gold', 105);
  await goVillage(h);
  await tapBuilding(h, 'tavern');
  await panel(h, 'tavern').catch(() => {});
  await tap(h, 'recruit', { wait: 1800 });
  await h.screenshot('recruit-reveal-' + Date.now() % 100000);
  await closePanels(h);
}
async function levelHero(h, id, target) {
  await tap(h, 'hero', { wait: 450 });
  await tap(h, 'hero-' + id, { wait: 450 });
  for (let i = 0; i < 40; i++) {
    const s = await st(h);
    if (s.quest.complete) break;
    const before = JSON.stringify(s.resources);
    const r = await send(h, { t: 'noop' }).catch(() => null);
    await tap(h, 'levelUp', { wait: 250 });
    const a = await st(h);
    if (JSON.stringify(a.resources) === before) break; // could not afford
  }
  await closePanels(h);
}

export default async function (h) {
  await boot(h);
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  const t0 = Date.now();
  let guard = 0, last = '';
  while (guard++ < 60) {
    let s = await claimNow(h);
    const q = s.quest;
    if (q.id !== last) { L(h, `[${((Date.now() - t0) / 1000).toFixed(0)}s real, ${s.playSec.toFixed(0)}s game] quest ${q.id} "${q.text}" lvl=${s.level} cp=${s.cp} res=${JSON.stringify(s.resources)}`); last = q.id; }
    if (q.id === 'q22' || q.index >= 21) break;
    switch (q.id) {
      case 'q01': await stand(h, TREE, (x) => x.quest.complete); break;
      case 'q02': await stand(h, CRAB, (x) => x.quest.complete); break;
      case 'q03': await ensureRes(h, 'meat', 15); await levelHero(h, 'bang', 2); break;
      case 'q04': await buildType(h, 'lumber_camp', 'q04'); break;
      case 'q05': await stand(h, ROCK, (x) => x.quest.complete); break;
      case 'q06': await buildType(h, 'tavern', 'q06'); break;
      case 'q07': case 'q13': await recruitOnce(h); break;
      case 'q08': await goVillage(h); await tap(h, 'squad', { wait: 500 }); await tap(h, 'autoAssign', { wait: 500 }); await h.screenshot('q08-auto'); await closePanels(h); break;
      case 'q09': await stand(h, RAT, (x) => x.quest.complete); break;
      case 'q10': await buildType(h, 'ore_mine', 'q10'); break;
      case 'q11': await goVillage(h); await waitFast(h, (x) => x.buildings.find((b) => b.type === 'lumber_camp').buffer >= 1, 300); await tapBuilding(h, 'lumber_camp'); await h.screenshot('q11-camp-panel'); await tap(h, 'collect', { wait: 400 }); await tap(h, 'collectAll', { wait: 400 }); await closePanels(h); break;
      case 'q12': {
        await ensureRes(h, 'wood', 95); await goVillage(h);
        await tapBuilding(h, 'storage'); await h.screenshot('q12-storage-panel'); await tap(h, 'upgrade', { wait: 500 }); await closePanels(h);
        await waitFast(h, (x) => x.buildings.find((b) => b.type === 'storage').level >= 2, 120); break; }
      case 'q14': await ensureRes(h, 'meat', 200); await levelHero(h, 'bang', 5); break;
      case 'q15': await buildType(h, 'training_yard', 'q15'); break;
      case 'q16': {
        await ensureRes(h, 'ore', 20); await goVillage(h); await tapBuilding(h, 'training_yard'); await panel(h, 'training').catch(() => {});
        await h.screenshot('q16-training');
        for (let i = 0; i < 4; i++) { await tap(h, 'node' + i, { wait: 300 }); await tap(h, 'unlock', { wait: 300 }); }
        await closePanels(h); break; }
      case 'q17': await buildType(h, 'market', 'q17'); break;
      case 'q18': await stand(h, CRAB, (x) => x.quest.complete, 900); break;
      case 'q19': await buildType(h, 'dungeon_gate', 'q19'); break;
      case 'q20': case 'q21': {
        await goVillage(h); await tapBuilding(h, 'dungeon_gate'); await panel(h, 'gate').catch(() => {});
        await h.screenshot(q.id + '-gate');
        await tap(h, 'enter', { wait: 800 });
        await h.screenshot(q.id + '-dungeon-start');
        // fight: floor by floor, the AUTO button walks to the exit
        for (let i = 0; i < 200; i++) {
          const m = await read(h, (g) => g.mode);
          if (m !== 'DUNGEON') break;
          await h.eval(() => globalThis.__game.fastForward(2));
          await h.wait(30);
        }
        await h.screenshot(q.id + '-result');
        await tap(h, 'ok', { wait: 400 }).catch(() => {});
        break; }
      default: L(h, 'no handler for ' + q.id); guard = 999;
    }
    s = await st(h);
    if (s.mode === 'result' ) await tap(h, 'continue', { wait: 400 });
  }
  const s = await st(h);
  L(h, `END quest ${s.quest.id} lvl=${s.level} cp=${s.cp} squad=${s.squad} playSec=${s.playSec.toFixed(0)} buildings=${s.buildings.map((b) => b.type + b.level).join(',')}`);
  await h.screenshot('99-end');
}
