# Báo cáo QA cột mốc 1

# Kiểm lại lần 2

Commit đã kiểm: `29cdedf28d60d63e12f003f035f2069e8ef5faef` (nhánh `ccr-b3a4a578-w77en0`), clone sạch mới, ngày 2026-11-14. Báo cáo lần 1 (commit `ef54cb0`) giữ nguyên bên dưới, từ mục "Lần 1".
Bằng chứng lần 2: `docs/qa/m1/round2/` (`scenarios/`, `shots/`, `logs/`).

## L2.1 Kết luận lần 2

**SẴN SÀNG (ready).** Không còn lỗi chặn hay lỗi lớn. Còn vài lỗi nhỏ và hai câu hỏi cho thiết kế (mục L2.5). Việc mở trong editor vẫn **chờ owner**.

Các điều quyết định:

1. Dựng lại từ đầu vẫn chạy bằng lệnh trong tài liệu: setup 81 s, type-check sạch, **230** test xanh (lần 1: 225), bot đạt ở 11 seed (kết quả giống lần 1), 9 kịch bản của lập trình viên đều thoát mã 0 và không có lỗi console, 4 kịch bản lần 1 của tôi (qa-03, 04, 06, 07) vẫn đạt.
2. **Bằng chứng còn thiếu lần 1 đã có:** một người chơi mới, bằng chạm trên engine thật, từ save mới, theo thẻ nhiệm vụ, **đã hạ boss tầng 5 (Rương Nhai)** ở hai trong ba lần chạy (lần thứ ba không đạt vì lỗi kịch bản của tôi, xem L2.3). Thẻ nhiệm vụ chuyển sang q22 sau khi nhận thưởng q21.
3. Cả ba lỗi lớn lần 1 đã sửa hoặc đã hạ mức: QA-02 và QA-03 sửa xong; QA-05 sửa xong; QA-01 sửa phần lớn (còn chen chúc nhẹ khi có 6–7 công trình, hạ xuống nhỏ).
4. Ba điều tôi ghi là "được giải thích, chưa sửa" đều kiểm lại và đúng với lời giải thích (L2.4).
5. Draw call tôi đo lại: 60 quái, 8 hero, HUD: tổng 6, thế giới 1 (ngân sách 30 và 10).

Số lỗi mới: 0 lớn, 1 nhỏ (N-1). Thêm 2 câu hỏi (N-2, N-3).

## L2.2 Tái lập (commit 29cdedf)

| Việc | Kết quả |
|---|---|
| `npm run setup` | Thành công, 81.4 s |
| `npm run typecheck` | `game/: OK`, `tools/: OK` |
| `npm test` | 16 file, 230 test xanh |
| `npm run sim` (5 seed mặc định) | ĐẠT 5/5, tầng 20 lúc 2:11–2:18, đoạn dài nhất không tiến bộ ≤ 9:30 |
| `npm run sim -- --seeds 101,202,31337,7,424242,9999` | ĐẠT 6/6, tầng 20 lúc 2:05–2:16 |
| `npm run sim:newplayer` (mới) | Chạy được; tệp ghi 300/300 seed tới q21, q14 đủ thịt ở 300/300. Tôi chạy lệnh mặc định, không đổi tham số |
| 9 kịch bản `harness/scenarios/*.mjs` (kể cả `m1-extra`) | Cả 9 thoát mã 0, 0 lỗi console. `m1-crowd`: tổng 6, thế giới 1 |
| `npm run atlas:view` | Dựng `world.png` và `ui.png`, không đổi file nào (kết quả tất định) |
| Kịch bản lần 1 của tôi: qa-03, 04, 06, 07 | Đạt như cũ (xem L2.6 về một nút qa-03 tôi gọi sai tên từ lần 1) |
| Viewport 540×960, 412×915, 600×800, 360×640 | Đạt, ảnh trong `round2/shots/view-*` |

## L2.3 Người chơi mới tới boss tầng 5 (kịch bản `r2-01-newplayer-to-boss5.mjs`)

Cách làm: save mới, joystick bằng kéo tay chạm, mọi nút bằng chạm theo tên. Chỉ phần chờ (chặt cây, đánh khi đứng yên, công trình) tua bằng `__game.fastForward`; nay nó đẩy cả đồng hồ lõi nên công trình chạy theo. Vào dungeon bằng chạm nút VÀO và bật AUTO bằng chạm. Nhật ký từng nhiệm vụ: `round2/logs/newplayer-run-notes.txt`. Ảnh: `round2/shots/newplayer-*`.

Ba lần chạy:

| Lần | Kết quả | Ghi chú |
|---|---|---|
| A (`summary-np-run1.json`) | Hạ boss tầng 5, tới q22 (310 s thật, 2479 s game) | Thua q20 một lần, tăng sức rồi thắng q21 |
| B (`summary-np-run2.json`) | Kẹt ở q21 | **Lỗi của kịch bản tôi**, không phải game: nút AUTO giữ trạng thái giữa các lượt vào hang, kịch bản bấm AUTO nên tắt nó, đội đứng yên ở tầng 1 và không tới cửa. Đã sửa kịch bản: chỉ bấm khi AUTO đang tắt |
| C, bản chính (`summary-np.json`) | Hạ boss tầng 5, tới q22 (324 s thật, 1737 s game), cấp người chơi 7, CP 5284 | Thua q20 một lần và q21 một lần, rồi thắng |

Đường đi của lần C, từng nhiệm vụ (bằng chạm): q01 chặt 10 gỗ, q02 hạ 3 cua, q03 hero lên cấp 2, q04 xây Trại Gỗ, q05 đập quặng, q06 xây Quán, q07 tuyển, q08 TỰ XẾP, q09 chuột, q10 Mỏ Quặng, q11 thu gỗ, q12 nâng Nhà Kho, q13 tuyển thêm 2 lượt, q14 hero lên cấp 5, q15 Sân Tập, q16 mở nấc, q17 Chợ Bến, q18 hạ 20 quái, q19 Cổng Xoáy, q20 vượt tầng 1, q21 boss tầng 5.

