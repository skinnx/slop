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
  (2 nếu tính chữ nổi); sau các sửa của QA: tổng 7. Ngân sách: tổng ≤ 30, thế giới ≤ 10.

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
11. **Tường phòng dungeon**: tường phía sau cao hai khối có gai; tường phía trước (x = −1, y = −1) treo xuống dưới mép
    phòng (quyết định 36). Ngoài phòng là nền đá tối thay vì khoảng đen.
12. **Bóng công trình (ghost) và viền chọn** vẽ trên mọi thứ (không theo chiều sâu): bóng đặt sau một công trình cao vẫn
    phải thấy được.
13. **Hướng joystick**: view gửi vector màn hình; `CoreSource` đổi sang vector ô bằng `joystickToWorld` của lõi
    (hợp đồng v2). `Iso.screenDirToCell` chỉ còn cho nguồn dữ liệu mẫu.
14. **Nút vẽ bằng hình (nút tròn HUD, ⟳, AUTO) khi khóa** thì mờ 50% thay vì đổi sang nền xám.
15. **Màn tiêu đề, menu tạm dừng** là việc của view: lõi không có chế độ TITLE và không có tạm dừng; tạm dừng = view
    ngừng gọi `step()`.
16. **Cache chữ**: CHAR chỉ dùng cho HUD, chữ thế giới và toast. Atlas chữ CHAR của engine (1024 × 1024, dùng chung cả game)
    lưu mỗi ký tự theo cỡ + màu + viền; panel có quá nhiều kiểu chữ làm đầy atlas và ký tự sau bị mất (cảnh báo 12100,
    đã gặp). Màu chữ nổi không đổi theo frame (mờ dần bằng `UIOpacity`) vì màu cũng là khóa của ký tự.
17. **Chữ hoa có dấu chồng** (Ắ, Ễ, Ỡ...) bị cắt đầu ở chế độ CHAR (ô ký tự cao 1.26 × cỡ chữ trong `font-utils.ts`
    của engine): label có ký tự như vậy tự dùng cache NONE. Viền ở CHAR làm giãn chữ: bù bằng `spacingX = −2 × độ dày viền`.
18. **Đổi Vé**: mọi dòng mở lưới chọn hero hợp lệ (`eligibleHeroIds`) rồi hộp xác nhận, theo đặc tả 7.2.
19. **Màn Nhận Hero** (hợp đồng v2): mọi lượt của một lần bấm rút từ `RecruitResult.cards`; thẻ trúng nhô lên, thanh
    mảnh chạy tới `fragmentsAfter`. Nếu `bonusRefreshed`, sau lượt cuối ba thẻ đổi sang `cardsAfter` kèm chữ
    "BONUS! Bộ thẻ mới ở Quán"; tab Tuyển sau đó hiện bộ mới.
20. **Dấu trên công trình** lấy từ `BuildingView.marker` của lõi. Mũi tên xanh ở nút Đội đọc `getSquadInfo().canImprove`
    mỗi giây một lần (hàm cấp phát).
21. **Phím back Android / Esc** đóng hộp thoại hoặc panel trên cùng.
22. **Tạm dừng dungeon vẫn vẽ**: thế giới đứng yên, chữ nổi vẫn chạy hết hiệu ứng.
23. **Số nổi trong đám đông** (03-ux-spec.md mục 3): tối đa 32 chữ cùng lúc; chữ mới không bắt đầu đè lên chữ còn trẻ
    (< 0.35 s): thử chỗ gốc, rồi lên một dòng và lệch trái/phải; sát thương lên quái không còn chỗ thì bỏ (lên hero luôn
    hiện). EXP của các con chết gần nhau trong 0.25 s gộp thành một "EXP N".
24. **Thanh thông báo nhặt chỉ có ngoài đồng** (đặc tả mục 3; HUD dungeon mục 12.1 và ảnh tham chiếu dungeon không có).
    Trong dungeon, số vàng của lượt nảy lên khi nhặt vàng.
