# Hình và âm thanh tạm (cột mốc 1)

Mọi thứ game cần vẽ hoặc phát, lấy file nào trong `art-source/`, hoặc vẽ bằng code thế nào khi chưa có file. Mục tiêu: **không có thứ gì chặn lập trình viên**. Tất cả file nguồn là CC0 (font: OFL), xem `art-source/ASSETS_MANIFEST.md`.

## 0. Quy ước

- Ký hiệu đường dẫn ngắn:

| Ký hiệu | Thư mục |
|---|---|
| `td:NNNN` | `art-source/kenney-tiny-dungeon/Tiles/tile_NNNN.png` (16×16) |
| `tb:NNNN` | `art-source/kenney-tiny-battle/Tiles/tile_NNNN.png` (16×16) |
| `urban:NNNN` | `art-source/kenney-rpg-urban-kit/Tiles/tile_NNNN.png` (16×16) |
| `pp:NNNN` | `art-source/kenney-pixel-platformer/Tiles/tile_NNNN.png` (18×18) |
| `food:NNNN` | `art-source/kenney-pixel-platformer-food/Tiles/tile_NNNN.png` (18×18) |
| `icon:tên` | `art-source/kenney-board-game-icons/PNG/Default (64px)/tên.png` (hình trắng trên nền trong suốt, tô màu được) |
| `ui:Màu/tên` | `art-source/kenney-ui-pack/PNG/Màu/Default/tên.png` |
| `sfx:đường/dẫn` | `art-source/sfx-cc0/đường/dẫn` |
| `proc:tên` | Hình **sinh bằng code** lúc khởi động (mục 0.1) |

- Số thứ tự sprite là **tên file**, không phải số in trên contact sheet (hai cái không khớp ở một số pack). Tôi đã mở từng file được nêu dưới đây để xác nhận nó là thứ được mô tả.
- Hình pixel 16 px phóng to bằng số nguyên (`tuning.render.spriteScale`: hero ×4 = 64, quái ×3 = 48, tinh anh ×5, boss ×10, nút tài nguyên ×4, vật rơi ×2). Đặt lọc texture là **nearest** để pixel sắc nét.
- "Tô màu" = `sprite.color`, nhân với màu gốc. Hình trắng (`icon:`, `proc:`) nhận đúng màu tô; hình có màu chỉ ngả màu.
- Để gom draw call: chép mọi sprite 16–18 px dùng tới vào **một atlas** (một PNG + JSON rect), như `docs/tech/cocos-3.8-guide.md` mục 4.2 và 5.5 mô tả. Icon 64 px và UI vào atlas thứ hai.

### 0.1 Hình sinh bằng code (`proc:`)

Lúc khởi động, tạo một texture trắng 256 × 256 bằng buffer điểm ảnh (`ImageAsset` từ mảng RGBA, rồi `Texture2D`, rồi các `SpriteFrame` theo rect), chứa:

| Tên | Rect | Hình |
|---|---|---|
| `proc:pixel` | 4 × 4 | vuông trắng đặc (thanh, nền phủ, ô màu) |
| `proc:diamond` | 120 × 60 | hình thoi trắng đặc, khử răng cưa 1 px |
| `proc:circle` | 64 × 64 | tròn trắng đặc |
| `proc:ring` | 64 × 64 | vòng trắng dày 6 |
| `proc:arc` | 64 × 64 | lưỡi liềm trắng (vệt chém) |

Mọi thứ vẽ bằng các frame này cùng texture nên gom được batch. Cách tạo texture từ buffer chưa được thử trong harness [chưa kiểm chứng]; nếu không chạy, thay bằng `Graphics` (chấp nhận thêm draw call) và báo lại.

## 1. Thế giới

### 1.1 Nền ô thoi kiểu bàn cờ [TC: `hud-field-gathering-coins-01.jpg`]

Không pack nào có nền iso. Làm như sau:

- Mỗi khối 2 × 2 ô logic là một `proc:diamond` phóng thành 240 × 120, tô màu xen kẽ theo `(floor(x/2) + floor(y/2)) % 2`:
  - Đồng: `#5DBB63` / `#52A957`. Làng: `#6CC46F` / `#60B565`. Dungeon: `#3B3F5C` / `#34374F` (`tuning.render`).
