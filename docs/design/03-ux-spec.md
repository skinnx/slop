# Đặc tả UX (cột mốc 1)

Mọi kích thước tính bằng **đơn vị thiết kế** của khung 720 × 1280 (Fit Width). Để dễ đọc, tọa độ trong tài liệu này lấy **gốc ở góc trên trái, x sang phải, y xuống dưới**. Khi dựng trong Cocos (gốc giữa Canvas, y lên trên), đổi: `cocosX = x − 360`, `cocosY = H/2 − y`, với H = chiều cao thiết kế thực (≥ 1280).

Luật chơi đứng sau mỗi nút nằm trong `01-game-design.md`. Tên gọi theo bảng thuật ngữ trong `README.md`. Mọi chữ hiển thị là tiếng Việt, font Be Vietnam Pro (Bold cho tiêu đề, số; Regular cho chữ thường).

## 1. Màn hình dài hơn 16:9

- Chiều rộng luôn 720. Điện thoại dài hơn có H > 1280.
- Phần tử ghi "neo trên" giữ khoảng cách tới mép trên. Phần tử ghi "neo dưới" giữ khoảng cách tới mép dưới. Không có gì neo giữa theo chiều dọc trừ panel (panel giữa theo chiều dọc, cao tối đa ghi trong từng mục).
- Vùng an toàn: cộng `safeTop` (lấy từ `sys.getSafeAreaRect()`, đổi sang đơn vị thiết kế) vào mọi phần tử neo trên, `safeBottom` vào mọi phần tử neo dưới. Thế giới vẫn vẽ tràn màn hình [TC: game gốc có dải xanh trống ở trên cùng do tai thỏ].

## 2. Quy ước chung

### 2.1 Màu và chữ

| Vai | Màu |
|---|---|
| Nền panel | `#1B3A6B` (xanh dương đậm), viền `#0E2347` dày 4 |
| Ruy-băng tiêu đề | `#2E6FD8`, chữ trắng viền đen 3 |
| Nút chính | xanh lá `#4CD137`, chữ trắng viền xanh đậm; khi khóa: xám `#9AA0A6` |
| Nút phụ | xanh dương `#2E6FD8` |
| Nút nguy hiểm/hủy | đỏ `#E5484D` |
| Vàng (tiền) | `#FFC531` |
| Chữ đủ / thiếu | trắng / đỏ `#FF5A5A` (thiếu tài nguyên), tím `#C77DFF` (CP thiếu so với đề nghị) [TC] |
| Màu độ hiếm, màu hệ | `tuning.hero.rarityColor`, `attrColor` |

Cỡ chữ: tiêu đề panel 40, số lớn (CP, giá) 32, chữ thường 26, chú thích 22. Không chữ nào dưới 20.

### 2.2 Vùng chạm tối thiểu

- Mọi nút: vùng chạm **tối thiểu 88 × 88**, kể cả khi hình nhỏ hơn (mở rộng vùng chạm trong suốt). Nút chính: cao 112–120.
- Khoảng cách giữa hai vùng chạm ≥ 12.
- Danh sách cuộn: kéo quá 12 đơn vị thì là cuộn, không phải chạm.

### 2.3 Mẫu panel chung [TC: mọi ảnh panel, ví dụ `building-upgrade-mining-camp-01.jpg`, `training-ground-upgrade-tree-01.jpg`]

```
y=0    +------------------------------------------+
       |  THANH TRÊN (vẫn hiện, 0..120)           |
120    +------------------------------------------+
       |  (thế giới phía sau bị phủ đen 55%)       |
~200   |  [NPC 120x120]=== RUY-BĂNG TIÊU ĐỀ ===    |  ruy-băng: x 24..696, cao 88
       |  +------------------------------------+  |
       |  |                                    |  |  thân panel: x 24..696 (672 rộng)
       |  |        NỘI DUNG                    |  |  cao tùy panel, tối đa H-360
       |  |                                    |  |
       |  |      [  NÚT CHÍNH XANH LÁ  ]       |  |  400 x 120, giữa, cách đáy thân 32
       |  +------------------------------------+  |
       |                                          |
H-120  | [<]                                      |  nút back 96x96 tại x 24, neo dưới 24
H      +------------------------------------------+
```

- Thanh trên luôn hiện khi panel mở [TC].
- Mở: panel trượt từ dưới lên 0.2 s, lớp phủ đen hiện dần. Đóng: ngược lại.
- Đóng bằng: nút back (vuông xanh dấu "<", dưới trái) [TC], hoặc chạm lớp phủ ngoài thân panel. Nút back hệ thống Android = back.
- Chân dung NPC: hình đầu của nhân vật trông coi công trình (xem `04-placeholder-art.md`), đè góc trên trái ruy-băng [TC].
- Chỉ một panel mở tại một lúc; mở panel con (ví dụ chi tiết hero từ danh sách) thì panel con chồng lên, back quay về panel cha.

### 2.4 Joystick khi panel mở

- Panel, hộp thoại, màn nhận hero, chế độ xây: **joystick tắt**. Nếu ngón tay đang giữ joystick khi panel mở, coi như thả: đội dừng ngay.
- Đóng panel không khôi phục joystick cũ; phải chạm lại.
- Đội đứng yên khi panel mở nên hero có thể tự đánh quái tới gần (cố ý, xem `01` mục 3.2).
- Trong `DUNGEON`, menu tạm dừng **dừng mô phỏng**. Panel khác không mở được trong dungeon.

### 2.5 Phản hồi

