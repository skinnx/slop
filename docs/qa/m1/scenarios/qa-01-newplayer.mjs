// QA 01: a new player from a FRESH save, by touch only (joystick drag + taps on named nodes), follows the quest card.
// Time-skips (fastForward) are used only where the player would just wait; every one is noted.
import { boot, until, read, st, walkTo, waitState, ff, check, tap, panel, closePanels, texts, send, ui, farm, TREE, ROCK, goVillage, placeNew, leaveBuild, tapBuilding, claim } from './lib/qa.mjs';

export default async function (h) {
  await boot(h);
  await h.screenshot('01-title');
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(600);
  await h.screenshot('02-fresh-village');
  let s = await st(h);
  h.note(`start gold=${s.resources.gold} cp=${s.cp} squad=${s.squad} quest="${s.quest.text}"`);

  // --- q01 gather wood: walk to the nearest tree (30.8, 19.0) and stand still.
  const d = await walkTo(h, 30.8, 20.4, { stop: 1.6 });
  await h.screenshot('03-at-tree');
  const ok1 = await waitState(h, (x) => x.quest.complete || x.resources.wood >= 10, 40000);
  await h.screenshot('04-gathered');
  s = await st(h);
  check(h, ok1, `q01: 10 wood gathered by standing near a tree (wood=${s.resources.wood}, progress ${s.quest.progress}/${s.quest.target})`);
  await tap(h, 'quest', { wait: 500 });
  s = await st(h);
  check(h, s.quest.id === 'q02', `q01 claimed by tapping the quest card -> now ${s.quest.id}; gold=${s.resources.gold}`);
  await h.screenshot('05-quest-claimed');

  // --- q02 kill 3 Cua Cat at camp (42.5,30) : walk close, stand still.
  await walkTo(h, 40.5, 30, { stop: 2.5, untilFn: async (x) => x.monsters < 120 });
  await h.screenshot('06-near-camp');
  const ok2 = await waitState(h, (x) => x.quest.complete || x.quest.id !== 'q02', 40000);
  await h.wait(1500);
  await h.screenshot('07-combat');
  s = await st(h);
  check(h, ok2, `q02: 3 crabs killed (progress ${s.quest.progress}/${s.quest.target}) meat=${s.resources.meat} gold=${s.resources.gold}`);
  await tap(h, 'quest', { wait: 400 });

  // --- walk back to the village centre (drops are auto-collected).
  await walkTo(h, 30, 30, { stop: 2 });
  s = await st(h);
  h.note(`after q02: quest=${s.quest.id} meat=${s.resources.meat} wood=${s.resources.wood} gold=${s.resources.gold} zone=${s.zone}`);

  // --- q03 hero level 2 : open hero list, hero detail, level up.
  await tap(h, 'hero', { wait: 400 }); await panel(h, 'heroes').catch(() => {});
  await h.screenshot('08-hero-list');
  h.note('panels=' + JSON.stringify(await read(h, (g) => g.panels)));
  await tap(h, 'hero-bang', { wait: 400 });
  await h.wait(400);
  await h.screenshot('09-hero-detail');
  h.note('detail texts: ' + JSON.stringify(await texts(h)).slice(0, 600));
  await tap(h, 'levelUp', { wait: 500 });
  await h.screenshot('10-after-levelup');
  await closePanels(h);
  s = await st(h);
  check(h, s.quest.id !== 'q03' || s.quest.complete, `q03: hero level up -> quest ${s.quest.id} complete=${s.quest.complete} meat=${s.resources.meat}`);
  await tap(h, 'quest', { wait: 400 });
  s = await st(h);
  h.note(`quest now ${s.quest.id} "${s.quest.text}"`);

  // --- q04 build the lumber camp (30 wood, 10 s).
  s = await st(h);
  if (s.resources.wood < 30) check(h, await farm(h, 'wood', 30, TREE), 'gathered 30 wood for the camp');
  check(h, await goVillage(h), 'portal "Về làng" took the squad home');
  await h.screenshot('11-home');
  const camp = await placeNew(h, 'lumber_camp', { label: '12-ghost-lumber' });
  check(h, !!camp, 'lumber camp placed');
  await h.screenshot('13-scaffold');
  await leaveBuild(h);
  await waitState(h, (x) => x.buildings.find((b) => b.type === 'lumber_camp' && !b.job), 30000);
  await h.screenshot('14-camp-built');
  s = await st(h);
  check(h, s.quest.id === 'q05' || s.quest.complete, `q04 done after the camp finished: quest=${s.quest.id} complete=${s.quest.complete} lvl=${s.level}`);
  await tap(h, 'quest', { wait: 400 });
  s = await st(h);
  h.note(`quest now ${s.quest.id} "${s.quest.text}" lvl=${s.level} res=${JSON.stringify(s.resources)}`);

  // --- q05 ore
  check(h, await farm(h, 'ore', 10, ROCK), 'gathered 10 ore');
  await h.screenshot('15-ore');
  await claim(h);
  // --- q06 tavern (needs 60 wood)
  s = await st(h);
  if (s.resources.wood < 60) await farm(h, 'wood', 60, TREE);
  await goVillage(h);
  const tav = await placeNew(h, 'tavern', { label: '16-ghost-tavern' });
  await leaveBuild(h);
  await waitState(h, (x) => x.buildings.find((b) => b.type === 'tavern' && !b.job), 40000);
  await h.screenshot('17-tavern-built');
  s = await claim(h);
  // --- q07 recruit
  await tapBuilding(h, 'tavern');
  await h.wait(500);
  await h.screenshot('18-tavern-panel');
  h.note('panels ' + JSON.stringify(await read(h, (g) => g.panels)));
  h.note('tavern texts ' + JSON.stringify(await texts(h)).slice(0, 900));
  await tap(h, 'recruit', { wait: 1500 });
  await h.screenshot('19-recruit-reveal');
  h.note('panels ' + JSON.stringify(await read(h, (g) => g.panels)));
  await tap(h, 'ok', { wait: 600 }).catch(() => {});
  await h.screenshot('20-after-recruit');
  s = await st(h);
  h.note(`after recruit: gold=${s.resources.gold} heroes?? squad=${s.squad} quest=${s.quest.id} complete=${s.quest.complete}`);
  await closePanels(h);
  await claim(h);
  // --- q08 auto assign
  await tap(h, 'squad', { wait: 500 });
  await h.screenshot('21-squad-panel');
  await tap(h, 'autoAssign', { wait: 600 });
  await h.screenshot('22-after-auto-assign');
  await closePanels(h);
  s = await claim(h);
  h.note(`squad now ${s.squad} cp ${s.cp}`);
}
