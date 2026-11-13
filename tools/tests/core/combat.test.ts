// Ngoài đồng: di chuyển, đánh khi đứng yên, sát thương, thu thập, ổ quái, vật rơi, chết và hồi sinh, về làng.
import { describe, it, expect } from 'vitest';
import {
  newGame, teleport, run, cheat, give, grantHero, dataWith, campMonsters, makeDummies, loadData, quietSpot, TestGame,
} from './helpers';

const data = loadData();
const CRAB = 'c_z1_00';   // 4 Cua Cát tại (42.5, 30), Bãi Vỏ Sò
const QUIET = [27, 27];   // trong làng, không có gì xung quanh

function atCamp(t: TestGame, campId: string, dx = 2.5): { cx: number; cy: number } {
  const camp = t.game.field.camps.find((c) => c.id === campId)!;
  teleport(t.game, camp.x + dx, camp.y);
  return { cx: camp.x, cy: camp.y };
}

describe('movement', () => {
  it('the leader moves at 3 cells/s scaled by joystick deflection, with a 10% dead zone', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, QUIET[0], QUIET[1]);
    const x0 = g.field.leader!.x;
    g.setJoystick(1, 0);
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(x0 + 3.0, 1);
    g.setJoystick(0.5, 0);
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(x0 + 4.5, 1);
    g.setJoystick(0.05, 0);
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(x0 + 4.5, 1);
    g.setJoystick(30, 40); // vector dài hơn 1 được chuẩn hóa
    t.stepSec(1);
    expect(g.field.leader!.x).toBeCloseTo(x0 + 4.5 + 1.8, 1);
    expect(g.field.leader!.faceX).toBeCloseTo(0.6, 2);
  });

  it('followers keep the formation offsets around the leader (not rotated)', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se'); grantHero(g, 'lan');
    g.setSquad(['bang', 'se', 'lan']);
    teleport(g, QUIET[0], QUIET[1]);
    g.setJoystick(0, 1);
    t.stepSec(1.5);
    g.setJoystick(0, 0);
    t.stepSec(1.5);
    const [a, b, c] = g.field.heroes;
    const offs = data.tuning.squad.formationOffsets;
    expect(Math.hypot(b.x - (a.x + offs[1][0]), b.y - (a.y + offs[1][1]))).toBeLessThan(0.2);
    expect(Math.hypot(c.x - (a.x + offs[2][0]), c.y - (a.y + offs[2][1]))).toBeLessThan(0.2);
    expect(a.isLeader).toBe(true);
    expect(b.isLeader).toBe(false);
  });

  it('nobody walks into the water at the map edge', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 3, 30);
    g.setJoystick(-1, 0);
    t.stepSec(3);
    for (const h of g.field.heroes) expect(h.x).toBeGreaterThanOrEqual(1 + h.radius - 1e-9);
    expect(g.field.bounds).toEqual([1, 1, 59, 59]);
  });

  it('zones follow d = max(|x − 30|, |y − 30|)', () => {
    const g = newGame().game;
    expect(g.zoneAt(30, 30)).toBe('village');
    expect(g.zoneAt(40, 25)).toBe('village');
    expect(g.zoneAt(40.1, 25)).toBe('z1');
    expect(g.zoneAt(30, 47)).toBe('z1');
    expect(g.zoneAt(30, 47.1)).toBe('z2');
    expect(g.zoneAt(6, 30)).toBe('z2');
    expect(g.zoneAt(5.9, 30)).toBe('z3');
    expect(g.zoneAt(58, 58)).toBe('z3');
    expect(g.cellAt(21.9, 21.1)).toEqual({ cx: 21, cy: 21 });
    expect(g.inVillageGrid(20, 39)).toBe(true);
    expect(g.inVillageGrid(40, 39)).toBe(false);
  });
});