- Mọi nút: thu nhỏ 0.95 khi nhấn, âm `click-01`. Nút khóa: rung ngang 0.15 s, âm `error-01`, toast lý do.
- Xác nhận giao dịch thành công: âm `confirm-01`.

## 3. HUD thế giới (ngoài đồng) [TC: `hud-field-combat-slimes-01.jpg`, `hud-field-gathering-wood-01.jpg`, `hud-field-gathering-coins-01.jpg`, `hud-field-return-portal-01.jpg`]

```
  0                                                        720
0 +---------------------------------------------------------+
  |[Lv ]  ⚔ 5873        [● 277 ]  [◆ 20 ]                   |  thanh trên
  |[ 6 ]  =========== thanh EXP ===============  EXP 48%    |
120+---------------------------------------------------------+
  |[🍖▮▮▮  99]  [🔍][ icon | Xây: Sân Tập     0/1]   [⚙]   |
  |[🪵▮▮   12]       thẻ nhiệm vụ                            |
  |[💎▮    8 ]                                               |
  |                                                         |
  |                                                         |
  |                (thế giới, đội ở giữa)                    |
  |                                                         |
  |                                                         |
  |                     ( joystick )                        |
  |[Hero ]                                         [ Xây  ] |
  |[Đội  ]                                         [Về làng]|
H +---------------------------------------------------------+
```

| Vùng | Vị trí, cỡ | Neo | Nội dung, hành vi |
|---|---|---|---|
| Nền thanh trên | 0..720 × 0..120 | trên | Dải xanh đậm `#173A73` [TC] |
| Ô cấp người chơi | x 12, y 10, 88 × 96 | trên | Lục giác xanh, số cấp trắng [TC]. Chạm: không làm gì (M1) |
| CP | x 112..340, y 16, cao 56 | trên | Icon hai kiếm 48 + số CP đội, Bold 40 [TC]. Số đổi thì đếm chạy 0.4 s |
| Vàng | x 372..540, y 22, 168 × 52 | trên | Viên vàng + số. Không có dấu "+" (không cửa hàng) |
| San Hô Đỏ | x 552..708, y 22, 156 × 52 | trên | Thay vị trí gem của game gốc [QĐ]. Icon san hô đỏ + số |
| Thanh EXP | x 112..708, y 90..102 | trên | Xanh lơ trên nền đen, chữ "EXP 48%" cỡ 18 ở cuối phải, y 102..118 [TC] |
| Ô tài nguyên ×3 | x 8, y 136 / 196 / 256, 210 × 52 | trên | Icon 52 + thanh mức đầy kho (xanh lá, đỏ khi ≥ 95%) + số [TC]. Thứ tự: thịt, gỗ, quặng [TC]. Khi cộng: số nảy, chữ "+N" xanh nổi 0.6 s. Chạm: tooltip "Gỗ 120 / 300 (Nhà Kho cấp 1)" 2 s |
| Thẻ nhiệm vụ | x 200..540, y 132..236 | trên | Mục 13 |
| Nút kính lúp | x 172, y 124, 64 × 64 (vùng chạm 88) | trên | Chỉ đường (mục 13) [TC hình; chức năng QĐ] |
| Nút Cài đặt | x 624, y 136, 88 × 88 | trên | Bánh răng [TC]. Mở panel Cài đặt (mục 14.4) |
| Nút Hero | x 16, y H−264, 112 × 112 | dưới | Tròn xanh đậm, icon hai đầu hero [TC: nút đổi hero]. Mở Danh sách hero (mục 8) |
| Nút Đội | x 16, y H−136, 112 × 112 | dưới | Tròn, chân dung thủ lĩnh + "4/4" [TC]. Mũi tên xanh góc trên phải nếu có hero chưa vào đội mà CP cao hơn hero yếu nhất trong đội [TC]. Mở Xếp đội (mục 9) |
| Nút Xây | x 592, y H−264, 112 × 112 | dưới | Búa, nhãn "Xây". Ngoài làng: xám, chạm → toast "Về làng để xây dựng". Trong làng: mở chế độ xây (mục 5) |
| Nút Về làng / Ra đồng | x 592, y H−136, 112 × 112 | dưới | Cổng xoáy xanh, nhãn "Về làng" ngoài làng, "Ra đồng" trong làng [TC: Return/Portal]. Luật `01` mục 4.3 |
| Joystick | xem 3.1 | | |
| Biển gỗ vùng | trong thế giới | | Biển gỗ, chữ "Rừng Dừa Rậm ⚔ 4350"; số tím nếu CP đội thấp hơn |
| Số nổi | trong thế giới | | Sát thương: đỏ, Bold 26, bay lên 40 trong 0.6 s [TC]. "EXP 7": trắng 22 [TC]. Thu thập "+2": trắng [TC] |
| Thanh thông báo nhặt | x 110..610, y = 0.62 H, cao 60 | giữa | Nền đen 60%, icon, tên, "+6" xanh lá [TC: "Gold +6"]. Hiện 1.2 s, gộp cùng loại trong 1 s, tối đa 2 dòng chồng |

### 3.1 Joystick nổi [TC: vị trí khác nhau giữa các ảnh, nên là joystick nổi]

