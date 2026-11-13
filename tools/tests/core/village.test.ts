// Làng: đặt công trình, chi phí, thợ, thời gian xây, nâng cấp, hủy, dời, trần kho, sản xuất và thu.
import { describe, it, expect } from 'vitest';
import { newGame, give, setPlayerLevel, instantBuilding, teleport, cheat, TestGame } from './helpers';

function inBuildMode(t: TestGame, fn: () => void): void {
  expect(t.game.enterBuildMode().ok).toBe(true);
  fn();
  expect(t.game.exitBuildMode().ok).toBe(true);
}

describe('placement', () => {
  it('starts with a level-1 storage at (21, 21) that occupies 3×3 cells', () => {
    const g = newGame().game;
    const s = g.findBuilding('storage')!;
    expect([s.x, s.y, s.w, s.h, s.level]).toEqual([21, 21, 3, 3, 1]);
    expect(g.buildingAt(23.9, 23.9)!.type).toBe('storage');
    expect(g.buildingAt(24.1, 22)).toBeNull();
    expect(g.storageCap('wood')).toBe(300);
    expect(g.storageCap('meat')).toBe(300);
    expect(g.storageCap('gold')).toBe(Infinity);
  });

  it('checks the grid, overlap, unlock level, count, cost and builders, in that order', () => {
    const t = newGame();
    const g = t.game;
    // chưa mở (Quán cần cấp người chơi 2)
    expect(g.checkPlacement('tavern', 30, 30).reason).toBe('need_player_level');
    expect(g.checkPlacement('tavern', 30, 30).text).toBe('Cần cấp người chơi 2');
    // ra ngoài lưới làng (lưới 20..39; footprint 2×2 tại 39 thì lòi ra ngoài)
    expect(g.checkPlacement('lumber_camp', 39, 30).reason).toBe('out_of_grid');
    expect(g.checkPlacement('lumber_camp', 19, 30).reason).toBe('out_of_grid');
    expect(g.checkPlacement('lumber_camp', 38, 38).reason).toBe('missing_resources'); // vừa khít mép: hợp lệ về hình học
    // chồng lên Nhà Kho
    const over = g.checkPlacement('lumber_camp', 23, 23);
    expect(over.reason).toBe('overlap');
    expect(over.text).toBe('Chồng lên Nhà Kho');
    expect(over.blockerUid).toBe(g.findBuilding('storage')!.uid);
    // đứng sát nhau thì được; còn lại thiếu gỗ
    const miss = g.checkPlacement('lumber_camp', 24, 21);
    expect(miss.reason).toBe('missing_resources');
    expect(miss.text).toBe('Thiếu 30 gỗ');
    give(g, { wood: 30 });
    expect(g.checkPlacement('lumber_camp', 24, 21).ok).toBe(true);
    // ô không nguyên
    expect(g.checkPlacement('lumber_camp', 24.5, 21).reason).toBe('invalid');
  });

  it('placing needs build mode, pays at once, takes a builder and the build time', () => {
    const t = newGame();
    const g = t.game;
    give(g, { wood: 100 });
    expect(g.placeBuilding('lumber_camp', 26, 26).reason).toBe('wrong_mode');
    inBuildMode(t, () => {
      expect(g.placeBuilding('lumber_camp', 26, 26).ok).toBe(true);
    });
    expect(g.resources.wood).toBe(70);
    const b = g.findBuilding('lumber_camp')!;
    expect(b.level).toBe(0); // giàn giáo
    expect(b.job!.kind).toBe('build');
    expect(g.buildersFree).toBe(1);
    expect(g.checkPlacement('lumber_camp', 30, 30).reason).toBe('max_count'); // M1: mỗi loại 1 cái
    t.stepSec(9.5);
    expect(g.findBuilding('lumber_camp')!.level).toBe(0);
    t.stepSec(1);
    expect(g.findBuilding('lumber_camp')!.level).toBe(1);
    expect(g.findBuilding('lumber_camp')!.job).toBeNull();
    expect(g.buildersFree).toBe(2);
  });

  it('only two jobs run at the same time', () => {
    const t = newGame();
    const g = t.game;
    setPlayerLevel(g, 6);
    give(g, { wood: 1000 });
    inBuildMode(t, () => {
      expect(g.placeBuilding('tavern', 26, 26).ok).toBe(true);
      expect(g.placeBuilding('training_yard', 30, 26).ok).toBe(true);
      const third = g.placeBuilding('dungeon_gate', 34, 26);
      expect(third.reason).toBe('no_builder');
      expect(third.text).toBe('Hết thợ');
    });
    expect(g.buildersFree).toBe(0);
    // nâng cấp cũng cần thợ
    const st = g.findBuilding('storage')!;
    const up = g.getBuildingPanel(st.uid)!.canUpgrade;
    expect(up.reason).toBe('no_builder');
    expect(up.text).toBe('Đang có 2 công trình đang xây');
  });

  it('the build-mode button only works inside the village, and the joystick is off in build mode', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 45, 30);
    expect(g.canEnterBuildMode().reason).toBe('not_in_village');
    expect(g.canEnterBuildMode().text).toBe('Về làng để xây dựng');
    teleport(g, 30, 30);
    expect(g.enterBuildMode().ok).toBe(true);
    expect(g.mode).toBe('build');
    g.setJoystick(1, 0);
    const x = g.field.leader!.x;
    t.stepSec(1);
    expect(g.field.leader!.x).toBe(x);
    g.exitBuildMode();
    g.setJoystick(1, 0);
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(x + 3, 1);
  });

  it('moving is free and instant, keeps the timer, and obeys the same geometry rules', () => {
    const t = newGame();
    const g = t.game;
    give(g, { wood: 100 });
    let uid = 0;
    inBuildMode(t, () => {
      g.placeBuilding('lumber_camp', 26, 26);
      uid = g.findBuilding('lumber_camp')!.uid;
      const endsAt = g.findBuilding('lumber_camp')!.job!.endsAt;
      expect(g.moveBuilding(uid, 22, 22).reason).toBe('overlap');
      expect(g.moveBuilding(uid, 39, 39).reason).toBe('out_of_grid');
      expect(g.moveBuilding(uid, 30, 30).ok).toBe(true);
      const b = g.findBuilding('lumber_camp')!;
      expect([b.x, b.y]).toEqual([30, 30]);
      expect(b.job!.endsAt).toBe(endsAt);
      // công trình tự nó không cản việc dời sang ô chồng lên vị trí cũ của chính nó
      expect(g.moveBuilding(uid, 31, 30).ok).toBe(true);
    });
    expect(g.resources.wood).toBe(70);
    expect(g.moveBuilding(uid, 26, 26).reason).toBe('wrong_mode');
  });

  it('findFreeCell returns the nearest valid cell, or null when the village is full', () => {
    const t = newGame();
    const g = t.game;
    expect(g.findFreeCell('lumber_camp', 30, 30)).toEqual({ x: 29, y: 29 });
    const near = g.findFreeCell('lumber_camp', 22.5, 22.5)!; // tâm Nhà Kho: phải né ra
    expect(g.buildingAt(near.x, near.y)).toBeNull();
    give(g, { wood: 30 });
    expect(g.checkPlacement('lumber_camp', near.x, near.y).ok).toBe(true);
    // lấp kín làng bằng các ô giả 3×3 rồi hỏi lại
    const v = cheat(g).village;
    const def = g.data.buildingById.storage;
    for (let y = 20; y < 40; y += 3) for (let x = 20; x < 40; x += 3) if (!g.buildingAt(x, y) && x + 3 <= 40 && y + 3 <= 40) v.add(def, x, y, 1, null, 0);
    expect(g.findFreeCell('tavern', 30, 30)).toBeNull();
  });
});

