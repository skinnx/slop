// Nhiệm vụ chính: thứ tự, cách đếm, nhận thưởng, chỉ đường.
import { describe, it, expect } from 'vitest';
import {
  newGame, give, grantHero, instantBuilding, setPlayerLevel, teleport, run, cheat, campMonsters, strongSquad, enterStage,
  loadData, TestGame,
} from './helpers';

const data = loadData();

function jumpTo(t: TestGame, questId: string): void {
  const g = cheat(t.game);
  g.quest.index = data.quests.quests.findIndex((q) => q.id === questId);
  g.quest.progress = 0;
  g.quest.id = '';
  g.refreshQuest(false);
}

describe('main quest chain', () => {
  it('starts with q01 and shows text, progress and reward', () => {
    const g = newGame().game;
    const q = g.quest;
    expect([q.index, q.id, q.type, q.text, q.progress, q.target, q.complete, q.finished]).toEqual([0, 'q01', 'gather', 'Chặt cây lấy 10 gỗ', 0, 10, false, false]);
    expect(q.reward).toEqual({ gold: 50 });
    expect(q.hint).toBe('node:tree');
    expect(g.claimQuest().reason).toBe('quest_not_done');
  });

  it('counting quests count only what happens after they become active', () => {
    const t = newGame();
    const g = t.game;
    const crab = g.field.camps.find((c) => c.monsterId === 'cua_cat')!;
    teleport(g, crab.x + 1.5, crab.y);
    t.stepSec(25); // hạ cua trong lúc nhiệm vụ đang là "chặt cây"
    expect(g.quest.id).toBe('q01');
    expect(g.quest.progress).toBe(0);
    const tree = g.field.nodes.find((n) => n.id === 'n010')!;
    teleport(g, tree.x + 0.9, tree.y);
    const ev = run(t, 30 * 8);
    expect(g.quest.progress).toBe(10); // 5 nhát × 2 gỗ, không vượt quá mục tiêu
    expect(g.quest.complete).toBe(true);
    expect(ev.filter((e) => e.type === 'quest_complete').map((e) => e.key)).toEqual(['q01']);
    // không tự nhận: phải chạm thẻ
    t.stepSec(5);
    expect(g.quest.id).toBe('q01');
    const gold = g.resources.gold;
    g.clearEvents();
    expect(g.claimQuest().ok).toBe(true);
    expect(g.resources.gold).toBe(gold + 50);
    expect(g.quest.id).toBe('q02');
    expect(g.quest.progress).toBe(0); // cua đã hạ trước đó không được tính
    const ev2 = Array.from({ length: g.eventCount }, (_, i) => g.events[i]);
    expect(ev2.some((e) => e.type === 'quest_claimed' && e.key === 'q01')).toBe(true);
    expect(ev2.some((e) => e.type === 'toast' && e.text === 'Vàng +50')).toBe(true);
  });

  it('gather counts even when the storage is full', () => {
    const t = newGame();
    const g = t.game;
    give(g, { wood: 300 });
    const tree = g.field.nodes.find((n) => n.id === 'n010')!;
    teleport(g, tree.x + 0.9, tree.y);
    t.stepSec(8);
    expect(g.resources.wood).toBe(300);
    expect(g.quest.complete).toBe(true);
  });

  it('kill quests count the named monster, or any field monster of the named zone, never dungeon monsters', () => {
    const t = newGame();
    const g = t.game;
    strongSquad(g);
    jumpTo(t, 'q02'); // Hạ 3 Cua Cát
    const rat = g.field.camps.find((c) => c.monsterId === 'chuot_ben')!;
    const f = cheat(g).field;
    for (const m of campMonsters(g, rat.id)) f.damage(m, 99999, m.x + 1, m.y);
    expect(g.quest.progress).toBe(0);
    const crab = g.field.camps.find((c) => c.monsterId === 'cua_cat')!;
    for (const m of campMonsters(g, crab.id).slice(0, 2)) f.damage(m, 99999, m.x + 1, m.y);
    t.step();
    expect(g.quest.progress).toBe(2);
    jumpTo(t, 'q18'); // Hạ 20 quái ở Bãi Vỏ Sò (zone z1)
    for (const c of g.field.camps.filter((x) => x.zone === 'z1').slice(2, 4)) for (const m of campMonsters(g, c.id)) f.damage(m, 99999, m.x + 1, m.y);
    const z2 = g.field.camps.find((x) => x.zone === 'z2')!;
    for (const m of campMonsters(g, z2.id)) f.damage(m, 99999, m.x + 1, m.y);
    t.step();
    expect(g.quest.progress).toBe(8);
    // quái dungeon không tính
    enterStage(t, 1);
    for (let i = 0; i < 30 * 20; i++) t.step();
    expect(g.quest.progress).toBe(8);
  });

  it('state quests look at the current state and can be complete the moment they activate', () => {
    const t = newGame();
    const g = t.game;
    instantBuilding(t, 'lumber_camp', 26, 26, 1);
    grantHero(g, 'bang', 5);
    jumpTo(t, 'q03'); // Nâng một hero lên cấp 2
    expect([g.quest.progress, g.quest.target, g.quest.complete]).toEqual([1, 1, true]);
    g.claimQuest();
    expect(g.quest.id).toBe('q04'); // Xây: Trại Gỗ — đã có sẵn
    expect(g.quest.complete).toBe(true);
    g.claimQuest();
    expect(g.quest.id).toBe('q05');
    expect(g.quest.complete).toBe(false);
  });

  it('a building under construction does not satisfy a build quest until it is finished', () => {
    const t = newGame();
    const g = t.game;
    jumpTo(t, 'q04');
    give(g, { wood: 30 });
    g.enterBuildMode(); g.placeBuilding('lumber_camp', 26, 26); g.exitBuildMode();
    t.stepSec(5);
    expect(g.quest.complete).toBe(false);
    t.stepSec(6);
    expect(g.quest.complete).toBe(true);
  });

  it('recruit, auto_assign, collect, upgrade, training, slots and clear_floor quests', () => {
    const t = newGame();
    const g = t.game;
    teleport(g, 27, 27);
    instantBuilding(t, 'tavern', 30, 34, 1);
    give(g, { gold: 1000, ore: 500, coral: 10 });
    jumpTo(t, 'q07');
    g.recruit(1); t.step(); // thẻ nhiệm vụ cập nhật ở bước kế tiếp
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q08'); // bấm TỰ XẾP (kể cả khi đội không đổi)
    expect(g.quest.complete).toBe(false);
    g.autoAssign(); t.step();
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q13'); // Tuyển thêm 2 lượt
    g.recruit(3); t.step();
    expect([g.quest.progress, g.quest.target]).toEqual([2, 2]);
    jumpTo(t, 'q11'); // Thu gỗ ở Trại Gỗ
    const camp = instantBuilding(t, 'lumber_camp', 26, 30, 1);
    t.stepSec(70);
    expect(g.quest.complete).toBe(false);
    g.collectBuilding(camp); t.step();
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q12'); // Nâng Nhà Kho lên cấp 2
    expect(g.quest.complete).toBe(false);
    cheat(g).village.byType('storage').level = 2; t.step();
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q16'); // Mở 2 nấc ở Sân Tập
    const yard = instantBuilding(t, 'training_yard', 34, 34, 2);
    g.unlockTrainingNode(); t.step();
    expect([g.quest.progress, g.quest.target, g.quest.complete]).toEqual([1, 2, false]);
    g.unlockTrainingNode(); t.step();
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q22'); // Mở ô đội thứ 4
    expect(g.quest.complete).toBe(false);
    expect(yard).toBeGreaterThan(0);
    expect(g.unlockSquadSlot().ok).toBe(true); t.step();
    expect(g.quest.complete).toBe(true);
    jumpTo(t, 'q20'); // Vượt tầng 1
    expect(g.quest.complete).toBe(false);
    strongSquad(g);
    enterStage(t, 1);
    for (let i = 0; i < 30 * 60 && !g.run!.cleared; i++) t.step();
    expect(g.quest.complete).toBe(true); // tính ngay khi tầng sạch quái
    expect(g.claimQuest().reason).toBe('wrong_mode'); // thẻ nhiệm vụ ẩn trong dungeon
  });

  it('quest rewards are not cut by the storage cap', () => {
    const t = newGame();
    const g = t.game;
    give(g, { wood: 290 });
    instantBuilding(t, 'lumber_camp', 26, 26, 1);
    jumpTo(t, 'q04'); // thưởng 40 gỗ, kho 300
    expect(g.claimQuest().ok).toBe(true);
    expect(g.resources.wood).toBe(330);
  });

  it('after the last quest the card shows the chapter-complete text', () => {
    const t = newGame();
    const g = t.game;
    jumpTo(t, 'q41');
    cheat(g).bestFloorCleared = 30;
    t.step();
    expect(g.quest.complete).toBe(true);
    const gold = g.resources.gold;
    expect(g.claimQuest().ok).toBe(true);
    expect(g.resources.gold).toBe(gold + 1000);
    expect([g.quest.finished, g.quest.index, g.quest.complete, g.quest.text]).toEqual([true, 41, false, 'Hoàn thành Chương 1! Cứ tiếp tục luyện đội.']);
    expect(g.claimQuest().reason).toBe('no_quest');
    t.stepSec(1);
    expect(g.quest.finished).toBe(true);
  });

  it('the hint points at the nearest matching thing, a building, or a HUD button', () => {
    const t = newGame();
    const g = t.game;
    let h = g.getQuestHint(); // q01 node:tree
    expect(h.kind).toBe('world');
    const nearest = g.field.nodes.filter((n) => n.kind === 'tree').sort((a, b) => Math.hypot(a.x - 30, a.y - 30) - Math.hypot(b.x - 30, b.y - 30))[0];
    expect([h.x, h.y]).toEqual([nearest.x, nearest.y]);
    jumpTo(t, 'q02'); // camp:cua_cat
    h = g.getQuestHint();
    const camps = g.field.camps.filter((c) => c.monsterId === 'cua_cat').sort((a, b) => Math.hypot(a.x - 30, a.y - 30) - Math.hypot(b.x - 30, b.y - 30));
    expect([h.kind, h.x, h.y]).toEqual(['world', camps[0].x, camps[0].y]);
    jumpTo(t, 'q03'); // ui:hero_list
    expect([g.getQuestHint().kind, g.getQuestHint().ui]).toEqual(['ui', 'hero_list']);
    jumpTo(t, 'q07'); // building:tavern — chưa xây thì chỉ nút Xây
    expect([g.getQuestHint().kind, g.getQuestHint().ui]).toEqual(['ui', 'build_button']);
    instantBuilding(t, 'tavern', 30, 34, 1);
    h = g.getQuestHint();
    expect([h.kind, h.x, h.y]).toEqual(['world', 31.5, 35.5]);
    jumpTo(t, 'q18'); // zone:z1
    expect(g.zoneAt(g.getQuestHint().x, g.getQuestHint().y)).toBe('z1');
    setPlayerLevel(g, 1);
  });

  it('every quest in the table has a resolvable hint and a reachable target', () => {
    const t = newGame();
    const g = t.game;
    for (const b of data.buildings) if (!g.findBuilding(b.id)) instantBuilding(t, b.id, 20 + data.buildings.indexOf(b) * 3 % 18, 36, 1);
    for (const q of data.quests.quests) {
      jumpTo(t, q.id);
      const h = g.getQuestHint();
      expect(h.kind, q.id + ' ' + q.hint).not.toBe('none');
      expect(g.quest.target).toBeGreaterThan(0);
    }
  });
});