describe('attack only when standing still', () => {
  it('heroes deal no damage while the joystick is held; they attack once it is released', () => {
    const t = newGame();
    const g = t.game;
    atCamp(t, CRAB, 1.5);
    const dummies = makeDummies(g, CRAB);
    // lắc joystick trái/phải để luôn "đang đi" mà vẫn ở cạnh ổ quái
    const moving = run(t, 30 * 8, (i) => g.setJoystick(Math.floor(i / 10) % 2 === 0 ? 0.6 : -0.6, 0));
    expect(moving.filter((e) => e.type === 'damage' && e.key === 'monster').length).toBe(0);
    expect(dummies.every((m) => m.hp === m.maxHp)).toBe(true);
    expect(dummies.some((m) => m.state === 'chase')).toBe(true); // quái vẫn gây hấn và đuổi
    g.setJoystick(0, 0);
    const still = run(t, 30 * 5);
    expect(still.filter((e) => e.type === 'damage' && e.key === 'monster').length).toBeGreaterThanOrEqual(3);
  });

  it('waits 0.15 s after release, and pulling the joystick cancels a windup', () => {
    const t = newGame();
    const g = t.game;
    atCamp(t, CRAB, 1.2);
    makeDummies(g, CRAB);
    g.setJoystick(0.5, 0);
    t.step(3);
    g.setJoystick(0, 0);
    const hero = g.field.heroes[0];
    // tìm bước đầu tiên hero bắt đầu gồng
    let started = -1;
    for (let i = 0; i < 90 && started < 0; i++) { t.step(); if (hero.windupT > 0) started = i; }
    expect(started).toBeGreaterThanOrEqual(4); // 0.15 s = 4.5 bước sau khi thả
    g.clearEvents();
    g.setJoystick(1, 0);
    const ev = run(t, 12);
    expect(hero.windupT).toBe(0);
    expect(ev.filter((e) => e.type === 'damage' && e.key === 'monster').length).toBe(0);
  });

  it('with attackOnlyWhenIdle = false heroes also hit targets in range while moving', () => {
    const t = newGame({ data: dataWith((raw) => { raw.tuning.squad.attackOnlyWhenIdle = false; }) });
    const g = t.game;
    atCamp(t, CRAB, 1.5);
    makeDummies(g, CRAB);
    const ev = run(t, 30 * 8, (i) => g.setJoystick(Math.floor(i / 10) % 2 === 0 ? 0.6 : -0.6, 0));
    expect(ev.filter((e) => e.type === 'damage' && e.key === 'monster').length).toBeGreaterThanOrEqual(3);
  });
});

describe('damage and timing', () => {
  it('a basic hit deals round(ATK); field monsters have base × zone multiplier', () => {
    const t = newGame();
    const g = t.game;
    const crabs = campMonsters(g, CRAB);
    expect(crabs.length).toBe(4);
    expect(crabs[0].maxHp).toBe(156);  // 260 × 0.6
    expect(crabs[0].atk).toBe(18);     // 30 × 0.6
    const z2 = campMonsters(g, g.field.camps.find((c) => c.monsterId === 'sua_nhay')!.id);
    expect([z2[0].maxHp, z2[0].atk, z2[0].expValue]).toEqual([660, 76, 8]); // EXP 5 × 1.5 = 7.5 -> 8
    const elite = campMonsters(g, g.field.camps.find((c) => c.monsterId === 'cua_thep')!.id);
    expect([elite[0].maxHp, elite[0].atk, elite[0].kind]).toEqual([13000, 450, 'elite']);
    atCamp(t, CRAB, 1.5);
    const ev = run(t, 30 * 6);
    const hits = ev.filter((e) => e.type === 'damage' && e.key === 'monster');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.n === 110)).toBe(true);
    const taken = ev.filter((e) => e.type === 'damage' && e.key === 'hero');
    expect(taken.length).toBeGreaterThan(0);
    expect(taken.every((e) => e.n === 18)).toBe(true);
  });

  it('attacks come every attackInterval, each after a 0.2 s windup', () => {
    const t = newGame();
    const g = t.game;
    const tree = g.field.nodes.find((n) => n.id === 'n010')!;
    teleport(g, tree.x + 0.9, tree.y);
    const ev = run(t, 30 * 6).filter((e) => e.type === 'gather' && e.id === tree.index);
    expect(ev.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < ev.length; i++) expect(ev[i].step - ev[i - 1].step).toBe(33); // 1.1 s
    // game mới chưa ai chạm joystick: nhát đầu chỉ chờ 0.2 s gồng (6 bước)
    expect(ev[0].step).toBeGreaterThanOrEqual(5);
    expect(ev[0].step).toBeLessThanOrEqual(7);
  });

  it('a hit flashes and pushes the target back 0.15 cells', () => {
    const t = newGame();
    const g = t.game;
    atCamp(t, CRAB, 1.5);
    const dummies = makeDummies(g, CRAB);
    for (const m of dummies) m.moveSpeed = 0; // đứng yên để đo độ lùi
    teleport(g, dummies[0].x + 1.0, dummies[0].y);
    const before = dummies.map((m) => ({ x: m.x, y: m.y }));
    const ev = run(t, 30 * 2);
    const hit = ev.find((e) => e.type === 'damage' && e.key === 'monster')!;
    const i = dummies.findIndex((m) => m.id === hit.id);
    const moved = Math.hypot(dummies[i].x - before[i].x, dummies[i].y - before[i].y);
    expect(moved).toBeGreaterThan(0.1);
    expect(moved).toBeLessThan(0.5);
    expect(dummies.every((m) => m.hitFlashT >= 0)).toBe(true);
  });

  it('killing monsters gives EXP and player levels; extra EXP carries over', () => {
    const t = newGame();
    const g = t.game;
    atCamp(t, CRAB, 1.5);
    let ev = run(t, 1);
    while (ev.filter((e) => e.type === 'exp').length < 4) ev = ev.concat(run(t, 1));
    const exp = ev.filter((e) => e.type === 'exp');
    expect(exp.every((e) => e.n === 4)).toBe(true); // Cua Cát: 4 EXP × 1.0 ở Bãi Vỏ Sò
    // 16 EXP: cấp 1 -> 2 cần 10, dư 6
    expect(exp.length).toBe(4);
    expect(g.player.level).toBe(2);
    expect(g.player.exp).toBe(6);
    expect(g.player.expToNext).toBe(49);
    expect(ev.filter((e) => e.type === 'player_level').map((e) => e.n)).toEqual([2]);
    expect(ev.some((e) => e.type === 'toast' && e.text === 'Lên cấp!')).toBe(true);
    const c = cheat(g);
    c.player.exp = 6;
    c.addExp(43 + 125 + 9);
    expect([g.player.level, g.player.exp]).toEqual([4, 9]);
    c.addExp(10_000_000);
    expect([g.player.level, g.player.exp, g.player.expToNext]).toEqual([30, 0, 0]);
  });
});

