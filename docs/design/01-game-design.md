# Thiết kế game: Hải Đội Đảo Sương

Tài liệu này là luật chơi. Lập trình viên làm đúng theo đây. Số liệu nằm trong `docs/design/data/*.json` (xem `02-balance.md`). Bố cục màn hình nằm trong `03-ux-spec.md`. Hình tạm nằm trong `04-placeholder-art.md`. Tên gọi thống nhất nằm trong bảng thuật ngữ ở `README.md`.

## 0. Cách đọc

- **[TC]** = theo tham chiếu: game gốc làm vậy, có ảnh hoặc nguồn trong `docs/reference/gameplay-and-ux-reference.md`.
- **[QĐ]** = quyết định của thiết kế. Tham chiếu chưa xác nhận điều này, hoặc tham chiếu không có. Làm theo quyết định; muốn đổi thì đổi số trong JSON, không đổi luật.
- **[KB]** = khác biệt có chủ đích so với game gốc (phần 10% trong điều lệ).
- Ký hiệu `tuning.x.y` là một khóa trong `data/tuning.json`. `heroes.json`, `buildings.json`... là các file trong `data/`.
- Đơn vị khoảng cách trong lõi là **ô** (1 ô = 1 đơn vị). Thời gian là giây. Mọi tỉ lệ phần trăm trong JSON là số thập phân (0.05 = 5%).
- Mọi số trong tài liệu này là ví dụ đọc cho dễ. Khi số trong tài liệu khác số trong JSON, **JSON thắng**.

## 1. Chủ đề và tên gọi

### 1.1 Thế giới

- Tên tạm của game: **Hải Đội Đảo Sương** (mã: `tidecrew`). Tên cuối do product owner chọn (xem `05-open-questions.md`).
- Bối cảnh nguyên bản: một quần đảo nhiệt đới bị **Sương Mặn** bao phủ. Người chơi là thuyền trưởng trẻ của một làng chài bỏ hoang, **Làng Bến Neo**. Bạn dựng lại làng, tuyển thủy thủ, dọn quái trên đảo và xuống **Hang Xoáy** dưới đáy đảo để tìm nguồn gốc của sương.
- Giọng văn: vui, trẻ con, hơi hài. Không bạo lực máu me. Không dùng tên, nhân vật, câu chữ của Rumble Heroes, One Piece hay IP nào.
- Quy tắc đặt tên: hero mang biệt danh ngắn tiếng Việt gắn với biển và làng chài (Bàng, Sẻ, Mực...). Quái là sinh vật biển, hang, đảo. Công trình là tên nơi chốn làng chài.

### 1.2 Tên gọi chính

| Thứ | Tên trong game | Mã (id) |
|---|---|---|
| Làng (vùng xây) | Làng Bến Neo | `village` |
| Vùng đồng 1, 2, 3 | Bãi Vỏ Sò, Rừng Dừa Rậm, Gò Đá Lam | `z1`, `z2`, `z3` |
| Dungeon | Hang Xoáy (6 chặng, 30 tầng) | `dungeon` |
| Tài nguyên | Vàng, Thịt, Gỗ, Quặng, San Hô Đỏ, Vé Quán | `gold`, `meat`, `wood`, `ore`, `coral`, `tickets` |
| Mảnh hero | Mảnh | `fragments` |
| Lực chiến | Lực chiến (CP) | `cp` |
| Hệ (thuộc tính) | Sức Mạnh, Nhanh Nhẹn, Trí Tuệ | `STR`, `AGI`, `INT` |
| Độ hiếm | Thường, Hiếm, Sử Thi, Huyền Thoại | `N`, `R`, `E`, `L` |
| Công trình | Nhà Kho, Trại Gỗ, Quán Mỏ Neo, Mỏ Quặng, Sân Tập, Chợ Bến, Cổng Xoáy | xem `buildings.json` |

Danh sách đầy đủ hero, quái, kỹ năng, boss có trong JSON và trong bảng thuật ngữ ở `README.md`.

## 2. Toàn bộ game mục tiêu (khoảng 90% game gốc)

Cột "Mốc": **M1** = làm trong cột mốc 1. **Sau** = để sau, thiết kế M1 không được chặn đường. **Không** = ngoài phạm vi theo điều lệ.

| # | Tính năng | Tương đương game gốc | Mốc |
|---|---|---|---|
| 1 | Màn tiêu đề "Chạm để tiếp tục" | Title screen [TC] | M1 |
| 2 | Joystick nổi, cả đội đi theo thủ lĩnh | [TC] | M1 |
| 3 | Hero chỉ tự đánh khi đội đứng yên (cờ dữ liệu) | [TC] TK1, TK4 | M1 |
| 4 | Thu gỗ từ cây, quặng từ đá, thịt và vàng từ quái | [TC] | M1 |
| 5 | Tài nguyên và quái mọc lại | [TC] | M1 |
| 6 | Cấp người chơi lên bằng EXP từ quái | [TC] | M1 |
| 7 | Bản đồ liền: làng nằm giữa, ba vùng đồng bao quanh | [TC] (bản đồ liền) | M1 |
| 8 | Quái tinh anh ngoài đồng (Cua Càng Thép) | [TC] elite | M1 |
| 9 | Vùng sương tím mở bằng Đèn Xua Sương (trả gỗ) | Circle of Purification | Sau |
| 10 | Bệ dịch chuyển, danh sách vùng có ngưỡng CP | Teleport | Sau |
| 11 | Hero gặp ngoài đồng, trả tài nguyên để mời vào đội | Join Hero | Sau |
| 12 | Rương báu ngoài đồng | Treasure chest | Sau |
| 13 | Boss ngoài đồng có vòng báo đòn | Field boss | Sau |
| 14 | Xây công trình tự do trên lưới, di chuyển, nâng cấp, có thời gian xây | Chỗ xây cố định [KB] | M1 |
| 15 | Nhà Kho có sẵn từ đầu, sức chứa rộng | Storage khóa cấp 30 [KB] | M1 |
| 16 | Trại Gỗ, Mỏ Quặng, Chợ Bến sản xuất nhàn rỗi | Logging/Mining/Gold Camp [TC] | M1 |
| 17 | Quán Mỏ Neo: 3 thẻ, 100 vàng, 1x/2x/3x, thanh BONUS, đổi thẻ 30 phút | Pub [TC] | M1 |
| 18 | Đổi Vé Quán lấy mảnh hoặc hero chưa có | Mileage Shop (chưa xác nhận) [QĐ] | M1 |
| 19 | Hero: 3 hệ, 4 độ hiếm, cấp bằng thịt và mảnh, mốc cấp 5/10/15/20/25 | [TC] | M1 |
| 20 | Hai kỹ năng tự động mỗi hero, sao kỹ năng 1 và 2 | [TC] | M1 |
| 21 | Sao kỹ năng thứ 3, cấp hero trên 30 | [TC] | Sau |
| 22 | Sân Tập: cây nâng HP/ATK toàn đội bằng quặng, ô đội bằng San Hô Đỏ | Training Ground [TC] | M1 |
| 23 | Nhánh đặc biệt khác của Sân Tập (ngoài ô đội) | [TC] | Sau |
| 24 | Xếp đội, thủ lĩnh, nút TỰ XẾP theo sức mạnh thật | Squad + Auto Assign [KB] | M1 |
| 25 | Hang Xoáy: chặng 5 tầng, 40–60 quái, đếm chuỗi hạ gục, boss báo đòn | Dungeon [TC] | M1 |
| 26 | Nhiều dungeon khác nhau, cuộn vào dungeon | Dungeon Scroll | Sau |
| 27 | Hai vật phẩm dùng trong dungeon (nút sách) | Item books (chưa xác nhận) | Sau |
| 28 | Nút AUTO trong dungeon | AUTO (chưa rõ) [QĐ: tự đi tới cửa ra] | M1 |
| 29 | Màn thắng/thua | VICTORY / ANNIHILATED [TC] | M1 |
| 30 | Thẻ nhiệm vụ chính dẫn dắt | Quest card [TC] | M1 |
| 31 | Lưu/tải, tiến độ ngoại tuyến có trần 8 giờ | Không có trong gốc [KB] | M1 |
| 32 | Cài đặt: bật/tắt nhạc, hiệu ứng âm | Gear icon | M1 |
| 33 | Tượng Hộ Đảo + trang bị rơi từ dungeon | Guardian Statue + Equipment | Sau |
| 34 | Bảng nhiệm vụ ngày/tuần | Request Board | Sau |
| 35 | Đổi tài nguyên | Exchange | Sau |
| 36 | Lều Cắm Trại: đội farm khi không điều khiển, 1 giờ mỗi ngày | Camp | Sau |
| 37 | Thử thách: Heo Vàng, Thủ Làng, Khe Nứt, Tháp | Golden Pig, Village Defense, Rift, Tower | Sau |
| 38 | Thủ thành (base defense) | Village Defense | Sau |
| 39 | Chế tạo | Không có trong gốc | Sau |
| 40 | Túi đồ, bản đồ (la bàn), thư | Bag, compass, mail | Sau |
| 41 | Cửa hàng, gem, quảng cáo, mua trong ứng dụng, Premium Camp, quà giờ | Shop, ads, IAP | Không |