- Vùng nhận chạm: toàn màn hình trừ vùng chạm của mọi nút và thẻ nhiệm vụ, và trừ dải trên cùng y < 260.
- Khi không chạm: vẽ mờ (đế 35%, núm 50%) ở vị trí nghỉ (360, H − 300) [TC].
- Chạm xuống: đế (vòng tròn bán kính 110, viền trắng 4, nền trắng 15%) dời tới điểm chạm; núm (tròn bán kính 50, trắng 60%) theo ngón tay, kẹp trong bán kính 110.
- Vector = (núm − đế) / 110. Độ lệch < 0.1 = đứng yên (`tuning.combat.joystickDeadZonePct`).
- Thả hoặc TOUCH_CANCEL: núm về tâm, đế về vị trí nghỉ sau 0.15 s.
- Chỉ ngón chạm đầu tiên điều khiển joystick; ngón thứ hai dùng cho nút.

## 4. HUD trong làng [TC: `village-pub-request-board-01.jpg`, `hud-village-clean-lv29-01.jpg`, `village-dungeon-portal-teleport-pad-01.jpg`]

Giống hệt HUD ngoài đồng (cùng một HUD, làng là một vùng của cùng bản đồ [TC]). Khác biệt:

- Nút Xây sáng; nút dưới phải ghi "Ra đồng".
- Mỗi công trình có **nhãn tên** chữ trắng viền đen 24 ngay dưới footprint [TC].
- Trên công trình (cách đỉnh hình 16) có thể hiện **một** biểu tượng, theo thứ tự ưu tiên:
  1. Giàn giáo + thanh tiến độ 120 × 16 + "02:31" khi đang xây hoặc nâng.
  2. Bong bóng tài nguyên "🪵 120/480" khi bộ đệm sản xuất ≥ 1 [TC: "0/50"]. Chạm bong bóng = thu.
  3. Dấu chấm than vàng trên Quán khi có thể tuyển (vàng ≥ 100) hoặc thanh BONUS đầy; trên Sân Tập khi mở được nấc hoặc ô đội [TC: dấu chấm than].
  4. Dấu check xanh trên Cổng Xoáy khi CP đội ≥ CP đề nghị của chặng chưa vượt đầu tiên và Cổng đủ cấp [TC: dấu check].
- Chạm công trình (vùng chạm = footprint chiếu lên màn hình, mở rộng tối thiểu 120 × 120) mở panel của nó. Phân biệt chạm với kéo joystick: chạm = nhấn và thả trong 0.25 s, di chuyển < 12.

## 5. Chế độ xây (mới, theo ngôn ngữ hình của game gốc)

Không có ảnh tham chiếu (game gốc dùng chỗ xây cố định). Thiết kế dùng lại: thẻ khung màu như thẻ hero, nút xanh lá/đỏ, giàn giáo kiểu "đống gỗ đá có dây và biển búa" [TC: `village-storage-facility-level-lock-01.jpg`].

```
  0                                                        720
0 +---------------------------------------------------------+
  | thanh trên (giữ nguyên)                                  |
120+---------------------------------------------------------+
  |  [ CHẾ ĐỘ XÂY  —  Thợ: 1/2 rảnh ]                        |  dải 0..720 × 132..196
  |                                                         |
  |      lưới làng hiện viền ô mờ trắng 20%                  |
  |                                                         |
  |            [✓][✗]                                       |  nổi trên bóng
  |           ◇◇◇ bóng footprint ◇◇◇ (xanh/đỏ)               |
  |                                                         |
H-330+-------------------------------------------------------+
  | [Thẻ][Thẻ][Thẻ][Thẻ][Thẻ] →  (cuộn ngang)                 |  khay công trình
  |                                                         |
H-120+---------------------------------------------------[Xong]
H +---------------------------------------------------------+
```

| Vùng | Vị trí, cỡ | Hành vi |
|---|---|---|
| Dải chế độ | 0..720 × 132..196, nền đen 50% | "CHẾ ĐỘ XÂY" + "Thợ rảnh: 1/2" |
| Lưới | thế giới | Viền mọi ô của lưới làng, trắng 20%. Ô đã có công trình: không tô |
| Khay công trình | x 0..720, y H−330..H−130, nền `#1B3A6B` 90% | Cuộn ngang. Mỗi thẻ 150 × 190, cách 12: hình công trình 110, tên 22, giá (icon + số; đỏ nếu thiếu), thời gian xây. Thẻ đã xây đủ `maxCount`: phủ xám + "Đã xây". Thẻ chưa mở: ổ khóa + "Cấp N" [TC: ổ khóa có số cấp] |
| Bóng (ghost) | thế giới | Footprint tô xanh lá `#4CD137` 45% nếu hợp lệ, đỏ `#E5484D` 45% nếu không, kèm hình công trình mờ 70%. Bám ô. Kéo bằng một ngón bắt đầu trên bóng |
| Nút ✓ / ✗ | tròn 96 × 96, đặt cạnh nhau phía trên bóng cách 24; nếu bị che bởi dải trên thì đặt dưới bóng | ✓ xanh lá (xám khi không hợp lệ hoặc thiếu tài nguyên/thợ); ✗ đỏ |
| Nút Nâng cấp | nút chữ nhật 200 × 88 dưới công trình đang chọn | Mở panel nâng cấp (mục 6) |
| Nút Xong | x 592, y H−128, 112 × 112, neo dưới | Thoát chế độ xây |
| Kéo trên chỗ trống | | Cuộn camera, kẹp để tâm màn hình nằm trong lưới làng ± 4 ô |

Luồng:

