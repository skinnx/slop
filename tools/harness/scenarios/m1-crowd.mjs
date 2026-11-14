// Draw-call budget (charter 3.12): 60 monsters + full squad + pickups + damage numbers + dungeon HUD.
// Real core: an 8-hero squad goes to floor 4 of stage 3 (60 monsters), measured while they fight.
// npm run harness -- harness/scenarios/m1-crowd.mjs --out ../docs/evidence/m1/crowd [--viewport 412x915]
import { boot, until, read } from './lib/view.mjs';
import { crowdSquad, installSave, pageNow } from './lib/saves.mjs';
const ff = (h, s) => h.eval((s) => globalThis.__game.fastForward(s), s);

/** World-layer draw calls: the same frame measured with HUD and world text hidden (layers toggled in the page). */
async function measure(h, label) {
  const sample = async () => { await h.frames(3); return (await h.stats()).drawCalls; };
  const total = await sample();
  await h.screenshot(label.replace(/[^a-z0-9]+/gi, '-'));
  await h.eval(() => globalThis.__game.send({ t: 'pause', on: true })); // freeze the core for the per-layer split
  await h.eval(() => globalThis.__game.hideLayers(['hud', 'joystick', 'panels', 'dialogs', 'toasts']));
  const worldOnly = await sample();
  await h.eval(() => globalThis.__game.hideLayers(['world-text']));
  const worldNoText = await sample();
  await h.eval(() => globalThis.__game.hideLayers(null));
  await h.eval(() => globalThis.__game.send({ t: 'pause', on: false }));
  const parts = {};
  for (const L of ['hud', 'toasts', 'world-text', 'joystick']) {
    await h.eval((L) => globalThis.__game.hideLayers([L]), L);
    parts[L] = total - (await sample());
    await h.eval(() => globalThis.__game.hideLayers(null));
  }
  h.note(`${label}: draw calls by layer (total minus total-without-layer): ${JSON.stringify(parts)}`);
  const st = await read(h, (g) => ({ w: g.world, s: g.state }));
  const line = `${label}: total=${total} worldWithText=${worldOnly} worldSprites=${worldNoText} monstersAlive=${st.s.monsters} heroes=${st.s.heroes} pickups=${st.s.pickups} floaters=${st.w.floaters} spritesInLayers=${st.w.ground}+${st.w.overlay}+${st.w.units}`;
  h.note(line);
  return { total, worldOnly, worldNoText };
}

export default async function (h) {
  await boot(h);
  await installSave(h, crowdSquad(await pageNow(h)));
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(300);
  h.assert((await h.eval(() => globalThis.__game.send({ t: 'enterDungeon', stage: 1 }))).ok, 'enter stage 1');
  await until(h, (g) => g.mode === 'DUNGEON');
  await h.wait(600);
  await h.eval(() => globalThis.__game.send({ t: 'setAuto', on: false }));
  // Floors 1-3 quickly, then floor 4 (20 + 20 + 20 monsters, 0 / 8 / 16 s). The squad only attacks while it
  // stands still (tuning.squad.attackOnlyWhenIdle), so holding the stick lets all 60 spawn before the fight.
  for (let f = 1; f <= 3; f++) {
    for (let i = 0; i < 40 && (await read(h, (g) => g.state.run.floor)) === f && !(await read(h, (g) => g.state.run.cleared)); i++) await ff(h, 2);
    // walk to the exit (8, 21) from the start (8, 2): straight +y in cells
    await h.eval(() => globalThis.__game.send({ t: 'setAuto', on: true }));
    for (let i = 0; i < 20 && (await read(h, (g) => g.state.run.floor)) === f; i++) await ff(h, 1);
    await h.eval(() => globalThis.__game.send({ t: 'setAuto', on: false }));
  }
  await until(h, (g) => g.state.run.floor === 4);
  await h.eval(() => globalThis.__game.send({ t: 'joystick', x: 0.7, y: -0.7 }));
  await ff(h, 17);
  await h.eval(() => globalThis.__game.send({ t: 'joystick', x: 0, y: 0 }));
  h.note(`alive after holding the stick 17 s: ${await read(h, (g) => g.state.monsters)}`);
  await h.wait(350); // real time: the squad fights (damage numbers, EXP, drops)
  const st = await read(h, (g) => g.state);
  h.note(`floor ${st.run.floor}, alive ${st.monsters}, squad ${st.heroes}, pickups ${st.pickups}`);
  h.note('dungeon HUD texts: ' + JSON.stringify(await read(h, (g) => g.texts('dungeon-hud'))));
  const a = await measure(h, 'core floor 4');
  await h.eval(() => globalThis.__game.send({ t: 'pause', on: false }));
  await h.wait(1500);
  const b = await measure(h, 'core floor 4 later');
  const max = Math.max(a.total, b.total), maxW = Math.max(a.worldNoText, b.worldNoText);
  h.note(`BUDGET total<=30: ${max <= 30 ? 'OK' : 'OVER'} (${max}); world<=10: ${maxW <= 10 ? 'OK' : 'OVER'} (${maxW})`);
  h.assert(max <= 30 && maxW <= 10, 'draw-call budget');
}
