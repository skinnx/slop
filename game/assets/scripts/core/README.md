# Lõi luật chơi (`core/`)

Thư mục này chứa toàn bộ luật cột mốc 1, viết bằng TypeScript thuần. Không import `cc`, không dùng biến
trình duyệt, không đọc đồng hồ, không dùng `Math.random`. Cùng một seed và cùng chuỗi lệnh thì cho cùng kết quả.

- **Điểm vào duy nhất cho view: `core/index.ts`.** Đừng import các file khác trong `core/`.
- **Hợp đồng: `core/contract.ts`.** Mọi kiểu trạng thái, lệnh, sự kiện và câu hỏi cho panel nằm ở đó, có chú thích.
- Luật: `01-game-design.md`. Số liệu: `game/assets/resources/data/*.json`.

## 1. View dùng lõi thế nào

### 1.1 Khởi tạo

```ts
import { buildGameData, createGame, DATA_FILES, SaveError } from './core/index';
import type { Game, RawTables, SaveData } from './core/index';

// 1) Nạp các bảng JSON (tên trong DATA_FILES, không đuôi; hiện có 14 bảng) qua AssetLoader.
const raw: RawTables = {};
for (const f of DATA_FILES) raw[f] = await loader.json('data/' + f);
const data = buildGameData(raw);            // ném DataError (liệt kê mọi lỗi) nếu bảng sai

// 2) Đồng hồ thật do view cấp. Lõi không tự đọc giờ.
const clock = { nowMs: () => Date.now() };

// 3) Tạo ván. Có save thì truyền object đã JSON.parse.
const text = sys.localStorage.getItem(data.tuning.save.key);
let game: Game;
try {
  game = createGame({ data, clock, save: text ? JSON.parse(text) : null, seed: Date.now() >>> 0 });
} catch (e) {                               // SaveError: bản lưu hỏng hoặc mới hơn bản game
  game = createGame({ data, clock, seed: Date.now() >>> 0 });
}
if (game.offlineReport && game.offlineReport.showPanel) { /* mở panel "Chào mừng trở lại" */ }
```

Lõi không có chế độ `TITLE`: màn tiêu đề là việc của view. Chạm màn tiêu đề thì gọi `createGame`.

### 1.2 Vòng lặp mỗi frame

```ts
update(dt: number) {
  this.acc = Math.min(this.acc + dt, 0.25);         // chặn dồn bước khi tab bị treo
  while (this.acc >= game.stepSec) { game.step(); this.acc -= game.stepSec; }

  for (let i = 0; i < game.eventCount; i++) this.onEvent(game.events[i]);   // số nổi, toast, âm thanh...
  game.clearEvents();

  this.draw(game.scene);                              // đọc thẳng trạng thái, không cấp phát
}
```

- Không gọi `step()` khi menu tạm dừng dungeon đang mở. Mở panel khác thì vẫn gọi `step()` và gửi `setJoystick(0, 0)`.
- `game.scene` là thế giới đang hiện: ngoài đồng/làng (`kind: 'field'`) hoặc phòng dungeon (`kind: 'dungeon'`).
  `scene.heroes`, `scene.monsters`, `scene.pickups`, `scene.telegraphs` là mảng được sửa tại chỗ.
- **Tra đơn vị theo `id`**, đừng giữ tham chiếu object qua nhiều frame: lõi tái sử dụng object.
  `id` tăng dần và không lặp lại trong một phiên.
- `scene.monsters` ngoài đồng chứa mọi quái trên bản đồ (khoảng 130). View tự lọc theo camera.
- `hp` có thể là số lẻ (do hồi máu theo giây). Làm tròn khi hiển thị.
- `game.field.nodes` (cây, đá) và `game.field.camps` (ổ quái) có chỉ số cố định theo `field-layout.json`.
- HUD đọc mỗi frame: `game.player`, `game.resources`, `game.storageCap(res)`, `game.squadCp`, `game.quest`,
  `game.buildings`, `game.buildersFree`, `game.leaderZone`, `game.run` (trong dungeon), `game.result`.
- `game.player.expToNext` là **tổng EXP của cấp hiện tại** (không phải phần còn thiếu); `exp` là phần đã tích trong
  cấp. Thanh EXP = `exp / expToNext`.
