// Example scenario (copy it to start a new one). Coordinates: design/UI space, 720 x 1280, origin BOTTOM-LEFT
// (what game code gets from getUILocation()). The game's own nodes swallow touches, so the harness-level touch
// log (h.touches()) only sees touches no node handled; read the game's debug object (globalThis.__game) instead.
import { boot, until, read, where } from './lib/view.mjs';

export default async function (h) {
  await boot(h);
  await h.screenshot('01-title');
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(400);

  // Joystick-style drag with finger 0: press lower-left, pull up-right, keep holding.
  await h.drag([180, 300], [300, 420], { id: 0, steps: 12, keepDown: true });
  await h.screenshot('02-drag-held');
  const j = await read(h, (g) => g.joystick);
  h.note(`joystick vector (${j.x.toFixed(2)}, ${j.y.toFixed(2)})`);
  h.assert(j.x > 0.6 && j.y > 0.6 && Math.abs(Math.hypot(j.x, j.y) - 1) < 0.02, 'stick pulled up-right to full length');

  // Second finger taps the gear while the first still holds the stick (multi-touch): the settings panel opens.
  const gear = await where(h, 'settings');
  await h.tap(gear.x, gear.y, { id: 1 });
  await until(h, (g) => g.panels.indexOf('settings') >= 0);
  await h.touchUp(0);
  await h.wait(300);
  await h.screenshot('03-settings');
  const s = await h.stats();
  h.note(`drawCalls=${s.drawCalls} tris=${s.tris} frames=${s.frames}`);
  h.assert(s.drawCalls <= 30, `draw calls within the charter budget (got ${s.drawCalls})`);
}
