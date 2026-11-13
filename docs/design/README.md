# Tài liệu thiết kế — Hải Đội Đảo Sương

Thư mục này là nguồn sự thật về thiết kế game (điều lệ, mục 2). Lập trình gameplay làm theo các tài liệu dưới đây; khi thấy chỗ mơ hồ, làm theo ký hiệu [QĐ] gần nhất và ghi vào báo cáo.

## Đọc theo thứ tự

| File | Nội dung |
|---|---|
| `01-game-design.md` | Chủ đề, tên gọi, danh sách toàn bộ tính năng (M1 hay để sau), **toàn bộ luật cột mốc 1** |
| `02-balance.md` | Dữ liệu ở đâu, bảng số liệu, tiến độ mong muốn, **mục tiêu bot**, các kiểm tra số học, nút chỉnh |
| `03-ux-spec.md` | Wireframe từng màn hình 720 × 1280, nút, chuyển màn, ảnh tham chiếu tương ứng |
| `04-placeholder-art.md` | File hình/âm cho từng thứ, hình vẽ bằng code, cách cử động khi không có khung hoạt hình |
| `05-open-questions.md` | Câu hỏi cho product owner, kèm mặc định |
| `data/*.json` | **Số liệu cân bằng**. Chép sang `game/assets/resources/data/` |
| `tools/` | `build_data.py` (sinh JSON), `model.py` + `check.py` (kiểm tra và mô hình tiến độ), `gen_tables.py` + `fill_balance.py` (sinh lại `02-balance.md`) |

Ký hiệu trong mọi file: **[TC]** theo tham chiếu (có ảnh/nguồn), **[QĐ]** quyết định của thiết kế khi tham chiếu chưa rõ, **[KB]** khác biệt có chủ đích so với game gốc.

## Bảng thuật ngữ

Cùng một thứ luôn dùng cùng một từ. Cột "mã" là id trong dữ liệu và code.

### Chung

| Từ dùng | Mã | Nghĩa |
|---|---|---|
| Ô | — | Đơn vị khoảng cách của lõi; 1 ô = một ô lưới xây |
| Thủ lĩnh | `leader` | Hero còn sống ở ô đội đầu tiên; joystick điều khiển nó |
| Đội | `squad` | Các hero đang ra trận |
| Ô đội | `squadSlots` | Số hero tối đa trong đội (3 → 8) |
| Đứng yên | `idle` | Joystick không giữ (hoặc trong vùng chết) ≥ 0.15 s |
| Lực chiến (CP) | `cp` | Sức mạnh; công thức ở `01` mục 10.2 |
| CP đề nghị | `recommendedCp` | CP gợi ý cho một vùng hoặc tầng |
| Nút tài nguyên | `node` | Cây hoặc đá ngoài đồng |
| Độ bền | `durability` | Số nhát trước khi nút cạn |
| Ổ quái | `camp` | Điểm sinh một nhóm quái ngoài đồng |
| Vật rơi | `pickup` | Vàng, thịt, San Hô Đỏ nằm trên đất |
| Bộ đệm | `buffer` | Sản lượng chờ thu trong công trình sản xuất |
| Thợ | `builderSlots` | Số việc xây/nâng chạy cùng lúc (2) |
| Bóng | `ghost` | Hình công trình đang đặt trong chế độ xây |
| Đột phá | `breakthrough` | Lên cấp từ 5, 10, 15, 20, 25 — cần mảnh |
| Hiệu ứng sở hữu | `owned effect` | Thưởng % cho mọi hero cùng hệ khi một hero đạt mốc cấp |
| Nấc | `node` (Sân Tập) | Một ô nâng cấp trong cây Sân Tập |
| Chặng | `stage` | 5 tầng liên tiếp của Hang Xoáy, kết thúc bằng boss |
| Tầng | `floor` | Một phòng trong dungeon, đánh số 1–30 |
| Lượt (dungeon) | `run` | Một lần vào hang đánh hết một chặng |
| Chuỗi hạ gục | `streak` | Số quái hạ liên tục, mỗi lần cách nhau ≤ 3 s |
| Báo đòn | `telegraph` | Vùng đỏ trước đòn mạnh của boss |
| Lượt (tuyển) | `draw` | Một lần trả 100 vàng ở Quán |
| Bộ thẻ | `cards` | 3 hero đang hiện ở Quán |

### Thế giới và tài nguyên

| Tên | Mã |
|---|---|
| Làng Bến Neo | `village` |
| Bãi Vỏ Sò / Rừng Dừa Rậm / Gò Đá Lam | `z1` / `z2` / `z3` |
| Hang Xoáy | `dungeon` |
| Vàng, Thịt, Gỗ, Quặng | `gold`, `meat`, `wood`, `ore` |
| San Hô Đỏ (hiếm, mở ô đội) | `coral` |
| Vé Quán | `tickets` |
| Mảnh | `fragments` |

### Hệ và độ hiếm