describe('upgrades', () => {
  it('reasons come in the design order: player level, storage cap, resources, builders; then max level', () => {
    const t = newGame();
    const g = t.game;
    const st = g.findBuilding('storage')!;
    let c = g.getBuildingPanel(st.uid)!.canUpgrade;
    expect([c.reason, c.text]).toEqual(['need_player_level', 'Cần cấp người chơi 2']);
    setPlayerLevel(g, 30);
    c = g.getBuildingPanel(st.uid)!.canUpgrade;
    expect([c.reason, c.text]).toEqual(['missing_resources', 'Thiếu 90 gỗ']);
    // Cổng Xoáy cấp 2 giá 600 gỗ > trần 300 của Nhà Kho cấp 1 -> cần Nhà Kho cấp 3 (trần 800)
    const gate = instantBuilding(t, 'dungeon_gate', 30, 30, 1);
    c = g.getBuildingPanel(gate)!.canUpgrade;
    expect([c.reason, c.n, c.text]).toEqual(['need_storage_level', 3, 'Cần Nhà Kho cấp 3']);
    give(g, { wood: 90 });
    expect(g.upgradeBuilding(st.uid).ok).toBe(true);
    expect(g.upgradeBuilding(st.uid).reason).toBe('busy');
    const top = instantBuilding(t, 'tavern', 34, 30, 5);
    c = g.getBuildingPanel(top)!.canUpgrade;
    expect([c.reason, c.text]).toEqual(['max_level', 'Đã tối đa']);
    expect(g.getBuildingPanel(top)!.upgradeCost).toBeNull();
  });

  it('an upgrading building keeps working at the old level until the timer ends', () => {
    const t = newGame();
    const g = t.game;
    setPlayerLevel(g, 2);
    give(g, { wood: 90 });
    const st = g.findBuilding('storage')!;
    expect(g.upgradeBuilding(st.uid).ok).toBe(true);
    expect(g.resources.wood).toBe(0);
    expect(g.storageCap('wood')).toBe(300);
    t.stepSec(29);
    expect(g.storageCap('wood')).toBe(300);
    t.stepSec(2);
    expect(g.findBuilding('storage')!.level).toBe(2);
    expect(g.storageCap('wood')).toBe(500);
    expect(Array.from({ length: g.eventCount }, (_, i) => g.events[i]).some((e) => e.type === 'toast' && e.text === 'Xây xong: Nhà Kho cấp 2')).toBe(true);
  });

  it('cancelling refunds 100%; cancelling a new build removes the scaffold', () => {
    const t = newGame();
    const g = t.game;
    setPlayerLevel(g, 2);
    give(g, { wood: 120 });
    const st = g.findBuilding('storage')!;
    g.upgradeBuilding(st.uid);
    expect(g.resources.wood).toBe(30);
    expect(g.cancelBuildingJob(st.uid).ok).toBe(true);
    expect(g.resources.wood).toBe(120);
    expect(g.findBuilding('storage')!.job).toBeNull();
    expect(g.findBuilding('storage')!.level).toBe(1);
    inBuildMode(t, () => { g.placeBuilding('lumber_camp', 26, 26); });
    expect(g.resources.wood).toBe(90);
    expect(g.cancelBuildingJob(g.findBuilding('lumber_camp')!.uid).ok).toBe(true);
    expect(g.findBuilding('lumber_camp')).toBeNull();
    expect(g.resources.wood).toBe(120);
    expect(g.buildersFree).toBe(2);
    expect(g.cancelBuildingJob(st.uid).reason).toBe('invalid');
  });

  it('the panel lists current values and the gain at the next level', () => {
    const t = newGame();
    const g = t.game;
    const uid = instantBuilding(t, 'lumber_camp', 30, 30, 4);
    const p = g.getBuildingPanel(uid)!;
    expect(p.level).toBe(4);
    expect(p.maxLevel).toBe(10);
    const row = (k: string) => p.rows.find((r) => r.key === k)!;
    expect([row('perHour').value, row('perHour').delta]).toEqual([180, 60]);
    expect([row('bufferCap').value, row('bufferCap').delta]).toEqual([1440, 480]);
    expect(p.upgradeCost!.cost).toEqual({ wood: 195, ore: 130 });
    expect(p.upgradeCost!.missing).toEqual({ wood: 195, ore: 130 });
    expect(p.upgradeSec).toBe(240);
    const sp = g.getBuildingPanel(g.findBuilding('storage')!.uid)!;
    expect([sp.rows[0].key, sp.rows[0].value, sp.rows[0].delta]).toEqual(['cap', 300, 200]);
  });
});

