// The object `h` passed to every scenario. Coordinates are Cocos UI/design coordinates:
// x 0..720 left->right, y 0..1280 BOTTOM->TOP (same as EventTouch.getUILocation() in game code).
import fs from 'node:fs';
import path from 'node:path';

export function createApi(page, cdp, outDir) {
  const notes = [];
  const shots = [];
  const active = new Map(); // touch id -> css point

  const toCss = (x, y) => page.evaluate(([x, y]) => window.__harness.uiToCss(x, y), [x, y]);
  // `id` keeps each finger's identity: without it Chromium matches touch points by array position, so lifting
  // finger 1 while finger 0 stays down was reported as finger 0 ending.
  const points = async () => [...active.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y, radiusX: 1, radiusY: 1, force: 1 }));
  const send = async (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: await points() });
  const nextFrames = (n = 1) => page.evaluate((n) => new Promise((r) => {
    let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
  }), n);

  const h = {
    page,
    /** Free-form line added to the run summary. */
    note(msg) { notes.push(String(msg)); console.log(`[scenario] ${msg}`); },
    wait(ms) { return page.waitForTimeout(ms); },
    frames: nextFrames,
    /** Waits until globalThis[name] is truthy (e.g. '__bootstrapReady'). */
    async waitForGlobal(name, timeout = 15000) {
      await page.waitForFunction((n) => !!globalThis[n], name, { timeout });
    },
    async touchDown(id, x, y) { const p = await toCss(x, y); active.set(id, p); await send('touchStart'); await nextFrames(1); },
    async touchMove(id, x, y) { const p = await toCss(x, y); active.set(id, p); await send('touchMove'); await nextFrames(1); },
    async touchUp(id) {
      // Chromium ends the touch points LISTED in a touchEnd (matched by id). The previous version listed the
      // fingers that remain down, which lifted the wrong finger when two were down (verified with DOM events).
      const p = active.get(id);
      active.delete(id);
      if (p) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id, x: p.x, y: p.y, radiusX: 1, radiusY: 1, force: 1 }] });
      await nextFrames(1);
    },
    /** Quick tap with finger `id` (default 9 so it does not collide with a held joystick finger 0). */
    async tap(x, y, { id = 9, holdMs = 50 } = {}) {
      await h.touchDown(id, x, y); await h.wait(holdMs); await h.touchUp(id);
    },
    /** Joystick-style drag: press at `from`, move in `steps` to `to`, hold `holdMs`, release (unless keepDown). */
    async drag(from, to, { id = 0, steps = 10, stepMs = 16, holdMs = 0, keepDown = false } = {}) {
      await h.touchDown(id, from[0], from[1]);
      for (let i = 1; i <= steps; i++) {
        await h.touchMove(id, from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
        if (stepMs) await h.wait(stepMs);
      }
      if (holdMs) await h.wait(holdMs);
      if (!keepDown) await h.touchUp(id);
    },
    /** Touches as the game received them (harness listener on `input`). */
    touches() { return page.evaluate(() => window.__harness.touches.slice()); },
    clearTouches() { return page.evaluate(() => { window.__harness.touches.length = 0; }); },
    /** { drawCalls, tris, instances, frames } of the last rendered frame. */
    stats() { return page.evaluate(() => window.__harness.stats()); },
    /** Saves <out>/<name>.png and returns its path. */
    async screenshot(name) {
      await nextFrames(2);
      const file = path.join(outDir, name.endsWith('.png') ? name : `${name}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file });
      shots.push(file);
      console.log(`[scenario] screenshot ${file}`);
      return file;
    },
    /** Runs a function inside the page (has access to globalThis, not to game modules). */
    eval(fn, arg) { return page.evaluate(fn, arg); },
    assert(cond, msg) { if (!cond) throw new Error(`Scenario assertion failed: ${msg}`); },
  };
  return { h, notes, shots };
}
