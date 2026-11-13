// Hang Xoáy: điều kiện vào, sinh quái, giới hạn 60, chuỗi hạ gục, qua tầng, boss và báo đòn, thắng, thua, thưởng.
import { describe, it, expect } from 'vitest';
import {
  newGame, run, cheat, give, grantHero, instantBuilding, strongSquad, enterStage, dataWith, loadData, teleport, TestGame, Ev,
} from './helpers';

const data = loadData();

/** Chạy tới khi `until` đúng (tối đa maxSec giây), gom sự kiện. */
function runUntil(t: TestGame, until: () => boolean, maxSec = 300): Ev[] {
  let ev: Ev[] = [];
  for (let i = 0; i < maxSec * 30 && !until(); i++) ev = ev.concat(run(t, 1));
  expect(until(), 'điều kiện không xảy ra trong ' + maxSec + ' s').toBe(true);
  return ev;
}

/** Hero không thể chết (để quan sát boss). */
function immortal(t: TestGame): void {
  for (const h of cheat(t.game).dungeonScene.heroes) { h.maxHp = 1e9; h.hp = 1e9; }
}

describe('entering', () => {
  it('needs the gate, a high enough gate level, and the previous stage cleared', () => {
    const t = newGame();
    const g = t.game;
    expect(g.enterDungeon(1).reason).toBe('not_built');
    const gate = instantBuilding(t, 'dungeon_gate', 30, 34, 1);
    let info = g.getDungeonInfo();
    expect([info.built, info.gateLevel, info.defaultStage]).toEqual([true, 1, 1]);
    expect(info.stages[0].canEnter.ok).toBe(true);
    let c = info.stages[1].canEnter;
    expect([c.reason, c.n, c.text]).toEqual(['need_gate_level', 2, 'Cần Cổng Xoáy cấp 2']);
    cheat(g).village.byUid(gate).level = 6;
    c = g.enterDungeon(3);
    expect([c.reason, c.n, c.text]).toEqual(['need_prev_stage', 2, 'Vượt chặng 2 trước']);
    expect(g.enterDungeon(7).reason).toBe('invalid');
    info = g.getDungeonInfo();
    expect(info.stages.map((s) => s.recommendedCp)).toEqual([4550, 7300, 11700, 18800, 30200, 48550]);
    expect(info.stages.map((s) => s.bossName)).toEqual(['Rương Nhai', 'Cua Càng Thép Chúa', 'Mắt Đá', 'Rắn Biển Rạn', 'Thuyền Trưởng Ma', 'Vua Nhện Rạn']);
    // CP 1340 so với 4550: nhãn "Khó", vẫn cho vào
    expect([info.stages[0].label, info.stages[0].hard, info.stages[0].squadCp]).toEqual(['Khó', true, 1340]);
    expect(g.enterDungeon(1).ok).toBe(true);
    expect(g.mode).toBe('dungeon');
    expect(g.scene.kind).toBe('dungeon');
    expect(g.run!.floor).toBe(1);
    // trong dungeon không xếp đội, không lên cấp, không tuyển
    expect(g.autoAssign().reason).toBe('wrong_mode');
    expect(g.levelUpHero('bang').reason).toBe('wrong_mode');
    expect(g.recruit(1).reason).toBe('wrong_mode');
    expect(g.enterBuildMode().reason).toBe('wrong_mode');
  });

  it('the squad starts at (8, 2) in formation with full health and full cooldowns', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se'); grantHero(g, 'lan');
    g.setSquad(['bang', 'se', 'lan']);
    cheat(g).field.heroes[0].hp = 100; // bị thương ngoài đồng: vào hang vẫn đầy máu
    enterStage(t, 1);
    const hs = g.scene.heroes;
    expect(hs.map((h) => h.heroId)).toEqual(['bang', 'se', 'lan']);
    expect([hs[0].x, hs[0].y]).toEqual([8, 2]);
    expect(hs.every((h) => h.hp === h.maxHp)).toBe(true);
    expect(hs[0].skillCd0).toBe(6);
    expect(hs[0].skillCd1).toBe(-1);
    expect(g.scene.bounds).toEqual([0, 0, 16, 24]);
    expect([g.run!.roomW, g.run!.roomH, g.run!.exitX, g.run!.exitY]).toEqual([16, 24, 8, 21]);
  });
});