Điều tôi học khi chạy, cần cho người đọc:

- Các thẻ xây Sân Tập, Chợ, Cổng bị khóa theo cấp người chơi (4, 5, 6). Thẻ báo lý do; muốn mở phải đánh quái ở Bãi Vỏ Sò để lên cấp. Tôi thêm bước này vào kịch bản, làm đúng như sim card player. Khay công trình phải cuộn ngang để thấy thẻ xa (đã làm bằng kéo tay).
- Lần 1 tôi dừng ở q15 vì kịch bản không cuộn khay và không lên cấp. Đó là lỗi kịch bản, không phải lỗi game.
- **Thua dungeon là bình thường ở CP "Vừa".** CP đội 4119–4573, đề nghị 4550: ở cả ba lần chạy, đội thua ít nhất một lần ở q20 và/hoặc q21. Màn thua đưa ba gợi ý (tuyển hero, Sân Tập, nâng cấp bằng thịt). Làm theo: tuyển bằng vàng, đổi Vé lấy mảnh, đưa hero mạnh hơn vào đội, rồi thắng. Khớp với `newplayer.md` (trung vị 1 lần thua).
- Mọi hero trong đội dừng ở cấp 5 và hiện "Thiếu 4 mảnh" khi muốn lên 6. Thịt dồn lại (400+) không tiêu được cho tới khi có mảnh. Xem câu hỏi N-3.
- q22 ("Mở ô đội thứ 4 ở Sân Tập"): nút mở ô báo "Cần Sân Tập cấp 2". Tức là phải nâng Sân Tập trước. Tôi dừng ở đây trong lần chạy từ save mới (xem mục L2.5 về ô đội).

## L2.4 Từng phát hiện lần 1

| Id | Lần 1 | Lần 2 | Ảnh của tôi (`round2/shots/`) |
|---|---|---|---|
| QA-01 | Lớn: công trình quá to, đè nhau | **Sửa phần lớn.** Công trình nhỏ hơn rõ rệt, nhãn tên dưới chân, Cổng Xoáy/Chợ/Sân Tập đọc được. Còn chen sát và vài hình che nhau khi có 6–7 công trình, nên hạ xuống nhỏ | `newplayer-q19-built.png`, `view-540x960-01-village.png` |
| QA-02 | Lớn: màn ngắn mất nút VÀO | **Đã sửa.** 600×800 giờ hiển thị cả khung 720×1280, hai dải bên; nút VÀO, TỰ XẾP, hàng thẻ đều thấy | `view-600x800-07-gate.png`, `…-04-squad.png`, `…-03-hero-detail.png` |
| QA-03 | Lớn: màn thắng/thua chữ đè | **Đã sửa**, còn một chi tiết nhỏ (N-1) | `result-victory.png`, `result-defeat.png`, `newplayer-q21-result.png` |
| QA-04 | Nhỏ: toast đè panel và thanh máu boss | **Đã sửa.** Trên panel toast nằm ở dải thanh trên, trong dungeon không che tên và máu boss | `newplayer-q20-gate.png`, `boss-floor5.png` |
| QA-05 | Nhỏ (lead nâng lên lớn): dungeon khó đọc, phòng nhỏ | **Đã sửa.** Phòng phủ kín màn, tường trước không che quân, "Tầng N" ở dưới thanh KILL. Đám đông 60 quái vẫn dày (đúng tinh thần ảnh tham chiếu) | `dungeon-60-monsters.png`, `newplayer-q21-floor5.png` |
| QA-06 | Nhỏ: nhiều lỗi bố cục nhỏ | **Sửa một phần.** Nhãn "Nhanh Nhẹn" đủ chữ; hàng thẻ xếp đội không bị cắt; bong bóng "20/320" không còn đè bánh răng. Còn: hộp "Đề nghị / Đội bạn" của Cổng Xoáy vẫn chồng lên chân dung NPC ở mép trái ruy-băng (chữ vẫn đọc được) | `view-540x960-07-gate.png`, `view-412x915-07-gate.png` |
| QA-07 | Nhỏ: hình hero đè tab ở màn cao | **Rút lại / không phải lỗi.** Xem lại: chi tiết hero là panel chồng lên danh sách đã làm tối, nên thấy tab mờ phía sau. Tôi đã mô tả sai lần 1 | `view-412x915-03-hero-detail.png` |
| QA-08 | Nhỏ: không phản hồi tầm thu thập | **Đã sửa và lời giải thích đúng.** Cây trong tầm có vòng trắng. Tôi đo: đứng cách tâm cây 3.03 ô không chặt, 2.48 ô thì chặt (đúng "3 ô") | `reach-2.6-cells-gather-with-ring.png`, `reach-3.4-cells-no-gather.png` |
| QA-09 | Nhỏ: README thiếu atlas giao diện | **Đã sửa.** `tools/README.md` nêu `npm run atlas:view`; tôi chạy, không đổi file nào | (log) |
| QA-10 | Nhỏ: lỗi nạp lõi dùng dữ liệu giả âm thầm | **Đã sửa.** Chặn `tuning.json` rồi tải lại: màn lỗi "Không tải được dữ liệu game" kèm dòng lỗi; `?standin=1` mới ra dữ liệu giả | `error-screen.png` |

Ba điều "được giải thích":