- **Xây mới**: chạm thẻ → khay thu xuống còn 1 dòng chữ "Kéo để đặt — ✓ để xây" → bóng xuất hiện ở ô hợp lệ gần tâm nhất (nếu không có ô hợp lệ: toast "Làng đã kín chỗ" và hủy) → kéo → ✓ → giàn giáo xuất hiện, âm `build-drop`, khay hiện lại → vẫn ở chế độ xây.
- **Di chuyển**: chạm công trình → viền vàng nhấp nháy, hiện ✓ ✗ và nút Nâng cấp → kéo công trình → ✓ đặt (âm `drop-01`) / ✗ trả chỗ cũ. Chạm chỗ trống = bỏ chọn (như ✗).
- Lý do không hợp lệ hiện thành chữ nhỏ dưới bóng: "Chồng lên Nhà Kho", "Ra ngoài làng", "Thiếu 20 gỗ", "Hết thợ".

## 6. Panel công trình (nâng cấp) [TC: `building-upgrade-mining-camp-01.jpg`]

```
120 +------------------------------------------+
200 | [NPC]======= Trại Gỗ ===================  |  ruy-băng y 200..288
    | +--------------------------------------+ |
    | |        ( hình công trình 260x260 )   | |  y 300..580, vòng sáng tròn sau hình
    | |  [đang nâng: thanh 400x20 + 02:31]   | |
    | |----------- Cấp 4 ▶ 5 ----------------| |  y 600..660, Bold 32
    | | ⏱ Sản lượng / giờ         180  +60   | |  3 dòng 600x64, y 680..890
    | | ▤ Bộ đệm tối đa          1440 +480   | |
    | | ⌛ Đang chờ thu            120 [Thu]  | |
    | |  Nâng cấp để sản xuất nhiều hơn.     | |  chú thích 22
    | |     [ 🪵 125  💎 82   NÂNG CẤP ]     | |  400x120, + "⏱ 2:00" nhỏ dưới
    | |            [ Hủy xây ]               | |  chỉ khi đang nâng, nút đỏ 240x80
    | +--------------------------------------+ |
H-120 [<]                                       |
```

- Các dòng chỉ số theo loại công trình:
  - Nhà Kho: "Sức chứa mỗi loại" (giá trị, +chênh lệch).
  - Trại Gỗ / Mỏ Quặng / Chợ Bến: "Sản lượng / giờ", "Bộ đệm tối đa", "Đang chờ thu" + nút **Thu** 120 × 72.
  - Quán: "Tỉ lệ Sử Thi", "Tỉ lệ Huyền Thoại" (theo tier).
  - Sân Tập: "Ô đội mở được tối đa".
  - Cổng Xoáy: "Chặng cao nhất".
- Cấp tối đa: dòng "Cấp 10 (tối đa)", không có nút.
- Nút chính khóa: xám, chữ lý do (thứ tự `01` mục 7.5). Giá thiếu tô đỏ.
- Bấm NÂNG CẤP: trừ tài nguyên, đóng panel, giàn giáo/thanh tiến độ hiện trên công trình, toast "Bắt đầu nâng Trại Gỗ lên cấp 5".
- Hủy xây: hộp xác nhận (mục 14.2) "Hủy nâng cấp? Hoàn lại 100% tài nguyên."

## 7. Quán Mỏ Neo [TC: `hero-recruit-pub-01.jpg`, `hero-recruit-obtained-01.jpg`]

### 7.1 Tab Tuyển

```
120 +------------------------------------------+
140 | [NPC]========== Quán Mỏ Neo ============ |  ruy-băng y 140..228
    |  [ Tuyển ][ Đổi Vé ]                     |  2 tab 200x72, y 240
    |  BONUS [=======4/10========] [?]         |  thanh 420x36, x 150, y 340
    |      "Sau 6 lượt nữa: tăng tỉ lệ..."     |  chú thích 20, y 384
    |                                          |
    |  [ !! ]       [    ]       [ !! ]        |
    |  +------+    +------+    +------+        |  3 thẻ 196x270, y 440..710
    |  | MỚI  |    |  x5  |    | MỚI  |        |  cách 24, giữa
    |  |hình  |    | hình |    | hình |        |
    |  |[1]0/5|    |[2]19/5|   |[1]0/5|        |  đáy thẻ: cấp + thanh mảnh
    |  +------+    +------+    +------+        |
    |                    Đổi hero sau  [⟳]     |  y 740, chữ 22 + nút ⟳ 88x88
    |                     29:32  (50 ●)        |
    |   Bạn sẽ nhận một trong các hero.        |  y 840
    |      [ ● 100      TUYỂN ]                |  400x120, y 890
    |        [1x][2x][3x]                      |  3 nút 104x80 liền nhau, y 1030
H-120 [<]                                       |
```

- Thẻ hero: khung màu độ hiếm [TC], hình hero to giữa, góc trên phải icon hệ, nhãn **MỚI** đỏ trên đáy hình nếu chưa có [TC: NEW], "x5" ở đỉnh thẻ nếu đã có [TC: x5], dải đáy: huy hiệu cấp + thanh mảnh "mảnh có / mảnh cần cho đột phá kế" (không có đột phá kế thì "—"). Dấu "!!" nổi trên thẻ Sử Thi/Huyền Thoại [TC].
- Chạm thẻ: mở chi tiết hero ở chế độ xem (mục 8.2, nút UPGRADE ẩn nếu chưa có).
- 1x/2x/3x: nút chọn đang bật màu xanh sáng [TC]; giá trên nút TUYỂN đổi 100/200/300. Thiếu vàng: nút xám, giá đỏ.
- ⟳: hộp xác nhận "Đổi bộ hero ngay với 50 vàng?".
- Thanh BONUS màu tím [TC]; nút "?" mở tooltip giải thích luật 9.3.

### 7.2 Tab Đổi Vé

