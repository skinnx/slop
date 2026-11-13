// Tất định, hiệu năng, và bot chạy thử ngắn.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../paths';
import { newGame, strongSquad, enterStage, cheat, loadData, run } from './helpers';
import { Rng, hashSeed } from '../../../game/assets/scripts/core/rng';
import { worldToIso, isoToWorld, depthKey } from '../../../game/assets/scripts/core/index';
import type { Game } from '../../../game/assets/scripts/core/index';
import { Bot } from '../../sim/bot';
import { simulate } from '../../sim/simulate';
import { CardPlayer } from '../../sim/cardplayer';

const data = loadData();

/** Dấu vân tay của toàn bộ trạng thái nhìn thấy được. */
function fingerprint(g: Game): string {
  const u = (list: ReadonlyArray<any>) => list.map((x) => [x.id, x.x.toFixed(6), x.y.toFixed(6), Math.round(x.hp * 1000), x.alive ? 1 : 0].join(':')).join('|');
  return JSON.stringify({
    tick: g.tick, mode: g.mode, res: g.resources, player: [g.player.level, g.player.exp], cp: g.squadCp, squad: g.squad,
    heroes: u(g.scene.heroes), monsters: u(g.scene.monsters), pickups: g.scene.pickups.map((p) => [p.id, p.item, p.amount, p.x.toFixed(6), p.y.toFixed(6)]),
    nodes: g.field.nodes.map((n) => n.durability).join(''), quest: [g.quest.id, g.quest.progress],
    buildings: g.buildings.map((b) => [b.type, b.level, b.x, b.y, b.buffer]), run: g.run ? [g.run.floor, g.run.streak, g.run.remaining, g.run.loot] : null,
  });
}

function botRun(seed: number, steps: number): { print: string; game: Game } {
  const t = newGame({ seed });
  const bot = new Bot(t.game);
  for (let i = 0; i < steps; i++) {
    bot.act();
    t.step();
    bot.onEvents(t.game.events, t.game.eventCount);
    t.game.clearEvents();
  }
  return { print: fingerprint(t.game), game: t.game };
}

describe('determinism', () => {
  it('mulberry32 gives a fixed sequence for a seed', () => {
    const r = new Rng(1);
    const first = [r.next(), r.next(), r.next()];
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    const again = new Rng(1);
    expect([again.next(), again.next(), again.next()]).toEqual(first);
    expect(new Rng(2).next()).not.toBe(first[0]);
    expect(hashSeed(1, 1)).not.toBe(hashSeed(1, 2));
    expect(hashSeed(1, 1)).toBe(hashSeed(1, 1));
    const ints = new Rng(9);
    for (let i = 0; i < 1000; i++) { const v = ints.int(3, 5); expect(v === 3 || v === 4 || v === 5).toBe(true); }
  });

  it('same seed and same inputs give exactly the same game, 10 simulated minutes of bot play', () => {
    const a = botRun(42, 30 * 600);
    const b = botRun(42, 30 * 600);
    expect(a.print).toBe(b.print);
    expect(a.game.player.level).toBeGreaterThan(2); // có chuyện xảy ra thật
    const c = botRun(43, 30 * 600);
    expect(c.print).not.toBe(a.print);
  });

  it('a dungeon run depends only on the save seed and the run number', () => {
    const runOnce = (seed: number, warmup: number) => {
      const t = newGame({ seed });
      strongSquad(t.game);
      t.step(warmup); // số bước ngoài đồng trước đó không ảnh hưởng tới lượt dungeon
      enterStage(t, 2);
      t.step(1);
      return t.game.scene.monsters.map((m) => m.monsterId + ':' + m.x.toFixed(5) + ':' + m.y.toFixed(5)).join('|');
    };
    expect(runOnce(7, 10)).toBe(runOnce(7, 500));
    expect(runOnce(8, 10)).not.toBe(runOnce(7, 10));
    // lượt thứ hai của cùng save khác lượt thứ nhất
    const t = newGame({ seed: 7 });
    strongSquad(t.game);
    enterStage(t, 2); t.step(1);
    const first = t.game.scene.monsters.map((m) => m.x.toFixed(5)).join('|');
    t.game.leaveDungeon(); t.game.closeResult();
    enterStage(t, 2); t.step(1);
    expect(t.game.scene.monsters.map((m) => m.x.toFixed(5)).join('|')).not.toBe(first);
  });

  it('ties are broken by the smaller entity id', () => {
    const t = newGame();
    const g = t.game;
    const f = cheat(g).field;
    const crabs = f.monsters.filter((m: any) => m.alive && m.monsterId === 'cua_cat').slice(0, 2);
    const h = f.heroes[0];
    // hai con cua cách hero đúng bằng nhau
    crabs[0].x = h.x + 2; crabs[0].y = h.y; crabs[1].x = h.x - 2; crabs[1].y = h.y;
    for (const m of crabs) { m.moveSpeed = 0; m.atk = 0; m.homeX = m.x; m.homeY = m.y; }
    f.refreshActive();
    for (const m of f.active) if (crabs.indexOf(m) < 0) { m.x = 5; m.y = 5; }
    f.pickHeroTarget(h, h);
    expect(h.target.id).toBe(Math.min(crabs[0].id, crabs[1].id));
  });
});