- **q14 (lên cấp 5):** đúng. Trong cả ba lần chạy, q14 xong bằng vài lần bấm NÂNG CẤP (thịt 72 → 57 ở lần C, hero cấp 2 → 5, vài giây); mảnh chỉ cần từ 5 → 6. Lần 1 tôi chờ 200 thịt là do kịch bản của tôi. Lỗi "không thấy nút levelUp" lần 1 tôi không tái hiện được lần này; nhiều khả năng do cách điều hướng panel trong kịch bản cũ. Không tìm thấy lỗi game.
- **"Thu gỗ +140":** hợp lý. Lần 2 tôi thấy đúng thông báo này trong làng ngay sau khi đội hồi sinh cạnh Trại Gỗ (`untested-13-after-wipe.png`), tức là thu khi đi gần công trình. Trong các ảnh dungeon lần 2 không còn toast này. Tôi không có test riêng chứng minh "không thu trong lúc chạy dungeon"; test của lập trình viên nằm trong 230 test xanh, tôi chưa đọc.
- **QA-08 tầm thu thập:** đúng, xem hàng QA-08.

## L2.5 Các mục lần 1 ghi "chưa kiểm"

Kịch bản `r2-02-untested.mjs` (từ save giữa game, bằng chạm):

| Mục | Kết quả | Ảnh |
|---|---|---|
| Xây Sân Tập, Chợ, Cổng bằng chạm từ save mới, cuộn khay | **Đạt** (lần C). Cần lên cấp người chơi theo thẻ | `newplayer-q17-built.png`, `…q19-built.png` |
| Di chuyển công trình | **Đạt**: Quán 27,31 → 29,31 bằng kéo tay; kéo lên Nhà Kho báo "Chồng lên Nhà Kho"; hủy trả về chỗ cũ | `untested-02-…`, `untested-03-…` |
| Hủy việc xây | **Đạt**: đặt Chợ rồi hủy, gỗ 940 → 860 → 940 (hoàn 100% đúng spec) | `untested-07-cancel-confirm.png` |
| Cả đội gục ngoài đồng, hồi sinh | **Đạt**: đội 1 hero yếu ở Rừng Dừa Rậm gục, hồi sinh giữa làng (30,30), không màn hình lạ | `untested-13-after-wipe.png`, `untested-14-revived.png` |
| Mở ô đội bằng San Hô Đỏ | **Đạt ở ô 5** (Sân Tập cấp 3): ô 4 → 5, San Hô 12 → 8. **Ô 4 từ save mới chưa làm xong:** game báo "Cần Sân Tập cấp 2"; tôi chưa nâng Sân Tập rồi mở ô trong lần chạy từ save mới | `untested-09-slot5-tooltip.png`, `newplayer-q22-slot4-tooltip.png` |

Chưa kiểm được: chạy q22 trở đi từ save mới (tới q41), quái tinh anh, ô đội 6–8.

## L2.6 Có gì mới bị hỏng bởi các sửa lỗi?

Không thấy gì hỏng. 9 kịch bản của lập trình viên và qa-03/04/06/07 của tôi đều đạt. Lưu/tải, ngoại tuyến (3 giờ → 390 gỗ, 8 giờ → 1040, 100 giờ cắt ở 8 giờ), save hỏng, đặt đè, ra ngoài lưới, thiếu gỗ: kết quả không đổi. Ghi chú: qa-03 vẫn in hai dòng FAIL vì tôi gọi sai tên nút xác nhận ("ok") ở bước rời hang; việc rời hang đạt ở qa-07.

Phát hiện mới:

- **N-1 (nhỏ)** Màn thắng: hàng phần thưởng có một ô thứ ba/thứ tư thu nhỏ còn bằng một chấm cam khoảng 20 px, cạnh các ô vàng, san hô, vé. Tái hiện: `r2/newplayer-q21-result.png`, `result-victory.png` (kịch bản qa-06).
- **N-2 (câu hỏi cho thiết kế)** Cổng Xoáy hiện "Vừa" ở CP 4119 so với 4550 đề nghị, nhưng người chơi mới thua gần như mỗi lần thử đầu (3/3 lần chạy). Có muốn nhãn "Vừa" khó hơn ("Khó" khi CP thấp hơn đề nghị)? Nhãn hiện đã đổi thành "Dễ" khi CP ≥ đề nghị (thấy trong `qa-03`: "Dễ" ở 13900 so với 4550).
- **N-3 (câu hỏi cho thiết kế)** Hero cấp 5 cần mảnh để lên 6; thịt chỉ dùng để lên cấp nên thịt dư (400+) không tiêu được cho tới khi có mảnh (từ tuyển trùng hoặc Đổi Vé). Thẻ nhiệm vụ không nói điều này. Màn thua có gợi ý "Nâng cấp hero bằng thịt" nhưng khi mọi hero ở cấp 5 gợi ý đó không làm được gì.

## L2.7 Bảng tiêu chí điều lệ mục 7 (cập nhật)

### Phải chơi được

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Ngoài đồng | **Đạt** | Chạy lần C và `r2-03`; thu gỗ, quặng, thịt, vàng; mọc lại (suy ra: gỗ tiếp tục tăng ở cùng cụm cây sau khi cây đầu cạn) |
| 2 | Làng | **Đạt** | Đặt, đè, ngoài lưới, thiếu gỗ, di chuyển, nâng, hủy (hoàn 100%), cả 6 công trình dựng bằng chạm từ save mới. Lỗi nhỏ QA-01 còn lại |
| 3 | Tuyển hero | **Đạt** | Tuyển nhiều lượt, thẻ, làm mới, Đổi Vé |
| 4 | Luyện hero | **Đạt** | Lên cấp bằng thịt tới 5, TỰ XẾP tăng CP, Sân Tập mở nấc, mở ô đội ở save giữa game (ô 5). Ô 4 từ save mới: chưa làm |
| 5 | Dungeon | **Đạt** | 60 quái, chuỗi, boss báo đòn, so CP, thắng, thua, rời hang |
| 6 | Dẫn dắt | **Đạt** cho q01–q21 | Chạy tới q22 từ save mới bằng chạm. q22–q41 chưa kiểm |
| 7 | Lưu/tải, ngoại tuyến | **Đạt** | qa-04 chạy lại |
| 8 | Giao diện khớp tham chiếu | **Đạt, còn lỗi nhỏ** | Hai viewport ngắn và cao đều dùng được; QA-01, QA-06 còn dấu vết |