Danh sách "để sau" trong điều lệ (trang bị, trại nghỉ, nhiệm vụ ngày, chế độ thử thách, đổi tài nguyên, cửa hàng, chế tạo, thủ thành) khớp các dòng 33–41.

## 3. Cột mốc 1: tổng quan

### 3.1 Vòng lặp

```
Ngoài đồng: đi, chặt cây, đập đá, đánh quái  -> gỗ, quặng, thịt, vàng, EXP
   -> về làng (đi bộ; làng nằm giữa bản đồ)
   -> xây, di chuyển, nâng công trình (gỗ, quặng); thu sản lượng
   -> Quán Mỏ Neo: tuyển hero (vàng) -> hero mới hoặc mảnh
   -> nâng cấp hero (thịt, mảnh), Sân Tập (quặng, San Hô Đỏ)
   -> xếp đội (TỰ XẾP)
   -> Cổng Xoáy -> Hang Xoáy (vàng, San Hô Đỏ, Vé Quán, EXP)
   -> đội mạnh hơn -> vùng đồng xa hơn, chặng sâu hơn
```

### 3.2 Chế độ (state) của game

Lõi có đúng một chế độ chính tại một thời điểm:

| Chế độ | Mô tả |
|---|---|
| `TITLE` | Màn tiêu đề. Chạm bất kỳ -> tải save, áp tiến độ ngoại tuyến -> `WORLD`. |
| `WORLD` | Bản đồ liền (làng + đồng). Có joystick. |
| `BUILD` | Chế độ xây trong làng. Thế giới vẫn chạy (quái, timer) nhưng joystick tắt (xem 7.4). |
| `DUNGEON` | Một lượt Hang Xoáy. Thế giới ngoài **dừng** (không mô phỏng đồng; production và timer xây vẫn tính theo đồng hồ). |
| `RESULT` | Màn thắng hoặc thua sau dungeon. |

Panel (Quán, Hero, Xếp đội...) là lớp phủ trên `WORLD`; mô phỏng thế giới vẫn chạy khi panel mở [QĐ], nhưng đội đứng yên (joystick bị chặn, xem `03-ux-spec.md` mục 2.4). Vì đội đứng yên, hero sẽ tự đánh nếu có quái lại gần. Điều này cố ý: không có chỗ "an toàn giả".

### 3.3 Mô phỏng tất định

- Lõi chạy bước cố định `tuning.sim.fixedStepSec` = 1/30 s. View gọi `step()` bằng bộ tích lũy.
- Một RNG có seed (`mulberry32`). Seed lưu trong save. Mỗi lượt dungeon dùng RNG con với seed = hash(seed gốc, số thứ tự lượt).
- Lõi **không bao giờ** gọi `Date.now()` hay `Math.random()`. Thời gian thực (để tính timer xây, production, ngoại tuyến) đi vào lõi qua một `Clock` được truyền vào. Bot headless dùng đồng hồ giả tăng theo bước mô phỏng.
- Thứ tự xử lý mỗi bước: (1) đọc lệnh joystick, (2) AI hero chọn trạng thái, mục tiêu, (3) AI quái, (4) di chuyển và tách va chạm, (5) đếm giờ đòn đánh, gây sát thương, kỹ năng, (6) chết, rơi đồ, EXP, (7) nhặt vật rơi, (8) timer (hồi sinh, mọc lại, chuỗi hạ gục, công trình, quán), (9) kiểm tra nhiệm vụ.
- Khi hai thứ bằng nhau (khoảng cách, máu), thắng thứ có `entityId` nhỏ hơn. `entityId` tăng dần theo thứ tự tạo.

## 4. Thế giới

### 4.1 Bản đồ và tọa độ

- Bản đồ `tuning.world.mapW × mapH` = 60 × 60 ô. Gốc (0,0). Hàng ô viền ngoài cùng (`x<1`, `y<1`, `x>59`, `y>59`) là nước, không đi được.
- Làng ở giữa: lưới xây `villageGrid` = 20 × 20 ô, góc (20,20) tới (39,39).
- Vùng được tính theo `d = max(|x-30|, |y-30|)`:
  - `d <= 10`: làng.
  - `10 < d <= 17`: Bãi Vỏ Sò (`z1`).
  - `17 < d <= 24`: Rừng Dừa Rậm (`z2`).
  - `24 < d <= 30`: Gò Đá Lam (`z3`).
- Mọi vùng mở ngay từ đầu trong M1 [QĐ]. Ở ranh giới mỗi vùng có một **biển gỗ** ghi CP đề nghị của vùng (`tuning.world.zoneRecommendedCp`: 1050 / 4350 / 10950). Sương tím và cổng mở vùng để sau (dòng 9 bảng 2).
- Vị trí từng cây, đá, ổ quái, biển gỗ nằm trong `field-layout.json`. Không sinh ngẫu nhiên lúc chạy. Bốn con đường đất trang trí đi từ làng ra bốn hướng (`paths`).
- Đội bắt đầu ở `startPos` (30, 30), giữa làng.

### 4.3 Về làng và ra đồng [TC: nút Return/Portal]

- Ngoài làng, nút **Về làng** (dưới phải) đưa cả đội tới giữa làng (30, 30) sau 1 s gồng (vòng xoáy xanh quanh đội). Không bấm được khi có quái đang đuổi đội (nút xám, chạm hiện toast "Có quái ở gần!") [TC: TA, không dịch chuyển khi có quái gần]. Kéo joystick trong lúc gồng = hủy.
- Lúc bấm, lõi nhớ vị trí thủ lĩnh làm **điểm ra đồng**. Trong làng, nút đổi thành **Ra đồng**: đưa đội về điểm đó (cũng gồng 1 s). Chưa có điểm (mới chơi) thì nút ẩn.
- Đi bộ giữa làng và đồng luôn được; nút chỉ để tiết kiệm thời gian.

### 4.2 Trình bày (chỉ view)

- Nhìn từ trên xuống theo hình thoi (iso 2:1) như game gốc [TC]. Lõi dùng tọa độ ô vuông; view đổi sang màn hình:
  - `screenX = (x - y) * cellW / 2`, `screenY = (x + y) * cellH / 2` (y màn hình hướng lên), với `cellW = 120`, `cellH = 60` đơn vị thiết kế.
- Nền: ô thoi xen hai màu theo khối 2×2 ô (`checkerBlock`), nên mỗi ô màu rộng 240 đơn vị, khoảng 1/3 chiều rộng màn hình [TC: ảnh `hud-field-gathering-coins-01.jpg`]. Màu trong `tuning.render`.
- Sắp xếp chiều sâu: vật có `x + y` lớn hơn vẽ trước (xa hơn).
- Camera bám thủ lĩnh, nội suy `cameraFollowLerp` = 0.15 mỗi frame, không zoom [TC].

## 5. Đội và di chuyển

### 5.1 Thủ lĩnh và người theo

