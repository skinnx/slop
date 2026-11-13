// Main quest card: a finished quest shows "Nhận!" and pulses; tapping it claims the reward (toast) and the
// next quest appears. Also the title screen and the village HUD at this viewport.
// npm run harness -- harness/scenarios/m1-quest.mjs --out ../docs/evidence/m1/quest [--viewport 412x915]
import { boot, until, read, tapName } from './lib/view.mjs';
import { midGame, installSave, pageNow } from './lib/saves.mjs';

export default async function (h) {
  await boot(h);
  await h.wait(300);
  await h.screenshot('01-title');
  await installSave(h, midGame(await pageNow(h)));
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(600);
  const q0 = await read(h, (g) => g.state.quest);
  h.note('quest before: ' + JSON.stringify(q0));
  await h.screenshot('02-quest-ready');
  h.assert(q0.complete, 'the saved quest is already complete');
  await tapName(h, 'quest', { wait: 400 });
  const q1 = await read(h, (g) => g.state.quest);
  h.note('quest after: ' + JSON.stringify(q1) + ' toasts: ' + JSON.stringify(await read(h, (g) => g.toasts.toasts)));
  h.assert(q1.index === q0.index + 1, 'next quest');
  await h.screenshot('03-claimed');
}
