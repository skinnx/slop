# Thay đổi số liệu cân bằng so với bản gốc của thiết kế (cột mốc 1)

Điều lệ mục 3.14 yêu cầu ghi mọi con số trong `game/assets/resources/data/` khác với `docs/design/data/`.

## Kết luận: không đổi con số nào

13 bảng của thiết kế được chép nguyên sang `game/assets/resources/data/`. Test `tools/tests/core/data.test.ts`
("has every design table, and each one equals the design original unless the change is recorded") so từng file với
bản gốc mỗi lần chạy `npm test`; nếu sau này có file lệch mà tài liệu này không nhắc tên file đó, test sẽ đỏ.

Lý do không chỉnh: `02-balance.md` mục 7 chỉ cho phép đổi số để bot đạt mục tiêu. Bot đạt mọi mốc ở cả 10 seed
(`docs/evidence/m1/sim/bot-report.md`), nên không có căn cứ để đổi.

## Bảng thêm mới, không phải thay đổi cân bằng

| File | Nội dung | Vì sao |
|---|---|---|
| `display.json` | Icon của nhiệm vụ theo loại, tên tiếng Việt của loại kỹ năng và tham số kỹ năng, icon của dòng chỉ số công trình | Trưởng nhóm yêu cầu đưa các bảng hiển thị từ view vào dữ liệu. Không có số liệu cân bằng. `docs/design/data` chưa có bản gốc; đề nghị thiết kế nhận file này |

## Quan sát về cân bằng (không sửa, để thiết kế quyết định)

Số đo lấy từ `docs/evidence/m1/sim/` (bot, 10 seed × 6 giờ; 3 seed × 10 giờ; `difficulty.md`).

1. **Bot đi nhanh hơn mô hình của thiết kế khoảng 1.4–1.7 lần ở nửa sau.** Vượt tầng 20 ở 2:04–2:21 (mô hình: 3:04–3:10; hạn chót 6:00). Vượt tầng 25 ở 3:42–4:00 (mô hình: 6:36–7:16). Ở các seed chạy 10 giờ, bot vượt tầng 30 và xong cả 41 nhiệm vụ trong khoảng 6:10–7:00, trong khi thiết kế dự kiến chặng 6 cần "thêm vài giờ" sau giờ thứ 10.
2. **Nguyên nhân chính là tốc độ farm ngoài đồng, không phải dungeon dễ.** Mô hình giả định tối đa 10 quái, 4 cây, 3 đá mỗi phút và chỉ 40% thời gian đánh quái. Theo luật thật (ổ 4–5 quái, mọc lại 20 s, các ổ cách nhau vài ô, về làng mất 1 s), bot hạ trung bình khoảng 27 quái mỗi phút tính trên cả 6 giờ (9 700 quái ngoài đồng). Thu nhập 6 giờ của seed 1: vàng từ quái ngoài đồng 21 500 (mô hình: khoảng 10 400 trong 10 giờ), thịt 18 900, gỗ từ cây 51 700, quặng từ đá 32 800.
3. **Thưởng chuỗi hạ gục cộng dồn qua các tầng.** Đồng hồ chuỗi dừng giữa hai tầng (đúng luật mục 13.4), nên chuỗi có thể kéo dài cả lượt; thưởng mỗi mốc lại tăng tuyến tính theo chuỗi. Dungeon cho khoảng 20 000 vàng trong 6 giờ (nhặt, qua tầng, chuỗi: 13 600; thưởng chặng: 6 650) với 16–17 lượt.
4. **San Hô Đỏ dư.** Cua Càng Thép ở Gò Đá Lam rơi 2 San Hô mỗi lần (hệ số lượng vùng ×2 áp cho mọi dòng rơi, mục 6.3) và mọc lại sau 120 s: 68 San Hô trong 6 giờ chỉ từ nguồn này, trong khi cả 5 ô đội cần 33.
5. **CP đề nghị của dungeon có ý nghĩa đúng như thiết kế muốn.** Đội có CP bằng CP đề nghị thắng 8/8 lượt ở mọi chặng, máu đội thấp nhất còn 57–75%. Ở 0.8 lần đề nghị: chặng 4 thắng 4/8, chặng 5 thắng 2/8. Ở 0.6–0.7 lần: chặng 4 và 5 thua hết. Không gặp triệu chứng "thua ở CP ≥ đề nghị" hay "thắng dễ ở 0.6 lần". Chặng 6 dễ hơn một chút so với các chặng trước (0.8 lần vẫn thắng 8/8, 0.7 lần thắng 6/8).

Nếu thiết kế muốn nhịp độ khớp bảng "Tiến độ mong muốn" (mục 4 của `02-balance.md`), các nút hợp lý là: thời gian mọc lại của quái (`monsterRespawnSec`), lượng rơi `field_gold` / `field_meat`, và công thức thưởng chuỗi. Đó là quyết định của thiết kế; tôi không đổi vì bot không trượt mục tiêu.