- Đội có từ 1 tới `squadSlots` hero. Thứ tự ô đội quyết định thủ lĩnh: **thủ lĩnh là hero còn sống đứng đầu thứ tự ô** [TC: vương miện ở màn xếp đội]. Khi thủ lĩnh chết, quyền thủ lĩnh chuyển cho hero sống kế tiếp; khi hero đầu hồi sinh, nó lấy lại quyền.
- Joystick điều khiển **vận tốc thủ lĩnh**: hướng = vector joystick chuẩn hóa; tốc độ = `squad.moveSpeed` (3.0 ô/s) × min(1, độ lệch / bán kính joystick). Độ lệch dưới 10% bán kính coi như 0.
- Người theo thứ i (i = vị trí trong danh sách hero sống, thủ lĩnh là 0) có điểm đích = vị trí thủ lĩnh + `formationOffsets[i]` (không xoay theo hướng đi) [QĐ]. Người theo đi tới đích với tốc độ `moveSpeed × followerSpeedMult` (3.75), dừng khi cách đích dưới `followerArriveDist` (0.15).
- Tách va chạm: mọi đơn vị (hero, quái) là hình tròn bán kính `radius`. Hai đơn vị chồng nhau bị đẩy ra mỗi bên một nửa phần chồng, mỗi bước. Boss không bị đẩy. Dùng lưới băm 2 × 2 ô.
- Hero không đi qua nước viền bản đồ và tường phòng dungeon: vị trí bị kẹp vào vùng đi được.
- Công trình **không chặn** di chuyển trong M1 [QĐ]; đơn vị đi xuyên qua và được vẽ theo chiều sâu. Dữ liệu công trình để dành cờ `blocksMovement` cho thủ thành sau này.

### 5.2 Đánh khi đứng yên (cờ dữ liệu)

- `tuning.squad.attackOnlyWhenIdle = true` [TC: TK1, TK4; điều lệ mục 3.8].
- "Đứng yên" nghĩa là joystick không được giữ, hoặc được giữ nhưng độ lệch dưới 10%, liên tục ít nhất `idleAfterReleaseSec` = 0.15 s.
- Khi cờ = `true` và người chơi đang kéo joystick: không hero nào bắt đầu đòn đánh hay kỹ năng đánh. Đòn đang gồng (windup) bị hủy. Kỹ năng **hồi máu** vẫn được dùng [QĐ].
- Khi cờ = `false`: hero vừa đi theo đội vừa đánh mục tiêu **đã nằm trong tầm** mà không rời đội để đuổi.
- Áp dụng giống nhau ngoài đồng và trong dungeon [QĐ; tham chiếu chưa rõ trong dungeon].

### 5.3 Chọn mục tiêu của hero (khi đứng yên)

Mỗi hero tự chọn, đánh giá lại mỗi 0.5 s và ngay khi mục tiêu chết:

1. Ứng viên quái: quái còn sống, cách **thủ lĩnh** không quá `aggroRadius` = 5 ô. Chọn con gần **hero đó** nhất.
2. Nếu không có quái: ứng viên nút tài nguyên (cây, đá) chưa cạn, cách thủ lĩnh không quá `gatherRadius` = 3 ô. Chọn nút gần hero nhất. (Dungeon không có nút.)
3. Nếu không có gì: hero về điểm đội hình.

Hero đi tới khi mục tiêu nằm trong tầm đánh của nó (`attackRange`: cận chiến 0.9, tầm xa 3.5–4.0), rồi đánh. Hero không đi xa thủ lĩnh quá `leashRadius` = 4 ô; nếu phải đi xa hơn để tới mục tiêu thì bỏ mục tiêu đó.

## 6. Ngoài đồng

### 6.1 Thu thập

- Nút tài nguyên có `durability` (độ bền, số nhát) và `yieldPerHit`. Bảng `field-layout.json → nodeTypes`:

| Loại | Vùng | Độ bền | Mỗi nhát | Tổng một nút | Mọc lại |
|---|---|---|---|---|---|
| Cây | z1 / z2 / z3 | 6 / 6 / 8 | 1 / 2 / 2 gỗ | 6 / 12 / 16 gỗ | 30 s |
| Đá | z1 / z2 / z3 | 6 / 5 / 7 | 1 / 2 / 2 quặng | 6 / 10 / 14 quặng | 45 s |

- Hero "đánh" nút như đánh quái: cùng nhịp `attackInterval`, cùng luật đứng yên. Mỗi nhát trừ `gatherPower` độ bền (1 với hầu hết hero, 2 với Đô Neo và Én) và cộng `gatherPower × yieldPerHit` tài nguyên. Không phụ thuộc ATK [QĐ] (để hero chuyên thu thập có giá trị, giống ghi chú của LW).
- Tài nguyên từ nút **cộng ngay vào kho** khi nhát đánh trúng; view vẽ icon bay về cột tài nguyên và số nổi "+2" [TC: số nổi khi chặt].
- Nút hết độ bền: đổi sang hình gốc cây / đá vụn, không chọn được, mọc lại sau `respawnSec`. Trên gốc có **vòng tròn đếm giờ** dạng bánh (pie) [TC: ảnh `hud-field-gathering-coins-01.jpg` có vòng bánh trên con vật nằm; ý nghĩa là QĐ].

### 6.2 Quái ngoài đồng

- Quái ở theo **ổ** (`camps` trong `field-layout.json`): mỗi ổ có loại quái, số con, tâm, bán kính 1.5 ô. Quái đứng lảng vảng ngẫu nhiên trong bán kính ổ (đổi điểm đến mỗi 2–4 s, tốc độ 40%).
- Chỉ số: `HP = baseHp × fieldZoneMult[vùng]`, `ATK = baseAtk × fieldZoneMult[vùng]` (0.6 / 2.0 / 5.0), làm tròn. EXP = `exp × zoneAmountMult` (1 / 1.5 / 2), làm tròn.
- Gây hấn: quái chuyển sang đuổi khi có hero cách nó ≤ `monsterAggroRadiusField` = 4 ô, hoặc khi bị đánh. Cả ổ gây hấn cùng lúc (một con bị đánh -> cả ổ đuổi) [QĐ].
- Đuổi hero gần nhất. Nếu bị kéo xa tâm ổ hơn `monsterLeashField` = 7 ô: quay về ổ, không bị đánh trúng khi đang về, hồi 20% máu mỗi giây khi đã về.
- Quái chết: rơi đồ (6.3), cộng EXP, mọc lại sau `monsterRespawnSec` = 20 s tại tâm ổ (tinh anh: 120 s). Xác nằm 1 s rồi biến mất; vòng bánh đếm giờ hiện ở tâm ổ khi ổ trống hẳn.
- Quái tinh anh **Cua Càng Thép** (2 ổ ở Gò Đá Lam): vẽ ở tỉ lệ 5 (quái thường tỉ lệ 3), máu và ATK cao, không có đòn báo trước trong M1.

### 6.3 Vật rơi

- Bảng rơi trong `drop-tables.json`. Mỗi lần quái chết, từng dòng `rolls` tung độc lập: nếu `rng < chance` thì rơi số nguyên đều trong `[min, max]`, nhân `zoneAmountMult` (ngoài đồng) hoặc `floor.goldMult` (vàng trong dungeon), làm tròn xuống, tối thiểu 1.
- Mỗi loại vật rơi tạo tối đa 5 vật thể trên đất; số lượng chia đều cho chúng. Vật thể bắn ra quanh chỗ chết trong bán kính 0.6 ô.
- Nhặt [QĐ; tham chiếu chưa xác nhận]: vật rơi bay về hero gần nhất khi có hero cách ≤ `magnetRadius` = 2.5 ô (tốc độ 10 ô/s). Nếu sau 6 s chưa ai nhặt, nó tự bay về thủ lĩnh. Không bao giờ mất vật rơi.
- Khi nhặt: cộng vào kho, view hiện thanh thông báo "Vàng +6" giữa màn hình [TC: `hud-field-gathering-coins-01.jpg`], gộp các lần nhặt cùng loại trong 1 s.

### 6.4 Hero chết và cả đội gục

- Hero chết ngoài đồng: nằm xuống (hình xám, nghiêng 90°), hồi sinh sau `heroReviveSec` = 8 s tại chỗ, đủ máu [TC: TK1, TA].
- Cả đội chết: sau `wipeRespawnSec` = 3 s, màn hình mờ đen, cả đội hồi sinh đủ máu ở `wipeRespawnPos` (giữa làng). Không mất tài nguyên [QĐ]. Quái đang đuổi quay về ổ.
- Ngoài đồng hero tự hồi máu 2% máu tối đa mỗi giây khi không ở trong chiến đấu 5 s [QĐ].

