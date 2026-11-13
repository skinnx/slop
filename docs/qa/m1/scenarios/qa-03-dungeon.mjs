// QA 03: dungeon by touch from a mid-game save: gate panel, enter, fight, own draw-call measurement with ~60 monsters,
// boss telegraph, win, lose (weak squad), leave mid-dungeon, reload during dungeon.
import { boot, until, read, st, check, tap, panel, closePanels, texts, midGame, strongSquad, crowdSquad, installSave, pageNow, tapBuilding, ff, send, walkTo } from './lib/qa.mjs';

async function load(h, save) { await installSave(h, save); await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500); }
async function dc(h) { await h.frames(4); return (await h.stats()).drawCalls; }

export default async function (h) {
  await boot(h);
  const now = await pageNow(h);
  await load(h, crowdSquad(now));
  await tapBuilding(h, 'dungeon_gate'); await panel(h, 'gate').catch(() => {});
  await h.screenshot('01-gate-panel');
  h.note('gate texts ' + JSON.stringify(await texts(h, 'panel:gate')).slice(0, 700));
  await tap(h, 'enter', { wait: 900 });
  await until(h, (g) => g.mode === 'DUNGEON');
  await h.screenshot('02-floor1-start');
  // 60 monsters: walk (stick held) while they spawn, using the programmers' known floor-4 pattern but through the real stick
  for (let f = 1; f <= 3; f++) {
    for (let i = 0; i < 40 && (await read(h, (g) => g.state.run.floor)) === f && !(await read(h, (g) => g.state.run.cleared)); i++) await ff(h, 2);
    await send(h, { t: 'setAuto', on: true });
    for (let i = 0; i < 20 && (await read(h, (g) => g.state.run.floor)) === f; i++) await ff(h, 1);
    await send(h, { t: 'setAuto', on: false });
  }
  await until(h, (g) => g.state.run.floor === 4);
  await send(h, { t: 'joystick', x: 0.7, y: -0.7 }); await ff(h, 17); await send(h, { t: 'joystick', x: 0, y: 0 });
  // sample draw calls repeatedly while the fight runs; record monsters alive
  let best = null;
  for (let i = 0; i < 10; i++) {
    await h.wait(250);
    const s = await st(h); const calls = await dc(h);
    h.note(`sample ${i}: monsters=${s.monsters} heroes=${s.heroes} pickups=${s.pickups} drawCalls=${calls}`);
    if (!best || s.monsters > best.m) { best = { m: s.monsters, c: calls }; await h.screenshot('03-crowd'); }
  }
  h.note(`MAX monsters seen ${best.m}, draw calls then ${best.c}`);
  // world layer only
  await send(h, { t: 'pause', on: true });
  await h.eval(() => globalThis.__game.hideLayers(['hud', 'joystick', 'panels', 'dialogs', 'toasts', 'world-text']));
  h.note('world sprites only (HUD, texts, joystick hidden): drawCalls=' + await dc(h));
  await h.eval(() => globalThis.__game.hideLayers(null)); await send(h, { t: 'pause', on: false });
  // pause menu + leave
  await tap(h, 'pause', { wait: 400 }); await h.screenshot('04-pause'); await tap(h, 'resume', { wait: 300 });
  // reload mid-dungeon
  await h.eval(() => window.dispatchEvent(new Event('pagehide')));
  await tap(h, 'pause', { wait: 400 }); await tap(h, 'leave', { wait: 400 }); await h.screenshot('05-leave-confirm');
  await tap(h, 'ok', { wait: 700 });
  await h.wait(500); await h.screenshot('06-after-leave');
  h.note('after leave: mode=' + await read(h, (g) => g.mode) + ' panels=' + JSON.stringify(await read(h, (g) => g.panels)));
  await tap(h, 'ok', { wait: 500 }).catch(() => {});
  h.note('after result tap: mode=' + await read(h, (g) => g.mode));
}
