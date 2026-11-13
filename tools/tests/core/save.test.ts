// Lưu, tải, phiên bản, tiến độ ngoại tuyến có trần.
import { describe, it, expect } from 'vitest';
import {
  newGame, give, grantHero, instantBuilding, setPlayerLevel, teleport, cheat, strongSquad, enterStage, loadData, SimClock,
} from './helpers';
import { SaveError, SAVE_VERSION } from '../../../game/assets/scripts/core/index';
import type { Game, SaveData } from '../../../game/assets/scripts/core/index';

const data = loadData();
const HOUR = 3600;

/** Những gì người chơi thấy được sau khi tải lại. */
function visible(g: Game): any {
  return {
    player: { level: g.player.level, exp: g.player.exp },
    resources: { ...g.resources },
    buildings: g.buildings.map((b) => ({ uid: b.uid, type: b.type, level: b.level, x: b.x, y: b.y, job: b.job, buffer: b.buffer })),
    heroes: g.getHeroList().filter((h) => h.owned).map((h) => [h.id, h.level, h.fragments]).sort(),
    squad: g.squad.slice(), squadSlots: g.squadSlots, cp: g.squadCp,
    training: g.getTrainingInfo().nodesUnlocked,
    tavern: (() => { const t = g.getTavernInfo(); return { cards: t.cards.map((c) => c.heroId), bonus: t.bonus, draws: t.totalDraws, refresh: Math.round(t.refreshInSec) }; })(),
    dungeon: (() => { const d = g.getDungeonInfo(); return [d.bestStageCleared, d.bestFloorCleared, d.stages.map((s) => s.repeatClears)]; })(),
    quest: [g.quest.id, g.quest.progress],
    leader: [g.field.leader!.x, g.field.leader!.y],
    returnPoint: g.field.returnPoint,
    settings: { ...g.settings },
    playSec: Math.round(g.playSec),
  };
}

/** Một ván đã chơi dở: nhiều thứ khác mặc định. */
function played() {
  const t = newGame({ seed: 77 });
  const g = t.game;
  setPlayerLevel(g, 9);
  give(g, { gold: 834, meat: 120, wood: 260, ore: 90, coral: 3, tickets: 11 });
  instantBuilding(t, 'lumber_camp', 26, 26, 3);
  instantBuilding(t, 'tavern', 30, 34, 1);
  instantBuilding(t, 'training_yard', 34, 30, 2);
  instantBuilding(t, 'dungeon_gate', 24, 34, 2);
  grantHero(g, 'se', 6, 3); grantHero(g, 'lan', 4, 0); grantHero(g, 'muc', 2, 5);
  g.setSquad(['bang', 'se', 'lan']);
  for (let i = 0; i < 5; i++) g.unlockTrainingNode();
  g.recruit(3);
  g.unlockSquadSlot();
  cheat(g).bestStageCleared = 1; cheat(g).bestFloorCleared = 7; cheat(g).repeatClears['1'] = 2;
  cheat(g).quest.index = 21; cheat(g).quest.id = ''; cheat(g).quest.progress = 0;
  g.setSetting('music', false);
  const st = g.findBuilding('storage')!;
  expect(g.upgradeBuilding(st.uid).ok).toBe(true); // 30 s
  teleport(g, 45.5, 27.25);
  g.returnToVillage();
  t.stepSec(3); // về làng: có điểm ra đồng
  teleport(g, 27.5, 28.25);
  t.stepSec(5);
  return t;
}

