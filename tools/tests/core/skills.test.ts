// Kỹ năng hero: 7 loại, hồi chiêu, sao, hồi máu khi đang đi.
import { describe, it, expect } from 'vitest';
import { newGame, teleport, run, cheat, grantHero, makeDummies, loadData, TestGame, Ev } from './helpers';

const data = loadData();
const CRAB = 'c_z1_00';

/** Đội gồm các hero cho trước đứng cạnh 4 bao cát xếp sát nhau; trả về danh sách bao cát. */
function arena(heroes: { id: string; level?: number }[]): { t: TestGame; dummies: any[]; units: any[] } {
  const t = newGame();
  const g = t.game;
  for (const h of heroes) grantHero(g, h.id, h.level || 1);
  g.setSquad(heroes.map((h) => h.id));
  const camp = g.field.camps.find((c) => c.id === CRAB)!;
  // bỏ các ổ khác ra xa để không ai chen vào
  for (const m of cheat(g).field.monsters) if (m.campIndex !== camp.index) { m.x = 5; m.y = 5; m.homeX = 5; m.homeY = 5; }
  const dummies = makeDummies(g, CRAB);
  const spots = [[0, 0], [0.72, 0], [0, 0.72], [0.72, 0.72]];
  dummies.forEach((m, i) => { m.x = camp.x + spots[i][0]; m.y = camp.y + spots[i][1]; m.moveSpeed = 0; m.state = 'chase'; });
  teleport(g, camp.x + 0.36, camp.y - 1.0);
  t.step(3); // trận bắt đầu: hồi chiêu đặt lại đầy; các phép thử tự đặt hồi chiêu sau bước này
  return { t, dummies, units: cheat(g).field.heroes };
}

function dmg(ev: Ev[]): Ev[] { return ev.filter((e) => e.type === 'damage' && e.key === 'monster'); }