### Phải có bằng chứng

| # | Tiêu chí | Kết quả |
|---|---|---|
| 1 | `tsc` | **Đạt** |
| 2 | Test lõi | **Đạt** (230) |
| 3 | Bot | **Đạt** (11 seed) + `sim:newplayer` |
| 4 | Kịch bản chạm trên engine thật | **Đạt**, và người chơi mới tới boss tầng 5 (mục L2.3) |
| 5 | Draw call | **Đạt**: 6 và 1 |
| 6 | QA độc lập cài lại | **Đạt**, lần 2 |
| 7 | Việc owner kiểm trong editor | **Chờ owner** |

## L2.8 Chưa kiểm được ở lần 2

- Editor Cocos Creator 3.8.8, bản build Android, thiết bị thật, âm thanh và font hệ thống: chờ owner. FPS: không đo.
- Nhiệm vụ q22 trở đi từ save mới; ô đội 4 từ save mới (cần nâng Sân Tập cấp 2 trước); quái tinh anh; ô đội 6–8.
- Test "không thu sản lượng trong lúc chạy dungeon": tôi không đọc test đó.
- Kịch bản người chơi mới của tôi là một chiến lược cụ thể. Nó thắng ở hai trong ba lần, lần còn lại kẹt do lỗi kịch bản của chính tôi. Không phải bằng chứng rằng mọi người chơi đều qua được; `sim:newplayer` (300 seed) mới nói được điều đó, và tôi chỉ chạy lại nó, không đọc mã.

---

# Lần 1 (commit ef54cb0)

Người kiểm: QA độc lập. Commit đã kiểm: `ef54cb0159a479aee9d4635c400a1fa72f22de77` (nhánh `ccr-b3a4a578-w77en0`), clone sạch trong thư mục tạm, ngày 2026-11-13.

## 1. Kết luận

**SẴN SÀNG, NHƯNG CÓ SỬA LỖI BẮT BUỘC (ready with listed fixes).** Không có lỗi chặn (blocker) trên điện thoại màn dọc 9:16 và dài hơn. Có 3 lỗi lớn (major) cần sửa trước khi chủ sản phẩm duyệt.

Các điều quyết định kết luận:

1. Dựng lại từ đầu chạy được bằng lệnh có trong tài liệu: setup 78 s, type-check sạch, 225 test xanh, bot đạt mục tiêu ở 11 seed (5 mặc định, 6 của tôi).
2. Vòng lặp chơi được bằng chạm trên engine thật. Từ save mới tôi theo thẻ nhiệm vụ qua 13 nhiệm vụ (q01–q13): chặt cây, đánh cua, lên cấp hero, xây Trại Gỗ, Quán, Mỏ, tuyển hero, tự xếp đội, thu gỗ, nâng Nhà Kho. Từ save giữa game tôi vào dungeon, đánh boss, thắng, thua, rời hang. Không có lỗi console, không có mất dữ liệu.
3. Lưu/tải và ngoại tuyến đúng: tải lại giữ công trình, tài nguyên, đội, việc đang xây. Ngoại tuyến 3 giờ ra 390 gỗ (đúng 130/giờ), 100 giờ bị cắt ở 8 giờ. Save hỏng không làm sập game.
4. Draw call với 60 quái, 8 hero, HUD: tổng 6, lớp thế giới 1. Ngân sách là 30 và 10. Đạt.
5. Giao diện chưa khớp tham chiếu ở 3 chỗ lớn: công trình trong làng quá to và đè lên nhau (QA-01); trên màn hình ngắn (tỉ lệ 3:4) nút VÀO của Cổng Xoáy ra ngoài màn hình (QA-02); màn thắng và màn thua có chữ đè nhau (QA-03).
6. Việc mở project trong Cocos Creator editor chưa kiểm được trên Linux: **chờ owner**.

Số lỗi: 0 blocker, 3 major, 7 minor. Thêm 4 câu hỏi cho thiết kế hoặc chủ sản phẩm.

## 2. Tôi đã kiểm gì và bằng cách nào

Mọi lệnh chạy trong clone sạch `…/scratchpad/qa/repo`. Nhật ký nằm ở `docs/qa/m1/logs/`.

| Việc | Lệnh | Kết quả |
|---|---|---|
| Cài đặt | `cd tools && npm run setup` | Thành công, 77.9 s (chạy sạch). Không có lệnh nào ngoài tài liệu |
| Type-check | `npm run typecheck` | `game/: OK`, `tools/: OK`, 4.4 s |
| Test lõi | `npm test` | 16 file, 225 test xanh, 4.1 s |
| Bot, seed mặc định | `npm run sim -- --out …` | ĐẠT 5/5 seed. Tầng 20 lúc 2:11–2:18. Đoạn dài nhất không tiến bộ 4:55–9:30. 18 s |
| Bot, seed của tôi | `npm run sim -- --seeds 101,202,31337,7,424242,9999 --hours 6` | ĐẠT 6/6. Tầng 20 lúc 2:05–2:16. Đoạn dài nhất 5:00–6:27 |
| Kịch bản của lập trình viên | `npm run harness -- harness/scenarios/<x>.mjs` cho example, m1-field, m1-village, m1-tavern, m1-heroes, m1-dungeon, m1-crowd, m1-quest | Cả 8 thoát mã 0, không có `consoleErrors`. Thời gian 5–30 s mỗi kịch bản |
| Kịch bản của tôi | 8 file trong `docs/qa/m1/scenarios/` | Xem mục 3 |
| Viewport | 540×960, 412×915 (cao, H=1599), 600×800 (ngắn, H=960) | Ảnh trong `docs/qa/m1/shots/` |
| Kiểm mã | đọc và grep trong clone | Xem mục 6 |

Cách chạy kịch bản của tôi: sao chép `docs/qa/m1/scenarios/` vào cùng vị trí trong repo (các file nhập thư viện của harness theo đường dẫn tương đối), rồi `cd tools && npm run harness -- ../docs/qa/m1/scenarios/qa-0X-….mjs --out <thư mục> [--viewport WxH]`.

