// Bảng dữ liệu: bản đang dùng hợp lệ, khớp bản gốc của thiết kế, và bảng sai phải báo lỗi rõ ràng.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../paths';
import { readRawTables, DATA_DIR, loadData } from './helpers';
import { buildGameData, validateRawTables, DataError, DATA_FILES } from '../../../game/assets/scripts/core/index';

const DESIGN_DIR = path.join(REPO, 'docs/design/data');
const CHANGES_FILE = path.join(REPO, 'docs/evidence/m1/balance-changes.md');

function expectProblem(mutate: (raw: any) => void, fragment: string): void {
  const raw = readRawTables();
  mutate(raw);
  let err: any = null;
  try { buildGameData(raw); } catch (e) { err = e; }
  expect(err, 'phải ném DataError').toBeInstanceOf(DataError);
  expect(err.message).toContain(fragment);
  expect(err.problems.length).toBeGreaterThan(0);
}

describe('data tables', () => {
  it('the tables the game uses pass validation', () => {
    expect(validateRawTables(readRawTables())).toEqual([]);
    const data = loadData();
    expect(data.heroes.length).toBe(12);
    expect(data.dungeon.floors.length).toBe(30);
    expect(data.quests.quests.length).toBe(41);
    expect(data.training.nodes.length).toBe(90);
    expect(data.field.nodes.length).toBe(145);
    expect(data.field.camps.length).toBe(32);
    expect(data.buildings.map((b) => b.id)).toEqual(['storage', 'lumber_camp', 'tavern', 'ore_mine', 'training_yard', 'market', 'dungeon_gate']);
  });

  it('has every design table, and each one equals the design original unless the change is recorded', () => {
    // Điều lệ mục 3.14: mọi con số đổi so với docs/design/data phải được ghi trong balance-changes.md.
    const changes = fs.existsSync(CHANGES_FILE) ? fs.readFileSync(CHANGES_FILE, 'utf8') : '';
    for (const f of DATA_FILES) {
      const game = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f + '.json'), 'utf8'));
      const design = JSON.parse(fs.readFileSync(path.join(DESIGN_DIR, f + '.json'), 'utf8'));
      if (JSON.stringify(game) === JSON.stringify(design)) continue;
      expect(changes, `${f}.json khác bản gốc của thiết kế nhưng balance-changes.md không nhắc tới file này`).toContain(f + '.json');
    }
  });

  it('reads the scripted first recruit from recruit.json', () => {
    const data = loadData();
    expect(data.recruit.firstHero).toBe('se');
    expect(data.recruit.firstCards).toEqual(['lan', 'se', 'dang']);
  });

  it('rejects a missing table', () => {
    expectProblem((raw) => { delete raw.heroes; }, 'heroes.json: (file): thiếu file');
  });

  it('rejects a hero whose skill does not exist', () => {
    expectProblem((raw) => { raw.heroes.heroes[0].skills[0] = 'khong_co'; }, 'heroes.json: heroes[0].skills[0]: không có kỹ năng "khong_co"');
  });

  it('rejects a negative or non-numeric cost', () => {
    expectProblem((raw) => { raw.buildings.buildings[1].levels[0].cost.wood = -5; }, 'buildings.json: buildings[1].levels[0].cost.wood');
    expectProblem((raw) => { raw['hero-levels'].costs[3].meat = '20'; }, 'hero-levels.json: costs[3].meat: phải là số');
  });

  it('rejects recruit odds that do not sum to 1', () => {
    expectProblem((raw) => { raw.recruit.odds[0].N = 0.5; }, 'recruit.json: odds[0]: tổng tỉ lệ N+R+E+L phải bằng 1');
  });

  it('rejects a recruit table in which some hero could never be drawn', () => {
    // mọi hero luôn lấy được (01 mục 9.4): độ hiếm có hero mà tỉ lệ = 0 ở một cấp Quán là lỗi
    expectProblem((raw) => { raw.recruit.odds[2].L = 0; raw.recruit.odds[2].N += 0.03; }, 'recruit.json: odds[2].L: phải > 0');
    expectProblem((raw) => { raw.recruit.ticketExchange = raw.recruit.ticketExchange.filter((e: any) => e.id !== 'unlockL'); }, 'thiếu dòng unlockL');
  });

  it('rejects a dungeon with the wrong number of floors or an unknown monster', () => {
    expectProblem((raw) => { raw.dungeon.floors.pop(); }, 'dungeon.json: floors: cần đúng 30 tầng, có 29');
    expectProblem((raw) => { raw.dungeon.floors[2].groups[0].monster = 'd_rong'; }, 'dungeon.json: floors[2].groups[0].monster: không có quái "d_rong"');
    expectProblem((raw) => { raw.dungeon.floors[4].groups = raw.dungeon.floors[4].groups.slice(1); }, 'tầng boss cần đúng 1 boss');
  });

  it('rejects a quest that points at something that does not exist', () => {
    expectProblem((raw) => { raw.quests.quests[3].params.building = 'lau_dai'; }, 'quests.json: quests[3].params.building: không có công trình "lau_dai"');
    expectProblem((raw) => { raw.quests.quests[1].params.monster = 'rong'; }, 'quests.json: quests[1].params.monster');
    expectProblem((raw) => { raw.quests.quests[0].type = 'dance'; }, 'quests.json: quests[0].type: phải là một trong');
  });

  it('rejects levels out of order, a camp outside the map, and a bad tuning value', () => {
    expectProblem((raw) => { raw.buildings.buildings[0].levels[2].level = 7; }, 'buildings.json: buildings[0].levels[2].level: phải là 3');
    expectProblem((raw) => { raw['field-layout'].camps[0].pos = [80, 5]; }, 'field-layout.json: camps[0].pos: nằm ngoài bản đồ');
    expectProblem((raw) => { raw.tuning.squad.moveSpeed = 'nhanh'; }, 'tuning.json: squad.moveSpeed: phải là số');
    expectProblem((raw) => { raw['training-tree'].slotNodes.pop(); }, 'training-tree.json: slotNodes');
  });

  it('reports every problem at once, not only the first', () => {
    const raw = readRawTables();
    raw.heroes.heroes[0].baseHp = 0;
    raw.monsters.monsters[0].dropTable = 'none';
    raw.skills.skills[0].cooldownSec = -1;
    const problems = validateRawTables(raw);
    expect(problems.length).toBeGreaterThanOrEqual(3);
    expect(problems.join('\n')).toContain('heroes.json');
    expect(problems.join('\n')).toContain('monsters.json');
    expect(problems.join('\n')).toContain('skills.json');
  });
});
