// Đội hình, TỰ XẾP, ô đội, Sân Tập.
import { describe, it, expect } from 'vitest';
import { newGame, give, grantHero, instantBuilding, setPlayerLevel, loadData, cheat } from './helpers';

const data = loadData();

describe('squad', () => {
  it('starts with 3 slots; add, remove, swap and replace keep the rules', () => {
    const t = newGame();
    const g = t.game;
    expect(g.squadSlots).toBe(3);
    grantHero(g, 'se'); grantHero(g, 'lan'); grantHero(g, 'dang');
    expect(g.squadRemove('bang').reason).toBe('squad_min');
    expect(g.squadRemove('bang').text).toBe('Đội cần ít nhất 1 hero');
    expect(g.squadAdd('se').ok).toBe(true);
    expect(g.squadAdd('se').reason).toBe('invalid');
    expect(g.squadAdd('trieu').reason).toBe('not_owned');
    expect(g.squadAdd('lan').ok).toBe(true);
    expect(g.squadAdd('dang').reason).toBe('squad_full');
    expect(g.squad).toEqual(['bang', 'se', 'lan']);
    expect(g.squadSwap(0, 2).ok).toBe(true);
    expect(g.squad).toEqual(['lan', 'se', 'bang']);
    expect(g.field.heroes.map((h) => h.heroId)).toEqual(['lan', 'se', 'bang']);
    expect(g.field.leader!.heroId).toBe('lan'); // ô 1 là thủ lĩnh
    expect(g.squadReplace(1, 'dang').ok).toBe(true);
    expect(g.squad).toEqual(['lan', 'dang', 'bang']);
    expect(g.squadRemove('lan').ok).toBe(true);
    expect(g.field.leader!.heroId).toBe('dang');
    expect(g.setSquad(['bang', 'bang']).reason).toBe('invalid');
    expect(g.setSquad([]).reason).toBe('squad_min');
  });

  it('squad CP is the sum of the CP of the heroes in the squad', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se', 3); grantHero(g, 'lan', 7);
    g.setSquad(['bang', 'se', 'lan']);
    const sum = ['bang', 'se', 'lan'].reduce((s, id) => s + g.getHeroInfo(id)!.cp, 0);
    expect(g.squadCp).toBe(sum);
    const ev = Array.from({ length: g.eventCount }, (_, i) => g.events[i]).filter((e) => e.type === 'squad_changed');
    expect(ev[ev.length - 1].n).toBe(sum);
    expect(ev[ev.length - 1].id).toBe(1340);
  });

  it('a hero swapped in appears next to the leader, at full health', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se');
    g.squadAdd('se');
    const [bang, se] = g.field.heroes;
    expect(Math.hypot(se.x - bang.x, se.y - bang.y)).toBeLessThan(1.5);
    expect(se.hp).toBe(se.maxHp);
  });
});

describe('auto assign', () => {
  it('with 3 slots takes the best healer plus the highest CP, tank first', () => {
    const t = newGame();
    const g = t.game;
    for (const id of ['se', 'lan', 'dang', 'do_neo', 'muc']) grantHero(g, id);
    // CP cấp 1: do_neo 1668, muc 1580, dang 1483, bang 1340, se 1319, lan 1020
    const info = g.getSquadInfo();
    expect(info.autoHeroIds).toEqual(['do_neo', 'muc', 'lan']);
    expect(info.canImprove).toBe(true);
    expect(g.autoAssign().ok).toBe(true);
    expect(g.squad).toEqual(['do_neo', 'muc', 'lan']); // không có tank: cận chiến CP cao nhất làm thủ lĩnh
    expect(g.squadCp).toBe(1668 + 1580 + 1020);
    expect(g.getSquadInfo().autoCp).toBe(g.squadCp);
  });

  it('with 4 slots also takes the best tank and puts it in slot 1', () => {
    const t = newGame();
    const g = t.game;
    for (const id of ['se', 'lan', 'dang', 'do_neo', 'muc', 'dieu', 'san']) grantHero(g, id);
    cheat(g).squadSlots = 4;
    g.autoAssign();
    // healer tốt nhất: san 1479; tank duy nhất: bang 1340; còn lại theo CP: dieu 2245, do_neo 1668
    expect(g.squad).toEqual(['bang', 'dieu', 'do_neo', 'san']);
  });

  it('uses real power: a levelled Common hero beats a level-1 Rare one', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se', 20); grantHero(g, 'do_neo', 1); grantHero(g, 'muc', 1); grantHero(g, 'dang', 1);
    g.autoAssign();
    expect(g.squad).toContain('se');
    expect(g.getHeroInfo('se')!.cp).toBeGreaterThan(g.getHeroInfo('do_neo')!.cp);
  });

  it('with only ranged heroes the highest CP leads; ties break by id', () => {
    const t = newGame();
    const g = t.game;
    const c = cheat(g);
    c.owned.length = 0; c.ownedById = {};
    for (const id of ['se', 'dang', 'lan']) c.addOwned(id, 1, 0);
    c.squad = ['lan'];
    c.syncSquad();
    g.autoAssign();
    expect(g.squad).toEqual(['dang', 'se', 'lan']);
  });
});