- Chỉ tạo sprite cho khối nằm trong camera + 1 khối lề; tái dùng khi camera đi (khoảng 60 sprite).
- Viền nước (ô viền bản đồ): diamond `#3C7DD9`, thêm một diamond nhỏ hơn 10% `#5A9BEA` lệch lên 4 px làm sóng.
- Đường đất (`paths`): diamond 120 × 60 cho từng ô, `#D9B07A`.
- Cỏ trang trí: trên mỗi khối, vị trí tất định theo hash(khối), 0–2 bụi cỏ = foliage `art-source/kenney-foliage-sprites/PNG/Flat/sprite_0001.png`…`sprite_0006.png` thu còn 36 × 36, tô `#3E8E46`, mờ 70%. Hoa: `sprite_0010.png` 28 × 28 tô `#FFFFFF`.
- Ranh giới vùng: một dải diamond `#4B9A51` (đậm hơn) dọc ô `d = 17` và `d = 24`.

### 1.2 Nút tài nguyên

| Thứ | Hình | Ghi chú |
|---|---|---|
| Cây Bãi Vỏ Sò | `urban:0260` ×4 | cây tán tròn xanh ngọc, thân nâu |
| Cây Rừng Dừa Rậm | `urban:0291` ×4, tô `#9FD8A0` | cây thông |
| Cây Gò Đá Lam | `urban:0346` ×4 | cây tán cam |
| Gốc cây (đã chặt) | `proc:circle` 28 × 18 tô `#8B5A2B` + `proc:ring` 28 × 18 tô `#5C3A1A` | |
| Đá có quặng (`composite:rock`) | `proc:circle` 56 × 40 tô `#A7AEB8` (thân đá), thêm `proc:circle` 40 × 28 tô `#C9CED6` lệch trên trái (mặt sáng), trên đỉnh `pp:0067` ×2 (tinh thể xanh) [TC: đá xám có tinh thể xanh] | |
| Đá vụn (đã đập) | 3 `proc:circle` 12 × 9 tô `#8C939C` | |
| Vòng đếm mọc lại | `icon:timer_CW_25`, `timer_CW_50`, `timer_CW_75`, `timer_100` 32 × 32 tô trắng, đổi theo % thời gian | [TC hình bánh] |
| Mảnh văng khi đánh | gỗ: `pp:0007` ×1.5; quặng: `pp:0067` ×1 | 3 mảnh bay 0.3 s |

### 1.3 Công trình

Hình 16 px của tiny-battle (kiểu nhà máy hiện đại, không khớp chủ đề làng chài, nhưng có màu và dễ phân biệt). Vẽ trên một đế diamond bằng footprint (`proc:diamond` phóng `w × 120` theo chiều rộng footprint, tô `#C8A878` 80%). Hình phóng ×12 cho 2×2, ×18 cho 3×3, đặt tâm dưới hình ở tâm footprint.

| Công trình | Hình | Màu chủ đạo (để nhớ) |
|---|---|---|
| Nhà Kho | `tb:0081` (nhà khung cam) | cam |
| Trại Gỗ | `tb:0029` (xưởng mái răng cưa xanh lá) | xanh lá = gỗ |
| Mỏ Quặng | `tb:0048` (cần cẩu xanh dương) | xanh dương = quặng |
| Quán Mỏ Neo | `tb:0064` (nhà lớn đỏ) | đỏ |
| Sân Tập | `tb:0067` (lều đỏ) [TC: Training Ground là lều sọc] | đỏ |
| Chợ Bến | `tb:0080` (cụm nhà cam) | vàng cam = vàng |
| Cổng Xoáy | `tb:0025` (khung cổng xám) + `proc:circle` 0.6 footprint tô `#2E8BFF` và `proc:ring` tô `#9FD0FF` xoay 90°/s ở giữa | xanh dương xoáy [TC: Dungeon Portal xoáy xanh] |
| Giàn giáo (đang xây mới) | đế diamond tô `#8B6B4A`, 4 `td:0063` (thùng gỗ) ×4 ở bốn góc, `pp:0086` (biển gỗ) ×5 ở giữa, `proc:pixel` 4 × 60 tô `#C8A878` làm 4 cọc [TC: đống gỗ đá có dây, biển búa] | |
| Bóng khi xây | hình công trình mờ 70% + footprint `proc:diamond` xanh lá/đỏ 45% | |
| Bong bóng tài nguyên | `ui:Grey/button_round_flat` 64 × 64 nền trắng + icon tài nguyên 40 + nhãn | |
| Dấu chấm than | `proc:circle` 56 tô `#FFD34D` + chữ "!" Bold 40 đen | [TC] |
| Dấu check | `ui:Green/check_round_color` | [TC] |
| Ổ khóa cấp | `icon:lock_closed` tô `#E8EAEE` + `icon:hexagon` 36 tô `#2E6FD8` có số | [TC] |
| Biển gỗ vùng | `pp:0086` ×5 + nhãn | |