describe('core has no hidden inputs', () => {
  it('core files never read the wall clock or timers', () => {
    const dir = path.join(REPO, 'game/assets/scripts/core');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      // bỏ chú thích trước khi quét (tài liệu trong contract.ts có nhắc tới đồng hồ của view)
      const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(/\bDate\.now\b|\bnew Date\b|\bperformance\.now\b|\bsetTimeout\b|\bsetInterval\b/.test(src), f).toBe(false);
    }
  });

  it('the bot only uses the public entry of the core and never casts its way into internals', () => {
    for (const f of ['bot.ts', 'simulate.ts', 'main.ts', 'load.ts', 'cardplayer.ts', 'newplayer.ts', 'difficulty.ts']) {
      const src = fs.readFileSync(path.join(REPO, 'tools/sim', f), 'utf8');
      const imports = src.match(/from\s+'[^']*scripts\/core\/[^']*'/g) || [];
      for (const i of imports) expect(i, f).toMatch(/core\/index'$/);
      expect(/\bas any\b|<any>|\bcheat\(/.test(src), f + ' không được ép kiểu any').toBe(false);
    }
  });
});

describe('iso mapping', () => {
  it('worldToIso and isoToWorld are inverse, with 120 × 60 cells', () => {
    const p = { x: 0, y: 0 };
    worldToIso(data, 1, 0, p);
    expect([p.x, p.y]).toEqual([60, 30]);
    worldToIso(data, 0, 1, p);
    expect([p.x, p.y]).toEqual([-60, 30]);
    worldToIso(data, 21.5, 33.25, p);
    const back = isoToWorld(data, p.x, p.y, { x: 0, y: 0 });
    expect(back.x).toBeCloseTo(21.5, 9);
    expect(back.y).toBeCloseTo(33.25, 9);
    expect(depthKey(3, 4)).toBeGreaterThan(depthKey(2, 4)); // x + y lớn hơn = xa hơn, vẽ trước
  });
});

describe('performance', () => {
  it('a dungeon step with 60 monsters and a full squad is cheap', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g, 1, 8, 0);
    enterStage(t, 1);
    const sim = cheat(g).dungeonScene;
    sim.startFloor(4, false);
    for (const h of sim.heroes) { h.maxHp = 1e9; h.hp = 1e9; }
    // trận kéo dài: không ai chết, luôn đủ 60 quái vây đội 8 hero, mọi đòn đánh và kỹ năng vẫn chạy
    for (let i = 0; i < 30 * 17; i++) { t.step(); for (const m of sim.monsters) { m.maxHp = 1e9; m.hp = 1e9; } g.clearEvents(); }
    expect(g.scene.monsters.filter((m) => m.alive).length).toBe(60);
    // lấy lượt nhanh nhất trong 5 lượt để máy bận (test chạy song song) không làm kết quả dao động
    let us = Infinity;
    for (let round = 0; round < 5; round++) {
      const steps = 1000;
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < steps; i++) { t.step(); g.clearEvents(); }
      us = Math.min(us, Number(process.hrtime.bigint() - t0) / 1000 / steps);
    }
    expect(g.scene.monsters.filter((m) => m.alive).length).toBe(60);
    // ngân sách một frame 60 fps là 16 667 µs; một bước lõi phải dưới 1% ngân sách đó (đo được: khoảng 10–25 µs)
    expect(us, `mỗi bước ${us.toFixed(1)} µs`).toBeLessThan(160);
  });

  it('reading state and stepping does not grow the event buffer when the view clears it', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    enterStage(t, 1);
    let peak = 0;
    for (let i = 0; i < 600; i++) { t.step(); peak = Math.max(peak, g.eventCount); g.clearEvents(); }
    expect(g.eventCount).toBe(0);
    expect(peak).toBeGreaterThan(0);
    expect(g.events.length).toBeLessThanOrEqual(Math.max(64, peak)); // pool chỉ lớn bằng đỉnh của một bước
  });

  it('the event buffer stays bounded even if nobody clears it', () => {
    const t = newGame();
    strongSquad(t.game);
    enterStage(t, 1);
    for (let i = 0; i < 3000; i++) t.step();
    expect(t.game.events.length).toBeLessThanOrEqual(4096);
  });
});

