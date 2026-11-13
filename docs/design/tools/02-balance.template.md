# Số liệu cân bằng, tiến độ và mục tiêu bot (cột mốc 1)

## 1. Dữ liệu ở đâu, chép thế nào

- **Bản gốc của mọi số** là các file JSON trong `docs/design/data/`. Lập trình viên **chép nguyên** các file này sang `game/assets/resources/data/` (cùng tên). Không gõ lại số bằng tay.
- Các bảng trong tài liệu này được in ra từ JSON bằng `tools/gen_tables.py`, chỉ để đọc. Khi lệch nhau, JSON thắng.
- Sinh lại JSON: `cd docs/design/tools && python3 build_data.py ../data`. Kiểm tra: `python3 check.py ../data`. In bảng: `python3 gen_tables.py ../data`. Ba script chỉ dùng thư viện chuẩn của Python 3.
- Mọi file có `"version": 1`. Lõi nên kiểm tra kiểu dữ liệu (validator) khi nạp, như `docs/tech/cocos-3.8-guide.md` mục 2.3 gợi ý.
- Hình (`sprite`) ghi dạng `pack:số`: `td` = kenney-tiny-dungeon, `tb` = kenney-tiny-battle, `urban` = kenney-rpg-urban-kit, `pp` = kenney-pixel-platformer, `food` = kenney-pixel-platformer-food; `composite:rock` = hình ghép (xem `04-placeholder-art.md`).

| File | Nội dung | Mục luật trong `01-game-design.md` |
|---|---|---|
| `tuning.json` | Hằng số toàn cục: bước mô phỏng, bản đồ, vùng, render, đội, chiến đấu, vật rơi, đồng, dungeon, kinh tế, CP, lưu | nhiều mục |
| `heroes.json` | 12 hero: hệ, độ hiếm, vai, HP/ATK cấp 1 (đã nhân độ hiếm), nhịp, tầm, `gatherPower`, kỹ năng, hình | 8 |
| `skills.json` | 24 kỹ năng: loại, hồi chiêu, tham số theo sao | 8.4 |
| `hero-levels.json` | Thịt mỗi cấp, mảnh đột phá, mốc cấp | 8.2, 8.3 |
| `player-levels.json` | EXP mỗi cấp người chơi | 6.5 |
| `buildings.json` | 7 công trình: ô, giới hạn, mỗi cấp: chi phí, thời gian, cấp người chơi cần, hiệu ứng | 7 |
| `training-tree.json` | 90 nấc Sân Tập, 5 nút ô đội | 10.1, 11 |
| `recruit.json` | Giá, tỉ lệ theo cấp Quán, BONUS, trọng số, đổi Vé | 9 |
| `monsters.json` | Quái, tinh anh, boss, kỹ năng boss, hệ số vùng | 6.2, 12 |
| `drop-tables.json` | Bảng rơi, hệ số lượng theo vùng | 6.3 |
| `dungeon.json` | 6 chặng, 30 tầng: CP đề nghị, hệ số, nhóm quái, thưởng | 13 |
| `field-layout.json` | Loại nút tài nguyên, vị trí 145 nút, 32 ổ quái, biển gỗ, đường | 4.1, 6 |
| `quests.json` | 41 nhiệm vụ chính | 14 |

## 2. Hằng số toàn cục quan trọng (`tuning.json`)

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `sim.fixedStepSec` | 1/30 | Bước mô phỏng |
| `squad.moveSpeed` | 3.0 ô/s | Tốc độ đội |
| `squad.attackOnlyWhenIdle` | true | Chỉ đánh khi đứng yên |
| `squad.aggroRadius` / `gatherRadius` / `leashRadius` | 5 / 3 / 4 ô | Chọn mục tiêu quanh thủ lĩnh |
| `squad.startSlots` / `maxSlots` | 3 / 8 | Ô đội |
| `combat.attackWindupSec` | 0.2 s | Gồng trước khi gây sát thương |
| `pickup.magnetRadius` / `autoCollectSec` | 2.5 ô / 6 s | Nhặt vật rơi |
| `field.heroReviveSec` / `monsterRespawnSec` | 8 s / 20 s | Hồi sinh ngoài đồng |
| `dungeon.maxAlive` | 60 | Quái sống tối đa |
| `dungeon.streakTimeoutSec` / `streakMilestone` | 3 s / 20 | Chuỗi hạ gục |
| `economy.builderSlots` | 2 | Thợ xây |
| `economy.offlineCapHours` / `productionBufferHours` | 8 / 8 | Trần ngoại tuyến và bộ đệm sản xuất |
| `hero.growthPerLevel` | 0.03 | +3% chỉ số gốc mỗi cấp |
| `world.zoneRecommendedCp` | z1 1050, z2 4350, z3 10950 | Số trên biển gỗ mỗi vùng |

