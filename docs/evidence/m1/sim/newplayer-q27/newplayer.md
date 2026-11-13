# Người chơi mới chỉ làm theo thẻ nhiệm vụ

Lệnh: `cd tools && npm run sim:newplayer -- --seeds 100 --until q27`

Người chơi giả (`tools/sim/cardplayer.ts`) chỉ làm điều thẻ nhiệm vụ đang yêu cầu. Khi nút bị khóa, họ đọc lý do game hiện (câu chữ `Check.text` của lõi) và đi lấy đúng thứ đang thiếu: thiếu gỗ thì chặt cây, thiếu thịt thì đánh quái rơi thịt ở Bãi Vỏ Sò, thiếu cấp người chơi thì đánh quái ở Bãi Vỏ Sò. Không farm thêm, không tuyển thêm, không nâng công trình ngoài yêu cầu. Sau khi thua dungeon, họ làm theo gợi ý của màn thua trong 3 phút (tiêu thịt, vàng, quặng; đánh quái) rồi thử lại. Thời gian là thời gian chơi mô phỏng; panel mở tức thì.

## Cách tiêu thịt: `focused` — dồn thịt cho hero cấp cao nhất trong đội

- Số seed: 100. Đi tới hết q27 trong 6 giờ: **100/100**.
- Thời gian tới khi nhận thưởng q27: nhanh nhất 0:34:54, trung vị 0:39:12, 90% 0:42:19, chậm nhất 0:48:01.
- Lượt dungeon: trung vị 3, nhiều nhất 5; số lượt thua: trung vị 1, nhiều nhất 3.

**Lúc q14 ("Nâng một hero lên cấp 5") hiện ra** (100 seed tới được q14):

| | Ít nhất | Trung vị | 90% | Nhiều nhất |
|---|---|---|---|---|
| Thịt đang có | 61 | 71 | 77 | 96 |
| Thịt còn thiếu để hero được chọn lên cấp 5 | 0 | 0 | 0 | 0 |
| Thời gian từ lúc q14 hiện tới lúc xong (giây) | 1 | 1 | 1 | 1 |

- Đủ thịt ngay lúc q14 hiện (bấm NÂNG CẤP là xong): 100/100 seed.
- Cần mảnh hero để xong q14: 0/100 seed.
- Câu game hiện trên nút NÂNG CẤP khi bị khóa ở q14: không bị khóa lần nào.

Thời gian từng nhiệm vụ (giây, từ lúc thẻ hiện tới lúc nhận thưởng) và lý do khóa hay gặp nhất:

| Nhiệm vụ | Nội dung | Nhanh nhất | Trung vị | 90% | Chậm nhất | Câu "bị khóa" game đã hiện (số seed) |
|---|---|---|---|---|---|---|
| q01 | Chặt cây lấy 10 gỗ | 9 | 9 | 9 | 9 | — |
| q02 | Hạ 3 Cua Cát | 11 | 11 | 11 | 12 | — |
| q03 | Nâng một hero lên cấp 2 | 1 | 1 | 1 | 1 | — |
| q04 | Xây: Trại Gỗ | 25 | 35 | 36 | 51 | Thiếu N gỗ (100) |
| q05 | Đập đá lấy 10 quặng | 22 | 23 | 24 | 47 | — |
| q06 | Xây: Quán Mỏ Neo | 41 | 43 | 44 | 46 | Thiếu N gỗ (100) |
| q07 | Tuyển 1 hero ở Quán Mỏ Neo | 1 | 1 | 1 | 1 | — |
| q08 | Mở Xếp đội và bấm TỰ XẾP | 1 | 1 | 1 | 1 | — |
| q09 | Hạ 5 Chuột Bến | 6 | 7 | 8 | 8 | — |
| q10 | Xây: Mỏ Quặng | 15 | 17 | 18 | 20 | Thiếu N gỗ (100); Cần cấp người chơi N (51) |
| q11 | Thu gỗ ở Trại Gỗ | 1 | 1 | 1 | 1 | — |
| q12 | Nâng Nhà Kho lên cấp 2 | 52 | 64 | 69 | 71 | Thiếu N gỗ (100) |
| q13 | Tuyển thêm 2 lượt | 1 | 1 | 1 | 2 | — |
| q14 | Nâng một hero lên cấp 5 | 1 | 1 | 1 | 1 | — |
| q15 | Xây: Sân Tập | 68 | 90 | 106 | 133 | Cần cấp người chơi N (100); Thiếu N gỗ (100) |
| q16 | Mở 2 nấc ở Sân Tập | 2 | 2 | 2 | 2 | — |
| q17 | Xây: Chợ Bến | 66 | 76 | 92 | 105 | Cần cấp người chơi N (100); Thiếu N gỗ (100) |
| q18 | Hạ 20 quái ở Bãi Vỏ Sò | 17 | 19 | 22 | 24 | — |
| q19 | Xây: Cổng Xoáy | 130 | 156 | 167 | 199 | Cần cấp người chơi N (100); Thiếu N gỗ (100) |
| q20 | Vượt tầng 1 Hang Xoáy | 36 | 66 | 319 | 334 | — |
| q21 | Hạ boss tầng 5: Rương Nhai | 0 | 300 | 347 | 806 | — |
| q22 | Mở ô đội thứ 4 ở Sân Tập | 415 | 469 | 523 | 545 | Cần Sân Tập cấp N (100); Thiếu N gỗ (100); Thiếu N quặng (84) |
| q23 | Nâng Trại Gỗ lên cấp 3 | 107 | 129 | 136 | 140 | Thiếu N quặng (100) |
| q24 | Hạ 10 Sứa Nhầy ở Rừng Dừa Rậm | 25 | 29 | 34 | 45 | — |
| q25 | Nâng Cổng Xoáy lên cấp 2 | 576 | 682 | 745 | 789 | Cần Nhà Kho cấp N (100); Thiếu N gỗ (100); Thiếu N quặng (100) |
| q26 | Hạ boss tầng 10: Cua Càng Thép Chúa | 97 | 113 | 130 | 422 | — |
| q27 | Nâng một hero lên cấp 10 | 0 | 1 | 1 | 1 | Thiếu N mảnh (89) |