### 3. Kịch bản của tôi

| File | Nội dung | Kết quả |
|---|---|---|
| `qa-01-newplayer.mjs` | Save mới, joystick bằng chạm, theo thẻ q01–q09, xây, tuyển, tự xếp | Đạt. Có thể chạy tới q08 |
| `qa-02-questchain.mjs` | Tự theo thẻ nhiệm vụ đến q22 | Tới q14 (13 nhiệm vụ nhận xong). Sau đó kịch bản của tôi kẹt ở q14 (xem mục 8) |
| `qa-03-dungeon.mjs` | Cổng Xoáy, vào hang, đo draw call với 60 quái | Đạt. 60 quái, 6 draw call |
| `qa-04-edges.mjs` | Đặt đè, ra ngoài lưới, thiếu gỗ, hai ngón, lưu/tải, ngoại tuyến 3/8/100 giờ, save hỏng | Đạt (xem kết quả bên dưới) |
| `qa-05-screens.mjs` | Các màn chính ở ba viewport | Ảnh cho QA-01, 02, 06, 07 |
| `qa-06-boss-result.mjs` | Boss tầng 5, báo đòn, thắng, thua | Đạt. Ra QA-03 |
| `qa-07-leave.mjs` | Tạm dừng, rời hang, chạm ngoài panel | Đạt: giữ vàng đã nhặt (2000 → 2017) |

Kết quả `qa-04` (các thao tác người chơi hay làm hỏng):

- Kéo bóng công trình đè lên Nhà Kho: bóng đỏ, lý do "Chồng lên Nhà Kho", bấm ✓ không xây gì. Đạt.
- Kéo ra ngoài lưới: "Ra ngoài làng", không đặt được. Đạt.
- Thiếu gỗ (50 < 80): không xây được. Đạt.
- Giữ joystick bằng ngón 1, chạm nút Hero bằng ngón 2: panel mở, joystick tắt đúng theo spec mục 2.4. Đạt.
- Nâng cấp đang chạy rồi tải lại: công trình, tài nguyên, đội, quest giữ nguyên, việc nâng vẫn còn. Đạt.
- Tự lưu mỗi 15 s (`tuning.save.autosaveSec`): lưu cũ nhất 12 s. Đạt.
- Ngoại tuyến: 3 giờ → 390 gỗ chờ thu; 8 giờ → 1040; 100 giờ → vẫn tính 8 giờ ("tối đa 8 giờ"). Đạt.
- Save JSON hỏng: vào game mới, không sập. Đạt.

Hạn chế của công cụ, phải biết khi đọc kết quả: `__game.fastForward` chỉ chạy lõi theo bước, còn công trình và sản xuất tính theo đồng hồ thật (`Date.now`). Vì vậy khi tôi tua nhanh, công trình không chạy nhanh theo. Tôi đã chờ bằng thời gian thật khi cần. Ở vài chỗ tôi dùng `send(...)` của harness thay cho chạm (vào dungeon trong qa-06, bật AUTO). Các chỗ đó ghi rõ trong file.

## 4. Tiêu chí điều lệ mục 7

### Phải chơi được

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Ngoài đồng: joystick, thu gỗ/quặng/thịt/vàng, mọc lại | **Đạt** (mọc lại: suy ra) | qa-01/02: gỗ 10, quặng 10, thịt và vàng từ cua. Cây vẫn chặt được lần hai sau 30 s trong qa-02 (suy ra từ gỗ tăng 12 → 280). Joystick bằng chạm. Lưu ý QA-08 |
| 2 | Làng: đặt tự do, chồng lấn, chi phí, thời gian, di chuyển, nâng cấp; đủ 6 công trình | **Đạt về chức năng; giao diện chưa đạt** | Xây Trại Gỗ, Quán, Mỏ bằng chạm. Đè, ngoài lưới, thiếu gỗ bị chặn (qa-04). Nâng Nhà Kho q12. Di chuyển và hủy xây: kịch bản m1-village của lập trình viên chạy đạt, tôi không tự lặp lại. Sân Tập, Chợ, Cổng: có trong save fixture, dựng mới bằng chạm chưa xong trong run từ save mới (mục 8). Xem QA-01 |
| 3 | Tuyển hero: 3 thẻ, trả vàng, làm mới, độ hiếm, thuộc tính | **Đạt** | Quán 3 thẻ, 100 vàng, đếm ngược 29:59, BONUS 0/10, màn nhận hero. `np-18-…png` |
| 4 | Luyện hero: thịt, kỹ năng ở mốc, ô đội, CP, TỰ XẾP | **Đạt (một phần chưa lặp lại)** | Lên cấp 2 bằng thịt, TỰ XẾP làm CP 1379 → 2698, đội 1 → 2. Sân Tập và ô đội: chỉ xem ảnh, chạy kịch bản m1-heroes của lập trình viên (đạt) |
| 5 | Dungeon: nhiều tầng, 40–60 quái, chuỗi, boss báo đòn, so CP, thắng/thua | **Đạt** | 60 quái, bộ đếm KILL, boss "Rương Nhai", `telegraphCount > 0`, so CP "Đề nghị 4550 / Đội bạn 7913", cảnh báo "Đội còn yếu", màn thắng, màn thua, rời hang. Lỗi hiển thị: QA-03, QA-05 |
| 6 | Dẫn dắt bằng thẻ nhiệm vụ | **Đạt cho q01–q13** | Mỗi thẻ làm theo là hoàn thành và nhận thưởng bằng chạm vào thẻ. Chưa đi hết 41 thẻ (mục 8) |
| 7 | Lưu/tải, ngoại tuyến có trần | **Đạt** | Mục 3 |
| 8 | Giao diện khớp tham chiếu, dùng asset `art-source/` | **Chưa đạt** | Bố cục vùng chính khớp, nhưng có 3 major hiển thị. Asset đều từ `art-source/` |

