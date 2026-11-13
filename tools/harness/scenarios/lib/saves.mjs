// Save fixtures for view scenarios. A scenario writes one into localStorage BEFORE tapping the title screen;
// the core loads it like a real save (core/save.ts validates and cleans it). Only states a player could reach.
export const SAVE_KEY = 'tidecrew.save.v1';

/** Mid-game village: every M1 building, 6 heroes, gate level 2, enough resources to try every button. */
export function midGame(now, o = {}) {
  return {
    saveVersion: 1, createdAt: now - 7200e3, lastSaveAt: o.lastSaveAt ?? now - 1000,
    rng: { seed: 7, state: 7, dungeonRuns: 0 },
    player: { level: o.level ?? 12, exp: 0 },
    resources: { gold: 2000, meat: 900, wood: 1500, ore: 900, coral: 12, tickets: 40, ...(o.resources ?? {}) },
    buildings: [
      { uid: 1, type: 'storage', level: 5, x: 25, y: 25, job: null, buffer: 0 },
      { uid: 2, type: 'lumber_camp', level: 3, x: 31, y: 27, job: null, buffer: 140 },
      { uid: 3, type: 'tavern', level: 2, x: 27, y: 31, job: null, buffer: 0 },
      { uid: 4, type: 'ore_mine', level: 2, x: 33, y: 32, job: o.mineJob ? { kind: 'upgrade', targetLevel: 3, startedAt: now - 30e3, endsAt: now + 150e3 } : null, buffer: 30 },
      { uid: 5, type: 'training_yard', level: 2, x: 30, y: 35, job: null, buffer: 0 },
      { uid: 6, type: 'market', level: 1, x: 34, y: 29, job: null, buffer: 20 },
      { uid: 7, type: 'dungeon_gate', level: o.gateLevel ?? 2, x: 24, y: 28, job: null, buffer: 0 },
    ],
    nextBuildingUid: 8,
    heroes: o.heroes ?? [
      { id: 'bang', level: 14, fragments: 12 }, { id: 'se', level: 12, fragments: 7 }, { id: 'lan', level: 10, fragments: 3 },
      { id: 'dang', level: 9, fragments: 4 }, { id: 'do_neo', level: 6, fragments: 2 }, { id: 'muc', level: 5, fragments: 4 },
    ],
    squad: o.squad ?? ['bang', 'se', 'lan', 'dang'], squadSlots: o.slots ?? 4,
    training: { nodesUnlocked: 10 },
    tavern: { cards: ['en', 'san', 'trieu'], nextRefreshAt: now + 1700e3, bonus: 4, totalDraws: 6 },
    dungeon: { bestStageCleared: o.bestStage ?? 0, bestFloorCleared: (o.bestStage ?? 0) * 5, repeatClears: {}, auto: true },
    quest: { index: o.quest ?? 10, progress: 0 },
    world: { leaderPos: o.leaderPos ?? [30, 30], returnPoint: [30, 44] },
    settings: { music: true, sfx: true },
    stats: { playSec: 3600, kills: 150 },
    inventory: {},
  };
}

/** Strong 8-hero squad for the dungeon crowd test. */
export function strongSquad(now) {
  const ids = ['kinh_vuong', 'rua_sat', 'dieu', 'trieu', 'san', 'en', 'bang', 'se'];
  return midGame(now, {
    level: 25, gateLevel: 6, slots: 8, bestStage: 3,
    heroes: ids.map((id) => ({ id, level: 30, fragments: 0 })), squad: ids,
  });
}

/** Full 8-hero squad of modest level: fights 60 monsters for several seconds (crowd test). */
export function crowdSquad(now) {
  const ids = ['bang', 'do_neo', 'rua_sat', 'se', 'muc', 'lan', 'dang', 'san'];
  return midGame(now, { level: 12, gateLevel: 2, slots: 8, heroes: ids.map((id) => ({ id, level: 4, fragments: 0 })), squad: ids });
}

/** Writes a save into the page's localStorage (call before the title tap). */
export async function installSave(h, save) {
  await h.eval(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
}
export const pageNow = (h) => h.eval(() => Date.now());