## Cách tiêu thịt: `spread` — luôn nâng hero cấp thấp nhất trong đội (chia đều, tốn thịt nhất)

- Số seed: 100. Đi tới hết q27 trong 6 giờ: **100/100**.
- Thời gian tới khi nhận thưởng q27: nhanh nhất 0:34:54, trung vị 0:38:48, 90% 0:41:48, chậm nhất 0:45:15.
- Lượt dungeon: trung vị 3, nhiều nhất 4; số lượt thua: trung vị 1, nhiều nhất 2.

**Lúc q14 ("Nâng một hero lên cấp 5") hiện ra** (100 seed tới được q14):

| | Ít nhất | Trung vị | 90% | Nhiều nhất |
|---|---|---|---|---|
| Thịt đang có | 61 | 71 | 77 | 96 |
| Thịt còn thiếu để hero được chọn lên cấp 5 | 28 | 83 | 90 | 94 |
| Thời gian từ lúc q14 hiện tới lúc xong (giây) | 36 | 93 | 101 | 110 |

- Đủ thịt ngay lúc q14 hiện (bấm NÂNG CẤP là xong): 0/100 seed.
- Cần mảnh hero để xong q14: 0/100 seed.
- Câu game hiện trên nút NÂNG CẤP khi bị khóa ở q14: "Thiếu N thịt" (100 seed).

Thời gian từng nhiệm vụ (giây, từ lúc thẻ hiện tới lúc nhận thưởng) và lý do khóa hay gặp nhất:

| Nhiệm vụ | Nội dung | Nhanh nhất | Trung vị | 90% | Chậm nhất | Câu "bị khóa" game đã hiện (số seed) |
|---|---|---|---|---|---|---|
| q01 | Chặt cây lấy 10 gỗ | 9 | 9 | 9 | 9 | — |
| q02 | Hạ 3 Cua Cát | 11 | 11 | 11 | 12 | — |
| q03 | Nâng một hero lên cấp 2 | 1 | 1 | 1 | 1 | — |
| q04 | Xây: Trại Gỗ | 25 | 35 | 36 | 51 | Thiếu N gỗ (100) |
| q05 | Đập đá lấy 10 quặng | 22 | 23 | 24 | 47 | — |
| q06 | Xây: Quán Mỏ Neo | 41 | 43 | 44 | 46 | Thiếu N gỗ (100) |
| q07 | Tuyển 1 hero ở Quán Mỏ Neo | 1 | 1 | 1 | 1 | — |
| q08 | Mở Xếp đội và bấm TỰ XẾP | 1 | 1 | 1 | 1 | — |
| q09 | Hạ 5 Chuột Bến | 6 | 7 | 8 | 8 | — |
| q10 | Xây: Mỏ Quặng | 15 | 17 | 18 | 20 | Thiếu N gỗ (100); Cần cấp người chơi N (51) |
| q11 | Thu gỗ ở Trại Gỗ | 1 | 1 | 1 | 1 | — |
| q12 | Nâng Nhà Kho lên cấp 2 | 52 | 64 | 69 | 71 | Thiếu N gỗ (100) |
| q13 | Tuyển thêm 2 lượt | 1 | 1 | 1 | 2 | — |
| q14 | Nâng một hero lên cấp 5 | 36 | 93 | 101 | 110 | Thiếu N thịt (100) |
| q15 | Xây: Sân Tập | 51 | 61 | 70 | 82 | Thiếu N gỗ (100) |
| q16 | Mở 2 nấc ở Sân Tập | 2 | 2 | 2 | 2 | — |
| q17 | Xây: Chợ Bến | 32 | 40 | 84 | 114 | Thiếu N gỗ (100); Cần cấp người chơi N (45) |
| q18 | Hạ 20 quái ở Bãi Vỏ Sò | 17 | 19 | 21 | 38 | — |
| q19 | Xây: Cổng Xoáy | 128 | 153 | 169 | 215 | Cần cấp người chơi N (100); Thiếu N gỗ (100) |
| q20 | Vượt tầng 1 Hang Xoáy | 39 | 69 | 260 | 336 | — |
| q21 | Hạ boss tầng 5: Rương Nhai | 0 | 291 | 317 | 578 | — |
| q22 | Mở ô đội thứ 4 ở Sân Tập | 405 | 455 | 502 | 537 | Cần Sân Tập cấp N (100); Thiếu N gỗ (100); Thiếu N quặng (77) |
| q23 | Nâng Trại Gỗ lên cấp 3 | 109 | 126 | 136 | 140 | Thiếu N quặng (100) |
| q24 | Hạ 10 Sứa Nhầy ở Rừng Dừa Rậm | 25 | 29 | 33 | 60 | — |
| q25 | Nâng Cổng Xoáy lên cấp 2 | 576 | 671 | 744 | 795 | Cần Nhà Kho cấp N (100); Thiếu N gỗ (100); Thiếu N quặng (100) |
| q26 | Hạ boss tầng 10: Cua Càng Thép Chúa | 96 | 113 | 127 | 414 | — |
| q27 | Nâng một hero lên cấp 10 | 0 | 2 | 8 | 134 | Thiếu N mảnh (96); Thiếu N thịt (8) |

