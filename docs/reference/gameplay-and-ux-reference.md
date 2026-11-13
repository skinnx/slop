# Tham chiếu gameplay và UX: Rumble Heroes: Adventure RPG

Tài liệu này mô tả game gốc (PLAYHARD, `com.playhardlab.heroes`) để nhóm làm game nguyên bản. Chỉ dùng cho cơ chế và bố cục UX. Không sao chép tên, cốt truyện, art.

Cách đọc nguồn:

- Tên file ảnh (ví dụ `hero-recruit-pub-01.jpg`) nằm trong `reference-images/`. URL gốc của từng ảnh nằm trong `docs/reference/image-index.md`.
- Chữ **[thấy]** là điều tôi nhìn thấy trực tiếp trong ảnh. **[nguồn]** là điều một bài viết nêu, kèm URL. **[suy luận]** là suy ra từ ảnh nhưng chưa có nguồn xác nhận. **[theo thể loại]** là phỏng đoán theo quy ước thể loại, không có bằng chứng.
- Nguồn chữ chính:
  - TK1: review của người chơi trên TapTap, https://www.taptap.io/post/4757983
  - TK2: bài người chơi "Turning Vampire Survivors into a full open-world RPG...", https://www.taptap.io/post/4894458
  - TK3: bài người chơi có chú thích ảnh, https://www.taptap.io/post/6091819
  - TK4: bài người chơi "The Rumbling Heroes To Save The World", https://www.taptap.io/post/4895224
  - LW: hướng dẫn LevelWinner (báo chí), https://www.levelwinner.com/rumble-heroes-adventure-rpg-beginners-guide-tips-tricks-strategies-to-rescue-the-princess/
  - TA: hướng dẫn TalkAndroid (báo chí, chỉ lấy chữ, không lấy ảnh vì ảnh ghi nguồn nhà phát hành), https://www.talkandroid.com/17710-rumble-heroes-adventure-rpg-walkthrough-beginners-guide/
  - PG: PocketGamer "best teams", https://www.pocketgamer.com/rumble-heroes-adventure-rpg/best-teams
- Ảnh LevelWinner và TapTap chụp từ bản game năm 2023. PocketGamer có trang tier list cho bản 2.2.103 (12/2025), nên UI và số liệu bản hiện tại có thể đã đổi. Tôi không kiểm tra được bản mới.

## 0. Ba điểm khác với "điều đã biết"

1. **Hero chỉ tự đánh khi đứng yên.** Cả TK1 và TK4 viết rằng đội chỉ auto-attack khi người chơi dừng di chuyển. Khi đang kéo joystick thì không đánh. Đây là cơ chế quan trọng, vì nó tạo nhịp "di chuyển rồi đứng lại để đánh".
2. **Công trình không được đặt tự do.** Mọi ảnh làng cho thấy công trình nằm ở các "chỗ xây" có sẵn (bãi gỗ đá có dây, biển búa; xem `village-pub-request-board-01.jpg`, `village-storage-facility-level-lock-01.jpg`). Không thấy lưới đặt công trình hay menu chọn vị trí. Nếu team muốn "đặt tự do trên lưới" thì đó là thiết kế mới, không phải copy.
3. **Cỡ đội hình tăng theo tiến độ, không cố định.** Ảnh cho thấy 4/4 (cấp 10), 5/5 (cấp 22), 6/6 (cấp 24 đến 29). Có nút "Number of troops +1" ở Training Ground (`training-ground-troop-count-01.jpg`).

## 1. Vòng lặp gameplay từng bước

Game chạy **dọc (portrait)**, điều khiển một tay bằng joystick. Mọi ảnh trong thư mục đều dọc.

### 1.1 Vòng lặp tổng

```
Field (đi, đánh quái, chặt cây, đào quặng)
  -> nhận thịt / gỗ / quặng / vàng / EXP
  -> về làng (nút Return/Portal)
  -> xây hoặc nâng cấp công trình (gỗ, quặng)
  -> Pub: tuyển hero (vàng) và nhận mảnh hero
  -> nâng cấp hero (thịt + mảnh), Training Ground (quặng), Guardian Statue (trang bị)
  -> xếp đội
  -> đi tiếp field (mở vùng mới) hoặc vào Dungeon (trang bị, vàng, quặng đỏ)
  -> mạnh hơn, mở vùng khó hơn (cổng Teleport có ngưỡng sức mạnh)
```

### 1.2 Field (khám phá và thu thập)