### 1.4 Hero và quái

Hình đầy đủ ghi trong `heroes.json`, `monsters.json` (trường `sprite`, `tint`). Tóm tắt:

| Hero | Hình | Tô | | Quái | Hình | Tô |
|---|---|---|---|---|---|---|
| Bàng | `td:0097` (hiệp sĩ) | — | | Cua Cát | `td:0110` (con cua đỏ) | — |
| Đô Neo | `td:0087` (người sừng) | — | | Chuột Bến / Chuột Hang | `td:0124` | — / `#C8B8A0` |
| Rùa Sắt | `td:0096` (mũ sắt) | `#9FE3C9` | | Sứa Nhầy | `td:0108` (slime xanh) | `#9FD8FF` |
| Kình Vương | `td:0086` (người hói to) | `#8FB8FF` | | Dơi Hang | `td:0120` (dơi) | — |
| Sẻ | `td:0088` | — | | Nhện Rạn | `td:0122` (nhện) | — |
| Mực | `td:0112` (khăn xanh) | — | | Hồn Ma Biển | `td:0121` (ma) | `#BFFFF0` |
| Én | `td:0098` | `#7FE0FF` | | Cua Càng Thép (tinh anh) | `td:0110` ×5 | `#C0C8D8` |
| Diều | `td:0099` | `#FFE08A` | | Rương Nhai (boss 1) | `td:0092` (rương có răng) ×10 | — |
| Lan | `td:0100` (bà cụ) | — | | Cua Càng Thép Chúa (boss 2) | `td:0110` ×10 | `#C0C8D8` |
| Đăng | `td:0084` (phù thủy tím) | — | | Mắt Đá (boss 3) | `td:0109` (một mắt) ×10 | `#B8B8B8` |
| San | `td:0085` | `#FF9FB0` | | Rắn Biển Rạn (boss 4) | `td:0123` ×10 | `#7FFFD4` |
| Triều | `td:0111` (áo choàng) | `#7FA8FF` | | Thuyền Trưởng Ma (boss 5) | `td:0121` ×10 | `#FF8080` |
| | | | | Vua Nhện Rạn (boss 6) | `td:0122` ×10 | `#FF5050` |

- Bóng dưới mọi đơn vị: `tb:0197` (bóng mờ) ×3 (hero) hoặc theo tỉ lệ, mờ 50%.
- Vũ khí vung khi đánh (mục 2): cận chiến `td:0104` (kiếm) cho Bàng, Rùa Sắt, Mực (`td:0103` dao); `td:0118` (rìu) cho Đô Neo, Kình Vương; cung thủ không vung.
- Đạn: tên/lao `td:0131` (giáo nhỏ) ×2 xoay theo hướng bay; phép `proc:circle` 16 tô `#FFB347` (Đăng), `#7FD4FF` (Triều); hồi máu: chữ "+" xanh lá Bold 28 bay lên trên hero được hồi.

### 1.5 Dungeon [TC: tường đá gai, đuốc, nền đá tối]

| Thứ | Hình |
|---|---|
| Nền | diamond `#3B3F5C` / `#34374F` (1.1) |
| Tường (ô viền phòng) | `td:0040` (gạch đá) ×6, vẽ đứng tại mỗi ô tường, chồng 2 tầng (lệch 48 px) thành khối; trên đỉnh 3 `proc:pixel` 6 × 18 tô `#C9CED6` làm gai [TC: khối đá có gai] |
| Cờ treo tường và ánh đuốc | `td:0029` (tường có cờ đỏ) ×6 thay cho `td:0040` ở một ô tường mỗi 4 ô, thêm `proc:circle` 80 tô `#FFB347` mờ 25% nhấp nháy |
| Bẫy trang trí | `td:0041` (ô bẫy gai) ×6 trên nền, 2–3 cái mỗi phòng, vị trí tất định, không gây sát thương (M1) |
| Cửa ra | `proc:circle` 1.6 ô tô `#2E8BFF` + 2 `proc:ring` tô `#9FD0FF` xoay ngược chiều + mũi tên `ui:Yellow/arrow_basic_s` nảy phía trên |
| Báo đòn Đập Đất | `proc:circle` bán kính 3 ô (chiếu iso: dẹt 2:1) tô `#FF2020` mờ 25% + `proc:ring` cùng cỡ tô `#FF2020` đặc; lớp trong `proc:circle` tô `#FF2020` 35% phóng từ 0 tới đầy [TC: vòng đỏ] |
| Báo đòn Húc Lao | `proc:pixel` kéo thành chữ nhật 7 × 1.6 ô (xoay theo hướng, chiếu iso) tô `#FF2020` 25%, lớp trong lấp từ boss ra |