### 6.5 Cấp người chơi

- EXP từ quái chết (ngoài đồng và dungeon) cộng vào cấp người chơi. Bảng `player-levels.json` (cấp tối đa M1 = 30). Thừa EXP chuyển sang cấp sau.
- Cấp người chơi mở: loại công trình mới (`unlockPlayerLevel`), cấp công trình (`reqPlayerLevel`), nấc Sân Tập (3 nấc mỗi cấp) [TC: mỗi cấp mở 3 nấc, LW].
- Lên cấp: hiệu ứng chữ "Lên cấp!" giữa màn hình, âm `level-up`. Không hồi máu.

## 7. Làng và xây dựng

### 7.1 Tài nguyên và sức chứa

| Tài nguyên | Nguồn | Dùng cho | Trần |
|---|---|---|---|
| Vàng | Quái (`field_gold`), Chợ Bến, dungeon, nhiệm vụ | Tuyển hero, làm mới thẻ | Không trần |
| Thịt | Quái (`field_meat`), một ít trong dungeon, nhiệm vụ | Lên cấp hero | Nhà Kho |
| Gỗ | Cây, Trại Gỗ, nhiệm vụ | Xây, nâng công trình | Nhà Kho |
| Quặng | Đá, Mỏ Quặng, nhiệm vụ | Nâng công trình, nấc Sân Tập | Nhà Kho |
| San Hô Đỏ | Boss dungeon, Cua Càng Thép, nhiệm vụ | Ô đội ở Sân Tập | Không trần |
| Vé Quán | 1 vé mỗi lượt tuyển, dungeon, nhiệm vụ | Đổi mảnh hoặc hero | Không trần |
| Mảnh (theo hero) | Tuyển trùng hero, đổi Vé | Đột phá cấp hero | Không trần |

- Trần của thịt, gỗ, quặng = `effects.cap` của cấp Nhà Kho hiện tại (300 ở cấp 1 tới 18000 ở cấp 10).
- Khi đầy: phần vượt trần **bị bỏ**; hiện toast "Nhà Kho đầy! Nâng cấp Nhà Kho để chứa thêm." tối đa một lần mỗi 30 s. Thanh dưới ô tài nguyên ở HUD hiện mức đầy (xanh lá; đổi đỏ khi ≥ 95%) [TC suy luận: thanh xanh dưới ô tài nguyên].
- Sản lượng của công trình sản xuất **không bị mất** khi kho đầy: nó nằm lại trong bộ đệm của công trình (7.6).
- Không có chi phí nào vượt trần kho ở thời điểm người chơi đủ cấp để trả nó (đã kiểm bằng script, xem `02-balance.md`). Nếu chi phí lớn hơn trần hiện tại, nút ghi "Cần Nhà Kho cấp N" thay vì giá.

### 7.2 Lưới xây [KB]

- Lưới làng 20 × 20 ô (`villageGrid`). Mỗi công trình chiếm hình chữ nhật `footprint` (2×2 hoặc 3×3 ô). Vị trí công trình = ô góc có `x` và `y` nhỏ nhất.
- Luật đặt hợp lệ (cả xây mới và di chuyển):
  1. Toàn bộ footprint nằm trong lưới làng.
  2. Không ô nào trùng footprint của công trình khác (kể cả công trình đang xây). Hai công trình được đứng sát nhau.
  3. Số công trình cùng loại < `maxCount` (M1: 1 cho mọi loại).
  4. Loại đã mở (`unlockPlayerLevel` ≤ cấp người chơi).
  5. Xây mới: đủ tài nguyên cấp 1 và còn thợ rảnh (7.3).
- Không có ô bị chặn sẵn trong làng M1. Hero, quái, vật rơi không cản việc đặt.
- **Nhà Kho cấp 1 có sẵn** khi bắt đầu, đặt ở (21, 21) [KB: sửa "kho chật"]. Nó di chuyển và nâng được như mọi công trình.
- M1 không có phá hủy công trình [QĐ].

### 7.3 Thời gian xây và thợ

- Có `builderSlots` = 2 thợ. Mỗi lần xây mới hoặc nâng cấp chiếm một thợ trong `buildSec` của cấp đích.
- Trả tài nguyên ngay khi xác nhận. Hủy (trong panel công trình, nút "Hủy") hoàn 100% tài nguyên [QĐ].
- Đang xây mới: công trình hiện dạng **giàn giáo** (đống gỗ đá và biển búa như chỗ xây của game gốc [TC]) với thanh tiến độ và đồng hồ đếm ngược phía trên. Chưa dùng được.
- Đang nâng cấp: công trình **vẫn hoạt động ở cấp cũ** [QĐ], có thanh tiến độ phía trên.
- Hết giờ: cấp mới có hiệu lực ngay (kể cả khi đang ngoại tuyến), âm `build-drop`, toast "Xây xong: Trại Gỗ cấp 2".
- Không có cách tăng tốc trong M1 (không gem).
- Timer dùng mốc thời gian tuyệt đối (`jobEndsAt`, ms) từ `Clock`.

### 7.4 Chế độ xây (BUILD)

Bố cục chi tiết trong `03-ux-spec.md` mục 4. Luật:

- Vào: nút **Xây** (búa) ở HUD, chỉ bấm được khi thủ lĩnh đang ở trong làng (`d <= 10`); ngoài làng nút xám, chạm hiện toast "Về làng để xây dựng".
- Trong `BUILD`: joystick tắt; kéo một ngón trên vùng trống = **cuộn camera** trong giới hạn làng. Hero đứng yên (và có thể tự đánh nếu quái tới, hiếm vì làng không có ổ quái).
- **Xây mới**: chọn thẻ công trình trong thanh dưới -> một "bóng" (ghost) footprint xuất hiện ở ô hợp lệ gần tâm màn hình nhất -> kéo bóng để đổi chỗ (bám ô) -> bóng xanh lá nếu hợp lệ, đỏ nếu không -> nút ✓ (chỉ bấm được khi xanh) và ✗ nổi trên bóng. ✓ = trả tiền, bắt đầu xây. ✗ = bỏ.
- **Di chuyển**: chạm một công trình -> nó được chọn (viền vàng, hiện nút ✓ ✗ và nút "Nâng cấp") -> kéo để dời -> ✓ đặt chỗ mới, ✗ trả về chỗ cũ. Di chuyển miễn phí, tức thì, được cả khi đang xây hoặc nâng (timer giữ nguyên).
- **Nâng cấp**: từ công trình đang chọn, nút "Nâng cấp" mở panel công trình (7.5).
- Thoát: nút "Xong" (góc dưới phải). Nếu đang có bóng chưa xác nhận, thoát = ✗.

### 7.5 Panel công trình và nâng cấp

- Ngoài chế độ xây, **chạm vào công trình** mở panel của nó (Quán, Sân Tập, Cổng Xoáy mở panel chức năng riêng; công trình khác mở panel nâng cấp). Panel chức năng có nút "Nâng cấp" dẫn tới panel nâng cấp.
- Panel nâng cấp [TC: `building-upgrade-mining-camp-01.jpg`]: hình công trình, "Cấp N ▶ N+1", tối đa 3 dòng chỉ số (giá trị cũ và "+chênh lệch" màu xanh), một dòng mô tả, nút xanh lá lớn "NÂNG CẤP" kèm giá và thời gian xây.
- Nút xám kèm lý do khi không nâng được, theo thứ tự ưu tiên: "Cần cấp người chơi N", "Cần Nhà Kho cấp N" (giá > trần), "Thiếu tài nguyên", "Đang có 2 công trình đang xây". Cấp tối đa: "Đã tối đa".

### 7.6 Sản xuất và thu

- Trại Gỗ, Mỏ Quặng, Chợ Bến sản xuất `perHour` vào **bộ đệm** riêng, trần bộ đệm = `perHour × 8` (8 giờ, `productionBufferHours`). Bộ đệm đầy thì ngừng sản xuất.
- Trên công trình hiện icon tài nguyên và "số trong bộ đệm / trần" khi bộ đệm ≥ 1 [TC: "0/50" trên mỏ ở `village-mine-complete-01.jpg`].
- Thu: (a) thủ lĩnh đi tới cách footprint ≤ `collectRadius` = 1.5 ô, hoặc (b) nút "Thu" trong panel. Chuyển `min(bộ đệm, trần kho − đang có)` vào kho; phần còn lại ở lại bộ đệm. Toast "Thu gỗ +120" [TC: "Mine complete!"].
- Sản xuất tính theo đồng hồ, kể cả ngoại tuyến (mục 13).

