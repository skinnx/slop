// Chạy bot trên một seed và thu bảng tiến độ, mốc vượt tầng, khoảng lâu nhất không tiến bộ.
import { createGame } from '../../game/assets/scripts/core/index';
import type { Game, GameData } from '../../game/assets/scripts/core/index';
import { Bot, BotOptions, BotStats, fmtTime } from './bot';
import { SimClock } from './load';

export interface ProgressRow {
  sec: number;
  playerLevel: number;
  cp: number;
  heroesOwned: number;
  squadSlots: number;
  squadLevels: number[];
  trainingNodes: number;
  buildings: string;
  bestStage: number;
  bestFloor: number;
  resources: string;
  totalDraws: number;
  quest: string;
}

export interface SimReport {
  seed: number;
  hours: number;
  rows: ProgressRow[];
  /** Giây mô phỏng lúc vượt tầng 5, 10, 15, 20, 25, 30 (undefined = chưa vượt). */
  floorClearSec: { [floor: number]: number };
  /** Khoảng dài nhất (giây) không có tiến bộ nào, và nó bắt đầu lúc nào. */
  longestStallSec: number;
  longestStallStartSec: number;
  stats: BotStats;
  /** Thu nhập theo nguồn: income[nguồn][tài nguyên]. Nguồn: field_pickup, gather, production, quest, dungeon_loot, stage_reward. */
  income: { [source: string]: { [res: string]: number } };
  /** Số quái hạ ngoài đồng và trong dungeon. */
  fieldKills: number;
  dungeonKills: number;
  wallMs: number;
  steps: number;
  final: ProgressRow;
}

const SHORT: { [type: string]: string } = {
  storage: 'Kho', lumber_camp: 'Gỗ', tavern: 'Quán', ore_mine: 'Mỏ', training_yard: 'Tập', market: 'Chợ', dungeon_gate: 'Cổng',
};

export function snapshot(game: Game): ProgressRow {
  const heroes = game.getHeroList();
  const levels: number[] = [];
  let owned = 0;
  for (const h of heroes) { if (h.owned) owned++; if (h.inSquad) levels.push(h.level); }
  const d = game.getDungeonInfo();
  const r = game.resources;
  const order = ['storage', 'lumber_camp', 'tavern', 'ore_mine', 'training_yard', 'market', 'dungeon_gate'];
  const parts: string[] = [];
  for (const type of order) {
    const b = game.findBuilding(type);
    if (b) parts.push(SHORT[type] + b.level + (b.job ? '+' : ''));
  }
  const q = game.quest;
  return {
    sec: game.playSec,
    playerLevel: game.player.level,
    cp: game.squadCp,
    heroesOwned: owned,
    squadSlots: game.squadSlots,
    squadLevels: levels,
    trainingNodes: game.getTrainingInfo().nodesUnlocked,
    buildings: parts.join(' '),
    bestStage: d.bestStageCleared,
    bestFloor: d.bestFloorCleared,
    resources: 'vàng ' + r.gold + ', thịt ' + r.meat + ', gỗ ' + r.wood + ', quặng ' + r.ore + ', san hô ' + r.coral + ', vé ' + r.tickets,
    totalDraws: game.getTavernInfo().totalDraws,
    quest: q.finished ? 'xong chuỗi' : q.id + ' ' + q.text + ' (' + q.progress + '/' + q.target + ')',
  };
}

export interface SimOptions {
  seed: number;
  hours: number;
  rowEveryMin?: number;
  bot?: BotOptions;
  /** Dừng sớm khi đã vượt tầng này (0 = chạy hết giờ). */
  stopAtFloor?: number;
}