### Phải có bằng chứng

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | `tsc` không lỗi | **Đạt** | `logs/typecheck.log` |
| 2 | Test lõi xanh | **Đạt** | `logs/test.log`: 225/225 |
| 3 | Bot tới mục tiêu, bảng tiến độ | **Đạt** | `logs/bot-report-*.md`. Lưu ý câu hỏi Q1 |
| 4 | Kịch bản chơi thử trên engine thật bằng chạm, ảnh ở `docs/evidence/m1/` | **Đạt** | Chạy lại 8 kịch bản đều đạt. Ảnh tôi tạo lại giống ảnh của họ ở cấp độ bố cục |
| 5 | 60 quái, draw call trong mức | **Đạt** | Tôi tự đo: tổng 6, thế giới 1 (qa-03). Họ đo 7 và 1. Đây là số đếm, không phải FPS |
| 6 | QA độc lập cài lại và so ảnh | **Đạt (báo cáo này)** | Bản này |
| 7 | Danh sách việc owner kiểm trong editor | **Chờ owner** | Mở project trong Cocos Creator 3.8.8 không kiểm được trên Linux. Tôi không ghi đạt hay trượt. Cũng chờ: chạy trên Android, âm thanh thật, font trên máy thật |

## 5. So với ảnh tham chiếu

Tôi đặt ảnh của tôi cạnh 4 ảnh tham chiếu và đọc kỹ: `village-pub-request-board-01`, `hud-field-combat-slimes-01`, `hero-recruit-pub-01`, `dungeon-combat-kill-streak-02`. Với màn xếp đội, Sân Tập, bảng vào hang, màn thắng/thua, tôi so với mô tả trong `image-index.md` và wireframe `03-ux-spec.md`, chưa mở từng ảnh cạnh nhau. Khác biệt có chủ đích (xây tự do, ô San Hô Đỏ thay gem, tên và hình nguyên bản) tôi không tính là lỗi.

| Màn | Khớp | Khác | Loại |
|---|---|---|---|
| Tiêu đề | Logo, đảo, "Chạm để tiếp tục" | Nguyên bản, đúng | Khớp |
| HUD đồng/làng | Thanh trên (cấp, CP, vàng, san hô, EXP), cột tài nguyên, thẻ nhiệm vụ có kính lúp, bánh răng, nút Hero/Đội/Xây/Về làng, joystick nổi | Không có dải trống an toàn trên cùng như ảnh (spec cho phép). Làng bị phóng quá to | Khớp bố cục; QA-01 |
| Làng | Nhãn tên dưới công trình, biểu tượng "!" trên công trình | Công trình to gấp 2–3 lần ảnh, đè nhau, nhãn nằm trên hình. Quán và Nhà Kho cùng màu cam khó phân biệt | Lỗi (QA-01); màu là câu hỏi Q3 |
| Quán | Ruy-băng, thanh BONUS, 3 thẻ, "Đổi hero sau 29:59", nút TUYỂN 100, 1x/2x/3x | Có thêm tab "Tuyển / Đổi Vé" (quyết định thiết kế). Thông báo nổi đè lên tab và BONUS | Khớp; QA-04 |
| Danh sách hero và chi tiết | Lưới thẻ, bộ lọc hệ, CP/ATK/HP, các mốc 5/10/15/20/25, nút NÂNG CẤP | Nhãn "Nhanh" cụt; ở màn cao, hình hero đè lên tab | QA-06, QA-07 |
| Xếp đội | Hero quanh đống lửa, lưới thẻ, TỰ XẾP, back | Hàng thẻ thứ hai bị cắt đáy (540×960); ngắn hơn nữa thì cắt nhiều | QA-06, QA-02 |
| Sân Tập | Cây dọc HP/ATK xen kẽ, nhánh ô đội, số cấp | Phần HUD (số quặng) lọt lên trên ruy-băng | Nhỏ (QA-06) |
| Cổng Xoáy | Hình chặng, phần thưởng, nút VÀO, so CP | Hộp "Đề nghị / Đội bạn" đè lên tiêu đề; màn ngắn mất nút VÀO | QA-02, QA-06 |
| Dungeon | Tầng + vàng trên trái, pause trên phải, đếm KILL + "Thưởng chuỗi", joystick, nút AUTO, bar boss, vòng đỏ báo đòn | Đấu trường là một cái "bát" nhỏ giữa nền trống, quái và hero dồn thành cục, nhãn tên đè số sát thương. Ảnh gốc phủ kín màn | QA-05 |
| Màn thắng, màn thua | Tiêu đề, hộp phần thưởng, "Chạm để về làng", gợi ý ở màn thua | Chữ và ô thưởng đè lên nhau | Lỗi (QA-03) |

## 6. Luật điều lệ trong mã

| Luật | Kết quả | Cách kiểm |
|---|---|---|
| Lõi không import `cc` | Đạt | `tests/core-purity.test.ts` xanh; grep không thấy `from 'cc'` trong `core/` |
| Lõi không đọc đồng hồ, không `Math.random` | Đạt | grep `Date.now|Math.random|new Date|setTimeout` trong `core/`: chỉ trong chú thích và README. RNG là `rng.ts` (mulberry32). Test tất định xanh |
| Số cân bằng trong JSON, không nằm trong view | Đạt trong phạm vi tôi xem (suy ra, không vét hết) | Đọc `BuildMode`, `SquadTrainingGate`, `HeroPanels`, `CoreSource` và grep số trong `view/`. Số thấy được là kích thước giao diện, chuỗi chữ, ngưỡng cử chỉ (12 đơn vị, 0.25 s, theo spec). Sắp xếp thẻ hero theo CP trong view chỉ để hiển thị; TỰ XẾP chạy trong lõi |
| Nạp asset qua `AssetLoader` | Đạt | `resources.load` chỉ có trong `AssetLoader.ts` |
| Không dùng tên/hình Rumble Heroes, One Piece, IP khác | Đạt | grep tên IP trong `game/`, `docs/design/`, `tools/`: chỉ thấy câu cấm trong `01-game-design.md`. Hero, quái, công trình có tên Việt nguyên bản |
| Asset có giấy phép trong manifest | Đạt (một lưu ý) | 8 pack trong `view-atlases.json` + `atlases.json` đều có dòng trong `ASSETS_MANIFEST.md` (CC0), font OFL, âm thanh có `NGUON-VA-LICENSE.txt`. Lưu ý QA-09 |
| Không commit thứ cấm | Đạt | `git ls-files`: không có `reference-images/`, engine, build, `node_modules`. 111 ảnh PNG trong `docs/evidence` là ảnh chụp của chính game |
| Số bị đổi so với thiết kế ghi trong `balance-changes.md` | Có file, tôi không đối chiếu từng số | Ngoài phạm vi |