## 3. Bảng số liệu

### 3.1 Hero (cấp 1, đã nhân độ hiếm)

Độ hiếm nhân HP và ATK: Thường 1.0, Hiếm 1.2, Sử Thi 1.45, Huyền Thoại 1.75. Cột "CP cấp 1" tính theo công thức ở `01` mục 10.2 với kỹ năng 1.

{{heroes}}

### 3.2 Kỹ năng

{{skills}}

### 3.3 Cấp hero

{{hero-levels}}

### 3.4 Cấp người chơi

`exp(L→L+1) = round(10 × L^2.3)` (đa thức, không theo hàm mũ, để không có "tường" cuối game).

{{player-levels}}

### 3.5 Công trình theo cấp

Cấp 1 là chi phí xây mới. Hiệu ứng của công trình sản xuất ghi "sản lượng/giờ, bộ đệm".

{{buildings}}

### 3.6 Sân Tập

Nấc chẵn = HP +12 cho mọi hero, nấc lẻ = ATK +3. Giá `round(6 × 1.07^k)`.

{{training}}

### 3.7 Quái và boss

Ngoài đồng nhân `fieldZoneMult` = z1 0.6, z2 2.0, z3 5.0 cho HP và ATK. Trong dungeon nhân `hpMult`/`atkMult` của tầng. Ví dụ Cua Cát ở Bãi Vỏ Sò: HP 156, ATK 18; Bàng cấp 1 (ATK 110) hạ nó trong 2 nhát.

{{monsters}}

Kỹ năng boss: Đập Đất (vòng bán kính 3, báo 1.5 s, ×3.0 ATK, hồi 7 s), Húc Lao (chữ nhật 7 × 1.6, báo 1.2 s, ×2.0, hồi 11 s), Gọi Bầy (8 quái, hồi 15 s).

### 3.8 Bảng rơi

Ngoài đồng nhân `zoneAmountMult` z1 1.0, z2 1.5, z3 2.0. Vàng của `dungeon_mob` nhân `goldMult` của tầng. Boss không rơi gì; thưởng chặng nằm ở `dungeon.json → stages`.

{{drops}}

### 3.9 Hang Xoáy

`recommendedCp(f) = round50(3100 × 1.0995^(f−1))`. Hệ số quái tính ngược từ CP đề nghị (mục 6.3). Vì số ô đội dự kiến tăng theo chặng (3, 4, 5, 6, 7, 8), hệ số quái đầu chặng mới có thể thấp hơn cuối chặng trước một chút; CP đề nghị vẫn tăng đều.

{{stages}}

{{floors}}

### 3.10 Tuyển hero

Giá 100 vàng/lượt, 1x/2x/3x, đổi thẻ 30 phút hoặc 50 vàng, +5 mảnh mỗi lượt trùng, +1 Vé mỗi lượt, BONUS mỗi 10 lượt. Tỉ lệ theo cấp Quán: `01` mục 9.2. Đổi Vé: `01` mục 9.4.

### 3.11 Nhiệm vụ chính

{{quests}}

## 4. Tiến độ mong muốn

Số dưới đây là **mục tiêu thiết kế**, khớp với mô hình kinh tế (`tools/check.py`, mục 6). Bot và QA so với bảng này.