- `building.marker` cho biết vẽ gì trên công trình (`'job'`, `'buffer'`, `'alert'` = dấu "!", `'check'` = dấu check,
  `'none'`), đã chọn theo thứ tự ưu tiên của đặc tả UX. View không tự so vàng, quặng hay CP.
- `game.quest.icon` là icon của thẻ nhiệm vụ (bảng `display.json`).

### 1.3 Lệnh

Mọi lệnh là một hàm của `game`, trả về `Check { ok, reason, n, key, text }`. `text` là câu tiếng Việt sẵn dùng
cho toast hoặc chữ trên nút xám (ví dụ "Cần cấp người chơi 5", "Thiếu 20 gỗ", "Có quái ở gần!").

| Người chơi làm | Gọi |
|---|---|
| Kéo / thả joystick | `setJoystick(x, y)`: vector **trong tọa độ ô của lõi**, độ dài = độ lệch 0..1; thả tay = `(0, 0)`. Đổi từ vector joystick trên màn hình bằng `joystickToWorld(data, jx, jy, out)` |
| Về làng / Ra đồng | `returnToVillage()`, `goToField()`; hỏi trước bằng `canReturnToVillage()`, `canGoToField()` |
| Vào / thoát chế độ xây | `enterBuildMode()`, `exitBuildMode()`; `canEnterBuildMode()` |
| Bóng công trình | `findFreeCell(type, nearX, nearY)`, `checkPlacement(type, x, y)`, `checkMove(uid, x, y)` |
| ✓ xây / dời | `placeBuilding(type, x, y)`, `moveBuilding(uid, x, y)` (chỉ trong chế độ xây) |
| Nâng cấp, hủy, thu | `upgradeBuilding(uid)`, `cancelBuildingJob(uid)`, `collectBuilding(uid)`, `collectAll()` |
| Tuyển, đổi thẻ, đổi Vé | `recruit(1 \| 2 \| 3)`, `refreshCards()`, `exchangeTickets(id, heroId)` |
| Lên cấp hero | `levelUpHero(heroId)` |
| Xếp đội | `squadAdd`, `squadRemove`, `squadSwap`, `squadReplace`, `setSquad`, `autoAssign()` |
| Sân Tập | `unlockTrainingNode()`, `unlockSquadSlot()` |
| Dungeon | `enterDungeon(stage)`, `setAuto(on)`, `leaveDungeon()`, `closeResult()` |
| Nhiệm vụ | `claimQuest()`, `getQuestHint()` |
| Cài đặt, lưu | `setSetting('music' \| 'sfx', on)`, `save()` |

Kỹ năng hero tự kích hoạt (thiết kế mục 8.4), nên không có lệnh "dùng kỹ năng".

### 1.4 Dữ liệu cho panel

Các hàm `get...()` trả về object mới với mọi thứ panel cần, kể cả giá, thứ đang thiếu và lý do bị khóa. View
không tính lại luật nào.

| Panel | Hàm |
|---|---|
| Khay công trình trong chế độ xây | `getBuildMenu()` |
| Panel công trình / nâng cấp | `getBuildingPanel(uid)` (dòng chỉ số, chênh lệch cấp kế, giá, `canUpgrade`, `canCollect`) |
| Danh sách và chi tiết hero | `getHeroList()`, `getHeroInfo(id)` (HP/ATK/CP, "+X" cấp kế, mảnh, mốc, kỹ năng kèm `typeName` và `paramNames` tiếng Việt, `canLevelUp`) |
| Xếp đội | `getSquadInfo()` (CP đội, kết quả TỰ XẾP xem trước, `canImprove` cho mũi tên xanh) |
| Quán | `getTavernInfo()` (thẻ, đồng hồ, BONUS, `recruitOptions`: giá và lý do khóa của từng nút 1x/2x/3x, bảng đổi Vé) |
| Sân Tập | `getTrainingInfo()` |
| Cổng Xoáy | `getDungeonInfo()` (CP đề nghị và CP đội, nhãn độ khó, thưởng, `canEnter`, `readyStage`) |
| Thẻ nhiệm vụ | `game.quest` (đọc mỗi frame), `getQuestHint()` |

### 1.5 Sự kiện