- Dòng đầu: "Vé Quán: 23" (icon vé).
- Danh sách 5 dòng (mỗi dòng 640 × 120): icon, mô tả, giá vé, nút "ĐỔI" 160 × 88 (xám khi thiếu vé hoặc không có hero hợp lệ).
- Chạm "ĐỔI" ở dòng chọn hero: mở lưới chọn hero (lưới giống mục 8.1, chỉ hiện hero hợp lệ). Chọn → hộp xác nhận → nhận → màn "Nhận Hero" một thẻ.

### 7.3 Màn "Nhận Hero" [TC: `hero-recruit-obtained-01.jpg`]

- Toàn màn hình, nền rèm đỏ thẫm, đèn sân khấu, pháo giấy (hạt vẽ bằng code). Thanh trên vẫn hiện.
- Ruy-băng cam "NHẬN HERO" ở y 470.
- Ba thẻ như tab Tuyển, y 560..830. Mỗi lượt: thẻ trúng nhô lên 30 và sáng viền 0.4 s, chữ "+5 mảnh" hoặc "MỚI!" nổi lên, thanh mảnh chạy. 2x/3x: lượt tiếp sau 0.6 s.
- Chữ "Chạm để tiếp tục" ở y H−200 sau khi xong mọi lượt. Chạm → về tab Tuyển.

## 8. Hero

### 8.1 Danh sách hero (Hero của tôi)

Game gốc có panel này phía sau màn chi tiết (chữ "Heroes in battle 6/6" mờ ở `hero-detail-*.jpg`) nhưng không có ảnh rõ. Bố cục dùng lưới thẻ của màn xếp đội [TC: `squad-setup-6-slots-01.jpg`].

```
140 | [icon]========== Hero của tôi ==========  |
    |  Hero ra trận: 4/4      Sở hữu: 7/12     |  y 240, chữ 24
    |  [Tất cả][Sức Mạnh][Nhanh][Trí Tuệ]       |  4 tab lọc 150x64, y 290
    |  +---+ +---+ +---+ +---+                  |  lưới 4 cột, thẻ 148x184
    |  |   | |   | |   | |   |                  |  cách 16, lề trái 40, y bắt đầu 380
    |  +---+ +---+ +---+ +---+                  |  cuộn dọc
    |  ⚔ 867 ⚔ 856 ...                          |
    |  (hero chưa có: thẻ tối, hình bóng đen,   |
    |   chữ "Chưa có")                          |
H-120 [<]                                       |
```

- Thẻ hero (dùng chung cho danh sách, xếp đội, quán): khung màu độ hiếm, icon hệ góc trên trái [TC], mũi tên xanh góc trên phải khi lên cấp được (đủ thịt và mảnh) [TC], dấu check xanh giữa thẻ khi đang trong đội [TC], dải dưới: icon CP + số CP [TC], huy hiệu cấp góc dưới trái.
- Sắp xếp: trong đội trước (theo thứ tự ô), rồi theo CP giảm dần, rồi hero chưa có.
- Chạm thẻ: mở chi tiết.

### 8.2 Chi tiết hero [TC: `hero-detail-agility-01.jpg`, `hero-detail-intellect-healer-01.jpg`]

```
120 | [🍖 12]                                    |  thịt đang có: x 16, y 136, 180x52
    |          ( hình hero lớn, tỉ lệ 12 )       |  y 160..440, giữa
440 | +--------------------------------------+   |  thân: x 24..696, y 440..H-150
    | |[huy hiệu 120]  Cấp 20 [==20/10==]     |   |  huy hiệu hero khung độ hiếm
    | |                TÊN HERO               |   |  tên Bold 36
    | | [⚔ CP 3387] [🗡 ATK 408 +6] [♥ HP 1754 +26] |  3 ô 200x72, y 600
    | | (5)  Nhanh Nhẹn HP +5% (sở hữu)   ✓   |   |  5 dòng mốc 620x56, y 690..990
    | | (10) Mở kỹ năng Mưa Tên           ✓   |   |  cuộn nếu thiếu chỗ (7 mốc)
    | | (15) Nhanh Nhẹn ATK +5% (sở hữu)  🔒  |   |
    | | ...                                   |   |
    | | [icon KN1] Bắn Đôi ★★☆  [icon KN2] Mưa Tên ★☆☆ | 2 ô 300x130, y 1010
    | |        [ 🍖 100   NÂNG CẤP ]          |   |  400x120, y H-300
    | +--------------------------------------+   |
H-120 [<]                                       |
```

- Thanh cạnh cấp: mảnh đang có / mảnh cần cho đột phá kế (ẩn "/x" nếu không còn đột phá) [TC suy luận "20/10"].
- "+6", "+26": mức tăng ở cấp kế, màu xanh [TC].
- Mốc: dòng đạt có dấu ✓ và nền sáng; dòng chưa đạt mờ, ổ khóa [TC].
- Chạm ô kỹ năng: tooltip 560 × 220: tên, loại, hồi chiêu, mô tả, tham số sao hiện tại và sao kế.
- Nút NÂNG CẤP: giá thịt; ở cấp đột phá giá ghi "🍖 22 + 5 mảnh". Xám khi thiếu (giá thiếu tô đỏ) hoặc cấp tối đa ("Tối đa"). Bấm: +1 cấp, hiệu ứng sáng quanh hình, âm `level-up`; giữ nút 0.5 s = lên liên tục 4 cấp/giây tới khi thiếu.
- Vuốt trái/phải trên hình hero: hero kế/trước trong danh sách đang lọc.

## 9. Xếp đội [TC: `squad-setup-camp-auto-assign-01.jpg`, `squad-setup-6-slots-01.jpg`]

