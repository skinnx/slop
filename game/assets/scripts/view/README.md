# Lớp hiển thị (`view/`)

Mọi thứ người chơi thấy và chạm: thế giới, HUD, panel, input, âm thanh. View **chỉ đọc** trạng thái của lõi
(`../core/index.ts`) và gửi lệnh. Không có luật chơi và không có số liệu cân bằng nào ở đây.

## 1. Tổ chức

```
Bootstrap.ts (scene)  ->  view/GameView.ts      tạo các lớp, vòng lặp mỗi frame, định tuyến sự kiện, âm thanh,
                                                đối tượng debug globalThis.__game
view/model/  ViewModel.ts    kiểu dữ liệu màn hình đọc (WorldV, FieldHudV, TavernV...)
             Source.ts       giao diện nguồn dữ liệu: câu hỏi + lệnh (Cmd)
             CoreSource.ts   nối với lõi thật: đổi trạng thái/câu trả lời của lõi sang ViewModel
             StandInSource.ts dữ liệu mẫu cố định (không có luật) để dựng bố cục khi chưa có lõi
             createSource.ts chọn nguồn: lõi; ?standin=1 trên URL harness thì dùng dữ liệu mẫu
view/world/  WorldRenderer   nền ô thoi, phòng dungeon, công trình, nút tài nguyên, đơn vị, vật rơi, báo đòn
             SpriteLayer     lớp sprite dùng lại node (pool), sắp theo chiều sâu mỗi frame, một batch
             UnitMotion      "cử động không khung hình" (04-placeholder-art.md mục 2)
             WorldText       số nổi (CHAR cache) và nhãn tên công trình
             Iso             đổi ô <-> màn hình
view/hud/    FieldHud (HUD đồng/làng + thẻ nhiệm vụ), DungeonHud, Joystick
view/screens/ Screens (điều hướng), BuildMode, BuildingPanel, TavernPanel (+ HeroPickPanel),
             HeroPanels (Nhận Hero, danh sách, chi tiết), SquadTrainingGate (xếp đội, Sân Tập, Cổng Xoáy),
             SmallScreens (tiêu đề, thắng/thua, tạm dừng, cài đặt, chào mừng trở lại)
view/kit/    Ui (tạo node, sprite, label, đặt vị trí theo tọa độ đặc tả), Theme (màu, cỡ chữ, dải vẽ),
             Layout (chiều cao H, vùng an toàn), Assets (atlas, font, âm thanh), Button, Panel, ScrollList,
             Overlays (toast, thanh nhặt đồ, hộp xác nhận), Widgets (thanh, icon tài nguyên, thẻ hero...)
```

Thứ tự lớp dưới node `view` (cũng là thứ tự ưu tiên chạm, lớp sau nhận trước):
`world < joystick < hud < panels < dialogs < toasts < fade`. Joystick là một node toàn màn hình nằm dưới mọi nút,
nên chạm vào nút không bao giờ thành joystick.

### Draw call

- Hai atlas: `textures/world` (lọc NEAREST: pixel art, hình vẽ bằng code, nền) và `textures/ui` (lọc LINEAR: UI pack,
  icon 64 px). Hình "proc:" của 04-placeholder-art.md được vẽ sẵn **vào atlas** bởi `tools/atlas/build-view-atlases.mjs`
  (`npm run atlas:view`) thay vì tạo lúc chạy, để dùng chung texture với mọi thứ khác.
- Mỗi renderer có `Sorting2D.sortingOrder = dải × 4 + loại` (loại 0 sprite atlas UI, 1 sprite atlas world trong cây
  `groupAtlases`, 2 label). Vì vậy mọi sprite của một lớp vẽ trước mọi chữ của lớp đó và gom batch, bất kể cây node.
- Lớp thế giới: ba `SpriteLayer` (nền, phủ, đơn vị) dùng cùng atlas world → 1 draw call; chữ thế giới → 1.
- Đo trong harness (`m1-crowd.mjs`, 60 quái, 8 hero, số nổi, vật rơi, HUD dungeon): **tổng 10, lớp thế giới 1**
  (2 nếu tính chữ nổi). Ngân sách: tổng ≤ 30, thế giới ≤ 10.