describe('storage cap', () => {
  it('discards the overflow of capped resources and says so at most once every 30 s', () => {
    const t = newGame();
    const g = t.game;
    give(g, { wood: 299 });
    const tree = g.field.nodes.find((n) => n.kind === 'tree' && n.id === 'n010')!; // cụm cây không có ổ quái sát bên
    teleport(g, tree.x + 0.8, tree.y);
    let toasts = 0;
    for (let i = 0; i < 30 * 20; i++) {
      t.step();
      for (let k = 0; k < g.eventCount; k++) if (g.events[k].type === 'toast' && g.events[k].key === 'storage_full') toasts++;
      g.clearEvents();
    }
    expect(g.resources.wood).toBe(300);
    expect(toasts).toBe(1);
    for (let i = 0; i < 30 * 25; i++) {
      t.step();
      for (let k = 0; k < g.eventCount; k++) if (g.events[k].type === 'toast' && g.events[k].key === 'storage_full') toasts++;
      g.clearEvents();
    }
    expect(toasts).toBe(2);
    expect(g.resources.wood).toBe(300);
  });

  it('gold, coral and tickets have no cap', () => {
    const g = newGame().game;
    for (const r of ['gold', 'coral', 'tickets']) expect(g.storageCap(r)).toBe(Infinity);
  });
});

