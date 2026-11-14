// QA round 2, scenario 3: (QA-08) gather reach (core says 3 cells from the leader to the node's real position),
// cue ring on nodes in reach; (QA-10) data failure shows an error screen, not a fake game; ?standin=1 still works.
import { boot, until, read, st, check, walkTo, waitFast, ff } from '../../scenarios/lib/qa.mjs';
const TREE = [30.8, 19.0];
export default async function (h) {
  await boot(h);
  await h.tap(360, 640); await until(h, (g) => g.mode === 'WORLD'); await h.wait(500);
  // approach the tree from the village side and stop at a chosen distance
  for (const stop of [4.0, 3.4, 2.6]) {
    await walkTo(h, TREE[0], TREE[1], { stop });
    const s0 = await st(h);
    const d = Math.hypot(TREE[0] - s0.leader.x, TREE[1] - s0.leader.y);
    await h.frames(4); await h.wait(300);
    await h.screenshot(`reach-stop${stop}`);
    const w0 = s0.resources.wood;
    await waitFast(h, (x) => x.resources.wood > w0, 20);
    const s1 = await st(h);
    h.note(`stood at distance ${d.toFixed(2)} from the tree centre: wood ${w0} -> ${s1.resources.wood} after 20 game seconds (${s1.resources.wood > w0 ? 'gathered' : 'nothing'})`);
  }
  // QA-10: block the data file, reload
  await h.page.route('**/data/tuning.json*', (r) => r.abort());
  await h.page.reload();
  await h.wait(4000);
  await h.screenshot('error-screen');
  h.note('after blocking tuning.json: __bootstrapReady=' + await h.eval(() => !!globalThis.__bootstrapReady) + ' game=' + await h.eval(() => globalThis.__game ? ('source=' + globalThis.__game.source + ' mode=' + globalThis.__game.mode) : 'none'));
  await h.page.unroute('**/data/tuning.json*');
  // stand-in only with the flag
  const url = h.page.url();
  await h.page.goto(url + (url.includes('?') ? '&' : '?') + 'standin=1'); await h.wait(3000);
  h.note('standin flag: ' + await h.eval(() => globalThis.__game ? ('source=' + globalThis.__game.source) : 'none'));
}