describe('spawning', () => {
  it('floor 1 spawns 40 monsters in a ring, inside the room and at least 4 cells from every hero', () => {
    const t = newGame();
    const g = t.game;
    enterStage(t, 1);
    t.step();
    const ms = g.scene.monsters;
    expect(ms.length).toBe(40);
    expect(g.run!.remaining).toBe(40);
    expect(ms.filter((m) => m.monsterId === 'd_chuot').length).toBe(20);
    expect(ms.filter((m) => m.monsterId === 'd_doi').length).toBe(20);
    const hero = g.scene.heroes[0];
    for (const m of ms) {
      expect(m.x).toBeGreaterThanOrEqual(0); expect(m.x).toBeLessThanOrEqual(16);
      expect(m.y).toBeGreaterThanOrEqual(0); expect(m.y).toBeLessThanOrEqual(24);
      expect(Math.hypot(m.x - hero.x, m.y - hero.y)).toBeGreaterThan(3.8); // đã đi được 1 bước
      expect(m.campIndex).toBe(-1);
    }
    // chỉ số = gốc × hệ số tầng (0.379)
    const rat = cheat(g).dungeonScene.monsters.find((m: any) => m.monsterId === 'd_chuot');
    expect([rat.maxHp, rat.atk, rat.expValue]).toEqual([76, 10, 3]);
  });

  it('delayed groups appear at their delaySec', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    const sim = cheat(g).dungeonScene;
    sim.startFloor(3, false); // tầng 3: 27 chuột (front) ngay, 27 dơi (ring) sau 4 s
    t.step();
    expect(g.scene.monsters.filter((m) => m.monsterId === 'd_doi').length).toBe(0);
    expect(g.run!.remaining).toBe(54);
    const front = g.scene.monsters.filter((m) => m.monsterId === 'd_chuot');
    expect(front.length).toBe(27);
    for (const m of front) expect(m.y).toBeGreaterThan(13);
    g.setJoystick(0, 0);
    let appeared = -1;
    for (let i = 0; i < 150 && appeared < 0; i++) { t.step(); if (g.scene.monsters.some((m) => m.monsterId === 'd_doi')) appeared = g.run!.floorTime; }
    expect(appeared).toBeGreaterThan(3.99);
    expect(appeared).toBeLessThan(4.1);
  });

  it('never has more than maxAlive monsters alive; the rest queue and spawn as room frees up', () => {
    const t = newGame({ data: dataWith((raw) => { raw.tuning.dungeon.maxAlive = 12; }) });
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    let peak = 0;
    let spawnedTotal = 0;
    const seen = new Set<number>();
    runUntil(t, () => {
      const alive = g.scene.monsters.filter((m) => m.alive);
      peak = Math.max(peak, alive.length);
      for (const m of g.scene.monsters) if (!seen.has(m.id)) { seen.add(m.id); spawnedTotal++; }
      return g.run!.cleared;
    }, 120);
    expect(peak).toBe(12);
    expect(spawnedTotal).toBe(40);
  });

  it('the real tables never exceed 60 alive on a normal floor of 60', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g, 1, 3, 0);
    enterStage(t, 1);
    const sim = cheat(g).dungeonScene;
    sim.startFloor(4, false); // 20 + 20 (8 s) + 20 (16 s)
    immortal(t);
    for (const h of sim.heroes) h.atk = 0;
    let peak = 0;
    for (let i = 0; i < 30 * 20; i++) { t.step(); peak = Math.max(peak, g.scene.monsters.filter((m) => m.alive).length); }
    expect(peak).toBe(60);
    expect(data.tuning.dungeon.maxAlive).toBe(60);
  });
});