| Thời gian chơi | Người chơi mới nên đạt được |
|---|---|
| 5 phút | Cấp người chơi 3. Đã chặt cây, đập đá, hạ cua và chuột ở Bãi Vỏ Sò. Bàng cấp 4–5. Đã xây Trại Gỗ; Quán Mỏ Neo đang xây hoặc vừa xong; lượt tuyển đầu (Sẻ) ở khoảng phút 6. Đang ở nhiệm vụ 7–9. |
| 30 phút | Cấp người chơi 8. Đủ 7 loại công trình (Nhà Kho cấp 2–3). 5–6 hero, đội 3 người cấp khoảng 7, CP khoảng 6800. Khoảng 25 nấc Sân Tập. **Đã vượt chặng 1 (tầng 5)**, có 2 San Hô Đỏ. Đã sang Rừng Dừa Rậm. |
| 2 giờ | Cấp người chơi 14. 10–12 hero, đội 5 người cấp khoảng 15, CP khoảng 19000. Khoảng 40 nấc. **Đã vượt chặng 3 (tầng 15)**. Đang farm Gò Đá Lam. Nhà Kho cấp 5. |
| 10 giờ | Cấp người chơi 24. Đủ 12 hero, đội 7 người cấp 25–26, CP khoảng 40000. 72 nấc. **Đã vượt chặng 5 (tầng 25)** (mô hình: 6.6–7.3 giờ). Chặng 6 (CP đề nghị 48550) là mục tiêu tiếp theo, cần thêm vài giờ. |

## 5. Mục tiêu bot mô phỏng (tiêu chí hoàn thành M1)

### 5.1 Mục tiêu

**Từ một save mới, bot headless (không hiển thị) phải hạ boss tầng 20 (vượt chặng 4) trong không quá 6 giờ thời gian chơi mô phỏng, và không bị kẹt.**

Các mốc kiểm tra dọc đường (phải đạt, trễ hơn là lỗi cân bằng hoặc lỗi bot):

| Mốc | Hạn chót (giờ mô phỏng) | Mô hình dự kiến |
|---|---|---|
| Vượt tầng 5 | 0:45 | 0:16 |
| Vượt tầng 10 | 1:30 | 0:37–0:43 |
| Vượt tầng 15 | 3:00 | 1:30–1:45 |
| **Vượt tầng 20** | **6:00** | **3:04–3:10** |
| (Tham khảo) vượt tầng 25 | không bắt buộc | 6:36–7:16 |

Hạn chót rộng khoảng gấp đôi mô hình vì mô hình bỏ qua đi lại, né đòn, tốc độ thật của chiến đấu.

- "Kẹt" = trong 30 phút mô phỏng liên tiếp không có tiến bộ nào: không lên cấp người chơi, không công trình nào lên cấp, không hero nào lên cấp, không mở nấc mới, không vượt tầng mới. Kẹt là thất bại.
- Thời gian chơi mô phỏng = số bước × 1/30 s, tính cả thời gian trong panel (bot mở panel tức thì, 0 s) và trong dungeon. Không có thời gian ngoại tuyến.
- Bảng tiến độ bot phải in mỗi 15 phút mô phỏng: thời gian, cấp người chơi, CP đội, số hero sở hữu, số ô đội, cấp các hero trong đội, số nấc Sân Tập, cấp từng công trình, chặng cao nhất đã vượt, tài nguyên đang có, tổng lượt tuyển, nhiệm vụ hiện tại. Lưu bảng ở dạng CSV hoặc Markdown cạnh kết quả test.

### 5.2 Chính sách bot gợi ý

Bot chơi qua đúng các lệnh mà view gửi (joystick, mở panel, bấm nút), không đọc ghi trực tiếp vào state. Thứ tự ưu tiên mỗi khi rảnh:

