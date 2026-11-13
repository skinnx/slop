# Người chơi mới chỉ làm theo thẻ nhiệm vụ

Lệnh: `cd tools && npm run sim:newplayer -- --seeds 300 --until q21`

Người chơi giả (`tools/sim/cardplayer.ts`) chỉ làm điều thẻ nhiệm vụ đang yêu cầu. Khi nút bị khóa, họ đọc lý do game hiện (câu chữ `Check.text` của lõi) và đi lấy đúng thứ đang thiếu: thiếu gỗ thì chặt cây, thiếu thịt thì đánh quái rơi thịt ở Bãi Vỏ Sò, thiếu cấp người chơi thì đánh quái ở Bãi Vỏ Sò. Không farm thêm, không tuyển thêm, không nâng công trình ngoài yêu cầu. Sau khi thua dungeon, họ làm theo gợi ý của màn thua trong 3 phút (tiêu thịt, vàng, quặng; đánh quái) rồi thử lại. Thời gian là thời gian chơi mô phỏng; panel mở tức thì.

## Cách tiêu thịt: `focused` — dồn thịt cho hero cấp cao nhất trong đội

- Số seed: 300. Đi tới hết q21 trong 4 giờ: **300/300**.
- Thời gian tới khi nhận thưởng q21: nhanh nhất 0:11:03, trung vị 0:15:18, 90% 0:16:17, chậm nhất 0:24:42.
- Lượt dungeon: trung vị 2, nhiều nhất 4; số lượt thua: trung vị 1, nhiều nhất 3.

**Lúc q14 ("Nâng một hero lên cấp 5") hiện ra** (300 seed tới được q14):

| | Ít nhất | Trung vị | 90% | Nhiều nhất |
|---|---|---|---|---|
| Thịt đang có | 61 | 72 | 77 | 96 |
| Thịt còn thiếu để hero được chọn lên cấp 5 | 0 | 0 | 0 | 0 |
| Thời gian từ lúc q14 hiện tới lúc xong (giây) | 1 | 1 | 1 | 1 |

- Đủ thịt ngay lúc q14 hiện (bấm NÂNG CẤP là xong): 300/300 seed.
- Cần mảnh hero để xong q14: 0/300 seed.
- Câu game hiện trên nút NÂNG CẤP khi bị khóa ở q14: không bị khóa lần nào.

Thời gian từng nhiệm vụ (giây, từ lúc thẻ hiện tới lúc nhận thưởng) và lý do khóa hay gặp nhất:

| Nhiệm vụ | Nội dung | Nhanh nhất | Trung vị | 90% | Chậm nhất | Câu "bị khóa" game đã hiện (số seed) |
|---|---|---|---|---|---|---|
| q01 | Chặt cây lấy 10 gỗ | 9 | 9 | 9 | 9 | — |
| q02 | Hạ 3 Cua Cát | 11 | 11 | 11 | 12 | — |
| q03 | Nâng một hero lên cấp 2 | 1 | 1 | 1 | 1 | — |
| q04 | Xây: Trại Gỗ | 25 | 35 | 36 | 60 | Thiếu N gỗ (300) |
| q05 | Đập đá lấy 10 quặng | 22 | 23 | 24 | 47 | — |
| q06 | Xây: Quán Mỏ Neo | 40 | 43 | 44 | 46 | Thiếu N gỗ (300) |
| q07 | Tuyển 1 hero ở Quán Mỏ Neo | 1 | 1 | 1 | 1 | — |
| q08 | Mở Xếp đội và bấm TỰ XẾP | 1 | 1 | 1 | 1 | — |
| q09 | Hạ 5 Chuột Bến | 6 | 7 | 8 | 8 | — |
| q10 | Xây: Mỏ Quặng | 15 | 17 | 18 | 23 | Thiếu N gỗ (299); Cần cấp người chơi N (163) |
| q11 | Thu gỗ ở Trại Gỗ | 1 | 1 | 1 | 1 | — |
| q12 | Nâng Nhà Kho lên cấp 2 | 49 | 64 | 68 | 77 | Thiếu N gỗ (300) |
| q13 | Tuyển thêm 2 lượt | 1 | 1 | 1 | 2 | — |
| q14 | Nâng một hero lên cấp 5 | 1 | 1 | 1 | 1 | — |
| q15 | Xây: Sân Tập | 68 | 89 | 101 | 133 | Cần cấp người chơi N (300); Thiếu N gỗ (300) |
| q16 | Mở 2 nấc ở Sân Tập | 2 | 2 | 2 | 2 | — |
| q17 | Xây: Chợ Bến | 57 | 77 | 92 | 112 | Cần cấp người chơi N (300); Thiếu N gỗ (300) |
| q18 | Hạ 20 quái ở Bãi Vỏ Sò | 17 | 19 | 21 | 24 | — |
| q19 | Xây: Cổng Xoáy | 127 | 155 | 169 | 214 | Cần cấp người chơi N (300); Thiếu N gỗ (300) |
| q20 | Vượt tầng 1 Hang Xoáy | 34 | 63 | 253 | 334 | — |
| q21 | Hạ boss tầng 5: Rương Nhai | 0 | 303 | 347 | 806 | — |

