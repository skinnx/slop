// Title, field/village HUD, floating joystick, gathering (tree), fighting a camp (damage numbers, pickups,
// pickup banner), quest card + guide, return-to-village. Fresh save, real core.
// npm run harness -- harness/scenarios/m1-field.mjs --out ../docs/evidence/m1/field
import { boot, until, read, tapName, where } from './lib/view.mjs';

async function walk(h, dx, dy, ms) {
  // joystick drag from the lower middle, held for `ms`
  await h.drag([360, 420], [360 + dx, 420 + dy], { id: 0, steps: 6, stepMs: 16, keepDown: true });
  await h.wait(ms);
}

export default async function (h) {
  await boot(h);
  await h.wait(400);
  await h.screenshot('01-title');
  h.assert((await read(h, (g) => g.mode)) === 'TITLE', 'starts on the title screen');
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(500);
  await h.screenshot('02-village-start');
  const s0 = await read(h, (g) => g.state);
  h.note(`start: level ${s0.level}, cp ${s0.cp}, quest "${s0.quest.text}"`);

  // Guide: magnifier -> arrow around the leader for 6 s.
  await tapName(h, 'magnifier');
  await until(h, (g) => g.screen.guide);
  await h.screenshot('03-guide-arrow');

  // Walk towards the guided tree (right-down on screen). The joystick is drawn where the finger went down.
  await walk(h, 100, -44, 300);
  await h.screenshot('04-joystick-held');
  await h.wait(3300);
  await h.touchUp(0);
  await until(h, (g) => g.state.resources.wood >= 4, null, 25000);
  await h.wait(500);
  await h.screenshot('05-gathering');
  const s1 = await read(h, (g) => g.state);
  h.note(`after gathering: wood ${s1.resources.wood}, zone ${s1.zone}, quest ${s1.quest.progress}/${s1.quest.target}`);
  const portal = await read(h, (g) => g.fieldHud.portal);
  h.assert(portal === 'village', `portal button says Về làng outside the village (got ${portal})`);

  // Tap "Về làng": channel 1 s then teleport to the village.
  await tapName(h, 'portal', { wait: 0 });
  await h.wait(300);
  await h.screenshot('07-return-channel');
  await until(h, (g) => g.state.zone === 'village', null, 8000);
  await h.wait(500);
  await h.screenshot('08-back-in-village');
  const p = await read(h, (g) => g.fieldHud.portal);
  h.assert(p === 'field', 'button now says Ra đồng, got ' + p);

  // From the village centre walk right-up (cell +x) to the crab camp east of the village, then stand still.
  await walk(h, 99, 50, 4300);
  await h.touchUp(0);
  await until(h, (g) => g.state.resources.meat > 0, null, 25000);
  await h.wait(250);
  await h.screenshot('09-combat-pickups');
  const s2 = await read(h, (g) => g.state);
  h.note(`after combat: gold ${s2.resources.gold}, meat ${s2.resources.meat}, level ${s2.level}`);
  h.note(`field drawCalls=${(await h.stats()).drawCalls}`);
  // Locked "Về làng" while monsters chase: dimmed and tapping it explains why.
  const blocked = await read(h, (g) => g.fieldHud.portalBlocked);
  h.note(`portal blocked while fighting: ${blocked}`);
  if (blocked) { await tapName(h, 'portal'); await h.wait(150); await h.screenshot('10-portal-blocked-toast'); }
}
