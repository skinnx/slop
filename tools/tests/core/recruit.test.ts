// Quán Mỏ Neo: lượt đầu, giá, mảnh trùng, Vé, BONUS, làm mới, tỉ lệ độ hiếm, mọi hero đều lấy được.
import { describe, it, expect } from 'vitest';
import { newGame, give, instantBuilding, grantHero, loadData, cheat, TestGame } from './helpers';
import { generateCards } from '../../../game/assets/scripts/core/tavern';
import { Rng } from '../../../game/assets/scripts/core/rng';

const data = loadData();

function withTavern(level = 1, seed = 1): TestGame {
  const t = newGame({ seed });
  instantBuilding(t, 'tavern', 30, 34, level);
  return t;
}

describe('recruit', () => {
  it('needs a finished tavern and 100 gold per draw', () => {
    const t = newGame();
    const g = t.game;
    expect(g.recruit(1).reason).toBe('not_built');
    instantBuilding(t, 'tavern', 30, 34, 1);
    expect(g.recruit(1).ok).toBe(true);
    expect(g.resources.gold).toBe(0);
    const c = g.recruit(1);
    expect([c.reason, c.n, c.key, c.text]).toEqual(['missing_resources', 100, 'gold', 'Thiếu 100 vàng']);
    give(g, { gold: 250 });
    expect(g.recruit(3).reason).toBe('missing_resources');
    expect(g.recruit(2).ok).toBe(true);
    expect(g.resources.gold).toBe(50);
    expect(g.recruit(4).reason).toBe('invalid');
  });

  it('the first set is [Lan, Sẻ, Đăng] and the first draw of a save is always Sẻ, who joins the squad', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const t = withTavern(1, seed);
      const g = t.game;
      expect(g.getTavernInfo().cards.map((c) => c.heroId)).toEqual(['lan', 'se', 'dang']);
      expect(g.getTavernInfo().cards.every((c) => !c.owned)).toBe(true);
      expect(g.recruit(1).ok).toBe(true);
      const d = g.lastRecruit!.draws[0];
      expect([d.heroId, d.isNew, d.joinedSquad, d.fragmentsGained]).toEqual(['se', true, true, 0]);
      expect(g.squad).toEqual(['bang', 'se']);
      expect(g.resources.tickets).toBe(1);
      // bộ thẻ không đổi sau khi tuyển
      expect(g.getTavernInfo().cards.map((c) => c.heroId)).toEqual(['lan', 'se', 'dang']);
    }
  });

  it('a duplicate gives 5 fragments, every draw gives one ticket, and the result is reported per draw', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 2000 });
    g.recruit(1);
    let draws = 1;
    let fragments = 0;
    const owned = new Set(['bang', 'se']);
    for (let i = 0; i < 6; i++) {
      expect(g.recruit(3).ok).toBe(true);
      const r = g.lastRecruit!;
      expect(r.draws.length).toBe(3);
      expect(r.goldSpent).toBe(300);
      expect(r.ticketsGained).toBe(3);
      for (const d of r.draws) {
        draws++;
        expect(d.cards[d.pickIndex]).toBe(d.heroId);
        expect(d.isNew).toBe(!owned.has(d.heroId));
        if (d.isNew) { owned.add(d.heroId); expect(d.fragmentsGained).toBe(0); }
        else { fragments += 5; expect(d.fragmentsAfter - d.fragmentsBefore).toBe(5); }
      }
    }
    expect(g.resources.tickets).toBe(draws);
    expect(g.getTavernInfo().totalDraws).toBe(draws);
    expect(g.resources.gold).toBe(100 + 2000 - draws * 100);
    const total = g.getHeroList().filter((h) => h.owned).reduce((s, h) => s + h.fragments, 0);
    expect(total).toBe(fragments);
    // sự kiện 'recruit' mang cùng kết quả
    const ev = Array.from({ length: g.eventCount }, (_, i) => g.events[i]).filter((e) => e.type === 'recruit');
    expect(ev.length).toBe(7);
    expect(ev[6].data).toBe(g.lastRecruit);
  });

  it('each draw picks one of the three cards uniformly', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 100 * 3000 });
    g.recruit(1);
    cheat(g).tavern.bonus = -1e9; // tắt BONUS để bộ thẻ đứng yên trong phép thử này
    const counts = [0, 0, 0];
    for (let i = 0; i < 1000; i++) {
      g.recruit(3);
      for (const d of g.lastRecruit!.draws) counts[d.pickIndex]++;
    }
    for (const c of counts) expect(c / 3000).toBeGreaterThan(0.30);
    for (const c of counts) expect(c / 3000).toBeLessThan(0.37);
  });

  it('the BONUS bar fills every 10 draws, then the set refreshes at once with no Common hero', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 5000 });
    t.step(); // đồng hồ đổi thẻ bắt đầu chạy
    for (let i = 0; i < 9; i++) g.recruit(1);
    expect(g.getTavernInfo().bonus).toBe(9);
    t.stepSec(600); // đồng hồ đổi thẻ đã chạy 10 phút
    expect(Math.round(g.getTavernInfo().refreshInSec)).toBe(1200);
    g.clearEvents();
    expect(g.recruit(1).ok).toBe(true);
    const d = g.lastRecruit!.draws[0];
    expect(d.bonusTriggered).toBe(true);
    const info = g.getTavernInfo();
    expect(info.bonus).toBe(0);
    expect(info.cards.length).toBe(3);
    for (const c of info.cards) expect(c.rarity).not.toBe('N');
    expect(new Set(info.cards.map((c) => c.heroId)).size).toBe(3);
    expect(Math.round(info.refreshInSec)).toBe(1800); // đồng hồ đặt lại 30 phút
    const ev = Array.from({ length: g.eventCount }, (_, i) => g.events[i]);
    expect(ev.some((e) => e.type === 'cards_refreshed' && e.n === 1)).toBe(true);
  });

  it('a 3x pull that fills the bar mid-way still draws every pull from the set shown when the button was pressed', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 5000 });
    for (let i = 0; i < 8; i++) g.recruit(1);
    const shown = g.getTavernInfo().cards.map((c) => c.heroId);
    g.clearEvents();
    g.recruit(3); // lượt 9, 10 (đầy thanh), 11
    const res = g.lastRecruit!;
    const r = res.draws;
    expect(r.map((d) => d.bonusTriggered)).toEqual([false, true, false]);
    // cả ba lượt rút từ bộ thẻ đang hiện lúc bấm
    for (const d of r) { expect(d.cards).toEqual(shown); expect(shown[d.pickIndex]).toBe(d.heroId); }
    expect(res.cards).toEqual(shown);
    // bộ thẻ BONUS có hiệu lực sau khi cả lần bấm kết thúc
    expect(res.bonusRefreshed).toBe(true);
    const after = g.getTavernInfo();
    expect(res.cardsAfter).toEqual(after.cards.map((c) => c.heroId));
    expect(res.cardsAfter).not.toEqual(shown);
    for (const c of after.cards) expect(c.rarity).not.toBe('N');
    expect(after.bonus).toBe(1); // lượt thứ 11 tính cho thanh kế tiếp
    expect(Math.round(after.refreshInSec)).toBe(1800);
    const ev = Array.from({ length: g.eventCount }, (_, i) => g.events[i]);
    expect(ev.filter((e) => e.type === 'cards_refreshed' && e.n === 1).length).toBe(1);
    // lần bấm không làm đầy thanh thì bộ thẻ giữ nguyên
    g.recruit(2);
    expect(g.lastRecruit!.bonusRefreshed).toBe(false);
    expect(g.lastRecruit!.cardsAfter).toEqual(g.lastRecruit!.cards);
    expect(g.getTavernInfo().bonus).toBe(3);
  });

  it('each 1x / 2x / 3x option carries its own cost, affordability and blocking reason', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 150 }); // 250 vàng
    const o = g.getTavernInfo().recruitOptions;
    expect(o.map((x) => [x.times, x.costGold, x.affordable, x.check.ok])).toEqual([[1, 100, true, true], [2, 200, true, true], [3, 300, false, false]]);
    expect(o[2].check.text).toBe('Thiếu 50 vàng');
    const none = newGame().game.getTavernInfo().recruitOptions; // chưa có Quán: đủ vàng cho 1x nhưng vẫn bị khóa
    expect([none[0].affordable, none[0].check.reason]).toEqual([true, 'not_built']);
  });

  it('the set refreshes by itself every 30 minutes and for 50 gold on demand, but never before the first draw', () => {
    const t = withTavern();
    const g = t.game;
    give(g, { gold: 1000 });
    // trước lượt đầu: không tự đổi, không đổi bằng vàng
    cheat(g).tavern.nextRefreshAt = t.clock.nowMs() + 1000;
    t.stepSec(5);
    expect(g.getTavernInfo().cards.map((c) => c.heroId)).toEqual(['lan', 'se', 'dang']);
    expect(g.refreshCards().reason).toBe('first_draw_pending');
    g.recruit(1);
    const gold = g.resources.gold;
    expect(g.refreshCards().ok).toBe(true);
    expect(g.resources.gold).toBe(gold - 50);
    const a = g.getTavernInfo();
    expect(Math.round(a.refreshInSec)).toBe(1800);
    expect(new Set(a.cards.map((c) => c.heroId)).size).toBe(3);
    const seen = new Set<string>();
    let changes = 0;
    let prev = a.cards.map((c) => c.heroId).join();
    for (let i = 0; i < 6; i++) {
      t.clock.advanceSec(1800);
      t.step();
      const now = g.getTavernInfo().cards.map((c) => c.heroId).join();
      if (now !== prev) changes++;
      prev = now;
      g.getTavernInfo().cards.forEach((c) => seen.add(c.heroId));
    }
    expect(changes).toBeGreaterThanOrEqual(4);
    expect(seen.size).toBeGreaterThan(3);
    expect(g.resources.gold).toBe(gold - 50);
  });

  it('refresh costs are checked', () => {
    const t = withTavern();
    const g = t.game;
    g.recruit(1); // hết vàng
    const c = g.refreshCards();
    expect([c.reason, c.n]).toEqual(['missing_resources', 50]);
  });
});