### 7.7 Chức năng từng công trình

Số cụ thể theo cấp nằm trong `buildings.json` (bảng đầy đủ ở `02-balance.md` mục 3).

| Công trình | Ô | Mở ở cấp người chơi | Cấp tối đa | Chức năng mỗi cấp |
|---|---|---|---|---|
| Nhà Kho | 3×3 | có sẵn | 10 | Trần thịt/gỗ/quặng: 300, 500, 800, 1300, 2000, 3200, 5000, 8000, 12000, 18000 |
| Trại Gỗ | 2×2 | 1 | 10 | Gỗ/giờ: 60 → 700 |
| Quán Mỏ Neo | 3×3 | 2 | 5 | Bảng tỉ lệ độ hiếm tier 1–5 (mục 8.4) |
| Mỏ Quặng | 2×2 | 3 | 10 | Quặng/giờ: 30 → 350 |
| Sân Tập | 3×3 | 4 | 6 | Cho mở ô đội tới `cấp + 2` (cấp 2 → ô 4, ..., cấp 6 → ô 8); mở cây nâng cấp |
| Chợ Bến | 2×2 | 5 | 10 | Vàng/giờ: 40 → 400 |
| Cổng Xoáy | 3×3 | 6 | 6 | Chặng cao nhất được vào = cấp cổng |

## 8. Hero

### 8.1 Danh sách (12 hero trong M1)

| Hero | Hệ | Độ hiếm | Vai | Kỹ năng 1 / 2 |
|---|---|---|---|---|
| Bàng | Sức Mạnh | Thường | Đỡ đòn | Khiên Đập / Hô Vang |
| Đô Neo | Sức Mạnh | Hiếm | Đấu sĩ, thu thập ×2 | Vung Neo / Đạp Đất |
| Rùa Sắt | Sức Mạnh | Sử Thi | Đỡ đòn | Mai Sắt / Sóng Đồng |
| Kình Vương | Sức Mạnh | Huyền Thoại | Đấu sĩ | Kình Ngư Nộ / Hải Kình Giáng |
| Sẻ | Nhanh Nhẹn | Thường | Cung | Bắn Đôi / Mưa Tên |
| Mực | Nhanh Nhẹn | Hiếm | Sát thủ cận chiến nhanh | Dao Xoáy / Mực Đen |
| Én | Nhanh Nhẹn | Sử Thi | Phóng lao, thu thập ×2 | Lao Xuyên / Gió Biển |
| Diều | Nhanh Nhẹn | Huyền Thoại | Cung | Diều Hâu Lao / Bão Lông Vũ |
| Lan | Trí Tuệ | Thường | Hồi máu | Tay Lành / Sương Mát |
| Đăng | Trí Tuệ | Hiếm | Pháp sư | Lửa Hải Đăng / Chớp Sáng |
| San | Trí Tuệ | Sử Thi | Hồi máu | San Hô Hồi / Kén Bảo Vệ |
| Triều | Trí Tuệ | Huyền Thoại | Pháp sư | Sóng Thần / Triều Cường |

- Người chơi bắt đầu với **Bàng** cấp 1 (ô đội 1).
- Hệ quyết định màu icon và hiệu ứng sở hữu (8.3). M1 **không** có khắc chế hệ (game gốc không thấy có) [QĐ]. Tương tác giữa hệ chỉ qua hiệu ứng sở hữu và vai trò (đỡ đòn hút quái, hồi máu giữ đội sống, tầm xa đứng sau).
- Vai trò `role` quyết định chỉ số gốc và tầm đánh. Bảng chỉ số trong `heroes.json` (đã nhân độ hiếm).

### 8.2 Chỉ số và lên cấp

- Chỉ số gốc ở cấp 1: `baseHp`, `baseAtk` (đã nhân hệ số độ hiếm 1.0 / 1.2 / 1.45 / 1.75), `attackInterval`, `attackRange`.
- Ở cấp L: `stat = round(base × (1 + 0.03 × (L − 1)))` [TC: game gốc tăng ít mỗi cấp, "+5" ATK/cấp ở `hero-detail-*.jpg`]. Màn chi tiết hiện mức tăng ở cấp kế dạng "+X" xanh.
- Chỉ số cuối = `(chỉ số theo cấp + cộng phẳng Sân Tập) × (1 + % hiệu ứng sở hữu cùng hệ)`, làm tròn.
- Lên cấp L → L+1 tốn `meat` trong `hero-levels.json` (15 thịt ở cấp 1, 20 ở cấp 4, 100 ở cấp 20, khớp 2 điểm thấy ở game gốc [TC]). Cấp tối đa M1 = 30.
- **Đột phá**: ở cấp 5, 10, 15, 20, 25, lên cấp kế cần thêm **mảnh** của chính hero đó: Thường 5/10/15/20/25, Hiếm 4/8/12/16/20, Sử Thi 3/6/9/12/15, Huyền Thoại 2/4/6/8/10 [QĐ; game gốc có thanh mảnh "20/10", "24/5" cạnh cấp]. Ở các cấp khác chỉ tốn thịt.
- Hero ngoài đội vẫn lên cấp được.

### 8.3 Mốc cấp (giống game gốc [TC])

| Cấp | Hiệu ứng |
|---|---|
| 1 | Mở kỹ năng 1 (1 sao) |
| 5 | Mọi hero cùng hệ +5% HP (hiệu ứng sở hữu) |
| 10 | Mở kỹ năng 2 (1 sao) |
| 15 | Mọi hero cùng hệ +5% ATK (hiệu ứng sở hữu) |
| 20 | Kỹ năng 1 lên 2 sao |
| 25 | Mọi hero cùng hệ +5% HP (hiệu ứng sở hữu) |
| 30 | Kỹ năng 2 lên 2 sao |

"Hiệu ứng sở hữu" tính cho **mọi hero người chơi sở hữu**, kể cả ngoài đội, và áp lên mọi hero cùng hệ. Các hiệu ứng cộng dồn (4 hero cùng hệ đều cấp 25 → hệ đó +40% HP).

### 8.4 Kỹ năng

- Mỗi hero có 2 kỹ năng (`skills.json`). Kỹ năng tự kích hoạt, không có nút [TC].
- Hồi chiêu `cooldownSec` bắt đầu đầy khi vào trận (dungeon: đầu mỗi tầng; ngoài đồng: lúc hero có mục tiêu quái đầu tiên sau 5 s không chiến đấu), luôn đếm lùi kể cả khi đi.
- Khi kỹ năng sẵn sàng và hero đang được phép đánh, có mục tiêu quái trong tầm: lần đánh kế tiếp là kỹ năng thay cho đòn thường (cùng gồng 0.2 s, sau đó bắt đầu lại `attackInterval`). Không dùng kỹ năng lên cây, đá.
- Tham số theo sao: lấy phần tử thứ (sao − 1) của mỗi mảng trong `params`.

| Loại | Luật |
|---|---|
| `strike` | Gây `ATK × mult` cho mục tiêu hiện tại. |
| `cleave` | Gây `ATK × mult` cho mọi quái trong `radius` quanh vị trí mục tiêu. |
| `nova` | Gây `ATK × mult` cho mọi quái trong `radius` quanh hero. |
| `volley` | Gây `ATK × mult` cho tối đa `count` quái gần hero nhất trong `attackRange + 1`. |
| `heal` | Hồi `ATK × mult` cho `count` hero còn sống có tỉ lệ máu thấp nhất (count 8 = cả đội). Chỉ dùng khi có hero dưới 85% máu. Dùng được cả khi đội đang đi. |
| `buff_atk` | Mọi hero sống +`pct` ATK trong `durationSec`. Không cộng dồn; dùng lại thì làm mới thời gian. |
| `taunt` | Mọi quái trong `radius` quanh hero đổi mục tiêu sang hero này trong `durationSec`. |

- Sao 3 để sau M1. Bảng mô tả sao trong panel chi tiết hiện sao 3 dạng khóa.

## 9. Tuyển hero (Quán Mỏ Neo)

