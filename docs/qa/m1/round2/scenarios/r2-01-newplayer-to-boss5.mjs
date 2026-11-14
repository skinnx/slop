// QA round 2, scenario 1: a NEW player from a fresh save follows the main quest card to the floor 5 boss and beyond (q22).
// By touch: joystick drag to walk, taps on named nodes for HUD/panels/build/gate/AUTO. Pure waiting is fast-forwarded
// (fastForward now advances the core clock, so build timers move too). Screenshots at every quest.
import { boot, until, read, st, walkTo, waitFast, check, tap, panel, closePanels, texts, ui, placeNew, leaveBuild, tapBuilding, goVillage, ff } from '../../scenarios/lib/qa.mjs';

const TREE = [30.8, 19.0], ROCK = [43.1, 24.4], CRAB = [42.5, 30.0], RAT = [18.6, 23.6];
const BCOST = { lumber_camp: 30, tavern: 60, ore_mine: 60, training_yard: 100, market: 80, dungeon_gate: 150 };
let shotN = 0;
const shot = (h, n) => h.screenshot(String(++shotN).padStart(2, '0') + '-' + n);
const L = (h, m) => h.note(m);

async function standAt(h, spot, fn, sec = 900) { await walkTo(h, spot[0], spot[1], { stop: 1.6 }); return waitFast(h, fn, sec); }
async function ensure(h, res, n) {
  if ((await st(h)).resources[res] >= n) return true;
  if (res === 'wood') return standAt(h, TREE, (x) => x.resources.wood >= n);
  if (res === 'ore') return standAt(h, ROCK, (x) => x.resources.ore >= n);
  return standAt(h, CRAB, (x) => x.resources[res] >= n, 2400);
}
const REQLV = { lumber_camp: 1, tavern: 2, ore_mine: 3, training_yard: 4, market: 5, dungeon_gate: 6 };
async function build(h, type, tag) {
  if ((await st(h)).level < REQLV[type]) { L(h, `${type} needs player level ${REQLV[type]}, have ${(await st(h)).level}: the card says so; fighting in Bãi Vỏ Sò for EXP`); await h.screenshot(tag + '-locked-card'); await standAt(h, CRAB, (x) => x.level >= REQLV[type], 3600); }
  await ensure(h, 'wood', BCOST[type] + 2);
  await goVillage(h);
  const b = await placeNew(h, type, { label: tag + '-ghost' });
  await leaveBuild(h);
  await waitFast(h, (x) => x.buildings.find((q) => q.type === type && q.level >= 1 && !q.job), 300);
  await ff(h, 1);
  await h.screenshot(tag + '-built');
  return b;
}
async function levelHero(h, id, target) {
  await tap(h, 'hero', { wait: 500 }); await h.wait(300);
  await tap(h, 'hero-' + id, { wait: 500 }); await h.wait(300);
  await h.screenshot('levelhero-' + target + '-open');
  for (let i = 0; i < 6; i++) {
    const s = await st(h); if (s.quest.complete) break;
    await tap(h, 'levelUp', { wait: 300 });
  }
  await h.screenshot('levelhero-' + target + '-after');
  await closePanels(h);
}
async function recruit(h) {
  await ensure(h, 'gold', 105); await goVillage(h);
  await tapBuilding(h, 'tavern'); await panel(h, 'tavern').catch(() => {});
  await tap(h, 'recruit', { wait: 1800 }); await h.screenshot('recruit-' + Date.now() % 10000);
  await closePanels(h);
}
/** What the defeat screen advises: spend meat on heroes, gold on recruiting, ore on the training yard, re-pick the squad. */
async function strengthen(h, tag) {
  L(h, 'strengthen after defeat: ' + JSON.stringify((await st(h)).resources) + ' cp=' + (await st(h)).cp);
  await goVillage(h);
  for (let r = 0; r < 4 && (await st(h)).resources.gold >= 105; r++) await recruit(h);
  // tickets -> fragments (Quán, tab "Đổi Vé"), given to the first squad hero
  const ids = (await st(h)).squad.slice();
  for (let k = 0; k < 6 && (await st(h)).resources.tickets > 0; k++) {
    await tapBuilding(h, 'tavern'); await panel(h, 'tavern').catch(() => {});
    await tap(h, 'tab-exchange', { wait: 300 }); if (k === 0) await h.screenshot(tag + '-exchange-tab');
    const t0 = (await st(h)).resources.tickets;
    await tap(h, 'exchange-frag5', { wait: 400 }); await tap(h, 'pick-' + ids[k % ids.length], { wait: 400 }); await tap(h, 'ok', { wait: 500 });
    await closePanels(h);
    if ((await st(h)).resources.tickets === t0) break;
  }
  await tap(h, 'hero', { wait: 500 }); await h.wait(300);
  for (const id of ids) {
    await tap(h, 'hero-' + id, { wait: 500 }); await h.wait(250);
    for (let i = 0; i < 12; i++) { const m0 = (await st(h)).resources.meat; await tap(h, 'levelUp', { wait: 250 }); if ((await st(h)).resources.meat === m0) break; }
    await tap(h, 'back', { wait: 400 });
  }
  await h.screenshot(tag + '-heroes-levelled'); await closePanels(h);
  await tapBuilding(h, 'training_yard'); await panel(h, 'training').catch(() => {});
  for (let i = 0; i < 40; i++) { const w = await h.eval((n) => globalThis.__game.where(n), 'node' + i); if (!w) continue; await tap(h, 'node' + i, { wait: 200 }); await tap(h, 'unlock', { wait: 250 }); }
  await h.screenshot(tag + '-training'); await closePanels(h);
  await tap(h, 'squad', { wait: 500 }); await tap(h, 'autoAssign', { wait: 500 }); await h.screenshot(tag + '-squad'); await closePanels(h);
  const x = await st(h); L(h, `after strengthening: cp=${x.cp} squad=${x.squad} res=${JSON.stringify(x.resources)}`);
}
async function fightDungeon(h, tag) {
  await goVillage(h); await tapBuilding(h, 'dungeon_gate'); await panel(h, 'gate').catch(() => {});
  await h.screenshot(tag + '-gate');
  const gt = await texts(h, 'panel:gate'); L(h, 'gate texts: ' + JSON.stringify(gt).slice(0, 300));
  await tap(h, 'enter', { wait: 700 });
  if (await read(h, (g) => g.dialog)) { L(h, 'enter dialog: ' + await read(h, (g) => g.dialog)); await h.screenshot(tag + '-enter-dialog'); await tap(h, 'ok', { wait: 600 }); }
  try { await until(h, (g) => g.mode === 'DUNGEON'); } catch { L(h, 'FAIL did not enter dungeon'); return 'noenter'; }
  await h.screenshot(tag + '-floor1');
  if (!(await st(h)).run.auto) { await tap(h, 'auto', { wait: 200 }); L(h, 'AUTO was off, tapped it on'); } // AUTO button by touch; its state persists between runs
  let lastFloor = 0;
  for (let i = 0; i < 400; i++) {
    const s = await st(h);
    if (s.mode !== 'dungeon') break;
    if (s.run.floor !== lastFloor) { lastFloor = s.run.floor; await h.screenshot(tag + '-floor' + lastFloor); }
    await ff(h, 2); await h.wait(40);
  }
  await h.wait(800); await h.screenshot(tag + '-result');
  const res = (await st(h)).result; L(h, tag + ' result=' + JSON.stringify(res));
  await h.tap(360, 640); await h.wait(900);
  return res && res.outcome;
}