`game.events[0 .. game.eventCount)` là các sự kiện một lần kể từ lần `clearEvents()` trước. Mọi sự kiện cùng một
hình dạng `{ type, x, y, n, id, id2, key, text, data }`; bảng ý nghĩa từng trường theo `type` nằm trong
`contract.ts` (tìm "Sự kiện một lần"). Ví dụ: `damage` (số đỏ), `exp`, `gather` ("+2"), `pickup` ("Vàng +6"),
`player_level`, `streak_bonus`, `telegraph`, `toast` (đã có `text`), `quest_complete`, `recruit`
(`data: RecruitResult`), `result` (`data: ResultView`), `save_point`.

### 1.6 Lưu và tải

- Khi thấy sự kiện `save_point` (sau mỗi giao dịch, mỗi 15 s chơi, khi lượt dungeon kết thúc) và khi app ẩn:
  `sys.localStorage.setItem(data.tuning.save.key, JSON.stringify(game.save()))`.
- Trong dungeon `game.save()` trả về trạng thái trước khi vào hang. Thoát app giữa lượt thì lượt bị hủy.
- Tải: `createGame({ data, clock, save })`. Lõi tự tính tiến độ ngoại tuyến (trần 8 giờ) và ghi vào
  `game.offlineReport`. Nút "THU HẾT" gọi `game.collectAll()`.

### 1.7 Tọa độ

- Lõi dùng tọa độ ô liên tục. Công trình `{ x, y, w, h }` phủ các ô `[x, x+w) × [y, y+h)`; tâm là `(x + w/2, y + h/2)`.
- `worldToIso(data, x, y, out)` và `isoToWorld(data, sx, sy, out)` đổi giữa ô và màn hình iso theo
  `tuning.render` (công thức ở thiết kế mục 4.2). `depthKey(x, y)`: giá trị lớn hơn vẽ trước.
- `game.cellAt(x, y)`, `game.inVillageGrid(cx, cy)`, `game.zoneAt(x, y)`, `game.buildingAt(x, y)`.
- Phòng dungeon có hệ tọa độ riêng: `0..roomW × 0..roomH` (`game.run.roomW/roomH`, `scene.bounds`).

## 2. Cấu trúc bên trong

| File | Việc |
|---|---|
| `index.ts` | Điểm vào: `createGame`, `buildGameData`, re-export hợp đồng |
| `contract.ts` | Hợp đồng với view (chỉ có kiểu) |
| `data.ts` | Kiểu của các bảng JSON, validator, `buildGameData` |
| `game.ts` | `GameImpl`: ghép mọi phần, lệnh, câu hỏi cho panel, nhiệm vụ, đồng hồ, lưu |
| `arena.ts` | Đấu trường dùng chung: đơn vị, di chuyển, tách va chạm, đòn đánh, kỹ năng, vật rơi |
| `field.ts` | Ngoài đồng: nút tài nguyên, ổ quái, gây hấn, hồi sinh, về làng |
| `dungeon.ts` | Hang Xoáy: sinh quái, boss và báo đòn, chuỗi hạ gục, qua tầng |
| `village.ts` | Công trình, đặt/dời/nâng/hủy, thợ, sản xuất, thu |
| `tavern.ts` | Tạo bộ thẻ, rút thẻ |
| `formulas.ts` | Chỉ số hero, CP, giá lên cấp |
| `save.ts` | Đọc và làm sạch bản lưu, chuyển đổi phiên bản |
| `checks.ts` | `Check` và câu chữ tiếng Việt cho từng lý do |
| `rng.ts`, `iso.ts`, `constants.ts` | RNG có seed, đổi tọa độ iso, hằng số luật không có trong JSON |

## 2.1 Kiểm chứng

| Lệnh (trong `tools/`) | Việc |
|---|---|
| `npm run typecheck` | `tsc` cho `game/` (cùng `cc.d.ts` 3.8.8) và `tools/` |
| `npm test` | vitest; test của lõi nằm trong `tools/tests/core/` |
| `npm run sim` | Bot chơi 5 seed × 6 giờ mô phỏng, in bảng tiến độ mỗi 15 phút và kết luận ĐẠT/TRƯỢT |
| `npm run sim -- --seeds 1,2,3 --hours 10 --out ../docs/evidence/m1/sim --verbose` | Chọn seed, số giờ, thư mục ghi `bot-report.md` + `seed-N.csv`, in nhật ký quyết định của bot |
| `npm run sim:difficulty` | Đo tỉ lệ thắng của từng chặng theo tỉ lệ CP đội / CP đề nghị (đội dựng qua bản lưu, bot điều khiển) |