### 9.1 Thẻ và lượt tuyển [TC: `hero-recruit-pub-01.jpg`]

- Quán luôn có **3 thẻ hero**. Mỗi thẻ là một hero khác nhau, có khung màu theo độ hiếm, nhãn **MỚI** nếu chưa sở hữu, hoặc "x5" (số mảnh nhận được) nếu đã có.
- Một lượt tuyển giá `costGold` = 100 vàng. Nút chọn **1x / 2x / 3x** = 1 / 2 / 3 lượt (100 / 200 / 300 vàng).
- Mỗi lượt: chọn **đều ngẫu nhiên 1 trong 3 thẻ** ("Bạn sẽ nhận một trong các hero") [TC]. Nếu hero chưa có: mở hero đó ở cấp 1. Nếu đã có: +5 mảnh của hero đó. Các lượt trong 2x/3x độc lập và có thể trùng thẻ.
- Mỗi lượt cho thêm 1 **Vé Quán**.
- Sau tuyển: màn "Nhận Hero" (9.5). Bộ thẻ **không đổi** sau khi tuyển [TC: ảnh nhận hero vẫn hiện cùng 3 thẻ].
- Lượt tuyển đầu tiên trong đời save luôn ra **Sẻ** (cung thủ); bộ thẻ đầu tiên là [Lan, Sẻ, Đăng] [QĐ: người mới cần một hero tầm xa ngay].

### 9.2 Làm mới bộ thẻ

- Tự làm mới mỗi `refreshSec` = 1800 s (30 phút) [TC]. Đồng hồ "Đổi hero sau 29:32" hiện dưới thẻ.
- Làm mới ngay bằng nút ⟳: 50 vàng [QĐ; game gốc dùng gem/quảng cáo]. Đặt lại đồng hồ 30 phút.
- Cách tạo bộ thẻ: với mỗi thẻ, tung độ hiếm theo bảng `odds` của tier = cấp Quán; trong độ hiếm đó chọn hero theo trọng số (chưa có = 2, đã có = 1), không trùng hero đã có trong bộ. Nếu độ hiếm đó hết hero chưa dùng, tung lại độ hiếm.

| Cấp Quán | Thường | Hiếm | Sử Thi | Huyền Thoại |
|---|---|---|---|---|
| 1 | 62% | 30% | 7% | 1% |
| 2 | 55% | 33% | 10% | 2% |
| 3 | 48% | 35% | 14% | 3% |
| 4 | 42% | 36% | 17% | 5% |
| 5 | 36% | 37% | 20% | 7% |

### 9.3 Thanh BONUS (bảo hiểm) [TC: "After 6 recruitments: increased chance of a high grade hero"]

- Mỗi lượt +1 vào thanh BONUS (0/10). Khi đạt 10: bộ thẻ làm mới **ngay** bằng `bonusOdds` (Hiếm 50%, Sử Thi 38%, Huyền Thoại 12%, không có Thường), thanh về 0, đồng hồ làm mới đặt lại 30 phút. Lời chú dưới thanh: "Sau N lượt nữa: tăng tỉ lệ hero hạng cao!" (N = 10 − thanh).

### 9.4 Mọi hero luôn lấy được [KB]

- Cả 12 hero luôn nằm trong bể thẻ. Không hero nào có hạn thời gian.
- Hero chưa có được ưu tiên ×2 khi tạo thẻ.
- **Đổi Vé** (tab thứ hai trong Quán) [QĐ; tương tự "Mileage Shop" mà TA nhắc]:

| Đổi | Giá (Vé Quán) |
|---|---|
| 5 mảnh của một hero đã có (tùy chọn) | 8 |
| Mở một hero Thường chưa có (tùy chọn) | 15 |
| Mở một hero Hiếm chưa có | 30 |
| Mở một hero Sử Thi chưa có | 80 |
| Mở một hero Huyền Thoại chưa có | 150 |

### 9.5 Màn "Nhận Hero"

- [TC: `hero-recruit-obtained-01.jpg`] Ba thẻ trên sân khấu, thẻ trúng sáng lên và nhô lên; với 2x/3x, lần lượt từng lượt (0.6 s mỗi lượt), mỗi thẻ trúng hiện "+5 mảnh" hoặc "MỚI!". Thanh mảnh dưới thẻ chạy từ giá trị cũ tới mới. Chạm để đóng.
- Hero mới tự vào ô đội trống đầu tiên (nếu còn ô trống).

## 10. Đội hình và lực chiến

### 10.1 Ô đội

- Bắt đầu với 3 ô (`startSlots`), tối đa 8 trong M1 [QĐ; tham chiếu thấy 6/6, nguồn nói 8–10]. Mở ô 4..8 ở Sân Tập bằng San Hô Đỏ: 2 / 4 / 6 / 9 / 12, cần Sân Tập cấp 2 / 3 / 4 / 5 / 6.
- Xếp đội được ở mọi nơi ngoài dungeon [QĐ; game gốc chỉ ở làng]. Hero đổi vào xuất hiện cạnh thủ lĩnh.

### 10.2 Lực chiến (CP)

```
CP_hero = round( 4 × ATK × (1.0 / attackInterval) × (1 + skillCpBonus) + HP )
CP_đội  = tổng CP_hero của các hero trong đội
```

- ATK, HP là chỉ số cuối (đã gồm cấp, Sân Tập, hiệu ứng sở hữu).
- `skillCpBonus` = tổng bonus của các kỹ năng đã mở theo loại: strike 0.10, cleave 0.15, nova 0.15, volley 0.15, heal 0.25, buff_atk 0.10, taunt 0.05; cộng 0.05 cho mỗi kỹ năng ở 2 sao.
- Nguồn: hệ số 4 và 1 khớp hai điểm thấy ở game gốc (ATK 408, HP 1754 → CP 3387; ATK 268, HP 1083 → CP 2156) [TC suy luận]. Hệ số tốc đánh và kỹ năng là [KB] để CP phản ánh sức mạnh thật: hero đánh nhanh và hero hồi máu không bị đánh giá thấp.
- CP đội hiện ở thanh trên cùng [TC].

### 10.3 Tự xếp đội (TỰ XẾP) [KB]

Khi bấm TỰ XẾP với `n` = số ô đội:

1. Sắp mọi hero sở hữu theo CP giảm dần (bằng nhau: id nhỏ hơn trước).
2. Nếu `n ≥ 3` và có hero vai `healer`: lấy healer có CP cao nhất.
3. Nếu `n ≥ 4` và có hero vai `tank`: lấy tank có CP cao nhất (nếu chưa lấy).
4. Lấp các ô còn lại bằng hero CP cao nhất chưa lấy.
5. Thứ tự ô: tank (nếu có) đứng ô 1 làm thủ lĩnh; nếu không có tank, hero cận chiến CP cao nhất; nếu không có cận chiến, hero CP cao nhất. Các hero còn lại xếp theo CP giảm dần.

Màn xếp đội hiện "CP cũ ▶ CP mới" (đỏ nếu giảm, xanh nếu tăng) [TC].

## 11. Sân Tập

- Cây 90 nấc (`training-tree.json`) [TC: cây dọc xen kẽ HP +12 / ATK +3, giá 5 quặng ở đầu]. Nấc chẵn: mọi hero +12 HP. Nấc lẻ: mọi hero +3 ATK. Giá quặng tăng dần (6 ở nấc đầu → 2470 ở nấc cuối). Phải mở theo thứ tự.
- Mỗi cấp người chơi mở thêm 3 nấc (nấc k cần cấp `floor(k/3) + 1`).
- Cộng phẳng áp cho **mọi hero sở hữu**.
- Cột phải: 5 nút ô đội (10.1).

## 12. Chiến đấu

### 12.1 Đòn đánh thường

