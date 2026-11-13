// Lệnh chạy bot:  cd tools && npm run sim -- [--seeds 1,2,3,4,5] [--hours 6] [--out <thư mục>] [--verbose]
// In bảng tiến độ mỗi 15 phút mô phỏng cho từng seed và kết luận ĐẠT / TRƯỢT theo docs/design/02-balance.md mục 5.
import fs from 'node:fs';
import path from 'node:path';
import { loadGameData, repoRoot } from './load';
import { simulate, rowsToMarkdown, rowsToCsv, SimReport } from './simulate';
import { fmtTime } from './bot';

// Hạn chót (giây mô phỏng) cho từng mốc, theo 02-balance.md mục 5.1.
const DEADLINES: { floor: number; sec: number; required: boolean }[] = [
  { floor: 5, sec: 45 * 60, required: true },
  { floor: 10, sec: 90 * 60, required: true },
  { floor: 15, sec: 180 * 60, required: true },
  { floor: 20, sec: 360 * 60, required: true },
  { floor: 25, sec: Infinity, required: false },
];
const STALL_LIMIT_SEC = 30 * 60;

function arg(name: string, def: string): string {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const seeds = arg('seeds', '1,2,3,4,5').split(',').map((s) => Number(s.trim())).filter((n) => isFinite(n));
const hours = Number(arg('hours', '6'));
const outDir = arg('out', '');
const verbose = process.argv.indexOf('--verbose') >= 0;
const data = loadGameData();

function verdict(rep: SimReport): { pass: boolean; lines: string[] } {
  const lines: string[] = [];
  let pass = true;
  for (const d of DEADLINES) {
    const at = rep.floorClearSec[d.floor];
    const limit = d.sec === Infinity ? 'không bắt buộc' : fmtTime(d.sec);
    if (at === undefined) {
      if (d.required) pass = false;
      lines.push('| Vượt tầng ' + d.floor + ' | ' + limit + ' | chưa vượt | ' + (d.required ? 'TRƯỢT' : '—') + ' |');
    } else {
      const ok = at <= d.sec;
      if (d.required && !ok) pass = false;
      lines.push('| Vượt tầng ' + d.floor + ' | ' + limit + ' | ' + fmtTime(at) + ' | ' + (d.required ? (ok ? 'ĐẠT' : 'TRƯỢT') : '—') + ' |');
    }
  }
  const stallOk = rep.longestStallSec < STALL_LIMIT_SEC;
  if (!stallOk) pass = false;
  lines.push('| Đoạn dài nhất không tiến bộ (cả ' + rep.hours + ' giờ) | dưới 0:30:00 | ' + fmtTime(rep.longestStallSec) + ' (bắt đầu ở '
    + fmtTime(rep.longestStallStartSec) + ') | ' + (stallOk ? 'ĐẠT' : 'TRƯỢT') + ' |');
  return { pass, lines };
}

function incomeTable(rep: SimReport): string {
  const res = ['gold', 'meat', 'wood', 'ore', 'coral', 'tickets'];
  const names: { [k: string]: string } = {
    field_pickup: 'Quái ngoài đồng (vật rơi)', gather: 'Cây và đá', production: 'Công trình sản xuất', quest: 'Thưởng nhiệm vụ',
    dungeon_loot: 'Dungeon: nhặt, qua tầng, chuỗi', stage_reward: 'Dungeon: thưởng chặng',
  };
  let out = '| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |\n|---|---|---|---|---|---|---|\n';
  for (const src of Object.keys(names)) {
    const row = rep.income[src] || {};
    out += '| ' + names[src] + ' | ' + res.map((r) => row[r] || 0).join(' | ') + ' |\n';
  }
  return out;
}

function reportText(rep: SimReport): { text: string; pass: boolean } {
  const v = verdict(rep);
  let t = '## Seed ' + rep.seed + ': ' + (v.pass ? 'ĐẠT' : 'TRƯỢT') + '\n\n';
  t += '| Mốc | Hạn chót | Bot | Kết quả |\n|---|---|---|---|\n' + v.lines.join('\n') + '\n\n';
  t += 'Bảng tiến độ (mỗi 15 phút mô phỏng):\n\n' + rowsToMarkdown(rep.rows) + '\n';
  const s = rep.stats;
  t += 'Lượt dungeon: ' + s.dungeonRuns + ' (thắng ' + s.dungeonWins + ', thua ' + s.dungeonLosses
    + (s.dungeonLosses > 0 ? ', tầng lúc thua: ' + s.lossFloors.join(' ') : '') + '). Cả đội gục ngoài đồng: ' + s.fieldWipes
    + ' lần. Chuyến về làng: ' + s.villageTrips + '. Quái hạ: ' + rep.fieldKills + ' ngoài đồng, ' + rep.dungeonKills + ' trong dungeon.\n\n';
  t += 'Thu nhập theo nguồn trong ' + rep.hours + ' giờ:\n\n' + incomeTable(rep) + '\n';
  t += 'Thời gian chạy thật: ' + (rep.wallMs / 1000).toFixed(1) + ' s cho ' + rep.steps + ' bước ('
    + (rep.wallMs * 1000 / rep.steps).toFixed(1) + ' µs mỗi bước).\n';
  return { text: t, pass: v.pass };
}

let allPass = true;
const summary: string[] = [];
const parts: string[] = [];
for (const seed of seeds) {
  const rep = simulate(data, { seed, hours, rowEveryMin: 15, bot: { log: verbose ? (m) => console.log('  seed ' + seed + ' ' + m) : undefined } });
  const r = reportText(rep);
  if (!r.pass) allPass = false;
  console.log(r.text);
  parts.push(r.text);
  const f = (n: number) => (rep.floorClearSec[n] === undefined ? '—' : fmtTime(rep.floorClearSec[n]));
  summary.push('| ' + seed + ' | ' + f(5) + ' | ' + f(10) + ' | ' + f(15) + ' | ' + f(20) + ' | ' + f(25) + ' | ' + fmtTime(rep.longestStallSec)
    + ' | ' + rep.final.playerLevel + ' | ' + rep.final.cp + ' | ' + (r.pass ? 'ĐẠT' : 'TRƯỢT') + ' |');
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'seed-' + seed + '.csv'), rowsToCsv(rep.rows));
  }
}