describe('gathering', () => {
  it('a tree takes `durability` hits, gives yieldPerHit each, then regrows after respawnSec', () => {
    const t = newGame();
    const g = t.game;
    const tree = g.field.nodes.find((n) => n.id === 'n010')!; // tree_z1: 6 nhát, 2 gỗ mỗi nhát, 30 s
    expect([tree.maxDurability, tree.respawnSec, tree.kind, tree.resource]).toEqual([6, 30, 'tree', 'wood']);
    teleport(g, tree.x + 0.9, tree.y);
    const ev = run(t, 30 * 8);
    const mine = ev.filter((e) => e.type === 'gather' && e.id === tree.index);
    expect(mine.length).toBe(6);
    expect(mine.every((e) => e.n === 2 && e.key === 'wood')).toBe(true);
    expect(tree.depleted).toBe(true);
    expect(ev.some((e) => e.type === 'node_depleted' && e.id === tree.index)).toBe(true);
    const left = tree.respawnT;
    expect(left).toBeGreaterThan(20);
    teleport(g, QUIET[0], QUIET[1]);
    t.stepSec(left - 0.5);
    expect(tree.depleted).toBe(true);
    t.stepSec(1);
    expect(tree.depleted).toBe(false);
    expect(tree.durability).toBe(6);
  });

  it('a hero with gatherPower 2 gathers twice as fast and the node still gives the same total', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'do_neo');
    g.setSquad(['do_neo']);
    const rock = g.field.nodes.find((n) => n.type === 'rock_z2')!; // 5 độ bền, 2 quặng mỗi độ bền
    cheat(g).field.camps.forEach((c: any) => { c.respawnSec = 1e9; });
    for (const m of cheat(g).field.monsters) if (Math.hypot(m.x - rock.x, m.y - rock.y) < 9) { m.x = 5; m.y = 5; m.homeX = 5; m.homeY = 5; }
    teleport(g, rock.x + 0.9, rock.y);
    const ev = run(t, 30 * 5).filter((e) => e.type === 'gather' && e.id === rock.index);
    expect(ev.map((e) => e.n)).toEqual([4, 4, 2]); // nhát cuối chỉ còn 1 độ bền
    expect(rock.depleted).toBe(true);
  });

  it('heroes prefer monsters over nodes, and do not use skills on nodes', () => {
    const t = newGame();
    const g = t.game;
    const tree = g.field.nodes.find((n) => n.id === 'n010')!;
    teleport(g, tree.x + 0.9, tree.y);
    const ev = run(t, 30 * 8);
    expect(ev.filter((e) => e.type === 'skill').length).toBe(0); // Khiên Đập (hồi 6 s) không dùng lên cây
    expect(g.field.heroes[0].targetId).toBeLessThanOrEqual(0);
  });
});