## 2. Thêm một màn hình

1. Thêm kiểu dữ liệu vào `model/ViewModel.ts` và câu hỏi vào `model/Source.ts`.
2. Cài câu hỏi trong `CoreSource.ts` (đọc từ `game.get...Info()`/trạng thái; chỉ đổi hình dạng, không tính luật)
   và một mẫu trong `StandInSource.ts`.
3. Viết lớp con của `kit/Panel.ts`: đặt `id`, vẽ trong `build()` bằng `this.ribbon()`, `this.body()`,
   `this.backButton()`, `this.mainButton()`. Tọa độ theo đặc tả: `place(node, x, y, w, h)` trong `this.top`
   (gốc là mép trên vùng an toàn), `placeB(...)` trong `this.bottom`. Gọi `this.refresh()` sau mỗi lệnh.
4. Mở nó từ `screens/Screens.ts`. Đặt tên node cho nút (`name`) để kịch bản chạm được bằng `tapName`.
5. Viết kịch bản trong `tools/harness/scenarios/m1-*.mjs` (xem `lib/view.mjs`, `lib/saves.mjs`) và lưu ảnh vào
   `docs/evidence/m1/<màn>/`.

Chữ: `label()` mặc định cache NONE (một texture mỗi label). Cây gọi `useCharCache()` (HUD, chữ thế giới, toast)
dùng CHAR. Chữ hoa có dấu chồng (Ắ, Ễ, Ỡ...) tự chuyển sang NONE (xem mục 4).

## 3. Đối tượng debug cho kịch bản: `globalThis.__game`

`mode`, `panels`, `settled`, `dialog`, `toasts`, `fieldHud`, `dungeonHud`, `state` (tóm tắt trạng thái lõi),
`screen` (chế độ xây, chỉ đường, màn Nhận Hero), `world` (số sprite), `where(tên)` (tọa độ UI của node để chạm),
`texts(tên)`, `cellToUi(x, y)`, `send(cmd)`, `fastForward(giây)` (chạy lõi nhanh), `hideLayers([...])` (đo
draw call theo lớp), `telegraphCount`.

## 4. Quyết định khi cài đặt

1. **Hình "proc:" nằm trong atlas** (sinh lúc đóng gói), không tạo bằng buffer lúc chạy: cùng texture với sprite nên
   cùng batch, và không phụ thuộc API tạo texture từ buffer chưa kiểm chứng.
2. **Hai atlas, hai cách lọc**: pixel art NEAREST, UI LINEAR. Hero/quái/công trình trong panel lấy từ atlas world để giữ sắc nét.
3. **Đá San Hô Đỏ** dùng bản `pp:0067` được tô lại đỏ lúc đóng gói (`pp/0067_red`): tô màu bằng `sprite.color` lên viên
   pha lê xanh chỉ làm nó tối đi.