describe('production', () => {
  it('fills the buffer by the clock, stops at 8 hours of output, and is not lost when storage is full', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27); // trong làng, xa công trình (không tự thu) và xa ổ quái
    const uid = instantBuilding(t, 'lumber_camp', 30, 30, 1); // 60 gỗ / giờ
    t.stepSec(600);
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(10);
    expect(g.findBuilding('lumber_camp')!.bufferCap).toBe(480);
    t.clock.advanceSec(10 * 3600); // ứng dụng bị treo 10 giờ rồi chạy tiếp: tính tối đa 8 giờ
    t.step();
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(480);
    give(g, { wood: 250 });
    expect(g.collectBuilding(uid).ok).toBe(true); // kho còn chỗ cho 50
    expect(g.resources.wood).toBe(300);
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(430);
    const full = g.collectBuilding(uid);
    expect(full.reason).toBe('storage_full');
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(430);
  });

  it('is collected when the leader walks within 1.5 cells of the footprint, with a toast', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    instantBuilding(t, 'market', 30, 30, 1); // 40 vàng / giờ
    t.stepSec(900);
    expect(g.findBuilding('market')!.buffer).toBe(10);
    const gold = g.resources.gold;
    teleport(g, 33.8, 31); // cách mép phải (x = 32) 1.8 ô: chưa thu
    t.step();
    expect(g.resources.gold).toBe(gold);
    g.clearEvents();
    teleport(g, 33.4, 31); // 1.4 ô: thu
    t.step();
    expect(g.resources.gold).toBe(gold + 10);
    expect(g.findBuilding('market')!.buffer).toBe(0);
    const ev = Array.from({ length: g.eventCount }, (_, i) => g.events[i]);
    expect(ev.some((e) => e.type === 'collect' && e.n === 10 && e.key === 'gold')).toBe(true);
    expect(ev.some((e) => e.type === 'toast' && e.text === 'Thu vàng +10')).toBe(true);
  });

  it('a building under construction produces nothing; an upgrading one produces at the old rate', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    setPlayerLevel(g, 3);
    give(g, { wood: 78 });
    inBuildMode(t, () => { g.placeBuilding('lumber_camp', 30, 30); });
    t.stepSec(9);
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(0);
    t.stepSec(1 + 600); // xong ở giây 10, rồi 600 s ở cấp 1 (60/giờ) = 10 gỗ
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(10);
    expect(g.upgradeBuilding(g.findBuilding('lumber_camp')!.uid).ok).toBe(true); // 48 gỗ, 30 s
    t.stepSec(30);  // vẫn 60/giờ trong lúc nâng: +0.5
    t.stepSec(600); // rồi 90/giờ: +15
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(25);
  });
});
