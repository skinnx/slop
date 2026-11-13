// Đo độ khó Hang Xoáy so với CP đề nghị:  cd tools && npm run sim:difficulty [-- --out <thư mục>]
// Với mỗi chặng và mỗi tỉ lệ CP đội / CP đề nghị, dựng một đội qua BẢN LƯU (đường công khai của lõi), cho bot
// đánh chặng đó trên nhiều seed, rồi ghi tỉ lệ thắng và lượng máu thấp nhất của đội.
// Dùng để trả lời câu hỏi ở 02-balance.md mục 7: "thua ở CP ≥ đề nghị?" và "thắng dễ ở 0.6 lần đề nghị?".
import fs from 'node:fs';
import path from 'node:path';
import { createGame } from '../../game/assets/scripts/core/index';
import type { Game, GameData, SaveData } from '../../game/assets/scripts/core/index';
import { loadGameData, SimClock } from './load';
import { Bot } from './bot';

// Thứ tự người chơi thường có hero: Thường và Hiếm trước, Sử Thi và Huyền Thoại sau.
const ROSTER = ['bang', 'se', 'lan', 'do_neo', 'muc', 'dang', 'rua_sat', 'en', 'san', 'kinh_vuong', 'dieu', 'trieu'];
const RATIOS = [1.2, 1.0, 0.9, 0.8, 0.7, 0.6];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

function arg(name: string, def: string): string {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

/** Bản lưu của một người chơi đã vượt các chặng trước `stage`, có `owned` hero đầu danh sách ở cấp `level`. */
function makeSave(data: GameData, seed: number, stage: number, slots: number, owned: number, level: number, nodes: number): SaveData {
  const clock = new SimClock(data.tuning.sim.stepsPerSec);
  const base = createGame({ data, clock, seed }).save();
  base.heroes = ROSTER.slice(0, owned).map((id) => ({ id, level, fragments: 0 }));
  base.squad = ROSTER.slice(0, Math.min(slots, owned));
  base.squadSlots = slots;
  base.training.nodesUnlocked = nodes;
  base.player.level = data.playerLevels.maxLevel;
  base.dungeon.bestStageCleared = stage - 1;
  base.dungeon.bestFloorCleared = (stage - 1) * data.tuning.dungeon.floorsPerStage;
  base.buildings.push({ uid: 2, type: 'dungeon_gate', level: data.dungeon.stages.length, x: 30, y: 34, job: null, buffer: 0 });
  base.nextBuildingUid = 3;
  return base;
}

function load(data: GameData, save: SaveData): { game: Game; clock: SimClock } {
  const clock = new SimClock(data.tuning.sim.stepsPerSec);
  const game = createGame({ data, clock, save: JSON.parse(JSON.stringify(save)) });
  game.autoAssign();
  return { game, clock };
}

/** Tìm cấp hero (và số nấc Sân Tập đi kèm) cho CP gần `target` nhất. */
function fit(data: GameData, stage: number, slots: number, target: number): { level: number; nodes: number; cp: number } {
  let best = { level: 1, nodes: 0, cp: 0 };
  let bestD = Infinity;
  for (let level = 1; level <= data.heroLevels.maxLevel; level++) {
    const nodes = Math.min(data.training.nodes.length, Math.round(level * 3)); // khoảng 3 nấc mỗi cấp hero, như bot thật
    const cp = load(data, makeSave(data, 1, stage, slots, slots + 2, level, nodes)).game.squadCp;
    const d = Math.abs(cp - target);
    if (d < bestD) { bestD = d; best = { level, nodes, cp }; }
  }
  return best;
}

const data = loadGameData();
const slotsByStage = [3, 4, 5, 6, 7, 8]; // số ô đội thiết kế dự kiến ở từng chặng (02-balance.md mục 3.9)
let out = '# Độ khó Hang Xoáy so với CP đề nghị\n\n';
out += 'Lệnh: `cd tools && npm run sim:difficulty`\n\n';
out += 'Mỗi dòng: một đội dựng qua bản lưu (các hero phổ biến nhất, cùng cấp, khoảng 3 nấc Sân Tập mỗi cấp hero, số ô đội thiết kế dự kiến '
  + 'cho chặng đó, TỰ XẾP), do bot điều khiển, đánh chặng đó trên ' + SEEDS.length + ' seed. "Máu thấp nhất" là tỉ lệ tổng máu đội ở lúc thấp nhất, '
  + 'trung bình các lượt thắng. Tỉ lệ CP thật có thể lệch tỉ lệ mục tiêu vì cấp hero là số nguyên; đội yếu nhất có thể dựng là mọi hero cấp 1.\n\n';
out += '| Chặng | CP đề nghị | Tỉ lệ mục tiêu | CP đội | Tỉ lệ thật | Cấp hero | Nấc | Thắng | Máu thấp nhất (lượt thắng) | Tầng lúc thua | Thời gian (s) |\n';
out += '|---|---|---|---|---|---|---|---|---|---|---|\n';

for (let stage = 1; stage <= data.dungeon.stages.length; stage++) {
  const def = data.dungeon.stages[stage - 1];
  const slots = slotsByStage[stage - 1];
  let lastCp = -1;
  for (const ratio of RATIOS) {
    const f = fit(data, stage, slots, def.recommendedCp * ratio);
    if (f.cp === lastCp) continue; // không dựng được đội yếu hơn nữa
    lastCp = f.cp;
    let wins = 0;
    let hpSum = 0;
    let durSum = 0;
    const lossFloors: number[] = [];
    for (const seed of SEEDS) {
      const { game, clock } = load(data, makeSave(data, seed, stage, slots, slots + 2, f.level, f.nodes));
      const bot = new Bot(game);
      const entered = game.enterDungeon(stage);
      if (!entered.ok) throw new Error('không vào được chặng ' + stage + ': ' + entered.text);
      let minFrac = 1;
      for (let i = 0; i < 30 * 1200 && game.mode === 'dungeon'; i++) {
        bot.act();
        clock.tick();
        game.step();
        if (game.mode === 'dungeon') {
          let hp = 0;
          let max = 0;
          for (const h of game.scene.heroes) { hp += h.alive ? h.hp : 0; max += h.maxHp; }
          if (max > 0 && hp / max < minFrac) minFrac = hp / max;
        }
        game.clearEvents();
      }
      const r = game.result;
      if (r && r.outcome === 'victory') { wins++; hpSum += minFrac; } else lossFloors.push(r ? r.floorReached : 0);
      durSum += r ? r.durationSec : 0;
    }
    out += '| ' + [stage, def.recommendedCp, ratio.toFixed(1), f.cp, (f.cp / def.recommendedCp).toFixed(2), f.level, f.nodes,
      wins + '/' + SEEDS.length, wins > 0 ? Math.round(hpSum / wins * 100) + '%' : '—', lossFloors.join(' ') || '—',
      Math.round(durSum / SEEDS.length)].join(' | ') + ' |\n';
  }
}
console.log(out);
const outDir = arg('out', '');
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'difficulty.md'), out);
  console.log('Đã ghi ' + path.join(outDir, 'difficulty.md'));
}