- Người chơi kéo joystick để đi cả đội. Chặt cây, đào đá có tinh thể xanh, săn thỏ và quái bằng cách đưa đội lại gần rồi dừng. **[nguồn]** TK1, TA. **[thấy]** `hud-field-gathering-wood-01.jpg`, `hud-field-gathering-coins-01.jpg`.
- Tài nguyên: **thịt** (rơi từ quái có thịt), **gỗ** (cây, bụi), **quặng** (đá tinh thể xanh) hiện ở cột trái HUD **[thấy]**. Thêm **vàng** và **gem** ở thanh trên.
- Thịt dùng để nâng cấp hero **[thấy]** `hero-detail-agility-01.jpg` (nút UPGRADE ghi 100 thịt) và **[nguồn]** TK2, LW. Gỗ dùng để xây (`building-upgrade-mining-camp-01.jpg`: 400 gỗ) và để khôi phục Circle of Purification (LW). Quặng dùng ở Training Ground (`training-ground-upgrade-tree-01.jpg`: nút HP +12 giá 5 quặng).
- Quặng đỏ (Crimson Ore): hiếm, rơi từ nhiệm vụ, boss, dungeon. Dùng cho nâng cấp đặc biệt, ví dụ tăng số hero trong đội. **[nguồn]** LW, TA. **[thấy]** `training-ground-troop-count-01.jpg` (2 quặng đỏ cho +1 troop). TK3 ghi người chơi nói "red gem từ dungeon, tỉ lệ ngẫu nhiên".
- Quái và nhiệm vụ: ô nhiệm vụ chính trên đỉnh màn hình (ví dụ "Kill 10 Rat", "Construct: Training Ground", "Kill 20 Mandragora"). **[thấy]** nhiều ảnh. Nhiệm vụ chính mở vùng mới thông qua Circle of Purification, xóa sương mù tím (**[thấy]** `field-circle-of-purification-01.jpg`, **[nguồn]** TA, LW).
- Vùng bị khóa phủ sương tím, tối (`field-purple-fog-dialog-01.jpg`, `field-purple-fog-zone-01.png`).
- Gặp hero bị nhốt hoặc nằm bất tỉnh: tuyển bằng cách trả tài nguyên rồi bấm dấu check xanh (**[nguồn]** TA; **[thấy]** nhãn "Join Hero" ở `field-rabbit-join-hero-01.jpg`).
- Có rương kho báu ngoài field (`field-treasure-chest-01.jpg`). Mở rương cho quặng, kèm lời mời xem quảng cáo để nhân (`chest-reward-ad-offer-01.jpg`: x8 quặng, hoặc 40 nếu xem quảng cáo).
- Quái elite và boss cho nhiều EXP và rương (TA). Đòn mạnh của boss có vòng đỏ báo trước (**[thấy]** `dungeon-boss-golem-01.jpg`; **[nguồn]** LW: lùi ra khỏi vòng đỏ).
- Hero chết trên field: nằm vài giây rồi hồi lại đủ máu (**[nguồn]** TK1, TA).
- Teleport: bệ teleport rải khắp bản đồ. Không dịch chuyển được khi có quái gần (**[nguồn]** TA). Màn chọn vùng: `teleport-list-01.jpg`.
- Camp: xem mục 1.6.

### 1.3 Làng và công trình

Công trình thấy trong ảnh hoặc nguồn (chức năng đúng như nguồn nêu, tôi không thêm):

| Công trình | Chức năng | Bằng chứng |
|---|---|---|
| Pub | Tuyển hero (100 vàng một lượt), nhận mảnh hero | `hero-recruit-pub-01.jpg`, LW, TA |
| Training Ground | Cây nâng cấp chỉ số toàn đội bằng quặng; nhánh quặng đỏ cho nâng cấp đặc biệt và +1 slot đội | `training-ground-upgrade-tree-01.jpg`, `training-ground-troop-count-01.jpg` |
| Dungeon Portal | Gọi dungeon từ làng; cần cuộn (scroll) hoặc vé | `dungeon-entry-panel-01.jpg`, LW, TA |
| Teleportation pad | Chuyển vùng | `teleport-list-01.jpg` |
| Guardian Statue | Gắn trang bị tăng sức mạnh toàn đội | `guardian-statue-panel-01.jpg` |
| Request Board | Nhiệm vụ ngày/tuần | `village-pub-request-board-01.jpg`, TA |
| Exchange | Đổi vật phẩm (Grassland Marble lấy tài nguyên ngẫu nhiên) | LW; nhãn ở `village-pub-request-board-01.jpg` |
| Mining Camp, Logging Camp, Gold Production Camp | Sản xuất tài nguyên nhàn rỗi, có trần chứa | `building-upgrade-mining-camp-01.jpg`, `hud-village-pub-logging-camp-01.jpg` |
| Storage Facility | Chưa mở; khóa tới cấp người chơi 30 | `village-storage-facility-level-lock-01.jpg` |
| SHOP | Cửa hàng trả tiền (icon có chấm đỏ) | nhiều ảnh; nội dung shop **chưa thấy** |

Số liệu thấy trong Mining Camp Lv 4 -> 5 (`building-upgrade-mining-camp-01.jpg`): Production Output 5, Max Collection QTY 75 (+25), Production Speed 480, giá 400 gỗ. Đơn vị của "Production Speed" 480 **chưa rõ**. Logging Camp hiện "100/100" và Gold Production Camp "0/30" (`hud-village-pub-logging-camp-01.jpg`): có vẻ là lượng đã tích trữ so với trần **[suy luận]**.

Chỗ xây là điểm cố định với dây, biển búa và đống gỗ/đá. Ảnh `village-storage-facility-level-lock-01.jpg` cho thấy một số chỗ khóa theo cấp người chơi. Cấp người chơi lên bằng EXP từ quái (**[nguồn]** TA, TK2).

### 1.4 Hero: tuyển, hạng, nâng cấp, kỹ năng