```
120 |   "Chọn hero."   ----(i)----             |  y 150, chữ 26 [TC]
    |               4/4                        |  y 200, Bold 32
    |      hero quanh đống lửa (vòng tròn)     |  y 240..640: đống lửa giữa (360, 440)
    |   (thủ lĩnh có bong bóng vương miện)     |  hero đứng trên vòng bán kính 170
    | +--------------------------------------+ |
640 | |                     [ TỰ XẾP ]        | |  nút 220x88 x 456, y 650 [TC: AUTO ASSIGN]
    | |  [thẻ][thẻ][thẻ][thẻ]                 | |  lưới 4 cột như 8.1, y 760..H-260
    | |  [thẻ][thẻ][thẻ][thẻ]                 | |  cuộn dọc
    | |      ⚔ CP  2093 ▶ 2949                | |  dải nổi 480x64, hiện 2 s khi CP đổi
    | +--------------------------------------+ |
H-120 [<]                                       |
```

- Chạm thẻ hero **chưa** trong đội: nếu còn ô trống → thêm vào ô trống đầu; nếu đầy → thẻ đó được "cầm" (nảy lên), chạm một hero trên vòng lửa để đổi chỗ.
- Chạm thẻ hero **đang** trong đội: bỏ ra (trừ khi đội chỉ còn 1 người: rung, toast "Đội cần ít nhất 1 hero").
- Chạm một hero trên vòng lửa rồi chạm hero khác trên vòng: đổi thứ tự ô. Hero ở ô 1 có bong bóng vương miện = thủ lĩnh [TC].
- TỰ XẾP: chạy thuật toán `01` mục 10.3, hero bay vào vị trí 0.3 s.
- Dải "CP cũ ▶ CP mới": xanh lá khi tăng, đỏ khi giảm [TC]. Thanh trên cập nhật CP.
- Mở được ở mọi nơi ngoài dungeon.

## 10. Sân Tập [TC: `training-ground-upgrade-tree-01.jpg`, `training-ground-troop-count-01.jpg`]

```
120 |                       [💎 15] [🪸 0]     |  2 ô đếm 200x52, neo phải, y 140
200 | [NPC]========== Sân Tập ================ |
    | +--------------------------------------+ |
    | |  cột trái (nấc)  │  giữa  │ cột phải  | |  cột trái x 90..250, giữa x 330..390,
    | |   [♥ +12]        │   •    │   │       | |  cột phải x 470..630
    | |      |           │   •    │ [🧑+ ô 4] | |  nấc: ô 120x120, cách 90 theo dọc
    | |   [🗡 +3]        │  (5)   │   │       | |  huy hiệu cấp người chơi lục giác 72
    | |      |           │   •    │   │       | |  vùng đã mở: nền xanh lơ, chưa mở:
    | |   [♥ +12]        │   •    │           | |  nền xanh đen [TC]
    | +--------------------------------------+ |  cuộn dọc, nấc thấp ở dưới
H-120 [<]                                       |
```

- Cây vẽ từ dưới lên: nấc 0 ở đáy [TC]. Mỗi 3 nấc có huy hiệu cấp người chơi ở cột giữa, cắt ngang bằng một vạch [TC]. Phần trên vạch của cấp chưa đạt có nền tối.
- Trạng thái nấc: đã mở (sáng, viền xanh), mở được ngay (nảy nhẹ, viền vàng), khóa (xám).
- Chạm nấc mở được: tooltip trắng 380 × 340 bên cạnh [TC]: tiêu đề "HP" hoặc "ATK" trên dải xanh, "Mọi hero HP +12", nút xanh lá "💎 5 MỞ" [TC: UNLOCK]. Thiếu quặng: nút xám, giá đỏ.
- Cột phải: 5 nút ô đội ở ngang hàng cấp người chơi tương ứng thứ tự (không gắn với nấc), nối bằng đường xanh lá [TC]. Tooltip: "Số ô đội — Ô đội tối đa +1", nút "🪸 2 MỞ". Thiếu cấp Sân Tập: nút xám ghi "Cần Sân Tập cấp 2".
- Panel mở ở vị trí cuộn sao cho nấc kế tiếp nằm giữa.
- Nút "Nâng cấp công trình" 240 × 80 ở góc dưới phải thân panel → panel 6.

## 11. Cổng Xoáy: bảng vào dungeon [TC: `dungeon-entry-panel-01.jpg`]

```
120 +------------------------------------------+
200 | [NPC]========== Cổng Xoáy ============== |
    |  ┌ Đề nghị  ⚔ 9000 ┐                      |  bong bóng trắng 320x110, x 80, y 196
    |  └ Đội bạn  ⚔ 8590 ┘ (tím nếu thiếu) [TC]|  đè lên ruy-băng [TC]
    |            Khó  (màu theo nhãn)          |  y 320
    |  [◀]   Chặng 4: Hang Rắn Biển       [▶]  |  y 370, mũi tên 88x88
    |          Tầng 16–20                      |
    |        (  ảnh tròn xem trước 360  )      |  y 440..800, vẽ phòng tối + boss
    |                         [icon cuộn]      |
    |         Phần thưởng có thể nhận          |  y 820
    |   [●][🪸][🎟]  (lần đầu: số, lặp: số)     |  3 ô 96x96, y 860
    |   Lần đầu: 1000 ● 5 🪸 6 🎟  | Đã vượt ✓  |  y 970, chữ 22
    |  ─────────────────────────────           |
    |    Vào hang để nhận thưởng!              |  y 1040
    |          [   VÀO   ]                     |  400x120, y H-280
H-120 [<]                                       |
```

