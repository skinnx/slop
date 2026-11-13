// Bổ sung hợp đồng v2: quy ước joystick, expToNext, dấu hiệu trên công trình, dữ liệu hiển thị.
import { describe, it, expect } from 'vitest';
import { newGame, give, grantHero, instantBuilding, setPlayerLevel, teleport, cheat, strongSquad, loadData } from './helpers';
import { joystickToWorld, worldToIso, CONTRACT_VERSION } from '../../../game/assets/scripts/core/index';

const data = loadData();

describe('joystick convention', () => {
  it('setJoystick takes a vector in core grid coordinates: (1, 0) moves along +x of the grid', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    g.setJoystick(1, 0);
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(30, 1);
    expect(g.field.leader!.y).toBeCloseTo(27, 5);
    g.setJoystick(0, -1);
    t.stepSec(1);
    expect(g.field.leader!.y).toBeCloseTo(24, 1);
  });

  it('joystickToWorld turns a screen-space stick vector into a grid vector of the same length', () => {
    const p = { x: 0, y: 0 };
    // đẩy joystick thẳng lên trên màn hình iso = đi theo (+x, +y) của lưới
    joystickToWorld(data, 0, 1, p);
    expect(p.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(p.y).toBeCloseTo(Math.SQRT1_2, 9);
    // đẩy sang phải = (+x, −y)
    joystickToWorld(data, 1, 0, p);
    expect(p.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(p.y).toBeCloseTo(-Math.SQRT1_2, 9);
    // độ dài được giữ nguyên (độ lệch 0.4)
    joystickToWorld(data, 0.24, -0.32, p);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(0.4, 9);
    // hướng trên lưới chiếu ngược lại màn hình cùng phía với hướng joystick
    const s = worldToIso(data, p.x, p.y, { x: 0, y: 0 });
    expect(s.x).toBeGreaterThan(0);
    expect(s.y).toBeLessThan(0);
    joystickToWorld(data, 0, 0, p);
    expect([p.x, p.y]).toEqual([0, 0]);
  });

  it('pushing the stick up on screen moves the leader up on screen at 3 cells per second', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    const v = joystickToWorld(data, 0, 1, { x: 0, y: 0 });
    g.setJoystick(v.x, v.y);
    const a = worldToIso(data, g.field.leader!.x, g.field.leader!.y, { x: 0, y: 0 });
    const x0 = g.field.leader!.x;
    const y0 = g.field.leader!.y;
    t.stepSec(1);
    const b = worldToIso(data, g.field.leader!.x, g.field.leader!.y, { x: 0, y: 0 });
    expect(b.x).toBeCloseTo(a.x, 5);
    expect(b.y).toBeGreaterThan(a.y);
    expect(Math.hypot(g.field.leader!.x - x0, g.field.leader!.y - y0)).toBeCloseTo(3, 1);
  });
});

describe('player EXP', () => {
  it('expToNext is the whole EXP of the current level, exp is the progress inside it', () => {
    const t = newGame();
    const g = t.game;
    expect([g.player.level, g.player.exp, g.player.expToNext]).toEqual([1, 0, 10]);
    cheat(g).addExp(4);
    expect([g.player.exp, g.player.expToNext]).toEqual([4, 10]); // còn thiếu 6, thanh EXP 40%
    cheat(g).addExp(10);
    expect([g.player.level, g.player.exp, g.player.expToNext]).toEqual([2, 4, 49]);
    expect(data.playerLevels.levels[1].exp).toBe(49);
  });
});