1. Nhận thưởng nhiệm vụ nếu xong.
2. Nếu có quái hay nút trong tầm: đứng yên cho đội đánh. Ngoài đồng chỉ đi tới mục tiêu kế tiếp khi xung quanh không còn gì.
3. Trong dungeon: nếu thủ lĩnh hoặc phần lớn đội nằm trong vùng đỏ báo đòn, đi thẳng ra khỏi vùng (hướng ra xa tâm vòng, hoặc vuông góc với hình chữ nhật), rồi đứng lại. Hết quái thì đi tới cửa ra.
4. Xây công trình mới đã mở theo thứ tự: Trại Gỗ, Quán Mỏ Neo, Mỏ Quặng, Sân Tập, Chợ Bến, Cổng Xoáy.
5. Nếu CP đội ≥ CP đề nghị của chặng kế mà Cổng Xoáy chưa đủ cấp: dành gỗ và quặng cho Cổng Xoáy. Nếu đủ San Hô Đỏ cho ô đội kế mà Sân Tập chưa đủ cấp: dành tài nguyên cho Sân Tập. Nếu chi phí đó lớn hơn trần kho: nâng Nhà Kho trước.
6. Nâng công trình rẻ nhất còn nâng được (khi còn thợ).
7. Mở ô đội khi đủ San Hô Đỏ. Mở nấc Sân Tập khi còn quặng sau khi chừa 1/3 giá của công trình định nâng.
8. Tiêu hết vàng vào tuyển (100 vàng/lượt). Dùng Vé để mở hero Sử Thi/Huyền Thoại chưa có; nếu hero trong đội cần mảnh để đột phá thì đổi 8 Vé lấy 5 mảnh.
9. Lên cấp hero trong đội, hero cấp thấp nhất trước. Bấm TỰ XẾP sau mỗi lần có hero mới hoặc lên cấp.
10. Nếu CP ≥ CP đề nghị chặng kế và Cổng đủ cấp: vào chặng kế. Mỗi 30 phút, đánh lại chặng cao nhất đã vượt một lần (San Hô Đỏ, vàng).
11. Ngoài đồng: farm vùng cao nhất có CP đề nghị ≤ CP đội. Nếu nhiệm vụ hiện tại yêu cầu quái của vùng khác, về vùng đó.
12. Về làng thu sản lượng ít nhất mỗi 20 phút.

## 6. Đã kiểm tra những gì bằng số học

Script: `tools/check.py` (chạy trên JSON thật trong `data/`). Kết quả lần chạy cuối: **không có vấn đề**.

### 6.1 Kiểm tra tĩnh

1. **Không chi phí nào vượt khả năng chứa.** Với mọi cấp của mọi công trình, mọi chi phí gỗ/quặng ≤ trần Nhà Kho cao nhất mà người chơi được xây ở `reqPlayerLevel` của cấp đó. Riêng Nhà Kho: chi phí lên cấp L ≤ trần của cấp L−1. Mọi giá thịt lên cấp hero và mọi giá quặng của nấc Sân Tập cũng ≤ trần kho ở cấp mở tương ứng.
2. **Không tầng nào không với tới.** CP tối đa trong M1 (8 hero mạnh nhất cấp 30, đủ 90 nấc, đủ hiệu ứng sở hữu) = 54568. Tầng khó nhất (30) đề nghị 48550. Mọi tầng ≤ CP tối đa.
3. **Không tài nguyên cụt.** Mỗi tài nguyên có ít nhất một nguồn và một chỗ tiêu:

| Tài nguyên | Nguồn | Chỗ tiêu |
|---|---|---|
| Vàng | quái, Chợ Bến, dungeon, nhiệm vụ | tuyển, làm mới thẻ |
| Thịt | quái, nhiệm vụ | lên cấp hero |
| Gỗ | cây, Trại Gỗ, nhiệm vụ | mọi công trình |
| Quặng | đá, Mỏ Quặng, nhiệm vụ | công trình (từ cấp 2–3), Sân Tập |
| San Hô Đỏ | thưởng chặng, Cua Càng Thép, nhiệm vụ | ô đội |
| Vé Quán | tuyển, dungeon, nhiệm vụ | đổi mảnh/hero (đổi mảnh không giới hạn) |
| Mảnh | tuyển trùng, đổi Vé | đột phá hero |
| EXP | quái | cấp người chơi |

