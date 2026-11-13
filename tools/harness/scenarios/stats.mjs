// Boots the game, lets it settle, saves one screenshot and reports draw calls.
// npm run drawcalls  (or: npm run harness -- harness/scenarios/stats.mjs --out <dir>)
export default async function (h) {
  await h.waitForGlobal('__bootstrapReady');
  await h.frames(30);
  const s = await h.stats();
  await h.screenshot('stats');
  h.note(`drawCalls=${s.drawCalls} tris=${s.tris} frames=${s.frames}`);
}
