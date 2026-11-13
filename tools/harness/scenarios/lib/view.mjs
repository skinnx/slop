// Helpers for view scenarios: find nodes through the game's debug object (globalThis.__game) and tap them,
// wait for conditions instead of sleeping. Coordinates are UI/design units (origin bottom-left).

/** Waits until fn(__game) is truthy in the page. fn is serialised: use only its argument and `arg`. */
export async function until(h, fn, arg, timeout = 10000) {
  const src = fn.toString();
  await h.page.waitForFunction(([s, a]) => { const g = globalThis.__game; if (!g) return false; try { return !!(0, eval)('(' + s + ')')(g, a); } catch { return false; } }, [src, arg], { timeout });
}

/** Reads a value from __game (fn(game, arg)). */
export async function read(h, fn, arg) {
  const src = fn.toString();
  return h.page.evaluate(([s, a]) => (0, eval)('(' + s + ')')(globalThis.__game, a), [src, arg]);
}

/** UI position of the front-most active node with this name (null if none). */
export function where(h, name) { return h.eval((n) => globalThis.__game.where(n), name); }

/** Taps the node called `name` (fails the scenario if it is not on screen). */
export async function tapName(h, name, { wait = 120 } = {}) {
  const p = await where(h, name);
  h.assert(p, `node "${name}" is on screen`);
  await h.tap(p.x, p.y);
  if (wait) await h.wait(wait);
  return p;
}

/** Waits for the game to boot (view ready). */
export async function boot(h) {
  await h.waitForGlobal('__bootstrapReady', 30000);
  await until(h, (g) => g.frame > 3);
}

/** Taps through the title screen into the world. */
export async function startGame(h) {
  await boot(h);
  if ((await read(h, (g) => g.mode)) === 'TITLE') {
    await h.tap(360, 640);
    await until(h, (g) => g.mode === 'WORLD');
  }
  await h.wait(450); // fade + panel slide
}

/** Waits until the top panel is `id` and its slide-in is over. */
export async function panel(h, id) {
  await until(h, (g, a) => g.panels[g.panels.length - 1] === a && g.settled, id);
  await h.wait(100);
}

/** Closes panels with the back button until none (or `keep`) remain. */
export async function closePanels(h, keep = 0) {
  for (let i = 0; i < 6; i++) {
    const n = await read(h, (g) => g.panels.length);
    if (n <= keep) return;
    await tapName(h, 'back', { wait: 300 });
  }
}

/** Draw calls of the last frame, measured after `frames` frames. */
export async function drawCalls(h, frames = 5) {
  await h.frames(frames);
  return (await h.stats()).drawCalls;
}