25. **Màu độ hiếm và màu hệ** lấy từ `tuning.hero.rarityColor/attrColor` khi nạp dữ liệu lõi.
26. **Cỡ hình công trình** ×8 (2×2) và ×12 (3×3) thay vì ×12 / ×18 của 04-placeholder-art.md 1.3: hình đứng trên ô
    chân như làng tham chiếu, không đè công trình bên cạnh (QA-01). Nhãn tên ở chân footprint.
27. **Thu phóng thế giới (chỉ view)**: ngoài đồng 1; chế độ xây 0.6 để thấy phần lớn lưới làng khi xếp đặt (nhãn tên giữ
    tối thiểu 20 trên màn); dungeon 1.4 để phòng phủ màn như ảnh tham chiếu. Phòng 16 × 24 ô là hình thoi
    2400 × 1200 đơn vị, ở thu phóng 1 không phủ được khung 720 × 1280 (cần ≥ 1.37). Camera dungeon bám trong phòng nhưng
    thủ lĩnh luôn ở phần giữa màn (không xuống dưới joystick).
28. **Màn hình thấp hơn 9:16** (ví dụ 600 × 800, 3:4): hiện trọn khung 720 × 1280 với hai dải hai bên
    (`ResolutionPolicy.SHOW_ALL`) thay vì cắt chiều cao (QA-02, quyết định của trưởng nhóm). 9:16 và dài hơn giữ Fit Width.
    `Layout.applyPolicy()` tự đổi theo hình dạng cửa sổ.
29. **Chỗ của toast** (QA-04, sửa lần hai ở quyết định 37): không panel và dungeon → xem 37; có panel hoặc màn kết quả → một toast duy nhất trên dải thanh trên (y 24..96), dải chỉ chứa số HUD nên không
    che nút nào của panel. Toast lớn khi có panel thành toast thường. Thanh nhặt đồ chỉ hiện khi đang thấy HUD đồng.
30. **Chữ "Tầng N"** ở vùng HUD trên (y 360, dưới bộ đếm chuỗi và thanh máu boss), cỡ 48, 1 s, thay vì giữa màn 0.8 s
    (đặc tả 12.1 [QĐ]). Tên kỹ năng không hiện trên đầu hero trong dungeon (ảnh tham chiếu không có).
31. **Lỗi nạp lõi** → màn báo lỗi; không còn âm thầm dùng dữ liệu mẫu. Dữ liệu mẫu chỉ qua cờ `?standin=1` (QA-10).
32. **Nút lên cấp bị khóa** vẫn hiện (xám); chữ trên nút là câu lý do của lõi (ví dụ "Thiếu 3 mảnh"); giá ở trên tô đỏ
    phần thiếu.
34. **Tầm thu thập** (hợp đồng v3, QA-08): nút tài nguyên có `inReach` (đội sẽ chặt/đập khi đứng yên) có một vòng trắng mờ
    nhấp nháy dưới chân. Cùng atlas, lớp phủ: không thêm draw call.
35. **Toast theo ngữ cảnh**: sự kiện của bước được xử lý trước khi đổi chế độ, rồi mọi lần đổi chế độ (vào/ra dungeon,
    màn kết quả, tiêu đề) xóa toast, thanh nhặt đồ và chữ lớn; chỉ làng ↔ chế độ xây giữ lại (cùng bản đồ, cùng HUD).
36. **Tường trước phòng dungeon treo xuống dưới mép phòng** (thay vì dựng lên từ ô mép): khối tường cao 96 dựng lên sẽ
    phủ khoảng ba hàng ô đi được phía sau nó, đó là nguyên nhân che đội (không phải dữ liệu phòng của lõi). Giờ hình tường
    chỉ nằm trên ô không đi được và vẽ dưới mọi đơn vị.
37. **Chỗ toast lần hai**: đặc tả 14.1 (y 300) nằm trên ô tài nguyên thứ ba và, khi xếp chồng, trên thẻ nhiệm vụ. Dải mới:
    HUD đồng y 324..396 (toast thứ hai nằm dưới, y 408..480); dungeon một toast y 380..440 dưới bộ đếm chuỗi, thanh máu
    boss (y 260 như đặc tả, tên boss nằm trên thanh) và chữ tầng (y 330); camera dungeon giữ thủ lĩnh ở giữa hoặc dưới
    giữa màn nên trận đánh ở dưới dải này.