Test theo chủ đề: `data` (bảng hợp lệ, khớp bản gốc thiết kế, bảng sai báo lỗi rõ), `formulas` (chỉ số, CP, giá),
`village` (đặt, thợ, nâng, hủy, trần kho, sản xuất), `recruit` (lượt đầu, BONUS, tỉ lệ, mọi hero lấy được), `squad`
(TỰ XẾP, ô đội, Sân Tập), `combat` (đánh khi đứng yên, thu thập, ổ quái, vật rơi, chết), `skills`, `dungeon` (sinh
quái, chuỗi, boss và báo đòn, thắng/thua), `quests`, `save` (lưu/tải, phiên bản, ngoại tuyến), `determinism`
(cùng seed cùng kết quả, hiệu năng, bot chạy ngắn).

Bot (`tools/sim/bot.ts`) chỉ import `core/index` và chỉ gọi các lệnh của người chơi; một test chặn việc bot ép kiểu
để với vào bên trong. `tools/sim/run-ts.mjs` dùng esbuild để chạy TypeScript của bot dưới Node (lõi import không ghi
đuôi `.ts` nên Node thuần không chạy được).

## 3. Quyết định khi cài đặt

Những chỗ tài liệu thiết kế im lặng hoặc tự mâu thuẫn. Mỗi mục ghi tôi chọn gì và vì sao.