describe('bot', () => {
  it('a new player bot gets through the first part of the loop in 12 simulated minutes', () => {
    const rep = simulate(data, { seed: 3, hours: 0.2, rowEveryMin: 4 });
    expect(rep.rows.length).toBe(3);
    const end = rep.final;
    expect(end.playerLevel).toBeGreaterThanOrEqual(4);
    expect(end.heroesOwned).toBeGreaterThanOrEqual(3);
    expect(end.buildings).toContain('Quán1');
    expect(end.buildings).toContain('Gỗ');
    expect(end.totalDraws).toBeGreaterThanOrEqual(3);
    expect(end.cp).toBeGreaterThan(3000);
    expect(rep.longestStallSec).toBeLessThan(300);
    expect(rep.income.gather.wood).toBeGreaterThan(100);
  });

  it('a new player who only follows the quest card is not stuck at q14 and beats the floor-5 boss (QA: quest chain)', () => {
    for (const policy of ['focused', 'spread'] as const) {
      const t = newGame({ seed: 21 });
      const g = t.game;
      const player = new CardPlayer(g, { levelPolicy: policy, stopAfterQuest: 'q21' });
      for (let i = 0; i < 30 * 3600 && !player.done; i++) {
        player.act();
        t.step();
        player.onEvents(g.events, g.eventCount);
        g.clearEvents();
      }
      expect(player.done, policy).toBe(true);
      expect(g.playSec).toBeLessThan(45 * 60); // hạn chót "vượt tầng 5" của thiết kế
      expect(g.getDungeonInfo().bestFloorCleared).toBeGreaterThanOrEqual(5);
      // q14 không cần mảnh; dồn thịt cho một hero thì đủ thịt ngay lúc thẻ hiện
      expect(player.q14!.fragmentsMissing).toBe(0);
      if (policy === 'focused') expect(player.q14!.meatMissing).toBe(0);
      const q14 = player.timings.find((x) => x.id === 'q14')!;
      expect(q14.endSec - q14.startSec).toBeLessThan(policy === 'focused' ? 5 : 240);
      // khi bị khóa, game nói rõ thiếu gì
      for (const text of Object.keys(player.blockedTexts.q14 || {})) expect(text).toMatch(/^Thiếu \d+ thịt$/);
    }
  });

  it('events of one step can be read by the bot before they are cleared', () => {
    const t = newGame();
    const ev = run(t, 5);
    expect(Array.isArray(ev)).toBe(true);
    const bot = new Bot(t.game);
    expect(bot.stats.dungeonRuns).toBe(0);
  });
});