describe('skills', () => {
  it('cooldowns start full when a fight begins, and a ready skill replaces the next basic attack', () => {
    const { t } = arena([{ id: 'bang' }]); // Khiên Đập: strike ×1.8, hồi 6 s
    const ev = run(t, 30 * 14);
    const hits = dmg(ev);
    const strikes = hits.filter((e) => e.n === 198);
    expect(hits.filter((e) => e.n === 110).length).toBeGreaterThan(5);
    expect(strikes.length).toBe(2);
    expect(strikes[0].step).toBeGreaterThanOrEqual(30 * 6);        // phải chờ hết 6 s đầu
    expect(strikes[0].step).toBeLessThan(30 * 7.4);                // rồi thay cho đòn thường kế tiếp
    expect(strikes[1].step - strikes[0].step).toBeGreaterThanOrEqual(30 * 6);
    expect(ev.filter((e) => e.type === 'skill' && e.key === 'khien_dap').length).toBe(2);
  });

  it('strike hits the current target for ATK × mult; two stars at level 20', () => {
    const { t, units } = arena([{ id: 'bang', level: 20 }]);
    const atk = t.game.getHeroInfo('bang')!.atk;
    units[0].skillCd0 = 0;
    const ev = run(t, 60);
    expect(dmg(ev).filter((e) => e.n === Math.round(atk * 2.2)).length).toBe(1);
    expect(dmg(ev).every((e) => e.n === atk || e.n === Math.round(atk * 2.2))).toBe(true);
  });

  it('cleave hits every monster within the radius around the target', () => {
    const { t, units, dummies } = arena([{ id: 'do_neo' }]); // Vung Neo ×1.6, bán kính 1.5
    dummies[3].x += 3; // con thứ tư ra ngoài bán kính
    units[0].skillCd0 = 0;
    const ev = run(t, 60);
    const hit = dmg(ev).filter((e) => e.n === 288);
    expect(hit.length).toBe(3);
    expect(new Set(hit.map((e) => e.id)).size).toBe(3);
    expect(hit.every((e) => e.step === hit[0].step)).toBe(true);
  });

  it('nova hits every monster within the radius around the hero, and is not wasted when nothing is close', () => {
    const { t, units, dummies } = arena([{ id: 'muc' }]); // Dao Xoáy ×1.3, bán kính 1.6
    units[0].skillCd0 = 0;
    const ev = run(t, 40);
    const hit = dmg(ev).filter((e) => e.n === 156);
    expect(hit.length).toBeGreaterThanOrEqual(2);
    for (const e of hit) {
      const m = dummies.find((d) => d.id === e.id);
      expect(Math.hypot(m.x - units[0].x, m.y - units[0].y)).toBeLessThanOrEqual(1.6 + 0.2);
    }
    // pháp sư tầm xa đứng xa quái: nova (bán kính quanh hero) không được tung vào chỗ trống
    const far = arena([{ id: 'trieu' }]);
    teleport(far.t.game, far.dummies[1].x + 3.3, far.dummies[1].y); // con gần nhất cách 3.3 ô: trong tầm đánh 3.5, ngoài bán kính nova 3.0
    for (const m of far.dummies) m.x = Math.min(m.x, far.dummies[1].x);
    far.units[0].skillCd0 = 0;
    const ev2 = run(far.t, 60);
    expect(ev2.filter((e) => e.type === 'skill').length).toBe(0);
    expect(far.units[0].skillCd0).toBe(0);
    expect(dmg(ev2).length).toBeGreaterThan(0); // vẫn đánh thường
  });

  it('volley hits up to `count` nearest monsters', () => {
    const { t, units } = arena([{ id: 'se' }]); // Bắn Đôi ×1.2, 2 mục tiêu
    units[0].skillCd0 = 0;
    const ev = run(t, 50);
    const hit = dmg(ev).filter((e) => e.n === 204);
    expect(hit.length).toBe(2);
    expect(new Set(hit.map((e) => e.id)).size).toBe(2);
  });

  it('heal restores ATK × mult to the most hurt hero, only when someone is below 85%, even while moving', () => {
    const { t, units } = arena([{ id: 'bang' }, { id: 'lan' }]);
    const g = t.game;
    teleport(g, 27, 27); // không có quái
    const [bang, lan] = units;
    lan.skillCd0 = 0;
    bang.hp = bang.maxHp * 0.9;
    let ev = run(t, 30);
    expect(ev.filter((e) => e.type === 'heal').length).toBe(0); // chưa ai dưới 85%
    bang.hp = 300;
    g.setJoystick(1, 0); // đội đang đi
    ev = run(t, 30);
    const heals = ev.filter((e) => e.type === 'heal');
    expect(heals.length).toBe(1);
    expect(heals[0].n).toBe(216); // 120 × 1.8
    expect(heals[0].id).toBe(bang.id);
    expect(bang.hp).toBeGreaterThanOrEqual(516);
    expect(bang.hp).toBeLessThan(516 + 40); // cộng thêm chút hồi máu tự nhiên ngoài chiến đấu
    expect(lan.skillCd0).toBeGreaterThan(3.5); // hồi chiêu 5 s bắt đầu tính
    expect(lan.x).toBeGreaterThan(27); // không bị bắt đứng lại để hồi máu
  });

  it('heal never exceeds max health and skips dead heroes', () => {
    const { t, units } = arena([{ id: 'bang' }, { id: 'lan' }, { id: 'se' }]);
    teleport(t.game, 27, 27);
    const [bang, lan, se] = units;
    cheat(t.game).field.damage(se, 99999, se.x + 1, se.y);
    lan.skillCd0 = 0;
    bang.hp = bang.maxHp - 100;
    lan.hp = lan.maxHp * 0.5;
    const ev = run(t, 30);
    const heals = ev.filter((e) => e.type === 'heal');
    expect(heals.length).toBe(1);
    expect(heals[0].id).toBe(lan.id); // tỉ lệ máu thấp nhất
    expect(se.alive).toBe(false);
  });

  it('attack buff raises every living hero’s ATK for its duration and does not stack', () => {
    const { t, units } = arena([{ id: 'kinh_vuong' }, { id: 'bang' }]); // Kình Ngư Nộ +20% trong 5 s
    units[0].skillCd0 = 0;
    const ev = run(t, 30 * 9);
    const buff = ev.find((e) => e.type === 'skill' && e.key === 'kinh_ngu')!;
    expect(buff).toBeTruthy();
    const bangHits = ev.filter((e) => e.type === 'attack' && e.id === units[1].id);
    const hitDamage = (a: Ev) => dmg(ev).find((d) => d.step === a.step && d.id === a.id2)!.n;
    const during = bangHits.filter((a) => a.step > buff.step && a.step < buff.step + 30 * 5 - 2).map(hitDamage);
    const after = bangHits.filter((a) => a.step > buff.step + 30 * 5 + 2).map(hitDamage);
    expect(during.length).toBeGreaterThan(2);
    expect(during.every((n) => n === 132 || n === Math.round(110 * 1.2 * 1.8))).toBe(true);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((n) => n === 110 || n === 198)).toBe(true);
  });

  it('taunt makes monsters within the radius target the tank for its duration', () => {
    const { t, units, dummies } = arena([{ id: 'se' }, { id: 'bang', level: 10 }]); // Hô Vang: bán kính 3, 3 s
    const [se, bang] = units;
    for (const m of dummies) { m.target = se; m.retargetT = 99; }
    bang.skillCd1 = 0;
    bang.skillCd0 = 99;
    const ev = run(t, 75);
    expect(ev.some((e) => e.type === 'skill' && e.key === 'ho_vang')).toBe(true);
    const near = dummies.filter((m) => Math.hypot(m.x - bang.x, m.y - bang.y) <= 3);
    expect(near.length).toBeGreaterThan(0);
    for (const m of near) { expect(m.tauntT).toBeGreaterThan(0.4); expect(m.target).toBe(bang); expect(m.targetId).toBe(bang.id); }
    t.stepSec(3.2);
    for (const m of near) expect(m.tauntT).toBe(0);
  });

  it('a skill whose target died before the windup ended is not consumed', () => {
    const { t, units, dummies } = arena([{ id: 'bang' }]);
    const hero = units[0];
    hero.skillCd0 = 0;
    let started = false;
    for (let i = 0; i < 60 && !started; i++) { t.step(); started = hero.windupT > 0 && hero.pending === 2; }
    expect(started).toBe(true);
    const target = hero.target;
    target.maxHp = 1; target.hp = 1;
    cheat(t.game).field.damage(target, 5, target.x + 1, target.y);
    const ev = run(t, 1);
    while (hero.windupT > 0) ev.push(...run(t, 1));
    expect(ev.filter((e) => e.type === 'skill').length).toBe(0);
    expect(hero.skillCd0).toBe(0);
    expect(dummies.includes(target)).toBe(true);
  });

  it('the hero panel lists both skills with their unlock levels and parameters', () => {
    const t = newGame();
    const info = t.game.getHeroInfo('bang')!;
    expect(info.skills.map((s) => [s.id, s.unlocked, s.stars, s.unlockLevel, s.star2Level])).toEqual([
      ['khien_dap', true, 1, 1, 20], ['ho_vang', false, 0, 10, 30],
    ]);
    expect(info.skills[0].params).toEqual({ mult: 1.8 });
    expect(info.skills[0].nextParams).toEqual({ mult: 2.2 });
    expect(info.milestones.map((m) => [m.level, m.reached])).toEqual([[1, true], [5, false], [10, false], [15, false], [20, false], [25, false], [30, false]]);
    expect(data.skillById.khien_dap.cooldownSec).toBe(6);
  });
});