describe('kill streak', () => {
  it('counts kills, pays a bonus at every multiple of 20, and resets after 3 s without a kill', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    const ev = runUntil(t, () => g.run!.streak >= 22, 60);
    const kills = ev.filter((e) => e.type === 'exp').length;
    expect(g.run!.streak).toBe(kills);
    const bonus = ev.filter((e) => e.type === 'streak_bonus');
    expect(bonus.length).toBe(1);
    expect([bonus[0].n, bonus[0].id]).toEqual([10, 20]); // 10 × (20/20) × goldMult 1.0
    expect(g.run!.streakT).toBeGreaterThan(2.5);
    // kéo joystick qua lại: đội không đánh, chuỗi hết giờ
    const before = g.run!.streak;
    run(t, 30 * 2, (i) => g.setJoystick(Math.floor(i / 6) % 2 === 0 ? 0.3 : -0.3, 0));
    if (g.run!.streak === before) expect(g.run!.streakT).toBeLessThan(1.1);
    run(t, 40, (i) => g.setJoystick(Math.floor(i / 6) % 2 === 0 ? 0.3 : -0.3, 0));
    expect(g.run!.streak).toBe(0);
    expect(g.run!.streakT).toBe(0);
  });

  it('the bonus grows with the streak and with the floor gold multiplier, and goes into the run loot', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 2);
    const sim = cheat(g).dungeonScene;
    sim.startFloor(8, false); // goldMult 1.407
    const ev = runUntil(t, () => g.run!.streak >= 40 || g.run!.cleared, 90);
    const bonus = ev.filter((e) => e.type === 'streak_bonus');
    expect(bonus[0].n).toBe(Math.round(10 * 1 * 1.407));
    if (bonus.length > 1) expect(bonus[1].n).toBe(Math.round(10 * 2 * 1.407));
    const picked = ev.filter((e) => e.type === 'pickup' && e.key === 'gold').reduce((s, e) => s + e.n, 0);
    expect(g.run!.loot.gold).toBe(picked + bonus.reduce((s, e) => s + e.n, 0) + (g.run!.cleared ? 43 : 0));
  });

  it('the streak clock pauses between floors', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    runUntil(t, () => g.run!.cleared, 60);
    const streak = g.run!.streak;
    const left = g.run!.streakT;
    expect(streak).toBeGreaterThan(0);
    t.stepSec(5); // đứng yên cạnh cửa ra 5 s
    expect(g.run!.streak).toBe(streak);
    expect(g.run!.streakT).toBe(left);
  });
});

describe('clearing floors', () => {
  it('a cleared floor opens the exit, pays clearGold, pulls in every pickup, and the exit leads to the next floor', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    const ev = runUntil(t, () => g.run!.cleared, 60);
    expect(g.run!.exitOpen).toBe(true);
    const clear = ev.find((e) => e.type === 'floor_clear')!;
    expect([clear.n, clear.id, clear.x, clear.y]).toEqual([25, 1, 8, 21]);
    expect(g.getDungeonInfo().bestFloorCleared).toBe(1);
    expect(g.scene.pickups.every((p) => p.flying)).toBe(true);
    t.stepSec(3);
    expect(g.scene.pickups.length).toBe(0);
    expect(g.run!.floor).toBe(1); // AUTO tắt: đội đứng yên
    const sim = cheat(g).dungeonScene;
    sim.kill(sim.heroes[3]);
    // đi tới cửa
    runUntil(t, () => { const l = g.scene.leader!; g.setJoystick(8 - l.x, 21 - l.y); return g.run!.fadeT > 0; }, 30);
    const l = g.scene.leader!;
    expect(Math.hypot(l.x - 8, l.y - 21)).toBeLessThanOrEqual(1.0);
    g.setJoystick(0, 0);
    for (const h of sim.heroes) if (h.alive) h.hp = h.maxHp * 0.5;
    const next = run(t, 16); // màn mờ 0.5 s
    expect(g.run!.floor).toBe(2);
    expect(next.some((e) => e.type === 'floor_start' && e.n === 2)).toBe(true);
    // hero sống hồi 30% máu tối đa; hero chết vẫn chết; hồi chiêu đầy lại; đội về (8, 2)
    const hs = sim.heroes;
    expect(hs[3].alive).toBe(false);
    for (const h of hs) if (h.alive) expect(h.hp / h.maxHp).toBeCloseTo(0.8, 2);
    expect(hs[0].skillCd0).toBeCloseTo(hs[0].skill0.cooldownSec, 1);
    expect([hs[0].x, hs[0].y]).toEqual([8, 2]);
    expect(g.run!.cleared).toBe(false);
    expect(g.run!.loot.gold).toBeGreaterThanOrEqual(25);
  });

  it('with AUTO on, the squad walks to the exit by itself 1.5 s after the floor is clear', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    g.setAuto(true);
    expect(g.run!.auto).toBe(true);
    runUntil(t, () => g.run!.cleared, 60);
    const l = g.scene.leader!;
    const pos = [l.x, l.y];
    t.stepSec(1.4);
    expect(Math.hypot(g.scene.leader!.x - pos[0], g.scene.leader!.y - pos[1])).toBeLessThan(1.5); // chưa tự đi (chỉ xê dịch do nhặt/đội hình)
    runUntil(t, () => g.run!.floor === 2, 30);
    expect(g.run!.floor).toBe(2);
  });
});