describe('save and load', () => {
  it('a save is plain versioned JSON', () => {
    const t = played();
    const s = t.game.save();
    expect(s.saveVersion).toBe(SAVE_VERSION);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.lastSaveAt).toBe(t.clock.nowMs());
    expect(Object.keys(s).sort()).toEqual(['buildings', 'createdAt', 'dungeon', 'heroes', 'inventory', 'lastSaveAt', 'nextBuildingUid', 'player',
      'quest', 'resources', 'rng', 'saveVersion', 'settings', 'squad', 'squadSlots', 'stats', 'tavern', 'training', 'world']);
    expect(s.inventory).toEqual({});
  });

  it('round trip: quitting and coming back at once keeps everything', () => {
    const t = played();
    const before = visible(t.game);
    const text = JSON.stringify(t.game.save());
    const u = newGame({ save: JSON.parse(text), clock: t.clock });
    expect(visible(u.game)).toEqual(before);
    expect(u.game.offlineReport!.offlineSec).toBe(0);
    expect(u.game.offlineReport!.showPanel).toBe(false);
    expect(u.game.mode).toBe('world');
    // và lưu lại lần nữa cho ra đúng bản lưu cũ (trừ trạng thái RNG: tải lại dựng lại ổ quái nên đã rút thêm số)
    const again: any = u.game.save();
    const first: any = JSON.parse(text);
    expect(again.rng.seed).toBe(first.rng.seed);
    again.rng.state = 0; first.rng.state = 0;
    expect(again).toEqual(first);
  });

  it('node and camp state is not saved: everything is full again after loading', () => {
    const t = newGame();
    const g = t.game;
    const tree = g.field.nodes.find((n) => n.id === 'n010')!;
    teleport(g, tree.x + 0.9, tree.y);
    t.stepSec(8);
    expect(tree.depleted).toBe(true);
    const u = newGame({ save: JSON.parse(JSON.stringify(g.save())), clock: t.clock });
    expect(u.game.field.nodes.every((n) => !n.depleted)).toBe(true);
    expect(u.game.field.camps.every((c) => c.alive === c.count)).toBe(true);
    expect(u.game.field.pickups.length).toBe(0);
    expect(u.game.resources.wood).toBe(g.resources.wood);
  });

  it('the game continues the same random sequence after a reload', () => {
    const run = (reload: boolean) => {
      const t = newGame({ seed: 5 });
      instantBuilding(t, 'tavern', 30, 34, 1);
      give(t.game, { gold: 3000 });
      t.game.recruit(3);
      let g = t.game;
      if (reload) g = newGame({ save: JSON.parse(JSON.stringify(g.save())), clock: t.clock }).game;
      const picks: string[] = [];
      for (let i = 0; i < 8; i++) { g.recruit(3); picks.push(g.lastRecruit!.draws.map((d) => d.heroId).join()); }
      return picks.join(';');
    };
    // tải lại tạo lại ổ quái (tốn số ngẫu nhiên) nên chuỗi sau đó khác chuỗi không tải; nhưng hai lần tải giống hệt nhau
    expect(run(true)).toBe(run(true));
    expect(run(false)).toBe(run(false));
  });

  it('inside the dungeon save() returns the state from before entering', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    const before = JSON.stringify(g.save());
    enterStage(t, 1);
    t.stepSec(20);
    expect((g.run!.loot.gold || 0)).toBeGreaterThan(0);
    const mid = g.save();
    expect(mid.resources).toEqual(JSON.parse(before).resources);
    expect(mid.dungeon.bestFloorCleared).toBe(0);
    // thoát app giữa lượt rồi vào lại: lượt bị hủy, đội ở làng
    const u = newGame({ save: JSON.parse(JSON.stringify(mid)), clock: t.clock });
    expect(u.game.mode).toBe('world');
    expect(u.game.run).toBeNull();
    expect(u.game.resources.gold).toBe(JSON.parse(before).resources.gold);
    expect(u.game.leaderZone).toBe('village');
    const gate = u.game.findBuilding('dungeon_gate')!; // đội đứng cạnh Cổng Xoáy
    expect([u.game.field.leader!.x, u.game.field.leader!.y]).toEqual([gate.x + 1.5, gate.y - 1]);
  });

  it('transactions and the 15 s timer ask the view to save', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    let points = 0;
    const count = () => { for (let i = 0; i < g.eventCount; i++) if (g.events[i].type === 'save_point') points++; g.clearEvents(); };
    for (let i = 0; i < 30 * 46; i++) { t.step(); count(); }
    expect(points).toBe(3); // 15, 30, 45 s
    give(g, { meat: 15 });
    g.levelUpHero('bang'); count();
    expect(points).toBe(4);
    g.setSetting('sfx', false); count();
    expect(points).toBe(5);
    expect(g.settings).toEqual({ music: true, sfx: false });
  });
});