## 7. Danh sách phát hiện

### Lỗi (defect)

**QA-01 (major) Làng: công trình quá to, đè nhau, nhãn nằm trên hình.**
- Cách tái hiện: `qa-02-questchain.mjs` (đến q15) hoặc `qa-05-screens.mjs --viewport 540x960`; xem ô làng sau khi có 3 công trình trở lên.
- Mong đợi (`03-ux-spec.md` mục 4, ảnh `village-pub-request-board-01.jpg`): công trình nhỏ, mỗi cái đọc được, nhãn tên dưới chân.
- Xảy ra: một công trình chiếm gần nửa chiều rộng màn; Mỏ Quặng che Trại Gỗ và một phần Quán; nhãn "Quán Mỏ Neo", "Trại Gỗ", "Mỏ Quặng" nằm trên hình; nhãn "Nhà Kho" nằm trong joystick. Khung nhìn chỉ thấy khoảng 4 ô. Chân công trình không đè nhau (kiểm tra chồng lấn đúng) nhưng hình thì đè.
- Ảnh: `shots/np-q15-village-overlap.png`, `shots/std-540x960-01-village.png`, `shots/np-12-ghost-lumber.png`.

**QA-02 (major) Màn hình ngắn (600×800, H=960): nút VÀO của Cổng Xoáy ra ngoài màn hình; panel bị cắt.**
- Cách tái hiện: `qa-05-screens.mjs --viewport 600x800`, mở Cổng Xoáy.
- Mong đợi (`03-ux-spec.md` mục 1, 2.3): panel giữ trong màn, nút chính luôn chạm được.
- Xảy ra: thấy phần thưởng và nút "Nâng cấp" đè lên dòng "Lần đầu…", nhưng không thấy nút VÀO. Từ giao diện này không vào được dungeon. Cùng viewport: chi tiết hero bị cắt (mốc kỹ năng, nút nâng cấp), màn xếp đội bị cắt hàng thẻ thứ hai. Trên 540×960 và 412×915 nút VÀO hiện đủ.
- Ghi chú: 600×800 là tỉ lệ 3:4 (máy tính bảng). Nếu owner coi đây không phải thiết bị mục tiêu, hạ xuống minor. Spec mục 1 nói "chiều cao ≥ 1280", vậy H=960 là ngoài phạm vi spec; tôi vẫn ghi vì game không báo gì và mất đường chơi.
- Ảnh: `shots/short-600x800-07-gate.png`, `…-03-hero-detail.png`, `…-04-squad.png`.

**QA-03 (major) Màn thắng và màn thua: chữ đè nhau.**
- Cách tái hiện: `qa-06-boss-result.mjs`.
- Mong đợi (`03-ux-spec.md`, ảnh `result-victory-01.jpg`, `result-annihilated-01.jpg`): danh sách phần thưởng và ô vật phẩm không chồng lên nhau; gợi ý màn thua đọc được.
- Xảy ra: màn thắng có hai ô phần thưởng (số 410 và 1) vẽ đè lên hai dòng "Vàng +2", "Thịt +1". Màn thua có dòng "Vàng +1" đè lên dòng gợi ý "Tuyển hero ở Quán Mỏ Neo".
- Ảnh: `shots/result-victory-overlap.png`, `shots/result-defeat-overlap.png`.

**QA-04 (minor) Thông báo nổi (toast) đè lên panel và HUD.**
- Tái hiện: `qa-01-newplayer.mjs` (mở Quán ngay sau khi xây xong); `qa-06-boss-result.mjs`.
- Xảy ra: "Xây xong: Quán Mỏ Neo cấp 1" và "Vàng +100" che tab Tuyển/Đổi Vé và thanh BONUS. "Thu gỗ +140" che tên và thanh máu boss. Toast "Thu gỗ +140" hiện cả trong dungeon, có vẻ là thu sản lượng làng lúc đang ở hang (suy ra, chưa dò nguyên nhân).
- Ảnh: `shots/np-18-tavern-toast-overlap.png`, `shots/boss-toast-over-hpbar.png`, `shots/np-q11-camp-panel-toast.png`.

**QA-05 (minor) Dungeon: đám đông khó đọc, đấu trường nhỏ.**
- Tái hiện: `qa-03-dungeon.mjs`, ảnh `dungeon-60-monsters.png`.
- Xảy ra: 60 quái và 8 hero dồn vào một cụm; nhãn tên hero ("Tay Lành", "Hôi") đè số sát thương; chữ "Tầng 4" che giữa trận. Đấu trường là hình bát nhỏ giữa vùng tối rộng, ảnh gốc phủ kín màn. Draw call tốt nên đây là chuyện bố cục, không phải hiệu năng.
- Khi nào nâng lên major: nếu owner coi "đám đông đọc được" là tiêu chí 8.