export default async function (h) {
  await boot(h);
  await h.screenshot('00-title');
  await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(600);
  const t0 = Date.now(); let last = '', same = 0;
  for (let guard = 0; guard < 80; guard++) {
    let s = await st(h);
    if (s.quest.complete) { await tap(h, 'quest', { wait: 500 }); s = await st(h); }
    const q = s.quest;
    if (q.id === last) { if (++same > 4) { L(h, `STALL at ${q.id} "${q.text}" ${q.progress}/${q.target}; state=${JSON.stringify({ mode: s.mode, zone: s.zone, res: s.resources, lvl: s.level, squad: s.squad })}`); await h.screenshot('STALL-' + q.id); break; } } else { same = 0; last = q.id; L(h, `[${((Date.now() - t0) / 1000).toFixed(0)}s real | ${s.playSec.toFixed(0)}s game] ${q.id} "${q.text}" lvl=${s.level} cp=${s.cp} squad=${s.squad.length}/${s.slots} res=${JSON.stringify(s.resources)}`); await h.screenshot('quest-' + q.id); }
    if (q.index >= 21 && q.id !== 'q22') break;
    if (q.id === 'q22') { // slot 4 with San Hô Đỏ
      await goVillage(h); await tapBuilding(h, 'training_yard'); await panel(h, 'training').catch(() => {});
      const c0 = (await st(h)); await tap(h, 'slot4', { wait: 400 }); await h.screenshot('q22-slot4-tooltip');
      await tap(h, 'unlock', { wait: 500 }); const c1 = await st(h);
      L(h, `q22 slot unlock: slots ${c0.slots} -> ${c1.slots}, coral ${c0.resources.coral} -> ${c1.resources.coral}`);
      await h.screenshot('q22-slot4-unlocked'); await closePanels(h);
      await tap(h, 'quest', { wait: 500 }); const c2 = await st(h); L(h, `quest after slot: ${c2.quest.id} ${c2.quest.text}`); break;
    }
    switch (q.id) {
      case 'q01': await standAt(h, TREE, (x) => x.quest.complete); break;
      case 'q02': await standAt(h, CRAB, (x) => x.quest.complete); break;
      case 'q03': await levelHero(h, 'bang', 2); break;
      case 'q04': await build(h, 'lumber_camp', 'q04'); break;
      case 'q05': await standAt(h, ROCK, (x) => x.quest.complete); break;
      case 'q06': await build(h, 'tavern', 'q06'); break;
      case 'q07': case 'q13': await recruit(h); break;
      case 'q08': await goVillage(h); await tap(h, 'squad', { wait: 500 }); await h.screenshot('q08-squad'); await tap(h, 'autoAssign', { wait: 500 }); await h.screenshot('q08-after-auto'); await closePanels(h); break;
      case 'q09': await standAt(h, RAT, (x) => x.quest.complete); break;
      case 'q10': await build(h, 'ore_mine', 'q10'); break;
      case 'q11': await goVillage(h); await waitFast(h, (x) => x.buildings.find((b) => b.type === 'lumber_camp').buffer >= 1, 400); await tapBuilding(h, 'lumber_camp'); await panel(h, 'building').catch(() => {}); await h.screenshot('q11-camp'); await tap(h, 'collect', { wait: 400 }); await closePanels(h); break;
      case 'q12': await ensure(h, 'wood', 95); await goVillage(h); await tapBuilding(h, 'storage'); await panel(h, 'building').catch(() => {}); await h.screenshot('q12-storage'); await tap(h, 'upgrade', { wait: 500 }); await closePanels(h); await waitFast(h, (x) => x.buildings.find((b) => b.type === 'storage').level >= 2, 300); break;
      case 'q14': await levelHero(h, 'bang', 5); break;
      case 'q15': await build(h, 'training_yard', 'q15'); break;
      case 'q16': {
        await ensure(h, 'ore', 12); await goVillage(h); await tapBuilding(h, 'training_yard'); await panel(h, 'training').catch(() => {}); await h.screenshot('q16-training');
        for (let i = 0; i < 6; i++) { const w = await h.eval(() => globalThis.__game.where('node' + 0)); await tap(h, 'node' + i, { wait: 250 }); await tap(h, 'unlock', { wait: 300 }); }
        await h.screenshot('q16-after-unlock'); await closePanels(h); break; }
      case 'q17': await build(h, 'market', 'q17'); break;
      case 'q18': await standAt(h, CRAB, (x) => x.quest.complete, 2400); break;
      case 'q19': await build(h, 'dungeon_gate', 'q19'); break;
      case 'q20': case 'q21': { const out = await fightDungeon(h, q.id); L(h, q.id + ' outcome ' + out); if (out === 'defeat') { await h.screenshot(q.id + '-defeat-back'); await strengthen(h, q.id); } break; }
      default: L(h, 'no handler ' + q.id); guard = 999;
    }
  }
  const s = await st(h);
  L(h, `END quest=${s.quest.id} lvl=${s.level} cp=${s.cp} squad=${s.squad} playSec=${s.playSec.toFixed(0)} bestFloor? buildings=${s.buildings.map((b) => b.type + b.level).join(',')} res=${JSON.stringify(s.resources)}`);
  await h.screenshot('99-end');
}