describe('save versions and bad saves', () => {
  it('rejects a save from a newer game version, and things that are not saves', () => {
    const s = newGame().game.save();
    const newer = { ...s, saveVersion: SAVE_VERSION + 1 };
    expect(() => newGame({ save: newer })).toThrow(SaveError);
    expect(() => newGame({ save: newer })).toThrow(/mới hơn bản game/);
    expect(() => newGame({ save: 'x' as any })).toThrow(SaveError);
    expect(() => newGame({ save: {} as any })).toThrow(/saveVersion/);
    expect(() => newGame({ save: { saveVersion: 1 } as any })).toThrow(/thiếu/);
    expect(() => newGame({ save: { ...s, heroes: [{ id: 'khong_co', level: 1, fragments: 0 }] } })).toThrow(/hero/);
  });

  it('repairs out-of-range values instead of crashing', () => {
    const s = newGame().game.save();
    const bad: any = JSON.parse(JSON.stringify(s));
    bad.player.level = 999;
    bad.resources.gold = -50;
    bad.resources.meat = 'nhiều';
    bad.heroes.push({ id: 'se', level: 77, fragments: -3 }, { id: 'se', level: 2, fragments: 0 }, { id: 'ghost', level: 1, fragments: 0 });
    bad.squad = ['ghost', 'se', 'se', 'bang', 'bang'];
    bad.squadSlots = 40;
    bad.buildings.push({ uid: 9, type: 'castle', level: 1, x: 0, y: 0, job: null, buffer: 0 });
    bad.buildings.push({ uid: 10, type: 'tavern', level: 99, x: 30, y: 30, job: null, buffer: -4 });
    bad.tavern.cards = ['lan'];
    bad.quest.index = 500;
    bad.world.leaderPos = [9999, -3];
    const g = newGame({ save: bad }).game;
    expect(g.player.level).toBe(30);
    expect(g.resources.gold).toBe(0);
    expect(g.resources.meat).toBe(0);
    expect(g.getHeroInfo('se')!.level).toBe(30);
    expect(g.getHeroInfo('se')!.fragments).toBe(0);
    expect(g.squad).toEqual(['se', 'bang']);
    expect(g.squadSlots).toBe(8);
    expect(g.buildings.map((b) => b.type).sort()).toEqual(['storage', 'tavern']);
    expect(g.findBuilding('tavern')!.level).toBe(5);
    expect(g.getTavernInfo().cards.length).toBe(3);
    expect(g.quest.finished).toBe(true);
    expect(g.field.leader!.x).toBeLessThanOrEqual(59);
    expect(g.field.leader!.y).toBeGreaterThanOrEqual(1);
  });

  it('loads the sample save from the design document (no bestFloorCleared, quest.baseValue)', () => {
    const sample: any = {
      saveVersion: 1, createdAt: 0, lastSaveAt: 0,
      rng: { seed: 0, state: 0, dungeonRuns: 0 },
      player: { level: 1, exp: 0 },
      resources: { gold: 100, meat: 0, wood: 0, ore: 0, coral: 0, tickets: 0 },
      buildings: [{ uid: 1, type: 'storage', level: 1, x: 21, y: 21, job: null, buffer: 0 }],
      heroes: [{ id: 'bang', level: 1, fragments: 0 }],
      squad: ['bang'], squadSlots: 3,
      training: { nodesUnlocked: 0 },
      tavern: { cards: ['lan', 'se', 'dang'], nextRefreshAt: 0, bonus: 0, totalDraws: 0 },
      dungeon: { bestStageCleared: 2, repeatClears: { 1: 0 } },
      quest: { index: 3, baseValue: 0 },
      world: { leaderPos: [30, 30], returnPoint: null },
      settings: { music: true, sfx: true },
      stats: { playSec: 0, kills: 0 },
      inventory: {},
    };
    const clock = new SimClock(0);
    const g = newGame({ save: sample as SaveData, clock }).game;
    expect(g.squad).toEqual(['bang']);
    expect(g.quest.id).toBe('q04');
    expect(g.getDungeonInfo().bestFloorCleared).toBe(10); // suy ra từ 2 chặng đã vượt
    expect(g.resources.gold).toBe(100);
  });
});

