// Công thức: chỉ số theo cấp, hiệu ứng sở hữu, Sân Tập, lực chiến, giá lên cấp, mốc kỹ năng.
import { describe, it, expect } from 'vitest';
import { loadData, newGame, grantHero, give, cheat } from './helpers';
import {
  statAtLevel, computeBonuses, heroHp, heroAtk, heroCp, skillStars, levelUpCost, nextBreakthroughFragments, cpFromStats,
  difficultyLabel,
} from '../../../game/assets/scripts/core/formulas';

const data = loadData();
const none = computeBonuses(data, [], 0);

describe('hero stats', () => {
  it('stat = round(base × (1 + 0.03 × (L − 1)))', () => {
    expect(statAtLevel(900, 1, 0.03)).toBe(900);
    expect(statAtLevel(900, 2, 0.03)).toBe(927);
    expect(statAtLevel(110, 30, 0.03)).toBe(206); // 110 × 1.87 = 205.7
    expect(statAtLevel(170, 10, 0.03)).toBe(216); // 170 × 1.27 = 215.9
  });

  it('level-1 CP of all 12 heroes matches the balance document', () => {
    const expected: { [id: string]: number } = {
      bang: 1340, do_neo: 1668, rua_sat: 1916, kinh_vuong: 2378, se: 1319, muc: 1580, en: 1909, dieu: 2245,
      lan: 1020, dang: 1483, san: 1479, trieu: 2161,
    };
    for (const h of data.heroes) expect(heroCp(data, h, 1, none), h.id).toBe(expected[h.id]);
  });

  it('CP = round(4 × ATK / interval × (1 + skill bonus) + HP)', () => {
    expect(cpFromStats(data, 110, 900, 1.1, 0.10)).toBe(1340);
    expect(cpFromStats(data, 100, 500, 1.0, 0)).toBe(900);
    expect(cpFromStats(data, 100, 500, 0.5, 0)).toBe(1300); // đánh nhanh gấp đôi thì phần ATK gấp đôi
  });

  it('skills unlock at 1 and 10 and reach two stars at 20 and 30', () => {
    expect([skillStars(data, 1, 0), skillStars(data, 1, 1)]).toEqual([1, 0]);
    expect([skillStars(data, 9, 0), skillStars(data, 9, 1)]).toEqual([1, 0]);
    expect([skillStars(data, 10, 0), skillStars(data, 10, 1)]).toEqual([1, 1]);
    expect([skillStars(data, 20, 0), skillStars(data, 20, 1)]).toEqual([2, 1]);
    expect([skillStars(data, 30, 0), skillStars(data, 30, 1)]).toEqual([2, 2]);
  });

  it('skill CP bonus grows with unlocked skills and stars', () => {
    const bang = data.heroById.bang; // strike 0.10 + taunt 0.05
    const hp = (l: number) => heroHp(data, bang, l, none);
    const atk = (l: number) => heroAtk(data, bang, l, none);
    expect(heroCp(data, bang, 10, none)).toBe(cpFromStats(data, atk(10), hp(10), 1.1, 0.15));
    expect(heroCp(data, bang, 20, none)).toBe(cpFromStats(data, atk(20), hp(20), 1.1, 0.20));
    expect(heroCp(data, bang, 30, none)).toBe(cpFromStats(data, atk(30), hp(30), 1.1, 0.25));
  });

  it('owned effects: +5% HP at 5 and 25, +5% ATK at 15, for every hero of the same attribute, stacking', () => {
    const b = computeBonuses(data, [{ id: 'bang', level: 25, fragments: 0 }, { id: 'do_neo', level: 15, fragments: 0 }, { id: 'se', level: 4, fragments: 0 }], 0);
    expect(b.hpPct.STR).toBeCloseTo(0.15); // bang 5 + 25, do_neo 5
    expect(b.atkPct.STR).toBeCloseTo(0.10);
    expect(b.hpPct.AGI).toBe(0);
    expect(b.hpPct.INT).toBe(0);
    // áp lên hero cùng hệ, kể cả hero không đạt mốc
    expect(heroHp(data, data.heroById.rua_sat, 1, b)).toBe(Math.round(1305 * 1.15));
    expect(heroHp(data, data.heroById.se, 1, b)).toBe(450);
  });

  it('training nodes add flat stats before the owned-effect percentage', () => {
    const b = computeBonuses(data, [{ id: 'bang', level: 5, fragments: 0 }], 5); // nấc 0..4: hp, atk, hp, atk, hp
    expect(b.flatHp).toBe(36);
    expect(b.flatAtk).toBe(6);
    expect(heroHp(data, data.heroById.bang, 1, b)).toBe(Math.round((900 + 36) * 1.05));
    expect(heroAtk(data, data.heroById.bang, 1, b)).toBe(116);
  });

  it('the strongest possible M1 squad has the CP the design computed (54568)', () => {
    const t = newGame();
    const g = cheat(t.game);
    for (const h of data.heroes) grantHero(t.game, h.id, 30);
    g.nodesUnlocked = 90; g.squadSlots = 8; g.syncSquad();
    expect(t.game.autoAssign().ok).toBe(true);
    expect(t.game.squadCp).toBe(54568);
  });
});