1. **Không có chế độ `TITLE` trong lõi.** Thiết kế mục 3.2 liệt kê `TITLE`, nhưng nó chỉ là "chạm rồi tải save". View giữ màn tiêu đề và gọi `createGame`.
2. **JSON thắng bảng trong tài liệu.** Cây Bãi Vỏ Sò cho 2 gỗ mỗi nhát theo `field-layout.json` (bảng ở mục 6.1 ghi 1). Trọng số hero chưa có là `unownedWeight` = 2 (câu chữ `heroPickRule` ghi 3).
3. **"Hồi chiêu bắt đầu đầy" nghĩa là phải chờ hết `cooldownSec` mới dùng được lần đầu.** Áp dụng đầu mỗi tầng dungeon, và ngoài đồng khi đội vào trận sau ít nhất 5 s không chiến đấu.
4. **Nhát thu thập cuối không vượt độ bền còn lại.** Hero `gatherPower` 2 đánh nút còn 1 độ bền chỉ nhận phần của 1 độ bền. Nhờ vậy tổng tài nguyên mỗi nút đúng bằng `durability × yieldPerHit`.
5. **Nhiệm vụ `gather` đếm lượng đã chặt, kể cả khi kho đầy.** Kho đầy không được chặn nhiệm vụ.
6. **Trần kho.** Vật nhặt, thu thập, thu sản lượng và vật mang về từ dungeon bị trần kho cắt (phần vượt bị bỏ, có toast). **Thưởng nhiệm vụ và hoàn tiền khi hủy xây không bị cắt**, để người chơi không mất thưởng vì kho nhỏ.
7. **Tiến độ ngoại tuyến có trần cho cả timer.** Thiết kế vừa ghi timer dùng mốc tuyệt đối, vừa ghi trần 8 giờ. Khi vắng quá 8 giờ, lõi dời mọi mốc (`endsAt`, đồng hồ Quán) về sau đúng phần vượt, nên chỉ 8 giờ được tính. Đồng hồ lùi: không có tiến độ, thời gian còn lại của timer giữ nguyên. Cùng luật áp dụng khi app bị treo lâu giữa hai bước.
8. **Bộ thẻ đầu tiên [Lan, Sẻ, Đăng] không đổi cho tới lượt tuyển đầu.** Đồng hồ Quán bắt đầu chạy khi Quán xây xong; trước lượt đầu, tự đổi thẻ bị bỏ qua và nút ⟳ bị khóa (`first_draw_pending`). Nhờ vậy lượt đầu luôn ra Sẻ.
9. **2x/3x và BONUS (quyết định của trưởng nhóm).** Cả lần bấm 1x/2x/3x rút từ bộ thẻ đang hiện lúc bấm. Nếu thanh BONUS đầy giữa chừng, bộ thẻ BONUS có hiệu lực **sau khi** lần bấm kết thúc; các lượt sau lượt làm đầy được tính cho thanh kế tiếp (ví dụ thanh 9/10, bấm 3x: rút 3 lượt từ bộ cũ, rồi đổi bộ, thanh còn 1/10). Thiết kế mục 9.3 ghi "làm mới ngay" nhưng không nói rõ trường hợp giữa một lần bấm; màn "Nhận Hero" (mục 9.5) chỉ có chỗ cho một bộ ba thẻ. `RecruitResult` có `cards`, `bonusRefreshed`, `cardsAfter`.
10. **Đổi Vé `frag5`** cho `fragmentsPerDuplicate` mảnh (5). Mọi dòng đổi hero đều cho chọn hero.
11. **Kỹ năng.** `nova` và `taunt` chỉ dùng khi có ít nhất một quái trong bán kính quanh hero (không phí chiêu vào chỗ trống). Kỹ năng trượt (mục tiêu chết hoặc ra khỏi tầm lúc hết gồng) thì không tính hồi chiêu. Hồi máu không cần mục tiêu, gồng 0.2 s, và không bắt hero dừng khi đội đang đi. Hai buff ATK không cộng dồn: giữ mức cao hơn, làm mới thời gian.
12. **Boss.** Hồi chiêu kỹ năng boss tính từ lúc bắt đầu gồng. Húc Lao gây sát thương lúc hết báo đòn cho hero có tâm trong hình chữ nhật, rồi boss lao 0.4 s. Gọi Bầy không xếp hàng: chỉ gọi số quái còn chỗ trong giới hạn 60. Boss luôn xuất hiện dù phòng đang đủ 60 quái.
13. **Thắng chặng.** Boss chết thì vật rơi còn trên đất được nhặt hết ngay, vì thiết kế nói vật rơi không bao giờ mất.
14. **`bestFloorCleared` có trong save.** Nhiệm vụ "Vượt tầng 1" cần biết tầng cao nhất đã vượt, mẫu save của thiết kế chỉ có chặng. Tầng được tính ngay khi sạch quái, kể cả khi lượt đó thua sau đó.
15. **Xếp đội khi có hero đang gục:** hero bị bỏ ra rồi cho vào lại sẽ đầy máu. Chấp nhận trong M1.
16. **Quái ở xa đứng yên.** Ổ quái cách thủ lĩnh hơn 16 ô không lảng vảng (ngoài tầm nhìn; tiết kiệm tính toán). Đồng hồ mọc lại vẫn chạy.
17. **Lệnh qua panel công trình không kiểm tra khoảng cách.** Thiết kế không yêu cầu đứng gần công trình. View chỉ mở panel khi chạm công trình trên màn hình. Bot tự giới hạn: chỉ dùng panel khi thủ lĩnh ở trong làng.
18. **Đặt và dời công trình chỉ trong chế độ xây**; nâng cấp, hủy, thu dùng được ở cả `world` và `build`.
19. **Thứ tự ô khi TỰ XẾP:** thủ lĩnh là tank CP cao nhất trong đội được chọn; không có tank thì hero cận chiến CP cao nhất.
20. **`recruit.json` mô tả lượt tuyển đầu bằng câu chữ** (`firstRecruitScript`). `buildGameData` đọc id từ câu đó nếu bảng chưa có `firstHero` / `firstCards`. Đề nghị thiết kế thêm hai trường này vào JSON.

