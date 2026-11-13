// Đo đường đi của người chơi mới chỉ làm theo thẻ nhiệm vụ:  cd tools && npm run sim:newplayer [-- --seeds 300 --out <thư mục>]
// Với mỗi seed và mỗi cách tiêu thịt, chạy CardPlayer từ save mới tới khi nhận thưởng nhiệm vụ đích (mặc định q21:
// hạ boss tầng 5) và ghi thời gian từng nhiệm vụ, tình trạng lúc q14 hiện ra, các câu "bị khóa" game đã hiện.
import fs from 'node:fs';
import path from 'node:path';
import { createGame } from '../../game/assets/scripts/core/index';
import type { GameData } from '../../game/assets/scripts/core/index';
import { loadGameData, SimClock } from './load';
import { CardPlayer, CardPlayerOptions } from './cardplayer';
import { fmtTime } from './bot';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

interface RunResult { player: CardPlayer; endSec: number; finished: boolean; }

function runOne(data: GameData, seed: number, opts: CardPlayerOptions, maxHours: number): RunResult {
  const clock = new SimClock(data.tuning.sim.stepsPerSec);
  const game = createGame({ data, clock, seed });
  const player = new CardPlayer(game, opts);
  const steps = Math.round(maxHours * 3600 * data.tuning.sim.stepsPerSec);
  for (let i = 0; i < steps && !player.done; i++) {
    player.act();
    clock.tick();
    game.step();
    if (game.eventCount > 0) { player.onEvents(game.events, game.eventCount); game.clearEvents(); }
  }
  return { player, endSec: game.playSec, finished: player.done };
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1) + 0.5))];
}

const data = loadGameData();
const nSeeds = Number(arg('seeds', '300'));
const stopAfter = arg('until', 'q21');
const maxHours = Number(arg('hours', '4'));
const outDir = arg('out', '');
const questText: { [id: string]: string } = {};
for (const q of data.quests.quests) questText[q.id] = q.text;

let out = '# Người chơi mới chỉ làm theo thẻ nhiệm vụ\n\n';
out += 'Lệnh: `cd tools && npm run sim:newplayer -- --seeds ' + nSeeds + ' --until ' + stopAfter + '`\n\n';
out += 'Người chơi giả (`tools/sim/cardplayer.ts`) chỉ làm điều thẻ nhiệm vụ đang yêu cầu. Khi nút bị khóa, họ đọc lý do game hiện '
  + '(câu chữ `Check.text` của lõi) và đi lấy đúng thứ đang thiếu: thiếu gỗ thì chặt cây, thiếu thịt thì đánh quái rơi thịt ở Bãi Vỏ Sò, '
  + 'thiếu cấp người chơi thì đánh quái ở Bãi Vỏ Sò. Không farm thêm, không tuyển thêm, không nâng công trình ngoài yêu cầu. '
  + 'Sau khi thua dungeon, họ làm theo gợi ý của màn thua trong 3 phút (tiêu thịt, vàng, quặng; đánh quái) rồi thử lại. '
  + 'Thời gian là thời gian chơi mô phỏng; panel mở tức thì.\n\n';