describe('boss', () => {
  function bossFloor(stage: number): { t: TestGame; sim: any; boss: any } {
    const t = newGame();
    strongSquad(t.game);
    enterStage(t, stage);
    const sim = cheat(t.game).dungeonScene;
    sim.startFloor(stage * 5, false);
    t.step();
    immortal(t);
    for (const h of sim.heroes) h.atk = 0; // không ai hạ boss trong lúc quan sát
    const boss = sim.monsters.find((m: any) => m.isBoss);
    return { t, sim, boss };
  }

  it('appears at (8, 19) with its name, ability cooldowns at 50%, and 15 minions now + 15 after 10 s', () => {
    const { t, boss } = bossFloor(1);
    const g = t.game;
    expect(g.run!.isBossFloor).toBe(true);
    expect(g.run!.bossName).toBe('Rương Nhai');
    expect(g.run!.bossId).toBe(boss.id);
    expect(boss.radius).toBe(1.2);
    expect(Math.hypot(boss.x - 8, boss.y - 19)).toBeLessThan(0.2);
    expect(boss.abilityCd[0]).toBeCloseTo(3.5, 1); // Đập Đất hồi 7 s, bắt đầu ở 50%
    expect([boss.maxHp, boss.atk]).toEqual([Math.round(9000 * 0.562), Math.round(70 * 0.562)]);
    expect(g.scene.monsters.length).toBe(16);
    expect(g.run!.remaining).toBe(31);
    t.stepSec(10.2);
    expect(g.scene.monsters.filter((m) => m.alive).length).toBe(31);
  });

  /** Đưa đội lên đứng đánh boss (boss đứng yên, quái thường bị dẹp sang góc), chờ 3 s cho ai vào chỗ nấy. */
  function engage(t: TestGame, sim: any, boss: any): void {
    for (const m of sim.monsters) if (!m.isBoss) { m.atk = 0; m.moveSpeed = 0; m.x = 1; m.y = 1; }
    boss.moveSpeed = 0;
    for (let k = 0; k < boss.abilityCd.length; k++) boss.abilityCd[k] = 99;
    sim.heroes.forEach((h: any, i: number) => { h.x = boss.x - 2 + (i % 4) * 1.2; h.y = boss.y - 4 - Math.floor(i / 4); });
    t.game.setJoystick(0, 0);
    t.stepSec(3);
  }

  it('slam: a red circle of radius 3 for 1.5 s, then ATK × 3 to every hero whose centre is inside', () => {
    const { t, sim, boss } = bossFloor(1);
    const g = t.game;
    const hs = sim.heroes;
    engage(t, sim, boss);
    boss.abilityCd[0] = 0;
    const ev = runUntil(t, () => g.scene.telegraphs.length > 0, 5);
    const tg = g.scene.telegraphs[0];
    expect([tg.shape, tg.ability, tg.radius, tg.duration, tg.sourceId]).toEqual(['circle', 'slam', 3, 1.5, boss.id]);
    expect([tg.x, tg.y]).toEqual([boss.x, boss.y]);
    expect(ev.some((e) => e.type === 'telegraph' && e.key === 'slam' && e.n === 1.5)).toBe(true);
    expect(g.scene.monsters.find((m) => m.id === boss.id)!.castAbility).toBe('slam');
    // boss đứng yên và không đánh thường trong lúc gồng
    const during = run(t, 43);
    expect(during.filter((e) => e.type === 'damage' && e.key === 'hero').length).toBe(0);
    expect(g.scene.telegraphs[0].elapsed).toBeCloseTo(1.47, 1);
    const cx = tg.x;
    const cy = tg.y;
    const inside = hs.filter((h: any) => Math.hypot(h.x - cx, h.y - cy) <= 3);
    const outside = hs.filter((h: any) => Math.hypot(h.x - cx, h.y - cy) > 3.05);
    expect(inside.length).toBeGreaterThanOrEqual(2);  // hero cận chiến đứng sát boss
    expect(outside.length).toBeGreaterThanOrEqual(2); // hero tầm xa đứng ngoài vòng
    const boom = run(t, 2);
    const slam = boom.filter((e) => e.type === 'damage' && e.key === 'hero');
    expect(slam.every((e) => e.n === boss.atk * 3)).toBe(true);
    expect(slam.map((e) => e.id).sort()).toEqual(inside.map((h: any) => h.id).sort());
    expect(g.scene.telegraphs.length).toBe(0);
    expect(boom.some((e) => e.type === 'boss_ability' && e.key === 'slam')).toBe(true);
    expect(boss.abilityCd[0]).toBeGreaterThan(5); // hồi 7 s tính từ lúc bắt đầu gồng
  });

  it('a hero who walks out of the red circle before it fills takes no damage', () => {
    const { t, sim, boss } = bossFloor(1);
    const g = t.game;
    engage(t, sim, boss);
    boss.abilityCd[0] = 0;
    runUntil(t, () => g.scene.telegraphs.length > 0, 5);
    g.setJoystick(0, -1); // kéo đội lùi xuống: 1.4 s × 3 ô/s là đủ ra khỏi vòng 3 ô
    const ev = runUntil(t, () => g.scene.telegraphs.length === 0, 3);
    const leader = g.scene.leader!;
    expect(Math.hypot(leader.x - boss.x, leader.y - boss.y)).toBeGreaterThan(3);
    expect(ev.some((e) => e.type === 'damage' && e.key === 'hero' && e.id === leader.id)).toBe(false);
  });

  it('charge: a 7 × 1.6 rectangle locked on the nearest hero for 1.2 s, ATK × 2 inside, then the boss dashes its length', () => {
    const { t, sim, boss } = bossFloor(2); // Cua Càng Thép Chúa: slam, charge
    const g = t.game;
    const hs = sim.heroes;
    engage(t, sim, boss);
    boss.abilityCd[1] = 0;
    runUntil(t, () => g.scene.telegraphs.length > 0, 5);
    const tg = g.scene.telegraphs[0];
    expect([tg.shape, tg.ability, tg.length, tg.width, tg.duration]).toEqual(['rect', 'charge', 7, 1.6, 1.2]);
    // hướng khóa về phía hero gần boss nhất lúc bắt đầu
    let near = hs[0];
    for (const h of hs) if (Math.hypot(h.x - boss.x, h.y - boss.y) < Math.hypot(near.x - boss.x, near.y - boss.y)) near = h;
    const len = Math.hypot(tg.dirX, tg.dirY);
    expect(len).toBeCloseTo(1, 5);
    const dir = [tg.dirX, tg.dirY];
    const start = [boss.x, boss.y];
    run(t, 34);
    const inRect = (h: any) => {
      const dx = h.x - tg.x;
      const dy = h.y - tg.y;
      const along = dx * dir[0] + dy * dir[1];
      const side = Math.abs(-dx * dir[1] + dy * dir[0]);
      return along >= 0 && along <= 7 && side <= 0.8;
    };
    const inside = hs.filter(inRect);
    expect(inside.length).toBeGreaterThanOrEqual(1);
    expect(inside.length).toBeLessThan(hs.length);
    const ev = runUntil(t, () => g.scene.telegraphs.length === 0, 3);
    const hit = ev.filter((e) => e.type === 'damage' && e.key === 'hero');
    expect(hit.every((e) => e.n === boss.atk * 2)).toBe(true);
    expect(hit.map((e) => e.id).sort()).toEqual(inside.map((h: any) => h.id).sort());
    expect(g.scene.monsters.find((m) => m.id === boss.id)!.dashing).toBe(true);
    t.stepSec(0.5);
    expect(boss.dashing).toBe(false);
    // lao hết 7 ô theo hướng đã khóa (trừ khi đụng tường)
    const moved = Math.hypot(boss.x - start[0], boss.y - start[1]);
    const wall = boss.x <= 1.21 || boss.x >= 14.79 || boss.y <= 1.21 || boss.y >= 22.79;
    if (!wall) expect(moved).toBeCloseTo(7, 0);
    expect((boss.x - start[0]) * dir[0] + (boss.y - start[1]) * dir[1]).toBeCloseTo(moved, 3);
  });

  it('summon: 8 of the first normal monster of the floor around the boss, respecting the 60 cap', () => {
    const { t, sim, boss } = bossFloor(3); // Mắt Đá: slam, summon; nhóm thường đầu tiên: d_nhen
    const g = t.game;
    boss.abilityCd[0] = 99; boss.abilityCd[1] = 0;
    const before = g.scene.monsters.filter((m) => m.alive).length;
    const ids = new Set(g.scene.monsters.map((m) => m.id));
    const ev = run(t, 2);
    expect(ev.some((e) => e.type === 'boss_ability' && e.key === 'summon' && e.n === 8)).toBe(true);
    const fresh = g.scene.monsters.filter((m) => !ids.has(m.id));
    expect(fresh.length).toBe(8);
    expect(fresh.every((m) => m.monsterId === 'd_nhen')).toBe(true);
    for (const m of fresh) expect(Math.hypot(m.x - boss.x, m.y - boss.y)).toBeLessThan(2.6);
    expect(g.scene.monsters.filter((m) => m.alive).length).toBe(before + 8);
    expect(g.scene.telegraphs.length).toBe(0); // không báo trước
    // đầy 60 thì chỉ gọi số còn chỗ
    for (let i = 0; i < 4; i++) { boss.abilityCd[1] = 0; t.step(); }
    t.stepSec(10.5); // nhóm trễ 10 s cũng đã ra
    boss.abilityCd[1] = 0;
    run(t, 2);
    expect(g.scene.monsters.filter((m) => m.alive).length).toBeLessThanOrEqual(60);
    boss.abilityCd[1] = 0; run(t, 2); boss.abilityCd[1] = 0; run(t, 2);
    expect(g.scene.monsters.filter((m) => m.alive).length).toBe(60);
  });

  it('is not pushed by other units and not knocked back by hits', () => {
    const { t, sim, boss } = bossFloor(1);
    boss.abilityCd[0] = 99; boss.moveSpeed = 0;
    for (const h of sim.heroes) { h.atk = 50; }
    const pos = [boss.x, boss.y];
    t.game.setJoystick(0, 1);
    t.stepSec(5);
    t.game.setJoystick(0, 0);
    t.stepSec(8);
    expect([boss.x, boss.y]).toEqual(pos);
    expect(boss.hp).toBeLessThan(boss.maxHp);
  });
});