describe('camps', () => {
  it('hitting or approaching one monster makes the whole camp chase', () => {
    const t = newGame();
    const g = t.game;
    const crabs = campMonsters(g, CRAB);
    expect(crabs.every((m) => m.state === 'wander')).toBe(true);
    atCamp(t, CRAB, 6.5); // 6.5 ô từ tâm: ngoài tầm gây hấn 4 ô của mọi con (quái lảng vảng trong 1.5 ô)
    t.stepSec(1);
    expect(crabs.every((m) => m.state === 'wander')).toBe(true);
    atCamp(t, CRAB, 3.0);
    t.stepSec(0.5);
    expect(crabs.every((m) => m.state === 'chase')).toBe(true);
  });

  it('monsters dragged more than 7 cells from the camp go home, cannot be hit, and heal 20% per second there', () => {
    const t = newGame();
    const g = t.game;
    const { cx, cy } = atCamp(t, CRAB, 2.5);
    const dummies = makeDummies(g, CRAB, 10000);
    t.stepSec(1);
    for (const m of dummies) m.hp = 4000;
    // kéo đội ra xa ổ: quái đuổi theo rồi bỏ cuộc
    g.setJoystick(0, 1);
    let sawReturn = false;
    for (let i = 0; i < 30 * 12; i++) {
      t.step();
      for (const m of dummies) {
        if (m.state === 'return') {
          sawReturn = true;
          expect(m.invulnerable).toBe(true);
          expect(Math.hypot(m.x - cx, m.y - cy)).toBeLessThan(7.6);
        }
      }
    }
    expect(sawReturn).toBe(true);
    g.setJoystick(0, 0);
    // đang quay về thì không bị đánh trúng
    const back = dummies.find((m) => m.state === 'return');
    if (back) { const hp = back.hp; cheat(g).field.damage(back, 500, 0, 0); expect(back.hp).toBe(hp); }
    t.stepSec(8);
    expect(dummies.every((m) => m.state === 'wander')).toBe(true);
    expect(dummies.every((m) => m.hp === m.maxHp)).toBe(true); // 20%/s -> đầy trong 5 s
  });

  it('a dead monster leaves a corpse for 1 s and respawns at the camp after respawnSec', () => {
    const t = newGame();
    const g = t.game;
    const camp = g.field.camps.find((c) => c.id === CRAB)!;
    atCamp(t, CRAB, 1.5);
    const field = cheat(g).field;
    const mine = () => field.monsters.filter((m: any) => m.campIndex === camp.index);
    let firstDeath = -1;
    let corpseGone = -1;
    let firstBack = -1;
    let low = 4;
    run(t, 30 * 30, (i) => {
      if (firstDeath < 0 && camp.alive < 4) firstDeath = i;
      if (firstDeath >= 0 && corpseGone < 0 && mine().length < 4) corpseGone = i;
      if (camp.alive < low) low = camp.alive;
      if (firstBack < 0 && low < 4 && camp.alive > low) firstBack = i;
    });
    expect(firstDeath).toBeGreaterThan(0);
    expect(corpseGone - firstDeath).toBeGreaterThanOrEqual(29);  // xác nằm 1 s
    expect(corpseGone - firstDeath).toBeLessThanOrEqual(30);
    expect(firstBack - firstDeath).toBeGreaterThanOrEqual(599);  // mọc lại sau 20 s
    expect(firstBack - firstDeath).toBeLessThanOrEqual(600);
    expect(camp.count).toBe(4);
    expect(camp.respawnSec).toBe(20);
  });

  it('the camp shows a countdown only while it is completely empty', () => {
    const t = newGame();
    const g = t.game;
    const camp = g.field.camps.find((c) => c.id === CRAB)!;
    expect(camp.respawnT).toBe(0);
    for (const m of campMonsters(g, CRAB)) cheat(g).field.damage(m, 99999, m.x + 1, m.y);
    t.step();
    expect(camp.alive).toBe(0);
    expect(camp.respawnT).toBeGreaterThan(19);
    t.stepSec(20.5);
    expect(camp.alive).toBe(4);
    expect(camp.respawnT).toBe(0);
  });
});