4. **Panel UI pack màu Grey được tô màu** thay vì dùng bản Blue/Green có sẵn, để ra đúng màu đặc tả (#1B3A6B, #4CD137...).
5. **Kính lúp** đặt ở góc trên trái thẻ nhiệm vụ (x 182, y 100) như ảnh tham chiếu; vị trí x 172, y 124 của đặc tả
   đè lên cột tài nguyên.
6. **Chữ "EXP 48%" cỡ 20** (đặc tả ghi 18, nhưng cũng ghi "không chữ nào dưới 20").
7. **Số dưới 10 000 không có dấu chấm ngăn cách** ("5873" như đặc tả); từ 10 000 dùng "12.500".
8. **Màn chi tiết hero**: đặc tả đặt kỹ năng ở y 1010 và nút ở H−300, chồng nhau ở H = 1280. Tôi xếp từ dưới lên:
   nút 400 × 112 sát đáy thân, kỹ năng ngay trên, danh sách mốc chiếm phần còn lại và cuộn.
9. **Màn thua**: khung gợi ý cao 380 (thay 420) và dòng "Đã nhặt" ở y 1036 để không chồng "Chạm để về làng." ở H = 1280.
10. **Cổng Xoáy**: ảnh xem trước 300 (thay 360) để nút VÀO nằm trong thân panel ở H = 1280; tiêu đề ruy-băng dịch phải
    vì bong bóng CP đè lên ruy-băng (giống tham chiếu).
11. **Tường phòng dungeon**: tường phía sau cao hai khối có gai; tường phía trước (x = −1, y = −1) một khối, để không che
    đội đứng sát tường.
12. **Bóng công trình (ghost) và viền chọn** vẽ trên mọi thứ (không theo chiều sâu): bóng đặt sau một công trình cao vẫn
    phải thấy được.
13. **Hướng joystick**: vector màn hình được đổi sang vector ô (`Iso.screenDirToCell`) để đẩy cần lên thì đội đi thẳng
    lên màn hình. Hợp đồng không nói rõ không gian của `setJoystick`; lõi dùng ô.
14. **Nút vẽ bằng hình (nút tròn HUD, ⟳, AUTO) khi khóa** thì mờ 50% thay vì đổi sang nền xám.
15. **Màn tiêu đề, menu tạm dừng** là việc của view: lõi không có chế độ TITLE và không có tạm dừng; tạm dừng = view
    ngừng gọi `step()`.
16. **Cache chữ**: CHAR chỉ dùng cho HUD, chữ thế giới và toast. Atlas chữ CHAR của engine (1024 × 1024, dùng chung cả game)
    lưu mỗi ký tự theo cỡ + màu + viền; panel có quá nhiều kiểu chữ làm đầy atlas và ký tự sau bị mất (cảnh báo 12100,
    đã gặp). Màu chữ nổi không đổi theo frame (mờ dần bằng `UIOpacity`) vì màu cũng là khóa của ký tự.
17. **Chữ hoa có dấu chồng** (Ắ, Ễ, Ỡ...) bị cắt đầu ở chế độ CHAR (ô ký tự cao 1.26 × cỡ chữ trong `font-utils.ts`
    của engine): label có ký tự như vậy tự dùng cache NONE. Viền ở CHAR làm giãn chữ: bù bằng `spacingX = −2 × độ dày viền`.
18. **Đổi Vé**: mọi dòng mở lưới chọn hero hợp lệ (`eligibleHeroIds`) rồi hộp xác nhận, theo đặc tả 7.2.
19. **Màn Nhận Hero** hiện bộ thẻ của lượt đầu; khi thanh BONUS đầy giữa 2x/3x, lõi đổi bộ thẻ cho các lượt sau
    (`RecruitDraw.cards`), màn này vẫn nhấc thẻ theo `pickIndex` trên bộ đầu.
20. **Dấu trên công trình** (chấm than ở Quán/Sân Tập, check ở Cổng Xoáy) và mũi tên xanh ở nút Đội đọc từ
    `getTavernInfo`/`getTrainingInfo`/`getDungeonInfo`/`getSquadInfo`, mỗi giây một lần (các hàm này cấp phát).
21. **Phím back Android / Esc** đóng hộp thoại hoặc panel trên cùng.
22. **Tạm dừng dungeon vẫn vẽ**: thế giới đứng yên, chữ nổi vẫn chạy hết hiệu ứng.

## 5. Hợp đồng lõi còn thiếu (cho trưởng nhóm chuyển lõi)

1. `setJoystick(x, y)`: không ghi vector theo không gian nào (ô hay màn hình). View gửi vector ô.
2. `PlayerView.expToNext`: không ghi là tổng EXP của cấp hay phần còn thiếu. View hiểu là tổng (thanh = exp / expToNext).
3. Giá của từng lựa chọn 1x/2x/3x: chỉ có `costGold` và `multi`; view nhân `costGold × multi` để in giá. Nên có
   `recruitCost[i]` trong `TavernInfo`.
4. Cờ hiển thị cho dấu trên công trình (Quán có thể tuyển, Sân Tập mở được nấc, Cổng Xoáy đủ CP). View đang suy từ
   các câu hỏi panel; riêng dấu check của Cổng Xoáy so `squadCp >= recommendedCp` trong view (một phép so sánh luật nhỏ).
   Nên có `BuildingView.badge` hoặc một câu hỏi `getBuildingBadges()`.
5. Biểu tượng của nhiệm vụ (`QuestView` chỉ có `type`): view tự chọn icon theo loại.
6. Tên tiếng Việt của loại kỹ năng và tên tham số (`mult`, `radius`...) cho tooltip kỹ năng: view có bảng tên riêng.
7. Khi BONUS đổi bộ thẻ giữa 2x/3x, `RecruitResult` có bộ thẻ từng lượt nhưng màn Nhận Hero của đặc tả chỉ có một bộ.
   Cần thiết kế quyết định cách hiện.
8. Không có sự kiện riêng cho "hero hồi sinh ngoài đồng xong"/"đội gục" ngoài `revive`/`wipe`; đủ dùng, chỉ ghi lại.

## 6. Harness khác bản build của editor ở đâu (phần của view)

1. **Font**: harness nạp TTF bằng `assetManager.loadRemote` (trình duyệt tạo `@font-face`); editor nạp `TTFFont` qua
   `resources.load`. Cả hai cho `label.font`. Chưa kiểm chứng trong editor và trên Android (font native khác).
2. **Âm thanh**: harness nạp bằng `loadRemote(url + đuôi)`; editor bằng `resources.load(path, AudioClip)`. Chromium
   headless không phát ra loa: chỉ kiểm chứng được là không lỗi. Trên web, nhạc chỉ phát sau lần chạm đầu (màn tiêu đề).
3. **Sorting2D** cần bật "2D Rendering Sorting" trong Feature Cropping (checklist owner bước 6). Nếu quên, hình vẫn đúng
   (thứ tự theo cây node) nhưng nhiều draw call hơn.
4. **Vùng an toàn** (`sys.getSafeAreaRect`): harness không có tai thỏ nên `safeTop = 0`. Bố cục đã chạy ở H = 1280,
   1599 (412 × 915) và 1600 (360 × 800); vùng an toàn thật chưa kiểm chứng.
5. **localStorage**: harness mỗi lần chạy là một trình duyệt mới (save rỗng). Kịch bản cài save mẫu bằng
   `lib/saves.mjs` trước khi chạm màn tiêu đề.
6. **FPS** trong harness thấp (SwiftShader): hiệu ứng trượt panel 0.2 s có thể kéo dài; kịch bản chờ `__game.settled`.
7. **Dynamic atlas**: mọi SpriteFrame của view có `packable = false`; trên Android dynamic atlas tắt nên kết quả draw call giống nhau.

## 7. Kịch bản và bằng chứng

| Kịch bản | Nội dung | Ảnh |
|---|---|---|
| `m1-field.mjs` | tiêu đề, HUD, chỉ đường, joystick, chặt cây, Về làng, đánh ổ quái, nút Về làng bị khóa | `docs/evidence/m1/field/` |
| `m1-village.mjs` | chào mừng trở lại, panel công trình (thu, nâng, hủy), chế độ xây (bóng xanh/đỏ, đặt, chọn, nâng), cài đặt | `docs/evidence/m1/village/` |
| `m1-tavern.mjs` | tab Tuyển, xem thẻ, 3x, Nhận Hero, đổi thẻ, Đổi Vé + chọn hero | `docs/evidence/m1/tavern/` |
| `m1-heroes.mjs` | danh sách hero, lọc, chi tiết, lên cấp, tooltip kỹ năng, vuốt, xếp đội, TỰ XẾP, Sân Tập | `docs/evidence/m1/heroes/` |
| `m1-dungeon.mjs` | Cổng Xoáy, HUD dungeon, AUTO, tạm dừng, tầng boss + báo đòn, thắng, Rời hang → màn thua | `docs/evidence/m1/dungeon/` |
| `m1-crowd.mjs` | 60 quái + 8 hero + số nổi + HUD: đo draw call | `docs/evidence/m1/crowd/` |
| `m1-quest.mjs` | nhận thưởng thẻ nhiệm vụ, màn tiêu đề | `docs/evidence/m1/quest/` |
| `dev-standin-tour.mjs` | mọi màn trên dữ liệu mẫu (không cần lõi) | (không lưu) |

Màn hình cao: `docs/evidence/m1/tall-412x915/`, `docs/evidence/m1/tall-360x800/`, `docs/evidence/m1/crowd/tall-412x915/`.