- **Tuyển ở Pub** (`hero-recruit-pub-01.jpg`): 3 thẻ hero hiện cùng lúc, mỗi thẻ ghi số mảnh (x33, x5, x33), nhãn NEW. Nút RECRUIT giá 100 vàng, chọn 1x/2x/3x (nhiều lượt cùng lúc nhận nhiều mảnh hơn, LW, TA). Thanh BONUS 4/10 với lời chú "After 6 recruitments: Increased chance of a high grade hero!" (**[thấy]**, đây là cơ chế bảo hiểm gacha). Đếm ngược "Hero switching time 29Min 32Sec": danh sách thẻ tự đổi mỗi 30 phút (TA), đổi ngay tốn gem, xem quảng cáo hoặc vé reroll. Trúng hero trùng thì thành mảnh (LW).
- **Hạng**: màu khung xám, xanh dương, tím, vàng = Normal, Rare, Special, Legendary (LW, TA). Khung tím và vàng thấy ở `squad-setup-6-slots-01.jpg`.
- **Hệ (class)**: Strength (đỏ, đỡ đòn), Agility (xanh lá, nhanh, thường tầm xa), Intellect (vàng, đa dạng, có hồi máu) (LW). Icon hệ nằm góc trái trên thẻ hero (**[thấy]** `squad-setup-6-slots-01.jpg`). Có tối đa khoảng 48 hero (TA, chưa kiểm chứng độc lập).
- **Chi tiết hero** (`hero-detail-agility-01.jpg`, `hero-detail-intellect-healer-01.jpg`): tên, cấp, CP, ATK, HP. Bảng mốc theo cấp: Lv 5 và 25 là hiệu ứng "Owned Effects" (+5% HP của hệ), Lv 10 mở kỹ năng, Lv 15 +5% sát thương của hệ, Lv 20 nâng cấp kỹ năng 1. 2 kỹ năng, mỗi kỹ năng có 3 sao. Nút UPGRADE tốn thịt (20 thịt ở Lv 4, 100 thịt ở Lv 20). Thanh cấp ghi "20/10" và "24/5": có vẻ là mảnh đang có trên mảnh cần **[suy luận]**.
- Kỹ năng chạy tự động (không thấy nút kỹ năng của hero trong màn chiến đấu; xem 1.5).
- Hero hồi máu là vai trò quan trọng (LW, PG). Một số hero chuyên thu thập (chặt gỗ nhanh) yếu dần về sau (LW).
- Nâng cấp toàn đội qua **Training Ground** (cây dọc HP +12, ATK +3 xen kẽ; mỗi cấp người chơi mở thêm 3 nấc, LW). Nhánh phải dùng quặng đỏ.
- **CP (combat power)**: số trên thanh trên và trên mỗi thẻ hero. Dùng để so với ngưỡng teleport và dungeon.

### 1.5 Dungeon và chiến đấu