describe('pickups', () => {
  function dropFrom(g: any, m: any, times: number): { [item: string]: number[] } {
    const f = cheat(g).field;
    const out: { [item: string]: number[] } = {};
    for (let i = 0; i < times; i++) {
      f.clearPickups();
      f.dropLoot(m);
      const sum: { [item: string]: number } = {};
      const objects: { [item: string]: number } = {};
      for (const p of f.pickups) { sum[p.item] = (sum[p.item] || 0) + p.amount; objects[p.item] = (objects[p.item] || 0) + 1; }
      for (const k of Object.keys(objects)) expect(objects[k]).toBeLessThanOrEqual(5); // tối đa 5 vật thể mỗi loại
      for (const k of Object.keys(sum)) (out[k] || (out[k] = [])).push(sum[k]);
    }
    f.clearPickups();
    return out;
  }

  it('drop tables: independent rolls, uniform amounts, zone multiplier, at most 5 objects per type', () => {
    const g = newGame().game;
    const crab = campMonsters(g, CRAB)[0]; // field_meat ở z1 (×1.0): thịt 1–2 luôn có; vàng 1 với 30%
    const a = dropFrom(g, crab, 4000);
    expect(a.meat.length).toBe(4000);
    expect(Math.min(...a.meat)).toBe(1);
    expect(Math.max(...a.meat)).toBe(2);
    expect(a.meat.filter((n) => n === 2).length / 4000).toBeGreaterThan(0.46);
    expect(a.meat.filter((n) => n === 2).length / 4000).toBeLessThan(0.54);
    expect(a.gold.length / 4000).toBeGreaterThan(0.27);
    expect(a.gold.length / 4000).toBeLessThan(0.33);
    expect(a.gold.every((n) => n === 1)).toBe(true);
    const elite = campMonsters(g, g.field.camps.find((c) => c.monsterId === 'cua_thep')!.id)[0]; // z3 (×2.0)
    const b = dropFrom(g, elite, 2000);
    expect(Math.min(...b.meat)).toBe(30);
    expect(Math.max(...b.meat)).toBe(40);
    expect(Math.min(...b.gold)).toBe(60);
    expect(Math.max(...b.gold)).toBe(80);
    expect(b.coral.every((n) => n === 2)).toBe(true);
    expect(b.coral.length / 2000).toBeGreaterThan(0.22);
    expect(b.coral.length / 2000).toBeLessThan(0.28);
  });

  it('a pickup flies to a hero within 2.5 cells, otherwise to the leader after 6 s; it is never lost', () => {
    const t = newGame();
    const g = t.game;
    const f = cheat(g).field;
    teleport(g, QUIET[0], QUIET[1]);
    const elite = campMonsters(g, g.field.camps.find((c) => c.monsterId === 'cua_thep')!.id)[0];
    elite.x = QUIET[0] + 8; elite.y = QUIET[1]; // rơi đồ cách đội 8 ô
    f.dropLoot(elite);
    elite.x = 3; elite.y = 3;
    const total = f.pickups.reduce((s: number, p: any) => s + (p.item === 'gold' ? p.amount : 0), 0);
    expect(total).toBeGreaterThanOrEqual(60);
    const gold0 = g.resources.gold;
    t.stepSec(5.5);
    expect(g.field.pickups.every((p) => !p.flying)).toBe(true);
    expect(g.resources.gold).toBe(gold0);
    const ev = run(t, 30 * 3); // quá 6 s: bay về thủ lĩnh với 10 ô/s
    expect(g.field.pickups.length).toBe(0);
    expect(g.resources.gold).toBe(gold0 + total);
    expect(ev.filter((e) => e.type === 'pickup' && e.key === 'gold').reduce((s, e) => s + e.n, 0)).toBe(total);
    // trong tầm hút: bay ngay
    elite.x = QUIET[0] + 1.5; elite.y = QUIET[1];
    f.dropLoot(elite);
    elite.x = 3; elite.y = 3;
    t.step(2);
    expect(g.field.pickups.every((p) => p.flying)).toBe(true);
    t.stepSec(1);
    expect(g.field.pickups.length).toBe(0);
  });
});