4. **San Hô Đỏ đủ cho ô đội.** Nguồn cố định: 27 (lần đầu vượt 6 chặng) + 9 (nhiệm vụ) = 36 ≥ 33 cần cho ô 4–8. Thêm nguồn lặp có bảo hiểm (1 San Hô mỗi 3 lần đánh lại một chặng) và Cua Càng Thép (25%).

### 6.2 Mô hình tiến độ theo phút

`check.py` chạy một người chơi giả 10 giờ, bước 60 s, theo chính sách ở 5.2, với 5 seed. Giả định:

- Ngoài đồng: 35% thời gian chặt cây, 25% đập đá, 40% đánh quái; mỗi lần chuyển mục tiêu mất 2.5 s; tối đa 4 cây, 3 đá, 10 quái mỗi phút (ổ quái mọc lại 20 s và phải đi giữa các ổ).
- Sát thương đội thật tính từ chỉ số hero (ATK / nhịp × 1.2 cho kỹ năng), hiệu suất 75%.
- Dungeon: vào chặng khi CP ≥ CP đề nghị; mỗi tầng mất khoảng 3 lần thời gian giải tích + 15 s.
- Sản lượng được thu liên tục; nhiệm vụ được nhận ngay khi xong.

Kết quả (seed 1; 4 seed khác lệch dưới 15%):

{{model}}

Phút vượt chặng theo 5 seed: chặng 1: 16; chặng 2: 37–43; chặng 3: 90–105; chặng 4: 184–190; chặng 5: 396–436. Nhiệm vụ 40 (tầng 25) xong ở khoảng phút 437.

Nguồn vàng trong 10 giờ (seed 1): đồng khoảng 10400, dungeon khoảng 16100, nhiệm vụ 1310, Chợ Bến khoảng 1450; tổng khoảng 290 lượt tuyển.

### 6.3 Mô hình chiến đấu dùng để đặt hệ số quái

`tools/model.py`, giải tích, không phải mô phỏng thời gian thực:

- Đội có CP = C có sát thương mỗi giây ≈ `0.45 × C / 4 × 1.25` (45% CP nằm ở phần tấn công, kỹ năng +25%) và tổng HP ≈ `0.55 × C`.
- Thời gian dọn N quái máu h: `T = N × h / (DPS × 0.75)`. Tối đa `4 + 3n` quái đánh đội cùng lúc (n = số hero).
- Sát thương nhận = DPS quái × số quái đang đánh × T, giảm dần khi quái chết. Boss: thêm Đập Đất và Húc Lao với giả định né được 60%.
- "Đủ mạnh" = sát thương nhận ≤ 60% tổng HP. Từ đó giải ra hệ số quái mỗi tầng để CP cần đúng bằng CP đề nghị.

### 6.4 Điều chưa kiểm được

- Mô hình không chạy chiến đấu thật. Bot thật có thể nhanh hơn hoặc chậm hơn. Nếu bot trượt hạn chót, xem 7.
- Thời gian dọn tầng ước lượng (cột `estClearSec` trong `dungeon.json`) chỉ là bậc độ lớn.

## 7. Nút chỉnh khi bot trượt mục tiêu

Lập trình viên **được** đổi các số dưới đây (trong JSON hoặc `build_data.py`) để bot đạt mục tiêu, và **phải ghi** thay đổi vào báo cáo. Không đổi luật.

| Triệu chứng | Chỉnh |
|---|---|
| Đội thua ở tầng có CP đề nghị ≤ CP đội | Giảm `hpMult`/`atkMult` của mọi tầng cùng một tỉ lệ (ví dụ × 0.85), giữ `recommendedCp` |
| Đội thắng dễ ở CP 0.6 lần đề nghị | Tăng `hpMult`/`atkMult` cùng tỉ lệ |
| CP tăng quá chậm (thiếu thịt) | Tăng `field_meat` min/max |
| Thiếu gỗ cho Cổng Xoáy | Giảm chi phí gỗ của Cổng Xoáy hoặc tăng `perHour` của Trại Gỗ |
| Kẹt vì cấp người chơi | Giảm hệ số 10 trong công thức EXP |