### 1.6 Vật rơi

| Thứ | Hình |
|---|---|
| Vàng | `pp:0151` ×2; xoay giả bằng đổi qua lại `pp:0152` mỗi 0.15 s |
| Thịt | `food:0008` ×2 |
| San Hô Đỏ (từ tinh anh) | `pp:0067` ×2 tô `#FF5050` |

## 2. Cử động khi không có khung hoạt hình

Các pack không có khung đi bộ. Mọi cử động làm bằng biến đổi (vị trí, xoay, tỉ lệ, màu) trên **một** sprite, do một manager cập nhật cho mọi đơn vị (không tạo component riêng mỗi con):

| Trạng thái | Cách làm |
|---|---|
| Đứng yên | "Thở": `scaleY` dao động 1.00 ↔ 1.04, 1 lần/giây, pha lệch theo `entityId` |
| Đi | "Nhún": dịch sprite lên `|sin(2π × 4 × t)| × 6` px (4 bước/giây) và nghiêng `sin(2π × 4 × t) × 6°`. Quái dùng 3 bước/giây, 4 px |
| Hướng | Lật ngang (`scaleX = −1`) khi vận tốc trên màn hình hướng sang trái (ngưỡng 0.05 ô/s). Khi đánh, quay về phía mục tiêu |
| Gồng đòn (0.2 s) | Lùi 4 px ngược hướng mục tiêu, `scaleY` 0.92 |
| Ra đòn cận chiến | Lao về phía mục tiêu 20 px trong 0.06 s rồi về trong 0.1 s; vũ khí (1.4) quay một cung 120° quanh hero trong 0.12 s; vẽ `proc:arc` trắng 64 × 64 mờ dần 0.15 s phía mục tiêu [TC: vết chém trắng] |
| Ra đòn tầm xa | Giật lùi 6 px, đạn bay 0.15 s |
| Dùng kỹ năng | Như ra đòn, cộng: `proc:ring` tô màu hệ phóng 0.5 → 1.5 trong 0.3 s quanh hero; tên kỹ năng chữ trắng 22 nổi trên đầu 0.8 s. Vùng `cleave`/`nova`: `proc:circle` bán kính bằng `radius` (chiếu iso) tô màu hệ 30% trong 0.2 s |
| Trúng đòn | Tô `#FF7070` 0.1 s (thay cho nháy trắng, vì tô màu không làm sáng hơn) [TC: hero phủ đỏ khi bị đánh], đẩy lùi 0.15 ô (lõi) |
| Chết (hero) | Xoay 90° trong 0.2 s, tô `#808080`, mờ 70%; nằm đó |
| Chết (quái) | Xoay 90°, mờ dần trong 1 s rồi ẩn |
| Hồi sinh | `proc:ring` xanh lá phóng to, hình bật lên từ 0.5 → 1 tỉ lệ trong 0.2 s |
| Thu thập | Như ra đòn cận chiến (cả hero tầm xa cũng "lao" vào nút); nút rung ngang ±3 px 0.1 s; mảnh văng (1.2) |
| Lên cấp hero / thủ lĩnh | Vương miện `icon:crown_a` 28 tô `#FFD34D` nổi trên đầu thủ lĩnh |

## 3. HUD và giao diện