describe('results', () => {
  function clearStage(t: TestGame, stage: number): Ev[] {
    const g = t.game;
    enterStage(t, stage);
    g.setAuto(true);
    return runUntil(t, () => g.mode === 'result', 400);
  }

  it('killing the boss wins the stage: first-clear reward plus everything picked up, then back beside the gate', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    const before = { ...g.resources };
    const ev = clearStage(t, 1);
    const r = g.result!;
    expect([r.outcome, r.stage, r.floorReached, r.firstClear]).toEqual(['victory', 1, 5, true]);
    expect(r.stageReward).toEqual({ gold: 300, coral: 2, tickets: 3 });
    expect(r.loot.gold).toBeGreaterThanOrEqual(25 + 27 + 29 + 31); // ít nhất là vàng qua 4 tầng
    expect(r.total.gold).toBe(r.loot.gold + 300);
    expect(r.kills).toBe(ev.filter((e) => e.type === 'exp').length);
    expect(r.kills).toBeGreaterThanOrEqual(40 + 48 + 54 + 60 + 1);
    expect(g.resources.gold).toBe(before.gold + r.total.gold);
    expect(g.resources.coral).toBe(before.coral + 2);
    expect(g.resources.tickets).toBe(before.tickets + 3);
    expect(g.resources.meat).toBe(Math.min(300, before.meat + (r.loot.meat || 0))); // thịt theo trần kho
    const info = g.getDungeonInfo();
    expect([info.bestStageCleared, info.bestFloorCleared, info.defaultStage]).toEqual([1, 5, 2]);
    expect(ev.some((e) => e.type === 'result' && e.key === 'victory' && e.data === r)).toBe(true);
    expect(ev.some((e) => e.type === 'save_point')).toBe(true);
    expect(g.run).toBeNull();
    expect(g.scene.kind).toBe('field');
    expect(g.closeResult().ok).toBe(true);
    expect(g.mode).toBe('world');
    expect(g.result).toBeNull();
    const gate = g.findBuilding('dungeon_gate')!;
    const l = g.field.leader!;
    expect(Math.hypot(l.x - (gate.x + 1.5), l.y - (gate.y - 1))).toBeLessThan(0.01);
    expect(g.field.heroes.every((h) => h.alive && h.hp === h.maxHp)).toBe(true);
    expect(g.leaderZone).toBe('village');
  });

  it('repeat clears pay 25% gold and a ticket, with coral guaranteed on every third repeat', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    clearStage(t, 1); g.closeResult();
    const corals: number[] = [];
    for (let i = 1; i <= 6; i++) {
      expect(g.getDungeonInfo().stages[0].nextRepeatGuaranteesCoral).toBe(i % 3 === 0);
      clearStage(t, 1);
      const r = g.result!;
      expect(r.firstClear).toBe(false);
      expect(r.stageReward.gold).toBe(75);
      expect(r.stageReward.tickets).toBe(1);
      corals.push(r.stageReward.coral || 0);
      g.closeResult();
    }
    expect(corals[2]).toBe(1);
    expect(corals[5]).toBe(1);
    expect(corals.every((c) => c === 0 || c === 1)).toBe(true);
    expect(g.getDungeonInfo().stages[0].repeatClears).toBe(6);
  });

  it('a wiped squad loses the run but keeps what it picked up; no stage reward', () => {
    const t = newGame();
    const g = t.game; // Bàng một mình, CP 1340
    enterStage(t, 1);
    cheat(g).dungeonScene.loot.gold = 17; // đã nhặt 17 vàng trước khi gục
    cheat(g).dungeonScene.loot.meat = 2;
    const gold = g.resources.gold;
    const ev = runUntil(t, () => g.mode === 'result', 300);
    const r = g.result!;
    expect(r.outcome).toBe('defeat');
    expect(r.stageReward).toEqual({});
    expect(r.loot.gold).toBeGreaterThanOrEqual(17);
    expect(g.resources.gold).toBe(gold + r.loot.gold);
    expect(g.resources.meat).toBe(r.loot.meat);
    expect(g.getDungeonInfo().bestStageCleared).toBe(0);
    expect(ev.filter((e) => e.type === 'revive').length).toBe(0); // trong hang hero không hồi sinh
    g.closeResult();
    expect(g.field.heroes[0].hp).toBe(g.field.heroes[0].maxHp);
  });

  it('leaving from the pause menu ends the run like a defeat', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    runUntil(t, () => (g.run!.loot.gold || 0) > 0, 60);
    const loot = g.run!.loot.gold;
    const gold = g.resources.gold;
    expect(g.leaveDungeon().ok).toBe(true);
    expect(g.mode).toBe('result');
    expect(g.result!.outcome).toBe('left');
    expect(g.resources.gold).toBe(gold + loot);
    expect(g.leaveDungeon().reason).toBe('wrong_mode');
  });

  it('the field is frozen while in the dungeon, but production keeps running on the clock', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    instantBuilding(t, 'lumber_camp', 26, 26, 1);
    teleport(g, 42, 30.5);
    t.stepSec(2); // đội đang đánh ổ cua
    const snapshot = () => g.field.monsters.map((m) => m.id + ':' + m.x.toFixed(4) + ':' + m.y.toFixed(4) + ':' + m.hp).join('|');
    enterStage(t, 1);
    const frozen = snapshot();
    const nodes = g.field.nodes.map((n) => n.respawnT).join();
    t.stepSec(60);
    expect(snapshot()).toBe(frozen);
    expect(g.field.nodes.map((n) => n.respawnT).join()).toBe(nodes);
    expect(g.findBuilding('lumber_camp')!.buffer).toBe(1); // 60 gỗ/giờ × 62 s
  });
});