let head = '# Kết quả bot mô phỏng (cột mốc 1)\n\n';
head += 'Lệnh: `cd tools && npm run sim -- --seeds ' + seeds.join(',') + ' --hours ' + hours + (outDir ? ' --out <thư mục>' : '') + '`\n\n';
head += 'Mục tiêu (`docs/design/02-balance.md` mục 5): từ save mới, vượt tầng 5 trước 0:45, tầng 10 trước 1:30, tầng 15 trước 3:00, '
  + '**tầng 20 trước 6:00**, và không có 30 phút mô phỏng liên tiếp nào không tiến bộ. Thời gian là thời gian chơi mô phỏng '
  + '(số bước × 1/30 s), không có thời gian ngoại tuyến.\n\n';
head += '## Tóm tắt: ' + (allPass ? 'ĐẠT' : 'TRƯỢT') + ' (' + seeds.length + ' seed, ' + hours + ' giờ mỗi seed)\n\n';
head += '| Seed | Tầng 5 (≤ 0:45) | Tầng 10 (≤ 1:30) | Tầng 15 (≤ 3:00) | Tầng 20 (≤ 6:00) | Tầng 25 (tham khảo) | Đoạn dài nhất không tiến bộ | Cấp NC cuối | CP cuối | Kết quả |\n';
head += '|---|---|---|---|---|---|---|---|---|---|\n' + summary.join('\n') + '\n\n';
console.log('=====================================================================');
console.log(head);
console.log(allPass ? 'KẾT LUẬN: ĐẠT mọi mục tiêu bot.' : 'KẾT LUẬN: TRƯỢT. Xem các dòng TRƯỢT ở trên.');
if (outDir) {
  fs.writeFileSync(path.join(outDir, 'bot-report.md'), head + parts.join('\n'));
  console.log('Đã ghi ' + path.relative(repoRoot(), path.resolve(outDir, 'bot-report.md')) + ' và seed-*.csv');
}
process.exit(allPass ? 0 : 1);