- Mỗi đơn vị có bộ đếm `attackCooldown`. Khi được phép đánh, mục tiêu trong `attackRange` (khoảng cách tâm tới tâm trừ bán kính mục tiêu) và `attackCooldown <= 0`: bắt đầu **gồng** `attackWindupSec` = 0.2 s (đứng yên), đặt `attackCooldown = attackInterval`. Hết gồng: nếu mục tiêu còn sống và còn trong `attackRange + 0.5` thì gây sát thương; nếu không, đòn trượt (không hiện số).
- Tầm xa: sát thương áp ngay khi hết gồng; view vẽ đạn bay 0.15 s chỉ để nhìn.
- Sát thương: `dmg = max(1, round(ATK × mult))`, `mult = 1` cho đòn thường. Không có phòng thủ, chí mạng hay ngẫu nhiên trong M1 [QĐ]. Phòng thủ để dành cho trang bị sau này.
- Trúng đòn: đơn vị nháy trắng 0.1 s, bị đẩy lùi 0.15 ô (boss không bị đẩy). Số sát thương đỏ nổi lên [TC].
- Quái chết: "EXP N" trắng nổi lên [TC].

### 12.2 AI quái

- Trong dungeon mọi quái luôn gây hấn, đuổi hero **gần nhất**, chọn lại mỗi 0.5 s, trừ khi đang bị `taunt`.
- Quái tầm xa (Hồn Ma Biển, tầm 3.0) đứng lại khi hero trong tầm và bắn.
- Quái không né, không bỏ chạy.

### 12.3 Boss và đòn báo trước [TC: vòng đỏ ở `dungeon-boss-golem-01.jpg`]

- Boss là quái `kind: boss`, bán kính 1.2 ô, thanh máu lớn ở đầu màn hình (tên + thanh). Boss đánh thường như quái (tầm 1.6).
- Kỹ năng boss (`monsters.json → abilities`), mỗi kỹ năng có hồi chiêu riêng bắt đầu ở 50% khi boss xuất hiện. Boss dùng kỹ năng sẵn sàng đầu tiên theo thứ tự trong mảng `abilities`. Khi đang gồng kỹ năng, boss không đánh thường, không di chuyển.

| Kỹ năng | Báo trước | Kết quả |
|---|---|---|
| Đập Đất (`slam`) | Vòng tròn đỏ trong suốt bán kính 3 ô tâm tại boss, viền đỏ đậm, lớp trong lớn dần từ 0 tới đầy trong 1.5 s | Hết giờ: mọi hero có tâm trong vòng nhận `ATK × 3.0` |
| Húc Lao (`charge`) | Hình chữ nhật đỏ dài 7, rộng 1.6, từ boss hướng về hero gần nhất (khóa hướng lúc bắt đầu), lấp đầy trong 1.2 s | Boss lao hết chiều dài trong 0.4 s; hero trong hình nhận `ATK × 2.0` |
| Gọi Bầy (`summon`) | Không báo | Gọi 8 quái thường đầu tiên trong danh sách nhóm của tầng, quanh boss bán kính 2 ô (tôn trọng giới hạn 60 quái) |

- Người chơi né bằng cách kéo joystick ra khỏi vùng đỏ. Vì đội không đánh khi đang đi, né có giá [TC: LW "lùi ra khỏi vòng đỏ"].

### 12.4 Chết

- Ngoài đồng: mục 6.4.
- Trong dungeon: hero chết nằm lại tới hết lượt [TC: TA]. Hồi máu giữa tầng không hồi sinh. Cả đội chết → thua.

## 13. Hang Xoáy (dungeon)

### 13.1 Cấu trúc

- Một dungeon, **6 chặng × 5 tầng = 30 tầng** (`dungeon.json`). Tầng đánh số toàn cục 1F…30F. Tầng 5, 10, …, 30 là tầng boss [QĐ; game gốc có tầng 1F/3F/4F, số tầng chưa rõ].

| Chặng | Tên | Tầng | Boss | CP đề nghị (tầng boss) |
|---|---|---|---|---|
| 1 | Hang Rương Cũ | 1–5 | Rương Nhai | 4550 |
| 2 | Hang Càng Thép | 6–10 | Cua Càng Thép Chúa | 7300 |
| 3 | Hang Mắt Đá | 11–15 | Mắt Đá | 11700 |
| 4 | Hang Rắn Biển | 16–20 | Rắn Biển Rạn | 18800 |
| 5 | Hang Tàu Ma | 21–25 | Thuyền Trưởng Ma | 30200 |
| 6 | Hang Vua Nhện | 26–30 | Vua Nhện Rạn | 48550 |

- Một **lượt** = 5 tầng liên tiếp của một chặng. Chọn được chặng `s` nếu `s ≤ cấp Cổng Xoáy` và `s ≤ chặng cao nhất đã vượt + 1`.
- M1 vào dungeon **miễn phí**, không giới hạn số lượt [QĐ; game gốc cần cuộn, để sau].

### 13.2 Phòng và sinh quái

- Mỗi tầng là một phòng chữ nhật 16 × 24 ô có tường bao, nền đá [TC: hành lang tối]. Đội xuất hiện ở (8, 2), theo đội hình. Vào tầng đầu của lượt: mọi hero đủ máu, mọi hồi chiêu đầy.
- Quái dungeon có id riêng (`d_...`), không tính cho nhiệm vụ "hạ N quái" ngoài đồng.
- Quái của tầng theo `groups`: mỗi nhóm có `monster`, `count`, `pattern`, `delaySec` (tính từ lúc vào tầng).
  - `ring`: rải đều trên vòng tròn quanh thủ lĩnh, bán kính ngẫu nhiên 6–8 ô, kẹp trong phòng, cách mọi hero ≥ 4 ô.
  - `front`: cụm ở nửa trên phòng: `x` ngẫu nhiên [2, 14], `y` ngẫu nhiên [14, 22].
  - `waves`: như `ring`, từng nhóm theo `delaySec`.
  - `boss`: boss ở (8, 19).
- Tối đa `maxAlive` = 60 quái sống cùng lúc. Quái chưa sinh được vì đầy thì xếp hàng, sinh ngay khi có chỗ (theo thứ tự nhóm).
- Chỉ số quái: `HP = baseHp × hpMult`, `ATK = baseAtk × atkMult` của tầng; EXP × `expMult`; vàng rơi × `goldMult`.
- Tầng thường có 40 / 48 / 54 / 60 quái (tầng 1–4 của chặng). Tầng boss có boss + 30 quái (15 ngay, 15 sau 10 s).

### 13.3 Qua tầng

- Hết quái (mọi nhóm đã sinh và đã chết): mọi vật rơi trong phòng bay về thủ lĩnh; **cửa ra** (xoáy nước xanh) hiện ở (8, 21); thưởng qua tầng `clearGold` vàng.
- Thủ lĩnh chạm cửa (cách ≤ 1 ô) → màn mờ 0.5 s → tầng kế. Nếu AUTO bật, đội tự đi tới cửa sau `floorExitDelaySec` = 1.5 s.
- Sang tầng kế: hero còn sống hồi 30% máu tối đa. Hero chết vẫn chết. Hồi chiêu kỹ năng đặt lại đầy.
- Tầng boss: boss chết → mọi quái còn lại biến mất → **thắng chặng**.

### 13.4 Chuỗi hạ gục [TC: "43 KILL Killing Spree Bonus", vòng đỏ quanh đầu lâu]

- Chỉ trong dungeon. Mỗi quái bị đội hạ (kể cả bằng kỹ năng) +1 chuỗi và đặt lại đồng hồ chuỗi về `streakTimeoutSec` = 3 s. Đồng hồ về 0 → chuỗi về 0.
- Vòng đỏ quanh icon đầu lâu là đồng hồ chuỗi (đầy = 3 s) [QĐ cho ý nghĩa].
- Mỗi khi chuỗi chạm bội số của 20 (20, 40, 60, …): thưởng `10 × (chuỗi / 20) × goldMult` vàng (làm tròn), chữ nổi "Thưởng chuỗi! +X" [TC: "Streak bonus!"].
- Đồng hồ chuỗi dừng từ lúc tầng sạch quái tới khi tầng kế bắt đầu.

### 13.5 Thắng, thua, thưởng

- **Thắng** (hạ boss): nhận mọi thứ đã nhặt trong lượt + thưởng chặng:
  - Lần đầu vượt chặng: `firstClear` (vàng, San Hô Đỏ, Vé Quán), ví dụ chặng 1: 300 vàng, 2 San Hô, 3 Vé.
  - Lần sau: `repeatClear`: 25% vàng lần đầu, 1 Vé, 35% cơ hội 1 San Hô; **bảo hiểm**: lần lặp thứ 3, 6, 9… của cùng chặng luôn cho 1 San Hô [KB: sửa "quặng đỏ ngẫu nhiên"].