- Vào dungeon qua Dungeon Portal trong làng (cần cuộn) hoặc đi bộ tới lối vào ngoài field (LW; **[thấy]** `field-dungeon-entrance-01.jpg`).
- Bảng vào (`dungeon-entry-panel-01.jpg`): tên dungeon, nhãn độ khó (ở ảnh là "Hard"), **sức mạnh đề nghị 9000 so với đội 8590 (chữ tím = thiếu)**, các icon phần thưởng có thể nhận, nút ENTER, nút back.
- Cấu trúc: nhiều tầng (ảnh thấy 1F, 3F, 4F), mỗi tầng phải dọn sạch quái rồi sang tầng sau (TK1: "wave-like, clear all enemies, one level after the next"). Có boss ở dungeon và ngoài field.
- Hành lang tối, tường gai, đuốc, nền đá (`dungeon-combat-hud-kill-streak-01.jpg`). Có bẫy sàn cam (cùng ảnh).
- Hạ càng nhiều quái liên tục càng nhận thưởng "Killing Spree / Streak bonus" (vàng, LW). Đếm thấy 43, 98, 190, 192 KILL. Bộ đếm có vòng đỏ quanh icon đầu lâu, nghĩa là vòng này có thể là thanh thời gian hết dần **[suy luận]** (LW: "streak counter... before it depletes").
- Hero chết trong dungeon nằm tới hết lượt chơi, thua khi cả đội gục (TA). Màn thua: `result-annihilated-01.jpg`. LW nói có thể xem quảng cáo để hồi sinh đội.
- Thưởng: trang bị, vàng, quặng đỏ, cuộn dungeon (`result-victory-01.jpg`, `dungeon-entry-panel-01.jpg`). Dungeon Slime cho vàng (LW).
- Độ khó: mỗi dungeon có nhãn độ khó và ngưỡng sức mạnh. Số quái, HP quái theo tầng **chưa có số liệu**.
- Điều khiển trong dungeon: joystick một tay. Hai nút vật phẩm (sách xanh dương có tinh thể, sách xanh lá có dấu cộng) ở mép phải, nút AUTO ở góc dưới phải (`dungeon-combat-hud-kill-streak-01.jpg`, `dungeon-combat-streak-bonus-01.jpg`). TA nói trong dungeon có hồi máu, tăng tốc, đòn mạnh; hai nút sách có thể là các hiệu ứng này nhưng **chưa được xác nhận**. Chức năng của nút AUTO chưa rõ; LW chỉ nói quảng cáo có thể kích hoạt 30 phút Auto Battle.
- Hero tự động tấn công **chỉ khi người chơi đứng yên** (TK1, TK4). Không có cách chỉ định hero nào đi trước chịu đòn (TK1).
- Hero tách nhau nhẹ khi đi rồi tự tụ lại (người chơi TapTap, https://www.taptap.io/post/4732936).

### 1.6 Camp

- Khi đặt camp, đội ở lại farm khi người chơi không điều khiển (TA, LW). Camp có thể mở từ nút Camp (dưới phải, khi có Training Ground; TA).
- **Mỗi ngày chỉ được camp tối đa 1 giờ.** **[thấy]** đếm ngược 59:40 ở `camp-active-timer-01.jpg` và thông báo "No more camps are available for today. Please try again tomorrow." ở `camp-limit-reached-01.jpg`.
- Premium Camp (nút lửa ở dưới phải, đếm 29:52): nhanh hồi sinh và nhiều tài nguyên hơn; mở bằng nâng cấp hoặc quảng cáo (LW, TA).
- Hero chết gần camp được hồi sinh; camp tan nếu cả đội chết (LW). Camp dừng khi thoát game (TA). Hai điều này có nguồn một phía.
- Đặt camp làm tăng quái và tài nguyên xuất hiện quanh đó (LW).

### 1.7 Giới hạn kho, đồng hồ, stamina

- Kho: có Storage Facility (khóa tới cấp 30, thấy ảnh). Cột tài nguyên trái có thanh xanh dưới mỗi ô, đầy xanh ở cấp 29 (`hud-village-clean-lv29-01.jpg`): rất có thể là mức đầy kho **[suy luận]**. Con số trần cụ thể **chưa biết**.
- Đồng hồ: camp 1 giờ mỗi ngày; Pub đổi hero mỗi 30 phút; quà theo giờ (icon quà, ví dụ "71Hour56Min", `hud-field-combat-slimes-01.jpg`); nhiệm vụ ngày có đồng hồ reset (`quest-daily-panel-01.jpg`: "Ends In 06Hour 32Min").
- **Stamina: không thấy trong nguồn nào.** Dungeon cần cuộn (Dungeon Scroll) chứ không phải stamina (LW, TA).
- Hoạt động hằng ngày/tuần: nhiệm vụ ngày có thanh điểm 0 đến 100 với 5 rương ở 20/40/60/80/100 (`quest-daily-panel-01.jpg`; rương cho vàng, mảnh hero, cuộn dungeon, LW). Thử thách mở theo cấp: Golden Pig (cấp 20, một lần mỗi ngày, đập heo vàng trong 1 phút), Village Defense (cấp 30), Rift (cấp 40), Tower of Trials (TA, LW). Chỉ Golden Pig có ảnh (`challenge-golden-pig-01.jpg`).

## 2. Bố cục UX từng màn hình

Quy ước chung **[thấy]** trên toàn bộ ảnh:

- Màn hình dọc. Phần thanh trên nằm sát đỉnh, có thể có khoảng trống lệch xuống do notch (ảnh 946x2048 có dải xanh dương trống ở trên cùng).
- Panel full-screen mở đè lên thế giới đã làm mờ. Tiêu đề là ruy-băng xanh có chân dung NPC của công trình đè lên góc trên trái. Nút **back là ô vuông xanh với dấu "<" ở góc dưới trái**. Nút hành động chính là nút **xanh lá lớn** (RECRUIT, ENTER, UNLOCK, EQUIP, UPGRADE là nút xám khi thiếu thịt).
- Ngoài thế giới, thanh trên luôn hiện cả trong panel (cấp, CP, vàng, gem).

### 2.1 Field (khám phá, thu thập, chiến đấu)

Ảnh: `hud-field-combat-slimes-01.jpg`, `hud-field-gathering-coins-01.jpg`, `hud-field-gathering-wood-01.jpg`, `hud-field-return-portal-01.jpg`, `hud-village-clean-lv29-01.jpg`.

```
+--------------------------------------------------+
| [Lv] [CP 5873]      [vàng 277 +] [gem 20 +]      |  thanh trên
| ====== thanh EXP (EXP 48%) =================     |
| [thịt 99 ]   [?] Nhiệm vụ chính  0/1  ]  [gear]  |
| [gỗ   12 ]                              [túi ]   |
| [quặng 8 ]                              [la bàn]  |
| [SHOP*]                                 [cuộn NV]|
| [quà 71h]                               [khiên*] |
| [sự kiện]                               [thư  ]  |
|                                                  |
|          (thế giới, đội hero ở giữa)             |
|                                                  |
|              (   joystick nổi   )               |
| [đổi hero]                          [Camp]      |
| [đội 6/6]                           [Return]    |
+--------------------------------------------------+
```

- Thanh trên **[thấy]**: ô cấp người chơi (lục giác xanh, số cấp), bên cạnh là biểu tượng hai kiếm và số CP, rồi vàng và gem (đều có dấu + để mua), thanh EXP mảnh bên dưới có chữ "EXP 48%" ở cuối phải.
- Cột trái **[thấy]**: thịt, gỗ, quặng (icon, thanh, số). Dưới đó là SHOP (chấm đỏ), quà đếm giờ, icon sự kiện kèm số ngày (26d, 5d).
- Giữa trên **[thấy]**: thẻ nhiệm vụ chính với kính lúp, hình mục tiêu, tên nhiệm vụ, tiến độ x/y. Chức năng của kính lúp chưa xác nhận (rất có thể là chỉ đường **[theo thể loại]**).
- Cột phải **[thấy]**: bánh răng cài đặt, túi, la bàn, cuộn nhiệm vụ, khiên (chấm đỏ), thư. Riêng chức năng của túi, la bàn, khiên, thư **chưa xác nhận** (suy từ biểu tượng).
- Dưới trái **[thấy]**: nút đổi hero (hai đầu mũi tên) và nút số đội (6/6, mũi tên xanh = có hero mới có thể xếp). Dưới phải: nút **Camp** (lều) và **Return/Portal** (cổng). Nhãn là "Return" ở các ảnh cấp 10 và 16 và "Portal" ở ảnh cấp 29; có vẻ cùng một nút.
- **Joystick**: vòng tròn mờ rộng khoảng 1/4 chiều rộng. Nằm giữa dưới màn hình ở hầu hết ảnh, nhưng ở `hud-field-gathering-coins-01.jpg` đặt lệch lên giữa màn hình, nên là joystick nổi (xuất hiện tại điểm chạm) **[suy luận từ vị trí khác nhau]**. Không có nút kỹ năng nào ngoài field **[thấy]**.
- Di chuyển: người chơi điều khiển một hero dẫn đầu, cả đội đi theo. Ở ảnh cấp 29 (`hud-village-clean-lv29-01.jpg`) chỉ một hero hiện trên màn hình dù đội 6/6. Có thể do hero đi sau ngoài khung, hoặc đội thu gọn **[chưa rõ]**.

### 2.2 Làng

Ảnh: `village-pub-request-board-01.jpg`, `village-pub-town-portal-01.jpg`, `village-dungeon-portal-teleport-pad-01.jpg`, `village-guardian-statue-pub-01.jpg`, `hud-village-pub-logging-camp-01.jpg`.

- Cùng HUD với field. Làng chỉ là một khu của bản đồ (không có màn tải riêng, nối liền với field; TK1: "all can be traveled seamlessly").
- Công trình có nhãn chữ trắng bên dưới (Pub, Request Board, Exchange, Dungeon Portal, Town Portal, Logging Camp...). Công trình dùng được có **dấu check xanh** hoặc **dấu chấm than** nổi trên đầu (NPC có việc). Chỗ chưa xây hiện đống gỗ đá có dây và biển búa. Công trình khóa theo cấp hiện ổ khóa kèm số cấp (`village-storage-facility-level-lock-01.jpg`: cấp 30).
- Chạm hoặc đi vào công trình để mở panel (**[suy luận]**, ảnh cho thấy dấu check nhưng không thấy khoảnh khắc chạm).
- Menu xây dựng và xác nhận chi phí xây **chưa có ảnh**.
- Có NPC đi lại, bong bóng thoại (`village-guardian-statue-pub-01.jpg`).

### 2.3 Bảng nâng cấp công trình

Ảnh: `building-upgrade-mining-camp-01.jpg`.

```
+---------------------------------+
| [NPC] ===== Mining Camp ======= |
|   +---------------------------+ |
|   |   (hình công trình)       | |
|   +---------------------------+ |
|        Level 4  >  5            |
|  Production Output          5   |
|  Max Collection QTY    75 +25   |
|  Production Speed         480   |
|  Upgrade to obtain more...      |
|     [ gỗ 400  UNLOCK ]         |
| [<]                             |
+---------------------------------+
```

Bố cục: hình công trình, cấp hiện tại -> cấp kế, 3 chỉ số (giá trị mới hiện kèm +chênh lệch), một dòng mô tả, nút xanh lớn kèm giá. Thời gian xây dựng **không hiện** ở ảnh nào (có thể không có timer xây **[suy luận]**).

### 2.4 Pub (tuyển hero)

Ảnh: `hero-recruit-pub-01.jpg`, `hero-recruit-obtained-01.jpg`.

```
+---------------------------------+
| thanh trên (cấp, CP, vàng, gem) |
| [NPC] ======= Pub ============  |
|  BONUS [=======4/10=====] [?]   |
|     [x33 NEW] [x5]  [x33 NEW]   |
|     thẻ hero  thẻ     thẻ       |
|                Hero switching   |
|                time 29Min 32Sec |
|   You will obtain one of heroes |
|       [ 100 vàng  RECRUIT ]     |
|          [1x][2x][3x]           |
| [<]                             |
+---------------------------------+
```

Sau khi tuyển, màn "Obtained Hero" hiện 3 thẻ trên sân khấu có pháo giấy. Thẻ có khung màu theo hạng và dưới đáy là thanh mảnh x/y.

### 2.5 Danh sách hero, chi tiết hero

- Chi tiết hero: `hero-detail-agility-01.jpg`, `hero-detail-intellect-healer-01.jpg`. Nửa trên là chân dung lớn, nửa dưới là panel: huy hiệu hero + tên + cấp + thanh mảnh; hàng CP / ATK / HP; danh sách mốc cấp (5, 10, 15, 20, 25) có dấu tick hoặc khóa; 2 ô kỹ năng với sao; nút UPGRADE ở đáy; số thịt đang có ở góc trên trái. Nút back góc dưới trái.
- **Màn danh sách toàn bộ hero (kiểu bộ sưu tập)** chưa có ảnh riêng. Chỉ có lưới thẻ ở màn xếp đội (2.6). Cách mở chi tiết từ lưới chưa thấy.

### 2.6 Xếp đội

Ảnh: `squad-setup-camp-auto-assign-01.jpg`, `squad-setup-6-slots-01.jpg`.

```
+---------------------------------+
| thanh trên                      |
|   "Select hero."  ---o---  6/6  |
|     hero quanh đống lửa         |
|     (một hero có vương miện =   |
|      thủ lĩnh)                  |
| +-----------------------------+ |
| |             [AUTO ASSIGN]   | |
| | [thẻ][thẻ][thẻ][thẻ]        | |
| |  CP   CP   CP   CP          | |
| | [thẻ][thẻ][thẻ][thẻ]  ...   | |
| +-----------------------------+ |
| [<]                             |
+---------------------------------+
```

- Thẻ hero: khung màu theo hạng, icon hệ ở góc trái trên, mũi tên xanh góc phải trên (có thể nâng cấp), dấu check xanh trên hero đã được chọn, CP bên dưới.
- Khi đổi đội, dòng "CP 2093 -> 2949" cho biết thay đổi sức mạnh (màu đỏ giảm, xanh tăng) **[thấy]** `squad-setup-camp-auto-assign-01.jpg`.
- **AUTO ASSIGN chọn theo CP (sức mạnh trên thẻ)**. Ảnh cho thấy CP hiển thị rõ trên mỗi thẻ, và PG khuyên tránh Auto Assign vì nó làm mất cân bằng vai trò. Điều đó khớp phàn nàn "auto-select chọn theo hạng", nhưng tôi chỉ có PG làm bằng chứng. Tiêu chí chính xác **chưa xác nhận**.
- Đổi đội chỉ ở làng và một số điểm chọn trước (TA). Nút đổi hero và số đội ở dưới trái màn field mở màn này.
- Cỡ đội: xem điểm 0. Mỗi hero có một ô đội, hero đầu là thủ lĩnh (vương miện).

### 2.7 Training Ground và Guardian Statue

- Training Ground: `training-ground-upgrade-tree-01.jpg`, `training-ground-troop-count-01.jpg`. Hai cột dọc, cuộn dọc. Cột trái: các nấc nâng cấp xanh dương (HP +12, ATK +3), bên trái là đường nối. Huy hiệu cấp (5, 9, 10) cắt ngang cột: mỗi nấc bị khóa tới cấp người chơi đó. Cột phải (đường xanh lá): nút đặc biệt trả bằng quặng đỏ (ví dụ "Number of troops: Max number of troops +1", 2 quặng đỏ). Chạm một nấc mở tooltip trắng có nút UNLOCK. Hai bộ đếm (quặng, quặng đỏ) ở trên phải.
- Guardian Statue: `guardian-statue-panel-01.jpg`. Tượng ở giữa, 3 ô trang bị bên trái, 3 ô bên phải (mỗi ô ghi giới hạn cấp), 3 ô tròn phụ bên dưới (khóa). Trên cùng: cấp tượng và số sức mạnh cộng thêm. Chạm trang bị để đổi (`equipment-detail-equip-01.jpg`: giới hạn cấp, điểm, chỉ số, nút EQUIP và Dismantle).

### 2.8 Dungeon: bảng vào, chiến đấu, kết quả

- Bảng vào: xem 1.5 và `dungeon-entry-panel-01.jpg`. Bố cục: tiêu đề, nhãn độ khó, bong bóng "Recommended" so với CP đội, ảnh tròn xem trước dungeon, icon phần thưởng, nút ENTER.
- HUD chiến đấu (`dungeon-combat-hud-kill-streak-01.jpg`, `dungeon-combat-streak-bonus-01.jpg`):

```
+---------------------------------+
| [tầng 1F]     (X) 43 KILL  [||] |
| [vàng 0]   Killing Spree Bonus  |
|                                 |
|        (hành lang, quái)        |
|         đội hero + quái         |
|                              [sách xanh]
|                              [sách lá ]
|            ( joystick )         |
|                              [AUTO]
+---------------------------------+
```

Không có thanh trên của làng trong lúc chạy dungeon.

- Kết quả: `result-victory-01.jpg` là toàn màn hình tối, huy hiệu "VICTORY!", khung "Rewards obtained" (trang bị, vàng, quặng đỏ), nút quảng cáo "150% bonus!", dòng "Touch to return to the village". `result-annihilated-01.jpg` là "ANNIHILATED" kèm ba gợi ý cải thiện đội (tuyển hero, Training Ground, lấy trang bị ở dungeon).

### 2.9 Shop, menu khác

- Shop: chỉ thấy icon "SHOP" kèm chấm đỏ ở cột trái. **Không có ảnh bên trong shop.**
- Quest: `quest-daily-panel-01.jpg`. Tab Daily/Weekly ở đáy, thanh điểm với 5 rương ở đầu, danh sách tác vụ (hàng: icon điểm, mô tả, thanh tiến độ, nút Obtain rewards).
- Túi, la bàn, thư, cài đặt, khiên: **chưa có ảnh bên trong**.
- Teleport: `teleport-list-01.jpg`. Danh sách vùng dạng thẻ ảnh, mỗi thẻ kèm sức mạnh yêu cầu, thẻ khóa có ổ khóa, nhãn đỏ "Current location".

### 2.10 Sơ đồ điều hướng

```
Màn tiêu đề (Touch to continue)
   |
   v
FIELD <----> LÀNG  (liền nhau, đi bộ; nút Return/Portal đưa về làng, vào lại để về chỗ cũ, theo TA)
  |  \          |__ Pub ---------- Obtained Hero
  |   \         |__ Training Ground
  |    \        |__ Guardian Statue -- chi tiết trang bị
  |     \       |__ Request Board / Quest
  |      \      |__ công trình sản xuất (nâng cấp)
  |       \     |__ Dungeon Portal -> bảng vào -> DUNGEON -> Victory/Annihilated -> về làng
  |        \____ Teleport (từ bệ) -> danh sách vùng
  |_ nút đội (dưới trái) -> Xếp đội
  |_ nút Camp -> trạng thái camp (nút Camera, Premium)
  |_ lối vào dungeon ngoài field -> DUNGEON
```

Mỗi panel đóng bằng nút back góc dưới trái.

## 3. Camera và trình bày thế giới

- **Góc nhìn**: nhìn từ trên xuống có nghiêng (isometric hai chiều), nền là ô thoi (hình thoi) xếp chéo, thấy rõ ở `hud-field-gathering-coins-01.jpg` (cỏ, ô sáng tối xen kẽ) và `dungeon-combat-hud-kill-streak-01.jpg` (gạch đá thoi). Mỗi ô rộng khoảng 1/3 chiều rộng màn hình ở camera mặc định **[ước lượng từ ảnh]**.
- **Tỉ lệ nhân vật**: hero và quái cao khoảng 4 đến 5% chiều cao màn hình (ước tính từ ảnh 946x2048: hero cao khoảng 90 px). Hero chibi, đầu to, nét viền dày. Boss lớn bằng cỡ 1/3 chiều rộng màn hình (`dungeon-boss-golem-01.jpg`).
- **Camera** bám đội, giữ cố định. Không thấy zoom.
- **Số quái cùng lúc**: ngoài field thường dưới 10; dungeon `dungeon-combat-hud-kill-streak-01.jpg` khoảng 20, `dungeon-boss-golem-01.jpg` hơn 40 xác và quái, và field cấp 99 có hơn 60 skeleton trong một màn hình (`field-level1-vs-level99-01.jpg`, `field-combat-skeleton-horde-01.jpg`).
- **Số hiển thị nổi**: số đỏ nhỏ cho sát thương (7, 45, 296), chữ trắng "EXP 7" từ mỗi quái chết, số nhỏ trắng/xanh khi nhặt tài nguyên ở field, thông báo "Gold +6" dạng thanh ngang giữa màn hình.
- **Vật rơi**: vàng là đồng xu vàng bật ra tại chỗ quái chết (rất nhiều ở dungeon), thịt (cục thịt hồng) rơi ở field, gỗ (khúc gỗ) khi chặt cây. Vật rơi có vẻ được hút/nhặt khi hero tới gần **[suy luận]**.
- **Hiệu ứng**: vết chém trắng, tia xanh, kiếm băng bay tỏa tròn, vòng đỏ báo đòn boss, hào quang vàng của kỹ năng ở cấp cao, vệt máu, hạt lấp lánh ở vùng có tài nguyên. Có lúc một hero bị phủ màu đỏ toàn thân (**[thấy]** `field-combat-skeleton-horde-01.jpg`, `dungeon-combat-hud-kill-streak-01.jpg`); ý nghĩa (trúng đòn hay trạng thái) **chưa xác nhận**.
- **Hoạt hình**: TK1 khen hoạt hình mượt ở đòn chém và cảnh chết. Hero và quái đánh bằng cận chiến hoặc tầm xa (cung, phép).
- **Bảng màu UI**: xanh dương đậm cho panel và thanh trên, nút xanh lá, vàng cho tiền, chữ trắng viền. Thế giới tươi, bão hòa, vùng bị khóa tím, dungeon xanh đen.

## 4. Nên copy, nên sửa

### Nên copy trung thành

| Cơ chế | Lý do và bằng chứng |
|---|---|
| Một tay: joystick, đội đi theo, hero **tự đánh khi đứng yên** | Cốt lõi của game (TK1, TK4); tạo nhịp di chuyển và dừng |
| Thu thập bằng cách đưa đội lại gần cây/đá/quái | `hud-field-gathering-wood-01.jpg`, TK2 |
| Bản đồ nối liền field và làng; vùng khóa bằng sương rồi mở bằng nhiệm vụ | TK1, TA |
| Ô nhiệm vụ chính luôn hiện trên đỉnh, chuỗi nhiệm vụ "xây X", "giết N Y" | Mọi ảnh HUD; TK1 |
| Pub: 3 thẻ, 100 vàng, mảnh hero, 1x/2x/3x, thanh bonus bảo hiểm hạng cao | `hero-recruit-pub-01.jpg` |
| Hero có hệ (3 loại) và hạng (4 màu), mốc kỹ năng mỗi 5 cấp | `hero-detail-*`, LW |
| Training Ground: cây nâng cấp dọc, nhánh đặc biệt cho slot đội | `training-ground-troop-count-01.jpg` |
| Ngưỡng CP để mở vùng và dungeon, hiện "đề nghị so với đội bạn" | `teleport-list-01.jpg`, `dungeon-entry-panel-01.jpg` |
| Kill streak bonus trong dungeon, đám quái cực đông | `dungeon-combat-streak-bonus-01.jpg` |
| Boss với vòng đỏ báo đòn | `dungeon-boss-golem-01.jpg`, LW |
| Camp farm nhàn rỗi có giới hạn thời gian | `camp-active-timer-01.jpg` |
| Quy ước panel: ruy-băng tiêu đề, back dưới trái, nút hành động xanh lá lớn | Mọi ảnh panel |

### Nên sửa (phàn nàn đã biết và bằng chứng tìm được)

| Phàn nàn | Bằng chứng tìm được | Hướng sửa gợi ý |
|---|---|---|
| Tiến độ chậm hẳn ở cuối | TK1: "vài giờ sau, người chơi gặp tường, phải cày hoặc trả tiền". TK3/LW: quặng đỏ ngẫu nhiên từ dungeon là điểm nghẽn cho slot đội và nâng cấp đặc biệt. Không có đường cong số liệu. | Đường cong ổn định; nguồn tài nguyên hiếm cần có cơ chế bảo hiểm |
| Kho và duy trì | Có Storage Facility khóa tới cấp 30 (`village-storage-facility-level-lock-01.jpg`), công trình sản xuất có trần chứa (75+25, 100/100). Không có số liệu về mức độ khó chịu. | Cho trần kho rộng, hoặc mở rộng kho sớm |
| Tự chọn theo hạng thay vì sức mạnh thật | Ảnh cho thấy CP có sẵn trên thẻ; PG khuyên tránh Auto Assign. Chưa xác nhận Auto Assign theo hạng. | Auto Assign tối ưu theo sức mạnh thực và cân vai trò (có healer) |
| Hero giới hạn thời gian | **Không tìm thấy bằng chứng.** Chỉ thấy đồng hồ đổi danh sách Pub mỗi 30 phút. | Không phải điều đã xác nhận; chỉ đảm bảo mọi hero tuyển lại được |
| Không offline, không multiplayer | Bài TapTap (https://www.taptap.io/post/4729449) ghi "Online". Không thấy tính năng nhiều người chơi. | Làm offline; progress ngoại tuyến có trần |
| Nhiều popup mua hàng | Thấy: biển quảng cáo gỡ ads ngay trong popup rương (`chest-reward-ad-offer-01.jpg`), nút quảng cáo ở màn thắng và rương, icon SHOP có chấm đỏ, quảng cáo cho camp và hồi sinh. | Hạn chế popup; quảng cáo chỉ tùy chọn |
| Chiến đấu thiếu chiều sâu | TK1: không có cách điều khiển ai đứng trước, chỉ "brute force". | Có thể thêm lựa chọn vị trí hoặc kỹ năng tay (tùy team) |
| Pathing nhỏ lỗi | TK1: đội không có điều khiển vị trí chính xác nên đôi lúc kẹt. | Đội đi theo mượt hơn |

## 5. Chưa xác nhận

Những điều dưới đây tôi không kiểm chứng được. Đừng coi là sự thật.

1. **Tôi không xem được video chơi game.** YouTube chặn trang xem. Ảnh đều lấy từ bài TapTap và LevelWinner (xem `image-index.md`). Chưa thử Reddit, Bilibili, QooApp, Naver. Một tìm kiếm tiếng Hàn không ra bài người chơi nào.
2. Màn hình bên trong **menu xây dựng** và bước xác nhận xây; có thời gian xây hay không; có nâng cấp công trình theo cấp nào ngoài Mining Camp.
3. **Cơ chế đặt công trình**: chỉ thấy chỗ xây có sẵn. Không biết có chỗ nào cho phép đặt tự do hay không.
4. Nội dung và tính năng **Storage Facility**, trần kho thật của từng tài nguyên, ý nghĩa thanh xanh dưới ô tài nguyên.
5. Chức năng chính xác của icon: kính lúp, túi, la bàn, khiên, thư, hai nút "sách" trong dungeon, icon sự kiện.
6. Cách nhặt vật rơi (tự hút hay chạm).
7. Số tầng dungeon, công thức tăng độ khó, số quái và HP quái, tỉ lệ rơi, bảng thưởng đầy đủ.
8. Cách thức Auto Assign tính chọn đội.
9. Công thức chi phí nâng cấp hero (chỉ có 2 điểm: 20 thịt ở Lv 4 và 100 thịt ở Lv 20), công thức mảnh cần (ảnh gợi ý 10 mảnh ở Lv 20, 5 mảnh ở Lv 4).
10. Số lượng hero, tỉ lệ gacha cho từng hạng, nội dung "Mileage Shop" (TA nhắc, không có ảnh).
11. **Cỡ đội hình tối đa**: LW nói 10, PG nói 4 đến 8, ảnh thấy đến 6/6. Chưa thống nhất.
12. Quy tắc "chỉ đánh khi đứng yên": chỉ có TK1 và TK4 nói, tôi không có ảnh hay video chứng minh. Chưa biết quy tắc này có áp dụng cả trong dungeon không, và hero có kỹ năng tự kích hoạt khi di chuyển hay không.
13. Cách xếp đội hình khi di chuyển (ai đi trước), hành vi tách và tụ lại của đội (chỉ có mô tả một câu ở TapTap, và TK1 nói không điều khiển được ai chịu đòn).
14. Nội dung bên trong **shop**, các gói mua, giá gem, hạn mức quảng cáo.
15. Hạn chế hoạt động offline: không biết game có tiến độ nhàn rỗi khi tắt máy không (TA nói camp dừng khi thoát).
16. Mọi thay đổi sau bản 2023 (PG có tier list cho bản 2.2.103). UI thấy trong ảnh có thể đã đổi.
17. Camp tan khi cả đội chết (LW, một nguồn) và camp tiếp tục sau khi cả đội chết (một bình luận trong LW, bị bác bỏ). Chưa kiểm chứng.
18. Danh sách tên hero và chi tiết kỹ năng, bỏ qua vì team làm hero nguyên bản; một số trang tier list trên web có thể nói về game khác cùng tên, nên tôi không dùng.

## 6. Khoảng trống ảnh

Mạnh: field/HUD, làng, Pub, chi tiết hero, xếp đội, Training Ground, Guardian Statue, bảng vào dungeon, chiến đấu dungeon, kết quả, Camp, Quest.

Yếu hoặc không có: menu xây dựng, shop, túi, thư, cài đặt, Request Board và Exchange khi mở, Storage Facility, danh sách hero dạng bộ sưu tập, các thử thách ngoài Golden Pig, màn hình đang bị đánh giữa dungeon ở độ phân giải cao (ảnh LevelWinner chỉ 400x867).