for (const policy of ['focused', 'spread'] as const) {
  const results: RunResult[] = [];
  for (let seed = 1; seed <= nSeeds; seed++) results.push(runOne(data, seed, { levelPolicy: policy, stopAfterQuest: stopAfter }, maxHours));
  const finished = results.filter((r) => r.finished);
  out += '## Cách tiêu thịt: ' + (policy === 'focused'
    ? '`focused` — dồn thịt cho hero cấp cao nhất trong đội'
    : '`spread` — luôn nâng hero cấp thấp nhất trong đội (chia đều, tốn thịt nhất)') + '\n\n';
  out += '- Số seed: ' + nSeeds + '. Đi tới hết ' + stopAfter + ' trong ' + maxHours + ' giờ: **' + finished.length + '/' + nSeeds + '**.\n';
  const total = finished.map((r) => r.endSec).sort((a, b) => a - b);
  if (total.length > 0) {
    out += '- Thời gian tới khi nhận thưởng ' + stopAfter + ': nhanh nhất ' + fmtTime(total[0]) + ', trung vị ' + fmtTime(pct(total, 0.5))
      + ', 90% ' + fmtTime(pct(total, 0.9)) + ', chậm nhất ' + fmtTime(total[total.length - 1]) + '.\n';
  }
  const attempts = results.map((r) => r.player.dungeonAttempts).sort((a, b) => a - b);
  const defeats = results.map((r) => r.player.dungeonDefeats).sort((a, b) => a - b);
  out += '- Lượt dungeon: trung vị ' + pct(attempts, 0.5) + ', nhiều nhất ' + attempts[attempts.length - 1] + '; số lượt thua: trung vị '
    + pct(defeats, 0.5) + ', nhiều nhất ' + defeats[defeats.length - 1] + '.\n\n';

  // q14
  const q14 = results.map((r) => r.player.q14).filter((x) => !!x);
  const dur14 = results.map((r) => r.player.timings.find((t) => t.id === 'q14')).filter((t) => t && t.endSec >= 0).map((t) => t.endSec - t.startSec).sort((a, b) => a - b);
  const meat = q14.map((x) => x.meat).sort((a, b) => a - b);
  const miss = q14.map((x) => x.meatMissing).sort((a, b) => a - b);
  const frag = q14.filter((x) => x.fragmentsMissing > 0).length;
  const ready = q14.filter((x) => x.meatMissing === 0).length;
  out += '**Lúc q14 ("' + questText.q14 + '") hiện ra** (' + q14.length + ' seed tới được q14):\n\n';
  out += '| | Ít nhất | Trung vị | 90% | Nhiều nhất |\n|---|---|---|---|---|\n';
  out += '| Thịt đang có | ' + [meat[0], pct(meat, 0.5), pct(meat, 0.9), meat[meat.length - 1]].join(' | ') + ' |\n';
  out += '| Thịt còn thiếu để hero được chọn lên cấp 5 | ' + [miss[0], pct(miss, 0.5), pct(miss, 0.9), miss[miss.length - 1]].join(' | ') + ' |\n';
  out += '| Thời gian từ lúc q14 hiện tới lúc xong (giây) | ' + [dur14[0], pct(dur14, 0.5), pct(dur14, 0.9), dur14[dur14.length - 1]].map((v) => Math.round(v)).join(' | ') + ' |\n\n';
  out += '- Đủ thịt ngay lúc q14 hiện (bấm NÂNG CẤP là xong): ' + ready + '/' + q14.length + ' seed.\n';
  out += '- Cần mảnh hero để xong q14: ' + frag + '/' + q14.length + ' seed.\n';
  const texts: { [t: string]: number } = {};
  for (const r of results) {
    const seen: { [t: string]: boolean } = {};
    for (const k of Object.keys(r.player.blockedTexts.q14 || {})) seen[k.replace(/\d+/g, 'N')] = true;
    for (const k of Object.keys(seen)) texts[k] = (texts[k] || 0) + 1;
  }
  out += '- Câu game hiện trên nút NÂNG CẤP khi bị khóa ở q14: ' + (Object.keys(texts).length === 0 ? 'không bị khóa lần nào'
    : Object.keys(texts).map((k) => '"' + k + '" (' + texts[k] + ' seed)').join(', ')) + '.\n\n';

  // từng nhiệm vụ
  out += 'Thời gian từng nhiệm vụ (giây, từ lúc thẻ hiện tới lúc nhận thưởng) và lý do khóa hay gặp nhất:\n\n';
  out += '| Nhiệm vụ | Nội dung | Nhanh nhất | Trung vị | 90% | Chậm nhất | Câu "bị khóa" game đã hiện (số seed) |\n|---|---|---|---|---|---|---|\n';
  for (const q of data.quests.quests) {
    const d = results.map((r) => r.player.timings.find((t) => t.id === q.id)).filter((t) => t && t.endSec >= 0).map((t) => t.endSec - t.startSec).sort((a, b) => a - b);
    if (d.length === 0) break;
    const reasons: { [t: string]: number } = {};
    for (const r of results) {
      const seen: { [t: string]: boolean } = {};
      for (const k of Object.keys(r.player.blockedTexts[q.id] || {})) seen[k.replace(/\d+/g, 'N')] = true;
      for (const k of Object.keys(seen)) reasons[k] = (reasons[k] || 0) + 1;
    }
    const top = Object.keys(reasons).sort((a, b) => reasons[b] - reasons[a]).slice(0, 3).map((k) => k + ' (' + reasons[k] + ')').join('; ');
    out += '| ' + [q.id, q.text, Math.round(d[0]), Math.round(pct(d, 0.5)), Math.round(pct(d, 0.9)), Math.round(d[d.length - 1]), top || '—'].join(' | ') + ' |\n';
    if (q.id === stopAfter) break;
  }
  out += '\n';
  const stuck = results.filter((r) => !r.finished);
  if (stuck.length > 0) {
    const where: { [id: string]: number } = {};
    for (const r of stuck) { const t = r.player.timings[r.player.timings.length - 1]; where[t ? t.id : '?'] = (where[t ? t.id : '?'] || 0) + 1; }
    out += 'Seed chưa tới đích sau ' + maxHours + ' giờ dừng ở: ' + Object.keys(where).map((k) => k + ' (' + where[k] + ')').join(', ') + '.\n\n';
  }
}
console.log(out);
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'newplayer.md'), out);
  console.log('Đã ghi ' + path.join(outDir, 'newplayer.md'));
}