export function simulate(data: GameData, opts: SimOptions): SimReport {
  const clock = new SimClock(data.tuning.sim.stepsPerSec);
  const game = createGame({ data, clock, seed: opts.seed });
  const bot = new Bot(game, opts.bot || {});
  const totalSteps = Math.round(opts.hours * 3600 * data.tuning.sim.stepsPerSec);
  const rowEvery = Math.round((opts.rowEveryMin || 15) * 60 * data.tuning.sim.stepsPerSec);
  const rows: ProgressRow[] = [];
  const floorClearSec: { [floor: number]: number } = {};
  let bestFloor = 0;
  let lastProgressSec = 0;
  let longest = 0;
  let longestStart = 0;
  const t0 = Date.now();
  let steps = 0;
  const income: { [source: string]: { [res: string]: number } } = {};
  const earn = (source: string, res: string, n: number) => {
    if (!(n > 0)) return;
    const row = income[source] || (income[source] = {});
    row[res] = (row[res] || 0) + n;
  };
  let fieldKills = 0;
  let dungeonKills = 0;

  const progress = () => {
    const gap = game.playSec - lastProgressSec;
    if (gap > longest) { longest = gap; longestStart = lastProgressSec; }
    lastProgressSec = game.playSec;
  };
  const newFloor = (floor: number) => {
    if (floor <= bestFloor) return;
    for (let f = bestFloor + 1; f <= floor; f++) if (f % 5 === 0) floorClearSec[f] = game.playSec;
    bestFloor = floor;
    progress();
  };

  for (let i = 1; i <= totalSteps; i++) {
    bot.act();
    clock.tick();
    game.step();
    steps = i;
    const n = game.eventCount;
    if (n > 0) {
      const ev = game.events;
      for (let k = 0; k < n; k++) {
        const e = ev[k];
        switch (e.type) {
          // "tiến bộ" theo 02-balance.md mục 5.1: lên cấp người chơi, công trình lên cấp, hero lên cấp, nấc mới, tầng mới
          case 'player_level': case 'build_done': case 'hero_level': case 'training_unlocked': progress(); break;
          case 'floor_clear': newFloor(e.id); break;
          case 'result':
            if (e.data.outcome === 'victory') newFloor(e.data.stage * data.tuning.dungeon.floorsPerStage);
            for (const k of Object.keys(e.data.loot)) earn('dungeon_loot', k, e.data.loot[k]);
            for (const k of Object.keys(e.data.stageReward)) earn('stage_reward', k, e.data.stageReward[k]);
            break;
          case 'gather': earn('gather', e.key, e.n); break;
          case 'pickup': if (game.mode !== 'dungeon' && game.mode !== 'result') earn('field_pickup', e.key, e.n); break;
          case 'collect': earn('production', e.key, e.n); break;
          case 'quest_claimed': for (const k of Object.keys(e.data)) earn('quest', k, e.data[k]); break;
          case 'exp': if (game.mode === 'dungeon') dungeonKills++; else fieldKills++; break;
        }
      }
      bot.onEvents(ev, n);
      game.clearEvents();
    }
    if (i % rowEvery === 0) rows.push(snapshot(game));
    if (opts.stopAtFloor && bestFloor >= opts.stopAtFloor) break;
  }
  const tail = game.playSec - lastProgressSec;
  if (tail > longest) { longest = tail; longestStart = lastProgressSec; }
  return {
    seed: opts.seed, hours: opts.hours, rows, floorClearSec, longestStallSec: longest, longestStallStartSec: longestStart,
    stats: bot.stats, income, fieldKills, dungeonKills, wallMs: Date.now() - t0, steps, final: snapshot(game),
  };
}

export function rowsToMarkdown(rows: ProgressRow[]): string {
  const head = '| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |\n'
    + '|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  return head + rows.map((r) => '| ' + [fmtTime(r.sec), r.playerLevel, r.cp, r.heroesOwned, r.squadSlots, r.squadLevels.join(', '),
    r.trainingNodes, r.buildings, r.bestStage, r.bestFloor, r.resources, r.totalDraws, r.quest].join(' | ') + ' |').join('\n') + '\n';
}

export function rowsToCsv(rows: ProgressRow[]): string {
  const esc = (v: any) => '"' + String(v).replace(/"/g, '""') + '"';
  const head = ['time', 'sec', 'playerLevel', 'squadCp', 'heroesOwned', 'squadSlots', 'squadHeroLevels', 'trainingNodes', 'buildings',
    'bestStage', 'bestFloor', 'resources', 'totalDraws', 'quest'].join(',');
  return head + '\n' + rows.map((r) => [fmtTime(r.sec), Math.round(r.sec), r.playerLevel, r.cp, r.heroesOwned, r.squadSlots,
    esc(r.squadLevels.join(' ')), r.trainingNodes, esc(r.buildings), r.bestStage, r.bestFloor, esc(r.resources), r.totalDraws, esc(r.quest)].join(',')).join('\n') + '\n';
}