describe('card generation', () => {
  function sample(tier: number, owned: { [id: string]: boolean }, n: number) {
    const rng = new Rng(12345 + tier);
    const byRarity: { [r: string]: number } = { N: 0, R: 0, E: 0, L: 0 };
    const byHero: { [id: string]: number } = {};
    for (let i = 0; i < n; i++) {
      const cards = generateCards(data, rng, data.recruit.odds[tier - 1], owned);
      expect(cards.length).toBe(3);
      expect(new Set(cards).size).toBe(3);
      // chỉ thẻ đầu tiên phản ánh đúng bảng tỉ lệ (thẻ sau bị ràng buộc "không trùng")
      byRarity[data.heroById[cards[0]].rarity]++;
      byHero[cards[0]] = (byHero[cards[0]] || 0) + 1;
    }
    return { byRarity, byHero };
  }

  it('rarity of a card follows the odds table of the tavern level', () => {
    const n = 20000;
    for (const tier of [1, 3, 5]) {
      const { byRarity } = sample(tier, {}, n);
      const odds = data.recruit.odds[tier - 1];
      for (const r of ['N', 'R', 'E', 'L'] as const) {
        expect(Math.abs(byRarity[r] / n - odds[r]), `tier ${tier} ${r}`).toBeLessThan(0.012);
      }
    }
  });

  it('a hero the player does not own is twice as likely as an owned one of the same rarity', () => {
    const { byHero } = sample(1, { bang: true }, 30000); // Thường: bang (đã có), se, lan (chưa có)
    const ratio = (byHero.se + byHero.lan) / 2 / byHero.bang;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it('the bonus set never contains a Common hero', () => {
    const rng = new Rng(99);
    const count: { [r: string]: number } = { N: 0, R: 0, E: 0, L: 0 };
    for (let i = 0; i < 3000; i++) for (const id of generateCards(data, rng, data.recruit.bonusOdds, {})) count[data.heroById[id].rarity]++;
    expect(count.N).toBe(0);
    expect(count.L).toBeGreaterThan(0);
  });

  it('the tavern panel shows the odds of its level', () => {
    const t = withTavern(4);
    expect(t.game.getTavernInfo().odds).toEqual({ N: 0.42, R: 0.36, E: 0.17, L: 0.05 });
    const p = t.game.getBuildingPanel(t.game.findBuilding('tavern')!.uid)!;
    const l = p.rows.find((r) => r.key === 'oddsL')!;
    expect(l.value).toBe(0.05);
    expect(l.delta).toBeCloseTo(0.02);
    expect(l.percent).toBe(true);
  });
});

describe('every hero is obtainable', () => {
  it('all 12 heroes appear in the card pool at every tavern level', () => {
    for (let tier = 1; tier <= 5; tier++) {
      const rng = new Rng(7 * tier);
      const seen = new Set<string>();
      for (let i = 0; i < 4000 && seen.size < 12; i++) generateCards(data, rng, data.recruit.odds[tier - 1], {}).forEach((id) => seen.add(id));
      expect(seen.size, `tier ${tier}`).toBe(12);
    }
  });

  it('a level-1 tavern with normal play (draws, auto refresh, tickets) ends with all 12 heroes', () => {
    for (const seed of [11, 12, 13]) {
      const t = withTavern(1, seed);
      const g = t.game;
      let draws = 0;
      while (g.getHeroList().filter((h) => h.owned).length < 12 && draws < 1500) {
        give(g, { gold: 300 });
        expect(g.recruit(3).ok).toBe(true);
        draws += 3;
        // Vé: mở hero hiếm nhất còn thiếu khi đủ vé
        const info = g.getTavernInfo();
        for (const id of ['unlockL', 'unlockE', 'unlockR', 'unlockN']) {
          const ex = info.exchanges.find((e) => e.id === id)!;
          if (ex.check.ok) { expect(g.exchangeTickets(id, ex.eligibleHeroIds[0]).ok).toBe(true); break; }
        }
        if (draws % 30 === 0) { t.clock.advanceSec(1800); t.step(); }
      }
      expect(g.getHeroList().filter((h) => h.owned).length, `seed ${seed}`).toBe(12);
      expect(draws).toBeLessThan(1500);
    }
  });

  it('tickets unlock a chosen missing hero of each rarity, or 5 fragments of an owned one', () => {
    const t = withTavern();
    const g = t.game;
    const info = g.getTavernInfo();
    const price = (id: string) => info.exchanges.find((e) => e.id === id)!.tickets;
    expect([price('frag5'), price('unlockN'), price('unlockR'), price('unlockE'), price('unlockL')]).toEqual([8, 15, 30, 80, 150]);
    expect(info.exchanges.find((e) => e.id === 'unlockL')!.check.reason).toBe('missing_resources');
    give(g, { tickets: 8 + 15 + 30 + 80 + 150 });
    expect(g.exchangeTickets('unlockL', 'trieu').ok).toBe(true);
    expect(g.getHeroInfo('trieu')!.owned).toBe(true);
    expect(g.squad).toEqual(['bang', 'trieu']); // hero mới tự vào ô đội trống
    expect(g.exchangeTickets('unlockL', 'trieu').reason).toBe('already_owned');
    expect(g.exchangeTickets('unlockL', 'se').reason).toBe('invalid'); // sai độ hiếm
    expect(g.exchangeTickets('unlockE', 'san').ok).toBe(true);
    expect(g.exchangeTickets('unlockR', 'muc').ok).toBe(true);
    expect(g.exchangeTickets('unlockN', 'lan').ok).toBe(true);
    expect(g.squad.length).toBe(3); // đội đã đủ 3 ô: hero sau không tự vào
    expect(g.exchangeTickets('frag5', 'lan').ok).toBe(true);
    expect(g.getHeroInfo('lan')!.fragments).toBe(5);
    expect(g.exchangeTickets('frag5', 'dieu').reason).toBe('not_owned');
    expect(g.resources.tickets).toBe(0);
    expect(g.exchangeTickets('frag5', 'lan').reason).toBe('missing_resources');
    // khi đã có đủ hero Huyền Thoại thì dòng đó không còn hero hợp lệ
    grantHero(g, 'dieu'); grantHero(g, 'kinh_vuong');
    expect(g.getTavernInfo().exchanges.find((e) => e.id === 'unlockL')!.eligibleHeroIds).toEqual([]);
  });
});