- Mặc định hiện chặng chưa vượt đầu tiên (hoặc chặng 6 nếu đã vượt hết).
- ◀ ▶ đổi chặng trong khoảng 1..min(cấp Cổng, chặng đã vượt + 1). Chặng sau đó hiện khóa: "Cần Cổng Xoáy cấp N" hoặc "Vượt chặng N trước"; nút VÀO xám.
- Nhãn độ khó và màu số CP theo `tuning.dungeon.difficultyLabels`.
- VÀO: nếu nhãn "Khó" thì hộp xác nhận "Đội của bạn yếu hơn đề nghị. Vẫn vào?"; rồi màn chuyển: mờ đen 0.4 s → `DUNGEON`.
- Nút "Nâng cấp công trình" như Sân Tập.

## 12. Dungeon

### 12.1 HUD chiến đấu [TC: `dungeon-combat-hud-kill-streak-01.jpg`, `dungeon-combat-streak-bonus-01.jpg`, `dungeon-boss-golem-01.jpg`]

Không có thanh trên của làng [TC].

```
  0                                                        720
0 +---------------------------------------------------------+
  | [▤] 1F            (💀)                          [ || ]  |  y 40..136
  | [●] 0             43 KILL                               |
  |              Thưởng chuỗi                               |
  |      [=========== thanh máu boss ===========]           |  chỉ tầng boss, y 260
  |                                                         |
  |                 (phòng, đội, quái)                      |
  |                                                         |
  |                    ( joystick )                         |
  |  [♥♥♥♥ máu đội]                               [AUTO]    |
H +---------------------------------------------------------+
```

| Vùng | Vị trí, cỡ | Nội dung |
|---|---|---|
| Tầng | x 24, y 40, icon bậc thang 64 + "1F" Bold 36 | [TC] |
| Vàng của lượt | x 24, y 116, icon 56 + số | [TC] |
| Bộ đếm chuỗi | tâm (360, 96): đầu lâu 96 trong vòng đỏ bán kính 60 dày 8 (vòng = đồng hồ chuỗi, ngắn dần); dưới: "43 KILL" Bold 48, "Thưởng chuỗi" xanh lơ 22 | [TC]. Ẩn khi chuỗi = 0 |
| Tạm dừng | x 616, y 40, 88 × 88 | [TC] mở menu 12.2 |
| Thanh máu boss | x 110..610, y 260, cao 28, tên boss trên thanh 24 | [TC] chỉ ở tầng boss |
| Máu đội | x 16, y H−150, mỗi hero một ô 64 × 80: chân dung + thanh máu dưới; chết: xám, dấu X | [QĐ] (game gốc chỉ có thanh máu nhỏ trên đầu hero) |
| AUTO | x 600, y H−150, 104 × 120, icon + chữ "AUTO", sáng khi bật | [TC hình; chức năng QĐ: tự đi tới cửa ra sau khi tầng sạch] |
| Nút sách (2 vật phẩm) | không có trong M1 | [TC] để sau |
| Thanh máu nhỏ trên đầu hero | 48 × 6, chỉ hiện khi máu < 100% | [TC] |
| Vòng đỏ/hình chữ nhật báo đòn | thế giới, lớp dưới đơn vị | `01` mục 12.3 |
| Chữ "Thưởng chuỗi! +X" | nổi gần đội, vàng 30 | [TC] |
| "Tầng 2" | chữ lớn giữa màn hình 0.8 s khi vào tầng | [QĐ] |
| Cửa ra | thế giới: xoáy nước xanh 2 × 2 ô, mũi tên vàng nảy phía trên | [QĐ] |

Joystick giống 3.1.

### 12.2 Menu tạm dừng

Hộp giữa màn hình 520 × 420: "Tạm dừng", nút xanh lá "Tiếp tục" 400 × 112, nút đỏ "Rời hang" 400 × 96. "Rời hang" → hộp xác nhận "Rời hang? Bạn giữ vàng và thịt đã nhặt nhưng không nhận thưởng chặng." Mô phỏng dừng khi menu mở.

### 12.3 Màn thắng [TC: `result-victory-01.jpg`]

```
    nền đen 85%, tia sáng xoay sau huy hiệu
    ( huy hiệu lục giác vàng 280: chân dung thủ lĩnh, hai cờ chéo )   y 220..560
    [===== CHIẾN THẮNG! =====]  ruy-băng đỏ 420x96                     y 520
    +------- PHẦN THƯỞNG ----------+   khung xanh 600x260              y 640..900
    |  [● 43] [🪸 1] [🎟 3] [🍖 12] |   ô 112x112, cách 16
    +------------------------------+
    "Lần đầu vượt chặng 1!" (nếu có)                                   y 930
    "Chạm để về làng."                                                 y H-220 [TC]
```

- Phần thưởng = vật nhặt trong lượt + thưởng chặng, mỗi ô hiện lần lượt 0.15 s. Không có nút quảng cáo (khác game gốc).

### 12.4 Màn thua [TC: `result-annihilated-01.jpg`]

```
    nền xanh đen có họa tiết mờ
    "TOÀN ĐỘI GỤC NGÃ"  Bold 56 trắng viền đen                         y 140
    ( hero gục cạnh cờ trắng, đèn chiếu )                              y 220..560
    +-------- Làm đội mạnh hơn! -------+  khung 600x420                y 640
    | [icon Quán] Tuyển hero ở Quán Mỏ Neo.         |
    | [icon Sân Tập] Nâng cấp ở Sân Tập.            |
    | [icon Hero] Nâng cấp hero bằng thịt.          |  (thay dòng "trang bị" của game gốc)
    +----------------------------------+
    "Đã nhặt: ● 21  🍖 4"                                               y 1090
    "Chạm để về làng."                                                 y H-220
```