| Thứ | Hình |
|---|---|
| Font | `art-source/font-be-vietnam-pro/BeVietnamPro-Bold.ttf`, `BeVietnamPro-Regular.ttf` (OFL). Nếu nạp TTF lỗi trong harness, tạm dùng font hệ thống (đã chạy trong harness) |
| Nền panel | `ui:Blue/button_square_flat` 9-slice (viền 16) tô `#1B3A6B` |
| Ruy-băng tiêu đề | `ui:Blue/button_rectangle_depth_flat` 9-slice |
| Nút chính xanh lá | `ui:Green/button_rectangle_depth_flat` 9-slice; khóa: `ui:Grey/button_rectangle_depth_flat` |
| Nút đỏ | `ui:Red/button_rectangle_depth_flat` |
| Nút back | `ui:Blue/button_square_depth_flat` 96 × 96 + `ui:Blue/arrow_basic_w` tô trắng |
| Nút tròn HUD (Hero, Đội, Xây, Về làng) | `ui:Blue/button_round_depth_flat` 112 × 112 tô `#173A73` + icon |
| Ô tài nguyên | `proc:pixel` nền `#0E2347` 80% bo bằng 9-slice của `ui:Grey/button_rectangle_flat`; thanh `proc:pixel` xanh lá `#4CD137` |
| Thanh EXP, máu, tiến độ | `proc:pixel` (nền đen, phần đầy màu) |
| Lục giác cấp | `icon:hexagon` tô `#2E9BFF`, viền `icon:hexagon_outline` tô trắng |
| Joystick | đế `proc:ring` 220 × 220 trắng 60% + `proc:circle` 220 trắng 15%; núm `proc:circle` 100 trắng 60% |
| Thẻ hero | khung `ui:Grey/button_square_flat` 9-slice tô màu độ hiếm; hình hero ×6; dải dưới `proc:pixel` `#0E2347` |
| Sao kỹ năng | `ui:Yellow/star` / `ui:Grey/star_outline` |
| Thẻ nhiệm vụ | `ui:Grey/button_rectangle_flat` 9-slice tô `#E8EAEE`; ô icon `proc:pixel` `#4FB3FF` |
| Toast | `proc:pixel` đen 75% |
| Màn thắng: tia sáng | 12 `proc:pixel` 8 × 600 tô `#FFFFFF` 8% xoay quanh tâm 20°/s |
| Màn thắng: huy hiệu | `icon:hexagon` 280 tô `#FFC531` + chân dung thủ lĩnh ×10; cờ `icon:flag_triangle` tô `#E5484D` |
| Màn thua | hình thủ lĩnh xoay 90° tô `#808080`, `icon:flag_square` tô trắng cắm cạnh; đèn chiếu `proc:pixel` hình thang mờ (hai sprite xoay) |
| Màn tiêu đề | bầu trời `proc:pixel` `#7EC8F2`, biển `proc:pixel` `#3C7DD9`, đảo `proc:circle` `#5DBB63`, 4 hero ×8 đứng giữa |
| Pháo giấy (Nhận Hero) | 40 `proc:pixel` 8 × 12 màu ngẫu nhiên rơi, xoay |
| Rèm Quán | `proc:pixel` `#5A1E2E` toàn màn hình + vệt dọc `#6E2638` mỗi 60 px |
| Chân dung NPC trên ruy-băng | Nhà Kho `urban:0320`, Trại Gỗ `urban:0023`, Quán `urban:0104`, Mỏ `urban:0266`, Sân Tập `urban:0131`, Chợ `urban:0158`, Cổng Xoáy `urban:0185`; ×7, trong `proc:circle` 120 tô `#FFFFFF` |

### 3.1 Icon

| Icon | Nguồn | Tô |
|---|---|---|
| Vàng | `pp:0151` | — |
| Thịt | `food:0008` | — |
| Gỗ | `icon:resource_wood` | `#B9773A` |
| Quặng | `pp:0067` | — |
| San Hô Đỏ | `pp:0067` | `#FF5050` |
| Vé Quán | `icon:card` | `#FFD34D` |
| Mảnh hero | `icon:cards_stack` | `#B455F5` |
| CP (hai kiếm chéo) | 2 × `icon:sword` xoay ±45° | `#C9CED6` |
| ATK | `icon:sword` | `#C9CED6` |
| HP | `icon:suit_hearts` | `#FF5A5A` |
| EXP | chữ "EXP" | — |
| Hệ Sức Mạnh / Nhanh Nhẹn / Trí Tuệ | `icon:shield` / `icon:bow` / `icon:flask_full` | màu hệ |
| Khóa | `icon:lock_closed` | trắng |
| Thời gian xây | `icon:hourglass` | trắng |
| Chuỗi hạ gục (đầu lâu) | `icon:skull` | trắng, trong `proc:ring` đỏ |
| Tầng | `icon:flag_triangle` | `#7FE0FF` |
| AUTO | `icon:arrow_clockwise` | trắng |
| Đống lửa (xếp đội) | `icon:campfire` | `#FF9A3C` |
| Vương miện thủ lĩnh | `icon:crown_a` | `#FFD34D` |
| Hero (nút HUD) | `icon:pawns` | trắng |
| Đội (nút HUD) | chân dung thủ lĩnh ×4 | — |
| Xây (búa) | không có búa; dùng `icon:structure_house` | trắng |
| Về làng / Ra đồng | `proc:circle` `#2E8BFF` + `proc:ring` `#9FD0FF` | |
| Cài đặt (bánh răng) | không có; vẽ: `proc:circle` 56 + 8 `proc:pixel` 14 × 20 xoay quanh làm răng + `proc:circle` 20 tô nền ở giữa | `#C9CED6` |
| Kính lúp | không có; vẽ: `proc:ring` 40 + `proc:pixel` 10 × 24 xoay 45° làm cán | trắng trên ô `#5A6070` |
| Tạm dừng | 2 `proc:pixel` 14 × 44 | trắng |
| Mũi tên chỉ đường | `ui:Yellow/arrow_decorative_e` | — |
| Check / X | `ui:Green/icon_checkmark`, `ui:Red/icon_cross` | — |
| Thanh BONUS | `proc:pixel` tím `#8A4FFF` | |