describe('offline progress', () => {
  function away(seconds: number, setup?: (t: ReturnType<typeof newGame>) => void) {
    const t = newGame();
    teleport(t.game, 27, 27);
    if (setup) setup(t);
    t.step();
    const save = JSON.parse(JSON.stringify(t.game.save()));
    t.clock.advanceSec(seconds);
    const u = newGame({ save, clock: t.clock });
    return { before: t, after: u, report: u.game.offlineReport! };
  }

  it('production runs while away and stays in the buffers until collected', () => {
    const { after, report } = away(2 * HOUR, (t) => {
      instantBuilding(t, 'lumber_camp', 30, 26, 1); // 60 gỗ / giờ
      instantBuilding(t, 'market', 33, 26, 2);      // 60 vàng / giờ
    });
    const g = after.game;
    expect(report.offlineSec).toBe(2 * HOUR);
    expect(report.showPanel).toBe(true);
    expect(report.capped).toBe(false);
    expect(report.buffers.map((b) => [b.type, b.resource, b.amount])).toEqual([['lumber_camp', 'wood', 120], ['market', 'gold', 120]]);
    expect(g.resources.wood).toBe(0);
    const got = g.collectAll(); // nút "THU HẾT"
    expect(got).toEqual({ wood: 120, gold: 120 });
    expect(g.resources.wood).toBe(120);
    expect(g.resources.gold).toBe(220);
  });

  it('is capped at 8 hours, and buffers at 8 hours of output', () => {
    const { after, report } = away(30 * HOUR, (t) => { instantBuilding(t, 'lumber_camp', 30, 26, 2); }); // 90 gỗ / giờ
    expect(report.offlineSec).toBe(8 * HOUR);
    expect(report.capped).toBe(true);
    expect(after.game.findBuilding('lumber_camp')!.buffer).toBe(720);
    expect(after.game.findBuilding('lumber_camp')!.bufferCap).toBe(720);
    // "THU HẾT" vẫn theo trần kho (300): phần còn lại ở lại bộ đệm
    expect(after.game.collectAll()).toEqual({ wood: 300 });
    expect(after.game.findBuilding('lumber_camp')!.buffer).toBe(420);
  });

  it('build and upgrade timers finish while away and take effect; the report lists them', () => {
    const { after, report } = away(45, (t) => {
      setPlayerLevel(t.game, 2);
      give(t.game, { wood: 90 });
      t.game.upgradeBuilding(t.game.findBuilding('storage')!.uid); // 30 s
    });
    expect(report.showPanel).toBe(false); // dưới 60 s: không hiện panel
    expect(report.finished).toEqual([{ uid: 1, type: 'storage', name: 'Nhà Kho', level: 2 }]);
    expect(after.game.findBuilding('storage')!.level).toBe(2);
    expect(after.game.storageCap('wood')).toBe(500);
    expect(after.game.buildersFree).toBe(2);
  });

  it('a production building that finishes its upgrade while away produces at the old rate first, then the new one', () => {
    const { after } = away(HOUR, (t) => {
      setPlayerLevel(t.game, 3);
      const uid = instantBuilding(t, 'lumber_camp', 30, 26, 1);
      give(t.game, { wood: 48 });
      expect(t.game.upgradeBuilding(uid).ok).toBe(true); // cấp 2 sau 30 s: 60/giờ -> 90/giờ
    });
    // 30 s ở 60/giờ = 0.5; 3570 s ở 90/giờ = 89.25 (bước đầu tiên trước khi lưu đã cộng thêm một chút)
    expect(after.game.findBuilding('lumber_camp')!.level).toBe(2);
    expect(after.game.findBuilding('lumber_camp')!.buffer).toBe(89);
  });

  it('a timer longer than the 8-hour cap only advances 8 hours', () => {
    const { before, after } = away(20 * HOUR, (t) => {
      const g = cheat(t.game);
      const b = g.village.byType('storage');
      const now = t.clock.nowMs();
      b.job = { kind: 'upgrade', targetLevel: 2, startedAt: now, endsAt: now + 10 * HOUR * 1000 };
    });
    const b = after.game.findBuilding('storage')!;
    expect(b.level).toBe(1);
    const left = (b.job!.endsAt - before.clock.nowMs()) / 1000;
    expect(left).toBeGreaterThan(2 * HOUR - 2);
    expect(left).toBeLessThan(2 * HOUR + 2);
    expect(after.game.getBuildingPanel(b.uid)!.jobRemainingSec).toBeCloseTo(left, 0);
  });

  it('the tavern clock runs while away and the set refreshes', () => {
    const { before, after, report } = away(40 * 60, (t) => {
      instantBuilding(t, 'tavern', 30, 34, 1);
      t.step();
      t.game.recruit(1);
    });
    expect(report.tavernRefreshed).toBe(true);
    expect(Math.round(after.game.getTavernInfo().refreshInSec)).toBe(20 * 60);
    expect(after.game.getTavernInfo().totalDraws).toBe(1);
    expect(before.game.getTavernInfo().cards.length).toBe(3);
  });

  it('a clock that went backwards gives no progress and keeps remaining times', () => {
    const { after, report } = away(-5 * HOUR, (t) => {
      instantBuilding(t, 'lumber_camp', 30, 26, 1);
      setPlayerLevel(t.game, 2);
      give(t.game, { wood: 90 });
      t.game.upgradeBuilding(t.game.findBuilding('storage')!.uid);
    });
    expect(report.offlineSec).toBe(0);
    expect(report.showPanel).toBe(false);
    expect(after.game.findBuilding('lumber_camp')!.buffer).toBe(0);
    expect(after.game.findBuilding('storage')!.level).toBe(1);
    expect(after.game.getBuildingPanel(after.game.findBuilding('storage')!.uid)!.jobRemainingSec).toBeCloseTo(30, 0);
    after.stepSec(31);
    expect(after.game.findBuilding('storage')!.level).toBe(2);
  });

  it('no combat or gathering is simulated while away', () => {
    const { before, after } = away(3 * HOUR);
    expect(after.game.player.exp).toBe(before.game.player.exp);
    expect(after.game.resources.meat).toBe(before.game.resources.meat);
    expect(after.game.resources.wood).toBe(before.game.resources.wood);
    expect(Math.round(after.game.playSec)).toBe(Math.round(before.game.playSec));
  });

  it('data sanity: the offline cap and the buffer cap are both 8 hours', () => {
    expect(data.tuning.economy.offlineCapHours).toBe(8);
    expect(data.tuning.economy.productionBufferHours).toBe(8);
    expect(data.tuning.save.welcomeBackMinSec).toBe(60);
  });
});