21. **Bước mô phỏng là đúng 1/30 s** (`1 / tuning.sim.stepsPerSec`). `fixedStepSec` trong JSON là số đã làm tròn (0.0333333); dùng nó thì đòn đánh 1.1 s sẽ thành 34 bước thay vì 33. Mọi đồng hồ đếm lùi coi như hết khi còn dưới 1e-6 s.
22. **Vào trận ngoài đồng:** hồi chiêu đặt lại đầy ngay khi hero đầu tiên có mục tiêu quái (sau ít nhất 5 s không chiến đấu), trước khi đòn đầu tiên được chọn. Nhờ vậy đòn mở đầu không bao giờ là kỹ năng.
23. **Hệ số lượng theo vùng áp cho mọi dòng rơi**, kể cả San Hô Đỏ của Cua Càng Thép (ở Gò Đá Lam: 2 San Hô mỗi lần rơi). Đây là luật ở mục 6.3 đọc theo nghĩa đen.
24. **Vật mang về từ dungeon** được cộng vào kho lúc lượt kết thúc (thắng, thua hoặc rời hang). Thịt vẫn theo trần kho.
25. **Thoát app giữa lượt dungeon:** bản lưu trước khi vào hang ghi vị trí đội là cạnh Cổng Xoáy, đúng như mục 13.5.
26. **Thẻ nhiệm vụ cập nhật ở bước mô phỏng kế tiếp** sau một lệnh (ví dụ sau khi tuyển). `claimQuest()` tự tính lại trước khi kiểm tra.
27. **Hủy xây mới** gỡ luôn giàn giáo (công trình biến mất) và hoàn 100%.
28. **Tầng boss:** boss chết là thắng ngay, kể cả khi nhóm quái đến trễ (sau 10 s) chưa kịp xuất hiện.
29. **Đồng hồ đổi thẻ của Quán** bắt đầu chạy ở bước đầu tiên sau khi Quán xây xong.

30. **Bảng `display.json` chỉ có ở phía game.** Nó chứa icon của nhiệm vụ theo loại, tên tiếng Việt của loại kỹ năng và tham số kỹ năng, icon của các dòng chỉ số công trình. Không có số liệu cân bằng. `docs/design/data` chưa có bảng này; đề nghị thiết kế nhận nó về làm bản gốc.
31. **Dấu "!" trên Quán** hiện khi đủ vàng cho một lượt tuyển. Đặc tả UX còn ghi "hoặc thanh BONUS đầy", nhưng thanh không bao giờ đứng ở trạng thái đầy (đầy là đổi thẻ rồi về 0), nên điều kiện đó không có hiệu lực.

### Hằng số không có trong JSON

Thiết kế ghi các số này bằng chữ nhưng `tuning.json` không có khóa tương ứng. Chúng nằm trong `constants.ts`:
xác nằm 1 s; gồng về làng 1 s; boss lao 0.4 s; Gọi Bầy bán kính 2 ô; volley tầm `attackRange + 1`; +0.05 CP cho
kỹ năng 2 sao. Thêm ba số thiết kế không ghi: bán kính nút tài nguyên 0.4 ô, khoảng cách nhặt vật rơi 0.3 ô,
khoảng cách "quái ở xa" 16 ô. Nếu thiết kế muốn chỉnh, chuyển chúng sang `tuning.json`.

## 4. Nhật ký thay đổi hợp đồng

| Phiên bản | Thay đổi |
|---|---|
| 1 | Bản đầu. |
| 2 | **Chỉ thêm, không bỏ hay đổi kiểu trường nào.** (1) `setJoystick`: ghi rõ vector là tọa độ ô của lõi; thêm hàm `joystickToWorld`. (2) `PlayerView.expToNext`: ghi rõ là tổng EXP của cấp. (3) `TavernInfo.recruitOptions[]` (`times`, `costGold`, `affordable`, `check`). (4) `BuildingView.marker` và `DungeonInfo.readyStage`. (5) Bảng mới `display.json` (đã nằm trong `DATA_FILES`), `GameData.display`, `QuestView.icon`, `SkillInfo.typeName`, `SkillInfo.paramNames`, `StatRow.icon`. (6) **Đổi hành vi:** lần bấm 2x/3x rút hết từ bộ thẻ lúc bấm, bộ thẻ BONUS đổi sau lần bấm; thêm `RecruitResult.cards`, `bonusRefreshed`, `cardsAfter`. View có thể bỏ: phép nhân `costGold × multi`, phép so `squadCp >= recommendedCp` cho dấu check, các bảng `QUEST_ICON`, `SKILL_KIND`, `PARAM_NAME`, `ROW_ICON`. |
