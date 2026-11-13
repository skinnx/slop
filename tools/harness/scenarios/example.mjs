// Example scenario against the skeleton. Copy this file to start a new one.
// Coordinates: design/UI space, 720 x 1280, origin BOTTOM-LEFT (what game code gets from getUILocation()).
export default async function (h) {
  await h.waitForGlobal('__bootstrapReady');
  await h.screenshot('01-boot');

  // Joystick-style drag with finger 0: press lower-left, pull up-right, keep holding.
  await h.clearTouches();
  await h.drag([180, 300], [300, 420], { id: 0, steps: 12, keepDown: true });
  await h.screenshot('02-drag-held'); // the touch marker sprite sits under the finger

  // Tap with a second finger while the first is still down (skill-button style).
  await h.tap(560, 260, { id: 1 });
  await h.touchUp(0);

  const t = await h.touches();
  const lastMove = t.filter((e) => e.type === 'move' && e.id === 0).pop();
  const tapStart = t.find((e) => e.type === 'start' && e.id === 1);
  h.note(`finger0 last move at ui (${lastMove?.x}, ${lastMove?.y}); finger1 tap at ui (${tapStart?.x}, ${tapStart?.y}); events=${t.length}`);
  h.assert(lastMove && Math.abs(lastMove.x - 300) <= 2 && Math.abs(lastMove.y - 420) <= 2, 'drag ends where requested');
  h.assert(tapStart && Math.abs(tapStart.x - 560) <= 2 && Math.abs(tapStart.y - 260) <= 2, 'second finger tap lands where requested');

  await h.wait(100);
  await h.screenshot('03-released');
  const s = await h.stats();
  h.note(`drawCalls=${s.drawCalls} tris=${s.tris} frames=${s.frames}`);
  h.assert(s.drawCalls <= 4, `skeleton should need very few draw calls (got ${s.drawCalls})`);
}
