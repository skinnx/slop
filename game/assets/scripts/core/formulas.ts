// Công thức thuần (không trạng thái): chỉ số hero, lực chiến, giá lên cấp. Dùng chung cho lõi, panel và test.
import { GameData, HeroDef, SkillDef } from './data';
import { CP_BONUS_PER_EXTRA_STAR, MAX_STARS_M1 } from './constants';

export interface OwnedHero { id: string; level: number; fragments: number; }

/** Cộng phẳng từ Sân Tập và % hiệu ứng sở hữu theo hệ. */
export interface TeamBonuses {
  flatHp: number;
  flatAtk: number;
  hpPct: { [attr: string]: number };
  atkPct: { [attr: string]: number };
}

/** Làm tròn kiểu "nửa lên" ổn định trước sai số dấu phẩy động (ví dụ 110 × 1.15 = 126.49999…). */
export function roundHalfUp(v: number): number { return Math.floor(v + 0.5 + 1e-9); }

/** stat = round(base × (1 + growth × (L − 1))) (01 mục 8.2). */
export function statAtLevel(base: number, level: number, growth: number): number {
  return roundHalfUp(base * (1 + growth * (level - 1)));
}

export function computeBonuses(data: GameData, owned: ReadonlyArray<OwnedHero>, nodesUnlocked: number): TeamBonuses {
  const b: TeamBonuses = { flatHp: 0, flatAtk: 0, hpPct: { STR: 0, AGI: 0, INT: 0 }, atkPct: { STR: 0, AGI: 0, INT: 0 } };
  const nodes = data.training.nodes;
  for (let i = 0; i < nodesUnlocked && i < nodes.length; i++) {
    if (nodes[i].stat === 'hp') b.flatHp += nodes[i].value; else b.flatAtk += nodes[i].value;
  }
  for (const h of owned) {
    const def = data.heroById[h.id];
    if (!def) continue;
    for (const m of data.heroLevels.milestones) {
      if (h.level < m.level) continue;
      if (m.type === 'owned_hp') b.hpPct[def.attribute] += m.pct;
      else if (m.type === 'owned_atk') b.atkPct[def.attribute] += m.pct;
    }
  }
  return b;
}

/** Chỉ số cuối = (chỉ số theo cấp + cộng phẳng Sân Tập) × (1 + % hiệu ứng sở hữu cùng hệ), làm tròn. */
export function heroHp(data: GameData, def: HeroDef, level: number, b: TeamBonuses): number {
  return roundHalfUp((statAtLevel(def.baseHp, level, data.tuning.hero.growthPerLevel) + b.flatHp) * (1 + b.hpPct[def.attribute]));
}
export function heroAtk(data: GameData, def: HeroDef, level: number, b: TeamBonuses): number {
  return roundHalfUp((statAtLevel(def.baseAtk, level, data.tuning.hero.growthPerLevel) + b.flatAtk) * (1 + b.atkPct[def.attribute]));
}

/** Số sao của kỹ năng ở ô `slot` (0 hoặc 1) khi hero ở cấp `level`: 0 = chưa mở. */
export function skillStars(data: GameData, level: number, slot: number): number {
  let stars = 0;
  for (const m of data.heroLevels.milestones) {
    if (m.skillSlot !== slot || level < m.level) continue;
    if (m.type === 'skill_unlock') stars = Math.max(stars, 1);
    else if (m.type === 'skill_star') stars = Math.max(stars, 2);
  }
  return Math.min(stars, MAX_STARS_M1);
}

/** Cấp mở kỹ năng ở ô `slot` (type 'skill_unlock') hoặc cấp lên 2 sao ('skill_star'); 0 nếu không có. */
export function skillMilestoneLevel(data: GameData, slot: number, type: 'skill_unlock' | 'skill_star'): number {
  for (const m of data.heroLevels.milestones) if (m.type === type && m.skillSlot === slot) return m.level;
  return 0;
}

/** Tham số kỹ năng ở số sao cho trước: phần tử thứ (sao − 1) của mỗi mảng. */
export function skillParam(skill: SkillDef, key: string, stars: number): number {
  const arr = skill.params[key];
  if (!arr) return 0;
  const i = Math.max(0, Math.min(arr.length - 1, stars - 1));
  return arr[i];
}

export function skillCpBonus(data: GameData, def: HeroDef, level: number): number {
  let bonus = 0;
  for (let slot = 0; slot < def.skills.length; slot++) {
    const stars = skillStars(data, level, slot);
    if (stars <= 0) continue;
    const skill = data.skillById[def.skills[slot]];
    bonus += data.tuning.cp.skillCpBonusByType[skill.type] + CP_BONUS_PER_EXTRA_STAR * (stars - 1);
  }
  return bonus;
}

/** CP_hero = round(4 × ATK × (1 / nhịp) × (1 + skillCpBonus) + HP) (01 mục 10.2). */
export function cpFromStats(data: GameData, atk: number, hp: number, attackInterval: number, bonus: number): number {
  const c = data.tuning.cp;
  return roundHalfUp(c.atkWeight * atk * (c.refAttackInterval / attackInterval) * (1 + bonus) + c.hpWeight * hp);
}

export function heroCp(data: GameData, def: HeroDef, level: number, b: TeamBonuses): number {
  return cpFromStats(data, heroAtk(data, def, level, b), heroHp(data, def, level, b), def.attackInterval,
    skillCpBonus(data, def, level));
}

/** Giá lên từ cấp `level` lên `level + 1`; null khi đã tối đa. */
export function levelUpCost(data: GameData, def: HeroDef, level: number): { meat: number; fragments: number } | null {
  if (level >= data.heroLevels.maxLevel) return null;
  const row = data.heroLevels.costs[level - 1];
  return { meat: row.meat, fragments: row.fragments ? row.fragments[def.rarity] : 0 };
}

/** Mảnh cần cho lần đột phá kế tiếp tính từ cấp `level` (0 nếu không còn đột phá). */
export function nextBreakthroughFragments(data: GameData, def: HeroDef, level: number): number {
  const costs = data.heroLevels.costs;
  for (let i = level - 1; i < costs.length; i++) {
    if (i >= 0 && costs[i].fragments && costs[i].fragments[def.rarity] > 0) return costs[i].fragments[def.rarity];
  }
  return 0;
}

/** recommendedCp của tầng `floor` lấy từ bảng (dungeon.json), không tính lại công thức. */
export function floorRecommendedCp(data: GameData, floor: number): number {
  return data.dungeon.floors[floor - 1].recommendedCp;
}

/** Nhãn độ khó theo tỉ lệ CP đội / CP đề nghị. */
export function difficultyLabel(data: GameData, ratio: number): { label: string; color: string; hard: boolean } {
  const labels = data.tuning.dungeon.difficultyLabels;
  let best = labels[labels.length - 1];
  let bestMin = -1;
  let lowest = labels[0];
  for (const l of labels) {
    if (l.minRatio < lowest.minRatio) lowest = l;
    if (ratio >= l.minRatio && l.minRatio > bestMin) { best = l; bestMin = l.minRatio; }
  }
  return { label: best.label, color: best.color, hard: best === lowest };
}