## 4. Âm thanh

| Sự kiện | File | Ghi chú |
|---|---|---|
| Chạm nút | `sfx:ui/click-01.ogg` | |
| Đổi tab, bật công tắc | `art-source/kenney-ui-pack/Sounds/switch-a.ogg` | |
| Xác nhận giao dịch | `sfx:ui/confirm-01.ogg` | |
| Lỗi / nút khóa | `sfx:ui/error-01.ogg` | |
| Chọn thẻ / chọn công trình | `sfx:ui/select-01.ogg` | rất ngắn |
| Đặt / di chuyển công trình | `sfx:ui/drop-01.ogg` | |
| Bắt đầu xây | `sfx:combat/build-drop.mp3` | |
| Xây xong | `sfx:game/menu-confirm.mp3` | |
| Lên cấp (người chơi, hero) | `sfx:game/level-up.mp3` | |
| Đánh trúng | `sfx:combat/hit-01.ogg` | tối đa 6 lần mỗi 0.1 s, âm lượng 0.5 |
| Chặt cây | `sfx:combat/chop-wood-hit-01.ogg` | |
| Đập đá | `sfx:combat/mine-rock-hit-01.ogg` | |
| Nút cạn (cây đổ, đá vỡ) | `sfx:combat/tree-fall-01.ogg` | |
| Nhặt vàng | `sfx:game/pickup-coin.ogg` | tối đa 4 lần mỗi 0.1 s |
| Nhặt thịt, San Hô | `sfx:game/pickup-item.mp3` | |
| Thưởng chuỗi | `sfx:game/pickup-coin.ogg` phát 2 lần cách 0.08 s | |
| Báo đòn boss bắt đầu | `art-source/kenney-ui-pack/Sounds/switch-b.ogg` | |
| Lộ hero ở Quán | `sfx:game/menu-confirm.mp3` | |
| Thắng | `sfx:game/level-up.mp3` | |
| Thua | `sfx:ui/error-01.ogg` | tạm |
| Nhạc tiêu đề | `sfx:music/menu-loop.ogg` | lặp |
| Nhạc thế giới | `sfx:music/platformer-room.ogg` | lặp |
| Nhạc dungeon | `sfx:music/runner-room.ogg` | lặp |

Điểm lặp của 3 bản nhạc chưa được kiểm tra (manifest). Nếu nghe giật khi lặp, chấp nhận ở M1.

## 5. Còn thiếu (đã có thay thế, không chặn)

| Thiếu | Thay thế trong M1 | Nên tìm sau |
|---|---|---|
| Khung đi, đánh của hero và quái | Biến đổi sprite (mục 2) | Pack nhân vật có hoạt hình 4 hướng |
| Nền iso, đường đất, cát, nước | `proc:diamond` tô màu (1.1) | Tile iso có viền |
| Công trình hợp chủ đề làng chài (quán, kho, bến) | Nhà máy tiny-battle tô màu (1.3) | Pack nhà làng iso |
| Đá có quặng | Hình ghép (1.2) | Sprite đá quặng |
| Icon búa, bánh răng, kính lúp | Vẽ bằng `proc:` | Pack icon game |
| Boss lớn chi tiết | Sprite 16 px phóng ×10 (rất "vỡ hạt") | Boss vẽ riêng |
| Âm báo đòn, âm thua, âm xây riêng | Âm UI tạm | Pack âm thanh RPG |
| Hiệu ứng hạt (lấp lánh, máu) | Không làm ở M1 (điều lệ: không trau chuốt) | Pack hạt |
| Logo game | Chữ | Logo theo tên cuối |