- **Thua** (cả đội chết): giữ mọi vàng, thịt đã nhặt trong lượt [QĐ], không có thưởng chặng.
- **Rời hang** (menu tạm dừng → xác nhận): như thua.
- Thoát app giữa lượt: lượt bị hủy, vật đã nhặt trong lượt mất; tải lại ở làng cạnh Cổng Xoáy [QĐ].
- Màn thắng/thua: `03-ux-spec.md` mục 12. Chạm → về làng, đội đứng cạnh Cổng Xoáy, máu đầy.

### 13.6 CP đề nghị

- `recommendedCp(tầng) = round50(3100 × 1.0995^(tầng − 1))`. Bảng chọn chặng hiện CP đề nghị của tầng boss trong chặng.
- Nhãn độ khó so `CP đội / CP đề nghị`: ≥ 1.2 "Dễ" (xanh), ≥ 0.9 "Vừa" (vàng), < 0.9 "Khó" (tím) [TC: chữ tím khi thiếu ở `dungeon-entry-panel-01.jpg`]. Không cấm vào khi "Khó".
- Hệ số quái mỗi tầng được tính ngược từ CP đề nghị bằng mô hình giải tích (`tools/model.py`) để một đội có đúng CP đó thắng với dư khoảng 40% máu.

## 14. Nhiệm vụ chính

- Chuỗi 41 nhiệm vụ trong `quests.json`, làm lần lượt [TC: thẻ nhiệm vụ "Construct: Training Ground", "Kill 10 Rat"].
- Thẻ nhiệm vụ luôn hiện ở giữa trên HUD (`WORLD`), gồm icon mục tiêu, chữ, tiến độ `x/y`.
- Đếm: `gather`, `kill`, `recruit`, `collect`, `auto_assign` đếm sự kiện **sau khi** nhiệm vụ kích hoạt. `build`, `upgrade`, `hero_level`, `clear_floor`, `slots`, `training` so **trạng thái hiện tại** (có thể xong ngay).
- Xong: thẻ đổi viền xanh lá, nhấp nháy, chữ "Nhận thưởng"; chạm thẻ → cộng thưởng (toast liệt kê), âm `confirm`, nhiệm vụ kế hiện ra. Không tự nhận [QĐ].
- Nút kính lúp bên trái thẻ = **chỉ đường** [QĐ; ý nghĩa ở game gốc chưa rõ]: theo `hint`:
  - `node:tree`, `node:rock`, `camp:<quái>`, `zone:<vùng>`: một mũi tên vàng quanh thủ lĩnh chỉ về mục tiêu gần nhất trong 6 s.
  - `building:<id>`: mũi tên chỉ công trình; nếu chưa xây thì như `ui:build_button`.
  - `ui:build_button`, `ui:hero_list`, `ui:squad_button`: nút đó trên HUD nảy và có vòng sáng 3 s.
- Hết chuỗi: thẻ ghi "Hoàn thành Chương 1!" và không còn tiến độ.
- Chuỗi đi qua đủ vòng lặp: chặt, đánh, nâng hero, xây, tuyển, xếp đội, thu sản lượng, nâng kho, Sân Tập, Cổng Xoáy, vượt tầng, mở ô đội, vùng 2, vùng 3, tinh anh, tới tầng 30.

## 15. Lưu, tải và ngoại tuyến

### 15.1 Khi nào lưu

- Mỗi 15 s thời gian chơi; ngay sau mọi giao dịch (xây, nâng, tuyển, lên cấp, mở nấc, nhận thưởng, thu); khi app ẩn (`game.on(Game.EVENT_HIDE)`); khi kết thúc lượt dungeon.
- Không lưu trong lúc `DUNGEON` (save giữ trạng thái trước khi vào).
- Lưu bằng `sys.localStorage` khóa `tidecrew.save.v1`, chuỗi JSON. Lõi tạo/đọc object; view chỉ ghi/đọc chuỗi.

### 15.2 Nội dung save

```json
{
  "saveVersion": 1,
  "createdAt": 0, "lastSaveAt": 0,
  "rng": {"seed": 0, "state": 0, "dungeonRuns": 0},
  "player": {"level": 1, "exp": 0},
  "resources": {"gold": 100, "meat": 0, "wood": 0, "ore": 0, "coral": 0, "tickets": 0},
  "buildings": [
    {"uid": 1, "type": "storage", "level": 1, "x": 21, "y": 21,
     "job": null, "buffer": 0}
  ],
  "heroes": [{"id": "bang", "level": 1, "fragments": 0}],
  "squad": ["bang"], "squadSlots": 3,
  "training": {"nodesUnlocked": 0},
  "tavern": {"cards": ["lan", "se", "dang"], "nextRefreshAt": 0, "bonus": 0, "totalDraws": 0},
  "dungeon": {"bestStageCleared": 0, "repeatClears": {"1": 0}},
  "quest": {"index": 0, "baseValue": 0},
  "world": {"leaderPos": [30, 30], "returnPoint": null},
  "settings": {"music": true, "sfx": true},
  "stats": {"playSec": 0, "kills": 0},
  "inventory": {}
}
```

- `job` khi đang xây: `{"kind": "build" | "upgrade", "targetLevel": 2, "endsAt": 0}` (ms).
- Trạng thái nút tài nguyên, ổ quái, vật rơi **không lưu**; tải lại thì mọi nút đầy, mọi ổ đủ quái [QĐ].
- `inventory` để trống trong M1, dành cho chế tạo/trang bị sau này.
- Đổi định dạng → tăng `saveVersion` và viết hàm chuyển đổi.

### 15.3 Tiến độ ngoại tuyến [KB]

- Khi mở game: `offlineSec = min(now − lastSaveAt, 8 giờ)` (`offlineCapHours`). Nếu `now < lastSaveAt` (đồng hồ lùi) thì `offlineSec = 0`.
- Trong `offlineSec`: sản xuất vào bộ đệm (vẫn bị trần 8 giờ), timer xây/nâng chạy (xong thì có hiệu lực), đồng hồ Quán chạy (làm mới nếu tới giờ). Không mô phỏng chiến đấu, không thu thập.
- Nếu `offlineSec ≥ 60`: hiện panel "Chào mừng trở lại" (xem UX) liệt kê sản lượng chờ thu và công trình đã xong. Nút "Thu hết" chuyển mọi bộ đệm vào kho (vẫn theo trần kho).

## 16. Chừa chỗ cho mở rộng (không làm trong M1)

- **Chế tạo**: tài nguyên là danh sách mở trong dữ liệu (thêm loại mới không đổi code); save có `inventory`; công trình có trường `category` để thêm "xưởng".
- **Thủ thành**: công trình có cờ `blocksMovement` (M1 = false) và HP sau này; AI quái chọn mục tiêu qua một hàm có thể trả về công trình; lưới làng là dữ liệu.
- **Trang bị**: công thức sát thương có chỗ cho phòng thủ (`dmg = max(1, ATK × mult − DEF)` với DEF = 0 trong M1).
- **Vùng sương, dịch chuyển**: vùng là dữ liệu `zones`; có `zoneRecommendedCp` để dùng làm ngưỡng mở.

## 17. Sửa điểm yếu của game gốc (tóm tắt)

| Điểm yếu | Cách sửa trong M1 |
|---|---|
| Tiến độ chậm đột ngột cuối game | EXP theo đa thức (`10 × L^2.3`), CP đề nghị tăng đều 9.95%/tầng, San Hô Đỏ có nguồn cố định và bảo hiểm; mô hình kiểm tra không có bước nhảy (`02-balance.md`) |
| Kho chật | Nhà Kho có sẵn, trần 300 → 18000 luôn ≥ mọi chi phí khi đủ cấp; sản lượng nằm trong bộ đệm không mất; thông báo rõ khi đầy |
| Tự xếp đội theo hạng | TỰ XẾP theo CP gồm tốc đánh và kỹ năng, luôn lấy hồi máu và đỡ đòn |
| Hero không lấy lại được | 12 hero luôn trong bể thẻ, ưu tiên hero chưa có, đổi Vé để mở hero chưa có |
| Không có tiến độ ngoại tuyến | Sản xuất, xây, Quán chạy khi tắt app, trần 8 giờ |