describe('squad slots', () => {
  it('slots 4..8 cost 2/4/6/9/12 coral and need training yard level 2..6', () => {
    const t = newGame();
    const g = t.game;
    expect(g.unlockSquadSlot().reason).toBe('not_built');
    const yard = instantBuilding(t, 'training_yard', 30, 34, 1);
    let c = g.unlockSquadSlot();
    expect([c.reason, c.n, c.text]).toEqual(['need_yard_level', 2, 'Cần Sân Tập cấp 2']);
    const b = cheat(g).village.byUid(yard);
    const costs = [2, 4, 6, 9, 12];
    for (let i = 0; i < 5; i++) {
      b.level = i + 2;
      c = g.unlockSquadSlot();
      expect([c.reason, c.n, c.key]).toEqual(['missing_resources', costs[i], 'coral']);
      give(g, { coral: costs[i] });
      expect(g.unlockSquadSlot().ok).toBe(true);
      expect(g.squadSlots).toBe(4 + i);
      expect(g.resources.coral).toBe(0);
      if (i < 4) expect(g.unlockSquadSlot().reason).toBe('need_yard_level');
    }
    expect(g.unlockSquadSlot().reason).toBe('max_level');
    const info = g.getTrainingInfo();
    expect(info.slotNodes.every((s) => s.state === 'unlocked')).toBe(true);
  });
});

describe('training yard', () => {
  it('nodes unlock in order for ore, three per player level, and add flat stats to every owned hero', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se');
    expect(g.unlockTrainingNode().reason).toBe('not_built');
    instantBuilding(t, 'training_yard', 30, 34, 1);
    let c = g.unlockTrainingNode();
    expect([c.reason, c.n, c.key]).toEqual(['missing_resources', 6, 'ore']);
    give(g, { ore: 200 });
    const hp0 = g.getHeroInfo('bang')!.hp;
    const atk0 = g.getHeroInfo('se')!.atk;
    expect(g.unlockTrainingNode().ok).toBe(true); // #0 HP +12, 6 quặng
    expect(g.getHeroInfo('bang')!.hp).toBe(hp0 + 12);
    expect(g.getHeroInfo('se')!.hp).toBe(450 + 12); // cả hero ngoài đội
    expect(g.field.heroes[0].maxHp).toBe(hp0 + 12);
    expect(g.unlockTrainingNode().ok).toBe(true); // #1 ATK +3, 6 quặng
    expect(g.getHeroInfo('se')!.atk).toBe(atk0 + 3);
    expect(g.unlockTrainingNode().ok).toBe(true); // #2, 7 quặng
    expect(g.resources.ore).toBe(200 - 6 - 6 - 7);
    c = g.unlockTrainingNode(); // #3 cần cấp người chơi 2
    expect([c.reason, c.n]).toEqual(['need_player_level', 2]);
    setPlayerLevel(g, 2);
    expect(g.unlockTrainingNode().ok).toBe(true);
    const info = g.getTrainingInfo();
    expect(info.nodesUnlocked).toBe(4);
    expect([info.flatHp, info.flatAtk]).toEqual([24, 6]);
    expect(info.nodes[3].state).toBe('unlocked');
    expect(info.nodes[4].state).toBe('available');
    expect(info.nodes[6].state).toBe('locked');
    expect(info.totalNodes).toBe(90);
  });

  it('the whole tree costs 37744 ore', () => {
    expect(data.training.nodes.reduce((s, n) => s + n.ore, 0)).toBe(37744);
  });
});

describe('squad changes during a fight', () => {
  it('monsters chasing a hero who is swapped out pick a new target instead of a stale one', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se'); grantHero(g, 'lan');
    g.setSquad(['bang', 'se']);
    const camp = g.field.camps.find((c) => c.id === 'c_z1_00')!;
    const f = cheat(g).field;
    f.placeSquad(camp.x + 2, camp.y);
    for (const m of f.monsters) if (m.campIndex === camp.index) { m.maxHp = 1e6; m.hp = 1e6; m.atk = 1; }
    t.stepSec(3);
    const chasers = f.monsters.filter((m: any) => m.campIndex === camp.index && m.state === 'chase');
    expect(chasers.length).toBe(4);
    expect(g.setSquad(['lan']).ok).toBe(true); // đổi cả đội giữa trận
    for (const m of chasers) expect(m.target).toBeNull();
    t.stepSec(2);
    const lan = f.heroes[0];
    for (const m of chasers) if (m.state === 'chase') { expect(m.target).toBe(lan); expect(m.target.isHero).toBe(true); }
    expect(f.monsters.every((m: any) => !m.target || m.target.isHero)).toBe(true);
  });
});