describe('level-up costs', () => {
  it('meat per level and fragments at the five breakthroughs', () => {
    const bang = data.heroById.bang; // Thường
    expect(levelUpCost(data, bang, 1)).toEqual({ meat: 15, fragments: 0 });
    expect(levelUpCost(data, bang, 4)).toEqual({ meat: 20, fragments: 0 });
    expect(levelUpCost(data, bang, 5)).toEqual({ meat: 22, fragments: 5 });
    expect(levelUpCost(data, bang, 20)).toEqual({ meat: 100, fragments: 20 });
    expect(levelUpCost(data, data.heroById.trieu, 25)).toEqual({ meat: 170, fragments: 10 });
    expect(levelUpCost(data, bang, 30)).toBeNull();
    expect(nextBreakthroughFragments(data, bang, 1)).toBe(5);
    expect(nextBreakthroughFragments(data, bang, 6)).toBe(10);
    expect(nextBreakthroughFragments(data, bang, 26)).toBe(0);
  });

  it('levelUpHero spends meat and fragments, and explains why it is blocked', () => {
    const t = newGame();
    const g = t.game;
    expect(g.levelUpHero('bang').reason).toBe('missing_resources');
    expect(g.levelUpHero('se').reason).toBe('not_owned');
    give(g, { meat: 200 });
    expect(g.levelUpHero('bang').ok).toBe(true);
    expect(g.resources.meat).toBe(185);
    expect(g.getHeroInfo('bang')!.level).toBe(2);
    for (let i = 0; i < 3; i++) expect(g.levelUpHero('bang').ok).toBe(true); // tới cấp 5
    const blocked = g.levelUpHero('bang');
    expect(blocked.reason).toBe('missing_fragments');
    expect(blocked.n).toBe(5);
    expect(blocked.text).toBe('Thiếu 5 mảnh');
    grantHero(g, 'bang', 5, 7);
    expect(g.levelUpHero('bang').ok).toBe(true);
    expect(g.getHeroInfo('bang')!.fragments).toBe(2);
    grantHero(g, 'bang', 30, 0);
    expect(g.levelUpHero('bang').reason).toBe('max_level');
  });

  it('hero info shows the gain at the next level and the squad CP follows level-ups', () => {
    const t = newGame();
    const g = t.game;
    give(g, { meat: 100 });
    const before = g.getHeroInfo('bang')!;
    expect(before.hpNext).toBe(27);
    expect(before.atkNext).toBe(3);
    expect(before.levelUpMeat).toBe(15);
    g.levelUpHero('bang');
    const after = g.getHeroInfo('bang')!;
    expect(after.hp).toBe(before.hp + before.hpNext);
    expect(after.atk).toBe(before.atk + before.atkNext);
    expect(g.squadCp).toBe(after.cp);
    expect(g.field.heroes[0].maxHp).toBe(after.hp);
  });
});

describe('difficulty label', () => {
  it('≥ 1.2 easy, ≥ 0.9 medium, below hard', () => {
    expect(difficultyLabel(data, 1.2).label).toBe('Dễ');
    expect(difficultyLabel(data, 1.19).label).toBe('Vừa');
    expect(difficultyLabel(data, 0.9).label).toBe('Vừa');
    expect(difficultyLabel(data, 0.89)).toEqual({ label: 'Khó', color: '#C77DFF', hard: true });
  });
});