**QA-06 (minor) Lỗi bố cục nhỏ ở 540×960.** Hộp "Đề nghị / Đội bạn" của Cổng Xoáy đè lên tiêu đề "Cổng Xoáy"; tab "Nhanh" cụt (đáng lẽ "Nhanh Nhẹn"); hàng thẻ thứ hai của màn xếp đội bị cắt đáy; ở Sân Tập, số quặng của HUD lọt lên trên ruy-băng; số "20/320" của bong bóng sản lượng đè lên bánh răng; "x5 MỚI!" đè lên hình hero ở màn nhận hero. Ảnh: `shots/std-540x960-07-gate.png`, `…-04-squad.png`, `…-06-training.png`, `…-01-village.png`.

**QA-07 (minor) Màn cao (412×915, H=1599): hình hero lớn đè lên tab lọc ở chi tiết hero.** Ảnh `shots/tall-412x915-03-hero-detail.png`. Các màn khác trên màn cao dùng được; còn nhiều khoảng trống.

**QA-08 (minor, suy ra) Không có phản hồi khi đứng quá xa cây.** Đứng cách cây 2.0 ô, đội không chặt; cách 1.6 ô thì chặt. Người chơi mới không thấy gì xảy ra. Tái hiện: `qa-02-questchain.mjs` với `stop: 2.0` (lần chạy đầu của tôi, nhật ký không giữ). Chưa đo chính xác ngưỡng; chưa tìm trong dữ liệu số tầm thu thập.

**QA-09 (minor, tài liệu) `npm run atlas` chỉ dựng atlas `placeholder`.** Atlas `ui.png` và `world.png` do `tools/atlas/build-view-atlases.mjs` dựng, nhưng `tools/README.md` mục 5 không nhắc. Người dựng lại từ đầu không biết cách tạo lại hai atlas này. Tôi chỉ chạy `npm run atlas` (không đổi file nào), không chạy script kia.

**QA-10 (minor, rủi ro) Khi lõi lỗi nạp, game âm thầm dùng `StandInSource`** (dữ liệu giả, có `Math.random`) và chỉ ghi `console.error`. Ở bản phát hành người chơi sẽ thấy game giả mà không có thông báo. Tôi không kích hoạt lỗi này, chỉ đọc `createSource.ts`.

### Câu hỏi cho thiết kế hoặc chủ sản phẩm (không phải lỗi)

- **Q1 Nhịp độ.** Bot qua boss tầng 20 lúc khoảng 2:10 (mục tiêu là không quá 6:00), thắng 16/16 lượt hang, 4–8 lần cả đội gục ngoài đồng trong 6 giờ. Đạt mục tiêu điều lệ, nhưng bot chơi hiệu quả hơn người thật nhiều. Thiết kế có muốn nhịp chậm hơn không? (Tôi không đánh giá cân bằng cho người chơi thật.)
- **Q2** Ảnh gốc có dải xanh trống trên cùng (tai thỏ). Game của ta không có dải đó. Spec mục 1 viết "thế giới vẫn vẽ tràn màn hình". Có cần thêm không?
- **Q3** Quán Mỏ Neo và Nhà Kho dùng hình cam gần như giống nhau; Cổng Xoáy dùng hình khác hẳn. Asset tạm thì chấp nhận, nhưng có làm khó người mới phân biệt không?
- **Q4** Nút "Ra đồng" ẩn lúc mới chơi (đúng spec 01 mục 4.3). Người mới có hiểu cách ra đồng không (thẻ nhiệm vụ có mũi tên chỉ đường)? Tôi đi ra bằng chạm joystick, nên chưa thấy vấn đề.

## 8. Những gì tôi chưa kiểm hoặc chưa làm xong

- **Editor Cocos Creator 3.8.8** và bản build thật: chờ owner.
- **Thiết bị thật, Android, âm thanh, font hệ thống:** harness không mô phỏng. Chạm trong harness là chạm tổng hợp.
- **FPS:** không đo, và harness dùng WebGL phần mềm nên không có ý nghĩa.
- **Chuỗi nhiệm vụ từ save mới:** tôi nhận được 13 thẻ (q01–q13). Kịch bản của tôi kẹt ở q14 ("nâng một hero lên cấp 5"): không tìm thấy nút `levelUp` lúc đó, tôi chưa tìm ra vì sao. Cấp 5 cần mảnh hero (đột phá), nên có thể là cách chơi bình thường là dùng "Đổi Vé" hoặc tuyển trùng, chưa kiểm. Vì vậy **tôi chưa chứng minh một người chơi mới đi hết thẻ nhiệm vụ tới tầng 5**. Các bước sau (Sân Tập, Chợ, Cổng Xoáy, dungeon) tôi chơi từ save giữa game.
- Nhiều lần chạy kịch bản của tôi bị dừng lâu vì đồng hồ thật điều khiển công trình (xem mục 3). Những chỗ đó không phải lỗi game.
- Xây Sân Tập, Chợ, Cổng Xoáy mới bằng chạm: chưa làm trong run từ save mới (cần cuộn khay công trình; tôi chỉ sửa kịch bản ở cuối). Di chuyển công trình và hủy xây: dựa vào kịch bản của lập trình viên.
- Mở ô đội bằng San Hô Đỏ, hồi sinh sau khi cả đội gục ngoài đồng, quái tinh anh, hai kỹ năng tay: chưa kiểm.
- Chạm ra ngoài panel để đóng: đạt ở một điểm thử (panel công trình đóng); chưa thử với mọi panel.
- Cân bằng số trong `balance-changes.md`: không đối chiếu.
- Đọc mã: tôi lấy mẫu (grep và đọc vài file view), không đọc toàn bộ 11 000 dòng. Mục "số cân bằng không nằm trong view" là suy ra từ mẫu.

## 9. Tệp liên quan

- `docs/qa/m1/scenarios/` (kịch bản và thư viện `lib/qa.mjs`)
- `docs/qa/m1/shots/` (ảnh đã nhắc ở trên)
- `docs/qa/m1/logs/` (setup, typecheck, test, bot, tóm tắt kịch bản của lập trình viên, nhật ký chạy nhiệm vụ từ save mới)