describe('building markers', () => {
  it('a job shows first, then a waiting buffer, then nothing', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    give(g, { wood: 30 });
    g.enterBuildMode(); g.placeBuilding('lumber_camp', 30, 26); g.exitBuildMode();
    t.step();
    expect(g.findBuilding('lumber_camp')!.marker).toBe('job');
    t.stepSec(11);
    expect(g.findBuilding('lumber_camp')!.marker).toBe('none');
    t.stepSec(60);
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(1);
    expect(g.findBuilding('lumber_camp')!.marker).toBe('buffer');
    expect(g.findBuilding('storage')!.marker).toBe('none');
    // đang nâng thì dấu 'job' thắng bong bóng tài nguyên
    setPlayerLevel(g, 3);
    give(g, { wood: 48 });
    g.upgradeBuilding(g.findBuilding('lumber_camp')!.uid);
    t.step();
    expect(g.findBuilding('lumber_camp')!.marker).toBe('job');
  });

  it('the tavern shows "!" exactly when one draw is affordable', () => {
    const t = newGame();
    const g = t.game;
    instantBuilding(t, 'tavern', 30, 34, 1);
    t.step();
    expect(g.findBuilding('tavern')!.marker).toBe('alert'); // 100 vàng lúc đầu
    g.recruit(1);
    t.step();
    expect(g.findBuilding('tavern')!.marker).toBe('none');
    give(g, { gold: 99 }); t.step();
    expect(g.findBuilding('tavern')!.marker).toBe('none');
    give(g, { gold: 1 }); t.step();
    expect(g.findBuilding('tavern')!.marker).toBe('alert');
  });

  it('the training yard shows "!" when the next node or the next squad slot can be unlocked', () => {
    const t = newGame();
    const g = t.game;
    const yard = instantBuilding(t, 'training_yard', 30, 34, 1);
    t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('none');
    give(g, { ore: 6 }); t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('alert');
    expect(g.getTrainingInfo().canUnlockNext.ok).toBe(true);
    g.unlockTrainingNode(); t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('none');
    give(g, { coral: 2 }); t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('none'); // Sân Tập cấp 1 chưa cho mở ô 4
    cheat(g).village.byUid(yard).level = 2; t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('alert');
    expect(g.unlockSquadSlot().ok).toBe(true); t.step();
    expect(g.findBuilding('training_yard')!.marker).toBe('none');
    // nấc kế cần cấp người chơi cao hơn: không báo dù đủ quặng
    give(g, { ore: 500 });
    g.unlockTrainingNode(); g.unlockTrainingNode(); t.step();
    expect(g.getTrainingInfo().canUnlockNext.reason).toBe('need_player_level');
    expect(g.findBuilding('training_yard')!.marker).toBe('none');
  });

  it('the dungeon gate shows the check mark when the squad CP reaches the recommended CP of the first uncleared stage', () => {
    const t = newGame();
    const g = t.game;
    const gate = instantBuilding(t, 'dungeon_gate', 30, 34, 1);
    t.step();
    expect(g.squadCp).toBeLessThan(4550);
    expect(g.findBuilding('dungeon_gate')!.marker).toBe('none');
    expect(g.getDungeonInfo().readyStage).toBe(0);
    grantHero(g, 'kinh_vuong', 6); grantHero(g, 'dieu', 6);
    g.setSquad(['bang', 'kinh_vuong', 'dieu']);
    t.step();
    expect(g.squadCp).toBeGreaterThanOrEqual(4550);
    expect(g.findBuilding('dungeon_gate')!.marker).toBe('check');
    expect(g.getDungeonInfo().readyStage).toBe(1);
    // đã vượt chặng 1: chặng 2 cần Cổng cấp 2 -> không có dấu dù CP đủ
    strongSquad(g);
    cheat(g).bestStageCleared = 1; t.step();
    expect(g.findBuilding('dungeon_gate')!.marker).toBe('none');
    cheat(g).village.byUid(gate).level = 2; t.step();
    expect(g.findBuilding('dungeon_gate')!.marker).toBe('check');
    expect(g.getDungeonInfo().readyStage).toBe(2);
    // đã vượt hết 6 chặng: không còn dấu
    cheat(g).village.byUid(gate).level = 6; cheat(g).bestStageCleared = 6; t.step();
    expect(g.findBuilding('dungeon_gate')!.marker).toBe('none');
    expect(g.getDungeonInfo().readyStage).toBe(0);
  });

  it('markers are also right immediately after loading a save', () => {
    const t = newGame();
    instantBuilding(t, 'tavern', 30, 34, 1);
    t.step();
    const u = newGame({ save: JSON.parse(JSON.stringify(t.game.save())), clock: t.clock });
    expect(u.game.findBuilding('tavern')!.marker).toBe('alert');
  });
});

describe('display metadata', () => {
  it('the quest card carries its icon', () => {
    const t = newGame();
    const g = t.game;
    expect(g.quest.icon).toBe('icon/resource_wood'); // q01 gather
    cheat(g).quest.index = 1; cheat(g).quest.id = ''; t.step();
    expect([g.quest.type, g.quest.icon]).toEqual(['kill', 'icon/sword']);
    cheat(g).quest.index = 41; cheat(g).quest.id = ''; t.step();
    expect([g.quest.finished, g.quest.icon]).toEqual([true, '']);
  });

  it('skills carry the Vietnamese name of their type and of each parameter', () => {
    const g = newGame().game;
    const s = g.getHeroInfo('do_neo')!.skills;
    expect([s[0].type, s[0].typeName]).toEqual(['cleave', 'Chém vùng']);
    expect(s[0].paramNames).toEqual({ mult: 'Hệ số', radius: 'Bán kính' });
    expect([s[1].type, s[1].typeName]).toEqual(['nova', 'Nổ quanh mình']);
    const k = g.getHeroInfo('kinh_vuong')!.skills[0];
    expect([k.typeName, k.paramNames]).toEqual(['Tăng ATK', { pct: 'Tăng', durationSec: 'Thời gian (giây)' }]);
    for (const h of data.heroes) for (const sk of g.getHeroInfo(h.id)!.skills) {
      expect(sk.typeName.length).toBeGreaterThan(0);
      expect(Object.keys(sk.paramNames).sort()).toEqual(Object.keys(sk.params).sort());
    }
  });

  it('building panel rows carry their icon', () => {
    const t = newGame();
    const uid = instantBuilding(t, 'lumber_camp', 30, 26, 1);
    const rows = t.game.getBuildingPanel(uid)!.rows;
    expect(rows.map((r) => [r.key, r.icon])).toEqual([['perHour', 'icon/hourglass'], ['bufferCap', 'icon/cards_stack'], ['buffer', 'icon/hourglass']]);
  });

  it('the contract version is 2', () => {
    expect(CONTRACT_VERSION).toBe(2);
  });
});