## 13. Thẻ nhiệm vụ chính [TC: thẻ ở mọi ảnh HUD]

```
  x 200                                        540
  +------------------------------------------------+  y 132
  | [🔍]          [==== 0/1 ====]                   |  pill tiến độ 150x36 ở góc trên phải,
  |  +------+                                       |  đè lên viền trên [TC]
  |  | icon |   Xây: Sân Tập                        |  icon 88x88 nền xanh lơ [TC]
  |  +------+                                       |  chữ 26, tối đa 2 dòng
  +------------------------------------------------+  y 236
```

- Nền trắng xám `#E8EAEE`, viền xám đậm 4, đổ bóng [TC].
- Đang làm: pill tiến độ đen, số trắng "x/y" (nhiệm vụ trạng thái: "0/1").
- Xong: viền và pill xanh lá, chữ pill "Nhận!", thẻ nhịp đập 1.0 ↔ 1.05 mỗi 0.8 s. Chạm thẻ: nhận thưởng, toast liệt kê thưởng, thẻ lật 0.3 s sang nhiệm vụ mới.
- Chạm thẻ khi chưa xong: giống kính lúp (chỉ đường).
- Kính lúp: `01` mục 14. Mũi tên chỉ đường: mũi tên vàng 64 quay quanh thủ lĩnh bán kính 90, chỉ về mục tiêu, 6 s.
- Thẻ ẩn trong `BUILD` và `DUNGEON`.

## 14. Toast, hộp thoại, panel nhỏ

### 14.1 Toast

| Loại | Vị trí | Hình | Thời gian |
|---|---|---|---|
| Nhặt đồ | 3 (thanh thông báo nhặt) | | 1.2 s |
| Thông tin / lỗi | x 60..660, y 300, cao 72 | nền đen 75% bo góc 16, chữ trắng 24; lỗi có viền đỏ | 2 s, tối đa 2 cái xếp chồng, cái mới đẩy cái cũ lên |
| Lớn ("Lên cấp!", "Xây xong") | giữa, y 0.4 H | chữ vàng Bold 44 viền đen, phóng to 1.3 → 1 | 1.5 s |

### 14.2 Hộp xác nhận

- Nền phủ 55%. Hộp 560 × 360 giữa màn hình: tiêu đề Bold 32, nội dung 24 (tối đa 3 dòng), hai nút 220 × 96: trái "Hủy" (xanh dương), phải "Đồng ý" (xanh lá; đỏ nếu hành động mất mát như Rời hang).
- Chạm ngoài hộp = Hủy. Dùng cho: làm mới thẻ bằng vàng, hủy xây, vào chặng "Khó", rời hang, đổi Vé, xóa dữ liệu.

### 14.3 Chào mừng trở lại

Panel mẫu chung, tiêu đề "Chào mừng trở lại!", dòng "Bạn đã đi 3 giờ 12 phút (tính tối đa 8 giờ)", danh sách: "Trại Gỗ: 480 gỗ chờ thu", "Xây xong: Mỏ Quặng cấp 3", "Quán đã đổi hero mới". Nút chính "THU HẾT". Back = đóng không thu.

### 14.4 Cài đặt

Panel nhỏ 560 × 520: hai công tắc "Nhạc", "Âm thanh" (88 × 48), dòng phiên bản, nút đỏ "Xóa dữ liệu" (hộp xác nhận 2 lần). Đóng bằng back.

## 15. Màn tiêu đề [TC: `title-screen-01.jpg`]

- Nền: bầu trời xanh, biển, đảo vẽ bằng code (hình tròn, đa giác) và vài hero đứng giữa.
- Logo chữ "HẢI ĐỘI ĐẢO SƯƠNG" Bold 64 vàng viền nâu, y 300.
- "Chạm để tiếp tục" nhấp nháy, y H−260 [TC].
- Chạm → nhạc bắt đầu (cần chạm đầu tiên cho audio web) → tải save → `WORLD` (có thể kèm Chào mừng trở lại).

## 16. Chuyển màn

```
TITLE --chạm--> WORLD (HUD đồng/làng)
WORLD --nút Hero--> Danh sách hero --thẻ--> Chi tiết hero
WORLD --nút Đội--> Xếp đội
WORLD --nút Cài đặt--> Cài đặt
WORLD --nút Xây (trong làng)--> BUILD --Nâng cấp--> Panel nâng cấp
WORLD --chạm công trình--> Panel công trình
        Quán --> tab Tuyển / tab Đổi Vé --> Nhận Hero
        Sân Tập --> tooltip nấc
        Cổng Xoáy --VÀO--> DUNGEON --thắng/thua--> RESULT --chạm--> WORLD (cạnh Cổng Xoáy)
        mọi panel công trình --Nâng cấp công trình--> Panel nâng cấp
WORLD --nút Về làng / Ra đồng--> WORLD (vị trí mới)
WORLD --thẻ nhiệm vụ--> nhận thưởng / chỉ đường
DUNGEON --tạm dừng--> Menu tạm dừng --Rời hang--> RESULT (thua)
```

- Panel: trượt lên 0.2 s. Đổi chế độ (`WORLD` ↔ `DUNGEON`, `RESULT`): mờ đen 0.4 s.
- Back luôn quay về màn trước; từ `WORLD` back Android = không làm gì (M1).