33. **Màn xếp đội**: danh sách từ y 600 (đặc tả 640) để hai hàng thẻ trọn ở H = 1280. Tab lọc "Nhanh Nhẹn" đầy đủ. Chữ
    "+5 mảnh"/"MỚI!" ở Nhận Hero nằm ở dải trên của thẻ, thay chỗ nhãn x5. Chi tiết hero phủ tối 85% panel phía sau.

## 5. Hợp đồng lõi

Hợp đồng v2 đã đóng sáu chỗ thiếu của bản v1 (giá 1x/2x/3x `recruitOptions`, `BuildingView.marker`/`readyStage`,
`QuestView.icon`, `SkillInfo.typeName`/`paramNames`, `StatRow.icon`, quy ước joystick, `expToNext`, BONUS sau lần bấm).
View đã bỏ các bảng và phép tính tạm tương ứng.

Còn lại trong view, có lý do:
- `maxStars: 3` của kỹ năng (sao 3 luôn khóa trong M1, `SkillInfo` không có số sao tối đa) — chỉ để vẽ ba ngôi sao.
- Bảng hình (vũ khí, chân dung NPC, màu phép của Đăng/Triều) theo 04-placeholder-art.md: hình ảnh, không phải luật.
- Thứ tự sắp thẻ hero (trong đội, rồi CP giảm dần) và thanh tài nguyên đỏ khi ≥ 95%: quy tắc hiển thị của 03-ux-spec.md.

## 6. Harness khác bản build của editor ở đâu (phần của view)

1. **Font**: harness nạp TTF bằng `assetManager.loadRemote` (trình duyệt tạo `@font-face`); editor nạp `TTFFont` qua
   `resources.load`. Cả hai cho `label.font`. Chưa kiểm chứng trong editor và trên Android (font native khác).
2. **Âm thanh**: harness nạp bằng `loadRemote(url + đuôi)`; editor bằng `resources.load(path, AudioClip)`. Chromium
   headless không phát ra loa: chỉ kiểm chứng được là không lỗi. Trên web, nhạc chỉ phát sau lần chạm đầu (màn tiêu đề).
3. **Sorting2D** cần bật "2D Rendering Sorting" trong Feature Cropping (checklist owner bước 6). Nếu quên, hình vẫn đúng
   (thứ tự theo cây node) nhưng nhiều draw call hơn.
4. **Màn hình thấp hơn 9:16** dùng SHOW_ALL lúc chạy (mục 4, quyết định 28); Project Settings vẫn là Fit Width.
5. **Vùng an toàn** (`sys.getSafeAreaRect`): harness không có tai thỏ nên `safeTop = 0`. Bố cục đã chạy ở H = 1280,
   1599 (412 × 915) và 1600 (360 × 800); vùng an toàn thật chưa kiểm chứng.
6. **localStorage**: harness mỗi lần chạy là một trình duyệt mới (save rỗng). Kịch bản cài save mẫu bằng
   `lib/saves.mjs` trước khi chạm màn tiêu đề.
7. **FPS** trong harness thấp (SwiftShader): hiệu ứng trượt panel 0.2 s có thể kéo dài; kịch bản chờ `__game.settled`.
8. **Dynamic atlas**: mọi SpriteFrame của view có `packable = false`; trên Android dynamic atlas tắt nên kết quả draw call giống nhau.

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
| `m1-extra.mjs` | BONUS đầy: Nhận Hero hiện bộ đã rút rồi bộ BONUS; nút lên cấp bị khóa ở cấp đột phá | `docs/evidence/m1/extra/` |
| `m1-extra.mjs` | BONUS đầy: Nhận Hero hiện bộ đã rút rồi bộ BONUS; nút lên cấp bị khóa ở cấp đột phá | `docs/evidence/m1/extra/` |
| `dev-standin-tour.mjs` | mọi màn trên dữ liệu mẫu (không cần lõi) | (không lưu) |

Màn hình cao: `docs/evidence/m1/tall-412x915/`, `docs/evidence/m1/tall-360x800/`, `docs/evidence/m1/crowd/tall-412x915/`.