| Tên | Mã | Màu |
|---|---|---|
| Sức Mạnh | `STR` | đỏ |
| Nhanh Nhẹn | `AGI` | xanh lá |
| Trí Tuệ | `INT` | vàng |
| Thường / Hiếm / Sử Thi / Huyền Thoại | `N` / `R` / `E` / `L` | xám / xanh dương / tím / vàng cam |

### Công trình

| Tên | Mã |
|---|---|
| Nhà Kho | `storage` |
| Trại Gỗ | `lumber_camp` |
| Quán Mỏ Neo | `tavern` |
| Mỏ Quặng | `ore_mine` |
| Sân Tập | `training_yard` |
| Chợ Bến | `market` |
| Cổng Xoáy | `dungeon_gate` |

### Hero

Bàng `bang`, Đô Neo `do_neo`, Rùa Sắt `rua_sat`, Kình Vương `kinh_vuong`, Sẻ `se`, Mực `muc`, Én `en`, Diều `dieu`, Lan `lan`, Đăng `dang`, San `san`, Triều `trieu`. Kỹ năng: `skills.json`.

### Quái và boss

Ngoài đồng: Cua Cát `cua_cat`, Chuột Bến `chuot_ben`, Sứa Nhầy `sua_nhay`, Dơi Hang `doi_hang`, Nhện Rạn `nhen_ran`, Hồn Ma Biển `ma_bien`, tinh anh Cua Càng Thép `cua_thep`.
Dungeon: `d_chuot`, `d_doi`, `d_nhen`, `d_nhay`, `d_ma`.
Boss chặng 1–6: Rương Nhai `b_ruong`, Cua Càng Thép Chúa `b_cua`, Mắt Đá `b_mat`, Rắn Biển Rạn `b_ran`, Thuyền Trưởng Ma `b_thuyentruong`, Vua Nhện Rạn `b_vuanhen`.
Kỹ năng boss: Đập Đất `slam`, Húc Lao `charge`, Gọi Bầy `summon`.

## Các quyết định chính khi tham chiếu chưa xác nhận [QĐ]

1. Đánh khi đứng yên áp dụng cả ngoài đồng và trong dungeon; kỹ năng hồi máu vẫn dùng khi đi.
2. Thu thập không phụ thuộc ATK; hero có `gatherPower` 2 thu gấp đôi.
3. Vật rơi tự hút trong 2.5 ô, tự về thủ lĩnh sau 6 s; không bao giờ mất.
4. Cấp hero tốn thịt mỗi cấp và mảnh ở các cấp đột phá 5/10/15/20/25.
5. CP = 4 × ATK × (1 / nhịp) × (1 + bonus kỹ năng) + HP (hệ số 4 và 1 suy từ hai điểm thấy ở game gốc).
6. Quán: 1 lượt chọn đều 1 trong 3 thẻ; trùng hero = 5 mảnh; BONUS 10 lượt làm mới bộ thẻ với tỉ lệ cao; đổi Vé.
7. Hang Xoáy: 6 chặng × 5 tầng, boss mỗi tầng 5; thua vẫn giữ đồ đã nhặt; vào miễn phí.
8. Vòng đỏ của bộ đếm chuỗi là đồng hồ 3 s; thưởng mỗi 20 lần hạ.
9. Nút AUTO trong dungeon = tự đi tới cửa ra khi tầng sạch.
10. Kính lúp trên thẻ nhiệm vụ = chỉ đường.
11. Công trình không chặn đường đi; đang nâng vẫn hoạt động ở cấp cũ; 2 thợ; hủy hoàn 100%.
12. Không có khắc chế hệ; hệ chỉ ảnh hưởng qua hiệu ứng sở hữu.
13. Ô đội tối đa 8; mở bằng San Hô Đỏ có nguồn cố định và bảo hiểm.
14. Trạng thái nút, ổ quái không lưu; tải lại thì đầy đủ.

## Mâu thuẫn đã gặp

- **Điều lệ (M1 mục 4) ghi "lên cấp bằng thịt"; tham chiếu cho thấy cấp hero cần cả thịt và mảnh** (thanh "20/10" cạnh cấp, vòng lặp ở tham chiếu mục 1.1). Tôi làm theo điều lệ là thịt cho mọi cấp, và **thêm** mảnh chỉ ở 5 cấp đột phá để giữ vai trò của mảnh. Nếu trưởng nhóm muốn chỉ thịt, đặt mọi giá mảnh trong `hero-levels.json` về 0; không phải đổi code.
- **Tham chiếu: Nhà Kho khóa tới cấp 30; điều lệ: kho không được chật.** Theo điều lệ: Nhà Kho có sẵn từ đầu.
- **Điều lệ (bằng chứng M1, mục 5) yêu cầu draw call "trong mức tài liệu kỹ thuật đề ra", nhưng `docs/tech/cocos-3.8-guide.md` không ghi con số giới hạn.** Không thuộc phần thiết kế; báo để trưởng kỹ thuật đặt số.