## Cách tiêu thịt: `spread` — luôn nâng hero cấp thấp nhất trong đội (chia đều, tốn thịt nhất)

- Số seed: 300. Đi tới hết q21 trong 4 giờ: **300/300**.
- Thời gian tới khi nhận thưởng q21: nhanh nhất 0:11:32, trung vị 0:15:39, 90% 0:16:35, chậm nhất 0:21:04.
- Lượt dungeon: trung vị 2, nhiều nhất 3; số lượt thua: trung vị 1, nhiều nhất 2.

**Lúc q14 ("Nâng một hero lên cấp 5") hiện ra** (300 seed tới được q14):

| | Ít nhất | Trung vị | 90% | Nhiều nhất |
|---|---|---|---|---|
| Thịt đang có | 61 | 72 | 77 | 96 |
| Thịt còn thiếu để hero được chọn lên cấp 5 | 28 | 83 | 89 | 94 |
| Thời gian từ lúc q14 hiện tới lúc xong (giây) | 25 | 94 | 102 | 119 |

- Đủ thịt ngay lúc q14 hiện (bấm NÂNG CẤP là xong): 0/300 seed.
- Cần mảnh hero để xong q14: 0/300 seed.
- Câu game hiện trên nút NÂNG CẤP khi bị khóa ở q14: "Thiếu N thịt" (300 seed).

Thời gian từng nhiệm vụ (giây, từ lúc thẻ hiện tới lúc nhận thưởng) và lý do khóa hay gặp nhất:

| Nhiệm vụ | Nội dung | Nhanh nhất | Trung vị | 90% | Chậm nhất | Câu "bị khóa" game đã hiện (số seed) |
|---|---|---|---|---|---|---|
| q01 | Chặt cây lấy 10 gỗ | 9 | 9 | 9 | 9 | — |
| q02 | Hạ 3 Cua Cát | 11 | 11 | 11 | 12 | — |
| q03 | Nâng một hero lên cấp 2 | 1 | 1 | 1 | 1 | — |
| q04 | Xây: Trại Gỗ | 25 | 35 | 36 | 60 | Thiếu N gỗ (300) |
| q05 | Đập đá lấy 10 quặng | 22 | 23 | 24 | 47 | — |
| q06 | Xây: Quán Mỏ Neo | 40 | 43 | 44 | 46 | Thiếu N gỗ (300) |
| q07 | Tuyển 1 hero ở Quán Mỏ Neo | 1 | 1 | 1 | 1 | — |
| q08 | Mở Xếp đội và bấm TỰ XẾP | 1 | 1 | 1 | 1 | — |
| q09 | Hạ 5 Chuột Bến | 6 | 7 | 8 | 8 | — |
| q10 | Xây: Mỏ Quặng | 15 | 17 | 18 | 23 | Thiếu N gỗ (299); Cần cấp người chơi N (163) |
| q11 | Thu gỗ ở Trại Gỗ | 1 | 1 | 1 | 1 | — |
| q12 | Nâng Nhà Kho lên cấp 2 | 49 | 64 | 68 | 77 | Thiếu N gỗ (300) |
| q13 | Tuyển thêm 2 lượt | 1 | 1 | 1 | 2 | — |
| q14 | Nâng một hero lên cấp 5 | 25 | 94 | 102 | 119 | Thiếu N thịt (300) |
| q15 | Xây: Sân Tập | 51 | 61 | 68 | 82 | Thiếu N gỗ (300); Cần cấp người chơi N (1) |
| q16 | Mở 2 nấc ở Sân Tập | 2 | 2 | 2 | 2 | — |
| q17 | Xây: Chợ Bến | 32 | 39 | 80 | 120 | Thiếu N gỗ (300); Cần cấp người chơi N (122) |
| q18 | Hạ 20 quái ở Bãi Vỏ Sò | 17 | 19 | 21 | 38 | — |
| q19 | Xây: Cổng Xoáy | 127 | 152 | 166 | 215 | Cần cấp người chơi N (300); Thiếu N gỗ (300) |
| q20 | Vượt tầng 1 Hang Xoáy | 39 | 68 | 253 | 352 | — |
| q21 | Hạ boss tầng 5: Rương Nhai | 0 | 293 | 320 | 610 | — |