describe('death, revive and regeneration', () => {
  it('a dead hero revives in place after 8 s with full health; the next living hero leads meanwhile', () => {
    const t = newGame();
    const g = t.game;
    grantHero(g, 'se');
    g.setSquad(['bang', 'se']);
    teleport(g, QUIET[0], QUIET[1]);
    const [bang, se] = g.field.heroes;
    const f = cheat(g).field;
    f.damage(bang, 99999, bang.x + 1, bang.y);
    t.step();
    expect(bang.alive).toBe(false);
    expect(bang.anim).toBe('dead');
    expect(g.field.leader!.heroId).toBe('se');
    expect(se.isLeader).toBe(true);
    const pos = [bang.x, bang.y];
    const ev = run(t, 30 * 8 + 2);
    expect(bang.alive).toBe(true);
    expect(bang.hp).toBe(bang.maxHp);
    expect([bang.x, bang.y]).toEqual(pos);
    expect(g.field.leader!.heroId).toBe('bang'); // hero đầu lấy lại quyền thủ lĩnh
    expect(ev.some((e) => e.type === 'revive' && e.key === 'bang')).toBe(true);
  });

  it('when the whole squad falls it reappears in the village after 3 s with nothing lost', () => {
    const t = newGame();
    const g = t.game;
    give(g, { meat: 50, wood: 70 });
    atCamp(t, CRAB, 1.5);
    for (const m of campMonsters(g, CRAB)) { m.atk = 5000; }
    const before = { ...g.resources };
    const ev = run(t, 30 * 12);
    const wipe = ev.find((e) => e.type === 'wipe')!;
    const tele = ev.find((e) => e.type === 'teleport' && e.key === 'wipe')!;
    expect(wipe).toBeTruthy();
    expect(tele.step - wipe.step).toBe(90); // 3 s
    expect([tele.x, tele.y]).toEqual([30, 30]);
    const h = g.field.heroes[0];
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(h.maxHp);
    expect(g.leaderZone).toBe('village');
    expect(g.resources.gold).toBeGreaterThanOrEqual(before.gold);
    expect(g.resources.meat).toBeGreaterThanOrEqual(before.meat);
    expect(g.resources.wood).toBe(before.wood);
    expect(campMonsters(g, CRAB).every((m) => m.state !== 'chase')).toBe(true); // quái quay về ổ
  });

  it('heroes regenerate 2% of max health per second after 5 s out of combat', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, QUIET[0], QUIET[1]);
    const h = g.field.heroes[0];
    cheat(g).field.damage(h, 450, h.x + 1, h.y);
    t.stepSec(4.9);
    expect(h.hp).toBe(450);
    t.stepSec(10.1);
    expect(h.hp).toBeGreaterThan(450 + 900 * 0.02 * 9.5);
    expect(h.hp).toBeLessThan(450 + 900 * 0.02 * 10.5);
    t.stepSec(30);
    expect(h.hp).toBe(900);
  });
});

describe('return to village', () => {
  it('teleports after a 1 s channel, remembers the spot, and "to field" goes back', () => {
    const t = newGame();
    const g = t.game;
    expect(g.canReturnToVillage().reason).toBe('invalid'); // đang ở trong làng
    expect(g.canGoToField().reason).toBe('no_return_point'); // chưa có điểm ra đồng: nút ẩn
    const spot = quietSpot(g, 'z1');
    teleport(g, spot.x, spot.y);
    expect(g.returnToVillage().ok).toBe(true);
    expect(g.field.returnChannelT).toBe(1);
    t.stepSec(0.9);
    expect(g.leaderZone).toBe('z1');
    const ev = run(t, 6);
    expect(g.leaderZone).toBe('village');
    expect([g.field.leader!.x, g.field.leader!.y]).toEqual([30, 30]);
    expect(ev.some((e) => e.type === 'teleport' && e.key === 'village')).toBe(true);
    expect(g.field.returnPoint).toEqual([spot.x, spot.y]);
    expect(g.goToField().ok).toBe(true);
    t.stepSec(1.1);
    expect([g.field.leader!.x, g.field.leader!.y]).toEqual([spot.x, spot.y]);
  });

  it('pulling the joystick cancels the channel; chasing monsters block the button', () => {
    const t = newGame();
    const g = t.game;
    const spot = quietSpot(g, 'z1');
    teleport(g, spot.x, spot.y);
    g.returnToVillage();
    t.stepSec(0.5);
    g.setJoystick(1, 0);
    const ev = run(t, 3);
    expect(g.field.returnChannelT).toBe(0);
    expect(ev.some((e) => e.type === 'return_cancel')).toBe(true);
    g.setJoystick(0, 0);
    t.stepSec(2);
    expect(g.leaderZone).toBe('z1');
    atCamp(t, CRAB, 2.0);
    makeDummies(g, CRAB);
    t.stepSec(1);
    const c = g.canReturnToVillage();
    expect([c.reason, c.text]).toEqual(['monsters_near', 'Có quái ở gần!']);
    expect(g.returnToVillage().ok).toBe(false);
  });
});
