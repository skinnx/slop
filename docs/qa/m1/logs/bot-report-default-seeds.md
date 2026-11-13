# Kết quả bot mô phỏng (cột mốc 1)

Lệnh: `cd tools && npm run sim -- --seeds 1,2,3,4,5 --hours 6 --out <thư mục>`

Mục tiêu (`docs/design/02-balance.md` mục 5): từ save mới, vượt tầng 5 trước 0:45, tầng 10 trước 1:30, tầng 15 trước 3:00, **tầng 20 trước 6:00**, và không có 30 phút mô phỏng liên tiếp nào không tiến bộ. Thời gian là thời gian chơi mô phỏng (số bước × 1/30 s), không có thời gian ngoại tuyến.

## Tóm tắt: ĐẠT (5 seed, 6 giờ mỗi seed)

| Seed | Tầng 5 (≤ 0:45) | Tầng 10 (≤ 1:30) | Tầng 15 (≤ 3:00) | Tầng 20 (≤ 6:00) | Tầng 25 (tham khảo) | Đoạn dài nhất không tiến bộ | Cấp NC cuối | CP cuối | Kết quả |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0:13:17 | 0:29:29 | 1:07:37 | 2:12:41 | 3:47:26 | 0:05:58 | 26 | 49458 | ĐẠT |
| 2 | 0:19:02 | 0:33:34 | 1:12:24 | 2:13:30 | 3:53:48 | 0:05:07 | 25 | 48591 | ĐẠT |
| 3 | 0:16:55 | 0:33:30 | 1:13:16 | 2:16:28 | 3:59:32 | 0:05:31 | 25 | 47580 | ĐẠT |
| 4 | 0:15:35 | 0:30:58 | 1:09:19 | 2:18:23 | 3:54:11 | 0:04:55 | 25 | 46192 | ĐẠT |
| 5 | 0:15:50 | 0:30:43 | 1:06:39 | 2:11:27 | 3:46:14 | 0:09:30 | 26 | 47799 | ĐẠT |

## Seed 1: ĐẠT

| Mốc | Hạn chót | Bot | Kết quả |
|---|---|---|---|
| Vượt tầng 5 | 0:45:00 | 0:13:17 | ĐẠT |
| Vượt tầng 10 | 1:30:00 | 0:29:29 | ĐẠT |
| Vượt tầng 15 | 3:00:00 | 1:07:37 | ĐẠT |
| Vượt tầng 20 | 6:00:00 | 2:12:41 | ĐẠT |
| Vượt tầng 25 | không bắt buộc | 3:47:26 | — |
| Đoạn dài nhất không tiến bộ (cả 6 giờ) | dưới 0:30:00 | 0:05:58 (bắt đầu ở 3:56:42) | ĐẠT |

Bảng tiến độ (mỗi 15 phút mô phỏng):

| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0:14:59 | 7 | 6096 | 6 | 3 | 5, 5, 4 | 21 | Kho2 Gỗ3 Quán1 Mỏ2 Tập1 Chợ2 Cổng1 | 1 | 5 | vàng 278, thịt 17, gỗ 263, quặng 295, san hô 2, vé 12 | 14 | q22 Mở ô đội thứ 4 ở Sân Tập (0/1) |
| 0:29:59 | 9 | 9450 | 8 | 4 | 9, 9, 9, 9 | 27 | Kho4 Gỗ4 Quán1 Mỏ3 Tập2 Chợ3 Cổng2 | 2 | 10 | vàng 87, thịt 0, gỗ 90, quặng 78, san hô 4, vé 16 | 30 | q27 Nâng một hero lên cấp 10 (0/1) |
| 0:44:59 | 11 | 12476 | 10 | 4 | 10, 10, 10, 10 | 33 | Kho5 Gỗ4 Quán2 Mỏ3 Tập2+ Chợ3 Cổng2 | 2 | 10 | vàng 152, thịt 13, gỗ 706, quặng 286, san hô 7, vé 26 | 42 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 0:59:59 | 12 | 16420 | 11 | 5 | 13, 13, 13, 12, 12 | 36 | Kho5 Gỗ4+ Quán2 Mỏ3 Tập3 Chợ3 Cổng2+ | 2 | 10 | vàng 93, thịt 28, gỗ 839, quặng 438, san hô 3, vé 15 | 47 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 1:15:00 | 14 | 18824 | 11 | 5 | 17, 16, 16, 16, 16 | 42 | Kho5 Gỗ6 Quán2 Mỏ4 Tập3 Chợ4 Cổng3 | 3 | 15 | vàng 31, thịt 26, gỗ 1375, quặng 420, san hô 15, vé 38 | 75 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:30:00 | 15 | 19829 | 11 | 5 | 19, 19, 19, 18, 18 | 45 | Kho5+ Gỗ6 Quán2 Mỏ4 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 121, thịt 15, gỗ 628, quặng 292, san hô 19, vé 48 | 85 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:45:00 | 16 | 20828 | 11 | 5 | 20, 20, 20, 20, 19 | 48 | Kho6 Gỗ6 Quán2 Mỏ4 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 131, thịt 77, gỗ 2933, quặng 1147, san hô 22, vé 65 | 101 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:00:00 | 17 | 26276 | 11 | 6 | 21, 20, 20, 20, 20, 20 | 51 | Kho6 Gỗ6 Quán2 Mỏ5 Tập4 Chợ5 Cổng3+ | 3 | 15 | vàng 64, thịt 11, gỗ 1829, quặng 220, san hô 22, vé 77 | 113 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:15:00 | 18 | 27155 | 12 | 6 | 22, 22, 22, 22, 22, 21 | 53 | Kho6+ Gỗ6+ Quán2 Mỏ6 Tập4 Chợ5 Cổng4 | 4 | 20 | vàng 170, thịt 23, gỗ 2232, quặng 194, san hô 34, vé 133 | 152 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:30:00 | 18 | 27621 | 12 | 6 | 23, 23, 23, 23, 22, 22 | 54 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 82, thịt 117, gỗ 220, quặng 111, san hô 34, vé 141 | 160 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:45:00 | 19 | 28228 | 12 | 6 | 24, 24, 24, 24, 24, 24 | 55 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 111, thịt 22, gỗ 3083, quặng 872, san hô 38, vé 166 | 184 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:00:00 | 20 | 29716 | 12 | 6 | 25, 25, 25, 25, 24, 24 | 60 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 106, thịt 104, gỗ 4972, quặng 1627, san hô 38, vé 166 | 192 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:14:59 | 20 | 35706 | 12 | 7 | 26, 26, 25, 13, 25, 25, 25 | 60 | Kho7 Gỗ7 Quán2+ Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 45, thịt 12, gỗ 941, quặng 389, san hô 31, vé 190 | 215 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:29:59 | 21 | 37388 | 12 | 7 | 26, 24, 26, 25, 25, 25, 25 | 62 | Kho7 Gỗ7+ Quán3 Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 143, thịt 131, gỗ 3511, quặng 223, san hô 33, vé 204 | 229 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:44:59 | 21 | 38323 | 12 | 7 | 26, 26, 26, 26, 26, 26, 26 | 63 | Kho7+ Gỗ8 Quán3 Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 267, thịt 58, gỗ 4859, quặng 615, san hô 38, vé 226 | 250 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:59:59 | 22 | 38895 | 12 | 7 | 27, 27, 27, 27, 26, 26, 26 | 65 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 231, thịt 129, gỗ 5985, quặng 1152, san hô 47, vé 269 | 285 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:14:59 | 23 | 39209 | 12 | 7 | 27, 27, 27, 27, 27, 27, 27 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 136, thịt 144, gỗ 2098, quặng 152, san hô 47, vé 291 | 306 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:29:59 | 23 | 39620 | 12 | 7 | 28, 28, 28, 28, 28, 27, 27 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 40, thịt 134, gỗ 5574, quặng 1514, san hô 51, vé 306 | 321 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:44:59 | 23 | 40248 | 12 | 7 | 29, 29, 28, 28, 28, 28, 28 | 69 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 137, thịt 67, gỗ 7535, quặng 1832, san hô 53, vé 331 | 345 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:59:59 | 24 | 40920 | 12 | 7 | 29, 29, 29, 29, 29, 29, 28 | 72 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 158, thịt 146, gỗ 8000, quặng 2691, san hô 55, vé 341 | 355 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:14:59 | 24 | 45604 | 12 | 8 | 30, 30, 30, 29, 29, 29, 29, 7 | 72 | Kho8 Gỗ8 Quán3 Mỏ7 Tập6 Chợ6 Cổng5+ | 5 | 25 | vàng 180, thịt 14, gỗ 1255, quặng 438, san hô 48, vé 369 | 382 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:29:59 | 25 | 47619 | 12 | 8 | 30, 30, 30, 29, 24, 29, 29, 29 | 72 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 285, thịt 24, gỗ 1777, quặng 324, san hô 52, vé 382 | 395 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:44:59 | 25 | 48375 | 12 | 8 | 30, 30, 30, 29, 29, 29, 29, 29 | 73 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 61, thịt 183, gỗ 5252, quặng 397, san hô 67, vé 415 | 427 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:59:59 | 26 | 49458 | 12 | 8 | 30, 30, 30, 30, 30, 30, 30, 30 | 74 | Kho9 Gỗ8 Quán3 Mỏ7+ Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 140, thịt 39, gỗ 6981, quặng 569, san hô 71, vé 428 | 440 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |

Lượt dungeon: 16 (thắng 16, thua 0). Cả đội gục ngoài đồng: 6 lần. Chuyến về làng: 147. Quái hạ: 9731 ngoài đồng, 3778 trong dungeon.

Thu nhập theo nguồn trong 6 giờ:

| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |
|---|---|---|---|---|---|---|
| Quái ngoài đồng (vật rơi) | 21529 | 18942 | 0 | 0 | 68 | 0 |
| Cây và đá | 0 | 0 | 51724 | 32772 | 0 | 0 |
| Công trình sản xuất | 938 | 0 | 2183 | 836 | 0 | 0 |
| Thưởng nhiệm vụ | 1310 | 885 | 720 | 540 | 9 | 23 |
| Dungeon: nhặt, qua tầng, chuỗi | 13613 | 572 | 0 | 0 | 0 | 0 |
| Dungeon: thưởng chặng | 6650 | 0 | 0 | 0 | 27 | 37 |

Thời gian chạy thật: 4.0 s cho 648000 bước (6.2 µs mỗi bước).

## Seed 2: ĐẠT

| Mốc | Hạn chót | Bot | Kết quả |
|---|---|---|---|
| Vượt tầng 5 | 0:45:00 | 0:19:02 | ĐẠT |
| Vượt tầng 10 | 1:30:00 | 0:33:34 | ĐẠT |
| Vượt tầng 15 | 3:00:00 | 1:12:24 | ĐẠT |
| Vượt tầng 20 | 6:00:00 | 2:13:30 | ĐẠT |
| Vượt tầng 25 | không bắt buộc | 3:53:48 | — |
| Đoạn dài nhất không tiến bộ (cả 6 giờ) | dưới 0:30:00 | 0:05:07 (bắt đầu ở 4:06:13) | ĐẠT |

Bảng tiến độ (mỗi 15 phút mô phỏng):

| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0:14:59 | 6 | 5045 | 3 | 3 | 5, 8, 5 | 18 | Kho3+ Gỗ3 Quán1 Mỏ2+ Tập1 Chợ2 Cổng1 | 0 | 1 | vàng 83, thịt 25, gỗ 43, quặng 85, san hô 0, vé 4 | 4 | q13 Tuyển thêm 2 lượt (1/2) |
| 0:29:59 | 8 | 8509 | 6 | 4 | 9, 8, 8, 8 | 24 | Kho4 Gỗ4 Quán1 Mỏ3 Tập2 Chợ2+ Cổng1+ | 1 | 5 | vàng 92, thịt 26, gỗ 547, quặng 51, san hô 0, vé 19 | 21 | q25 Nâng Cổng Xoáy lên cấp 2 (0/1) |
| 0:44:59 | 10 | 10427 | 8 | 4 | 8, 9, 9, 8 | 30 | Kho4 Gỗ4+ Quán1 Mỏ4 Tập2+ Chợ3 Cổng2 | 2 | 10 | vàng 78, thịt 27, gỗ 448, quặng 65, san hô 4, vé 35 | 40 | q27 Nâng một hero lên cấp 10 (0/1) |
| 0:59:59 | 11 | 16060 | 10 | 5 | 11, 11, 11, 11, 11 | 33 | Kho5 Gỗ5 Quán2 Mỏ4 Tập3 Chợ4 Cổng2+ | 2 | 10 | vàng 222, thịt 12, gỗ 484, quặng 167, san hô 0, vé 31 | 47 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 1:15:00 | 13 | 18424 | 11 | 5 | 15, 15, 15, 14, 14 | 39 | Kho6 Gỗ5 Quán2 Mỏ5 Tập3 Chợ4 Cổng3 | 3 | 15 | vàng 244, thịt 11, gỗ 1302, quặng 97, san hô 13, vé 69 | 74 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:30:00 | 14 | 19442 | 11 | 5 | 17, 17, 16, 16, 16 | 42 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3+ Chợ4+ Cổng3 | 3 | 15 | vàng 83, thịt 52, gỗ 550, quặng 89, san hô 13, vé 77 | 82 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:45:00 | 15 | 20163 | 11 | 5 | 18, 18, 18, 18, 18 | 45 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3+ Chợ5 Cổng3 | 3 | 15 | vàng 250, thịt 20, gỗ 2802, quặng 1035, san hô 15, vé 93 | 97 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:00:00 | 16 | 25308 | 11 | 6 | 19, 19, 16, 19, 19, 19 | 48 | Kho6 Gỗ6 Quán2 Mỏ5+ Tập4 Chợ5 Cổng3+ | 3 | 15 | vàng 133, thịt 42, gỗ 1305, quặng 306, san hô 15, vé 105 | 109 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:15:00 | 17 | 26921 | 12 | 6 | 21, 21, 20, 20, 20, 20 | 51 | Kho6+ Gỗ7 Quán2 Mỏ6 Tập4 Chợ5+ Cổng4 | 4 | 20 | vàng 194, thịt 37, gỗ 1304, quặng 191, san hô 22, vé 151 | 146 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:30:00 | 18 | 27780 | 12 | 6 | 22, 22, 22, 22, 21, 21 | 54 | Kho7 Gỗ7 Quán2+ Mỏ6 Tập4 Chợ6 Cổng4 | 4 | 20 | vàng 38, thịt 69, gỗ 3008, quặng 809, san hô 24, vé 163 | 158 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:45:00 | 19 | 28261 | 12 | 6 | 23, 23, 23, 23, 23, 22 | 54 | Kho7 Gỗ7 Quán3 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 276, thịt 12, gỗ 1719, quặng 581, san hô 26, vé 184 | 178 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:00:00 | 19 | 28886 | 12 | 6 | 24, 24, 24, 24, 23, 23 | 57 | Kho7 Gỗ7 Quán3 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 215, thịt 74, gỗ 4628, quặng 1455, san hô 26, vé 195 | 189 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:14:59 | 20 | 30823 | 12 | 6 | 25, 25, 25, 25, 24, 24 | 60 | Kho7 Gỗ7 Quán3 Mỏ6 Tập4+ Chợ6 Cổng4+ | 4 | 20 | vàng 294, thịt 8, gỗ 522, quặng 135, san hô 27, vé 216 | 209 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:29:59 | 20 | 36572 | 12 | 7 | 25, 25, 22, 25, 25, 24, 24 | 60 | Kho7 Gỗ7+ Quán3 Mỏ7 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 140, thịt 98, gỗ 1749, quặng 218, san hô 28, vé 231 | 224 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:44:59 | 21 | 37856 | 12 | 7 | 26, 25, 25, 25, 25, 25, 25 | 63 | Kho7 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 101, thịt 108, gỗ 4847, quặng 168, san hô 35, vé 239 | 247 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:59:59 | 22 | 38453 | 12 | 7 | 26, 26, 26, 26, 26, 26, 26 | 64 | Kho7+ Gỗ8 Quán3 Mỏ7 Tập5 Chợ6+ Cổng5 | 5 | 25 | vàng 209, thịt 117, gỗ 4504, quặng 388, san hô 48, vé 285 | 285 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:14:59 | 22 | 38939 | 12 | 7 | 27, 27, 27, 26, 26, 26, 26 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ7 Cổng5 | 5 | 25 | vàng 276, thịt 144, gỗ 6760, quặng 1597, san hô 49, vé 307 | 306 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:29:59 | 23 | 39284 | 12 | 7 | 28, 27, 27, 27, 27, 27, 27 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 128, thịt 4, gỗ 3700, quặng 692, san hô 51, vé 319 | 318 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:44:59 | 23 | 39729 | 12 | 7 | 28, 28, 28, 28, 28, 27, 27 | 67 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 229, thịt 51, gỗ 6115, quặng 1777, san hô 55, vé 345 | 343 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:59:59 | 24 | 40482 | 12 | 7 | 29, 29, 28, 28, 28, 28, 28 | 71 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 197, thịt 94, gỗ 7888, quặng 1693, san hô 59, vé 357 | 355 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:14:59 | 24 | 40920 | 12 | 7 | 29, 29, 29, 29, 29, 29, 28 | 72 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 133, thịt 218, gỗ 8000, quặng 3364, san hô 64, vé 386 | 383 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:29:59 | 25 | 46817 | 12 | 8 | 30, 29, 29, 29, 29, 29, 20, 29 | 72 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 139, thịt 57, gỗ 1043, quặng 155, san hô 58, vé 400 | 397 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:44:59 | 25 | 47724 | 12 | 8 | 30, 29, 29, 29, 27, 29, 29, 29 | 73 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 275, thịt 48, gỗ 4733, quặng 366, san hô 61, vé 427 | 423 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:59:59 | 25 | 48591 | 12 | 8 | 30, 30, 30, 30, 29, 29, 29, 29 | 73 | Kho9 Gỗ8 Quán3 Mỏ7+ Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 157, thịt 117, gỗ 6610, quặng 787, san hô 63, vé 444 | 440 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |

Lượt dungeon: 17 (thắng 16, thua 1, tầng lúc thua: 4). Cả đội gục ngoài đồng: 6 lần. Chuyến về làng: 148. Quái hạ: 9635 ngoài đồng, 3955 trong dungeon.

Thu nhập theo nguồn trong 6 giờ:

| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |
|---|---|---|---|---|---|---|
| Quái ngoài đồng (vật rơi) | 21133 | 18041 | 0 | 0 | 62 | 0 |
| Cây và đá | 0 | 0 | 51363 | 32092 | 0 | 0 |
| Công trình sản xuất | 1020 | 0 | 2173 | 894 | 0 | 0 |
| Thưởng nhiệm vụ | 1310 | 885 | 720 | 540 | 9 | 23 |
| Dungeon: nhặt, qua tầng, chuỗi | 13994 | 601 | 0 | 0 | 0 | 0 |
| Dungeon: thưởng chặng | 6600 | 0 | 0 | 0 | 25 | 37 |

Thời gian chạy thật: 3.5 s cho 648000 bước (5.4 µs mỗi bước).

## Seed 3: ĐẠT

| Mốc | Hạn chót | Bot | Kết quả |
|---|---|---|---|
| Vượt tầng 5 | 0:45:00 | 0:16:55 | ĐẠT |
| Vượt tầng 10 | 1:30:00 | 0:33:30 | ĐẠT |
| Vượt tầng 15 | 3:00:00 | 1:13:16 | ĐẠT |
| Vượt tầng 20 | 6:00:00 | 2:16:28 | ĐẠT |
| Vượt tầng 25 | không bắt buộc | 3:59:32 | — |
| Đoạn dài nhất không tiến bộ (cả 6 giờ) | dưới 0:30:00 | 0:05:31 (bắt đầu ở 4:53:13) | ĐẠT |

Bảng tiến độ (mỗi 15 phút mô phỏng):

| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0:14:59 | 6 | 5318 | 4 | 3 | 5, 9, 5 | 18 | Kho3+ Gỗ3 Quán1 Mỏ2+ Tập1 Chợ2 Cổng1 | 0 | 1 | vàng 11, thịt 11, gỗ 12, quặng 125, san hô 0, vé 5 | 5 | q13 Tuyển thêm 2 lượt (2/2) |
| 0:29:59 | 8 | 9662 | 7 | 4 | 10, 10, 10, 9 | 24 | Kho4 Gỗ4 Quán1 Mỏ3 Tập2 Chợ3 Cổng1+ | 1 | 5 | vàng 112, thịt 16, gỗ 231, quặng 54, san hô 0, vé 16 | 18 | q25 Nâng Cổng Xoáy lên cấp 2 (0/1) |
| 0:44:59 | 10 | 11311 | 9 | 4 | 12, 12, 11, 11 | 30 | Kho5 Gỗ4 Quán2 Mỏ3 Tập2+ Chợ3 Cổng2 | 2 | 10 | vàng 106, thịt 24, gỗ 493, quặng 15, san hô 5, vé 47 | 39 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 0:59:59 | 11 | 14765 | 10 | 5 | 14, 14, 14, 14, 2 | 33 | Kho5 Gỗ4+ Quán2 Mỏ3 Tập3 Chợ3 Cổng2+ | 2 | 10 | vàng 90, thịt 8, gỗ 303, quặng 70, san hô 1, vé 51 | 43 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 1:15:00 | 13 | 18285 | 11 | 5 | 15, 13, 15, 14, 14 | 37 | Kho5+ Gỗ5+ Quán2 Mỏ4 Tập3 Chợ4 Cổng3 | 3 | 15 | vàng 154, thịt 48, gỗ 450, quặng 61, san hô 8, vé 62 | 67 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:30:00 | 14 | 19815 | 11 | 5 | 17, 16, 16, 16, 16 | 42 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 56, thịt 46, gỗ 186, quặng 14, san hô 8, vé 54 | 75 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:45:00 | 15 | 20653 | 11 | 5 | 18, 18, 18, 18, 18 | 45 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 63, thịt 31, gỗ 2615, quặng 562, san hô 10, vé 71 | 91 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:00:00 | 16 | 25059 | 11 | 6 | 20, 19, 19, 19, 19, 18 | 48 | Kho6 Gỗ6 Quán2 Mỏ5 Tập4 Chợ4 Cổng3+ | 3 | 15 | vàng 169, thịt 31, gỗ 1770, quặng 146, san hô 6, vé 79 | 99 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:15:00 | 17 | 26322 | 11 | 6 | 21, 21, 20, 20, 20, 20 | 51 | Kho6 Gỗ6 Quán2 Mỏ6 Tập4 Chợ5 Cổng4 | 3 | 15 | vàng 433, thịt 61, gỗ 3124, quặng 220, san hô 7, vé 87 | 114 | q37 Hạ boss tầng 20: Rắn Biển Rạn (0/1) |
| 2:30:00 | 18 | 27298 | 11 | 6 | 22, 22, 22, 22, 22, 22 | 54 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4 Chợ5 Cổng4 | 4 | 20 | vàng 186, thịt 79, gỗ 3543, quặng 654, san hô 16, vé 134 | 145 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:45:00 | 18 | 27649 | 12 | 6 | 23, 23, 23, 23, 23, 22 | 54 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ5+ Cổng4 | 4 | 20 | vàng 80, thịt 96, gỗ 1564, quặng 68, san hô 18, vé 5 | 165 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:00:00 | 19 | 28258 | 12 | 6 | 24, 24, 24, 24, 23, 23 | 57 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 78, thịt 106, gỗ 4171, quặng 905, san hô 18, vé 14 | 174 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:14:59 | 20 | 29657 | 12 | 6 | 25, 25, 25, 24, 24, 24 | 60 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 110, thịt 81, gỗ 5000, quặng 1872, san hô 21, vé 34 | 193 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:29:59 | 20 | 35361 | 12 | 7 | 25, 25, 25, 18, 25, 25, 24 | 60 | Kho7 Gỗ7 Quán2+ Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 267, thịt 43, gỗ 1840, quặng 499, san hô 14, vé 20 | 203 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:44:59 | 21 | 36780 | 12 | 7 | 25, 25, 25, 25, 25, 25, 25 | 62 | Kho7 Gỗ7+ Quán3 Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 144, thịt 166, gỗ 3956, quặng 115, san hô 21, vé 40 | 230 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:59:59 | 22 | 37414 | 12 | 7 | 26, 26, 26, 26, 26, 26, 26 | 63 | Kho7+ Gỗ8 Quán3 Mỏ6+ Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 45, thịt 68, gỗ 3914, quặng 61, san hô 30, vé 87 | 269 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:14:59 | 22 | 37792 | 12 | 7 | 27, 27, 27, 26, 26, 26, 26 | 64 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 206, thịt 146, gỗ 6520, quặng 1376, san hô 30, vé 109 | 290 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:29:59 | 22 | 38349 | 12 | 7 | 28, 27, 27, 27, 27, 27, 27 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 189, thịt 33, gỗ 7917, quặng 2807, san hô 30, vé 118 | 299 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:44:59 | 23 | 38730 | 12 | 7 | 28, 28, 28, 28, 28, 28, 27 | 66 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6+ Cổng5 | 5 | 25 | vàng 201, thịt 40, gỗ 3473, quặng 292, san hô 40, vé 147 | 327 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:59:59 | 23 | 39064 | 12 | 7 | 29, 29, 28, 28, 28, 28, 28 | 67 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 236, thịt 71, gỗ 5964, quặng 1812, san hô 40, vé 155 | 335 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:14:59 | 24 | 39716 | 12 | 7 | 29, 29, 29, 29, 29, 29, 28 | 70 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 204, thịt 8, gỗ 7777, quặng 1850, san hô 43, vé 180 | 359 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:29:59 | 24 | 40381 | 12 | 7 | 30, 30, 29, 29, 29, 29, 29 | 72 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 78, thịt 249, gỗ 8000, quặng 2974, san hô 45, vé 191 | 370 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:44:59 | 25 | 46689 | 12 | 8 | 30, 30, 29, 29, 24, 29, 29, 29 | 75 | Kho8 Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5 | 5 | 25 | vàng 69, thịt 31, gỗ 8000, quặng 2930, san hô 37, vé 222 | 400 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:59:59 | 25 | 47580 | 12 | 8 | 30, 30, 30, 29, 29, 29, 29, 29 | 75 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 206, thịt 18, gỗ 522, quặng 174, san hô 43, vé 236 | 414 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |

Lượt dungeon: 16 (thắng 16, thua 0). Cả đội gục ngoài đồng: 6 lần. Chuyến về làng: 145. Quái hạ: 9519 ngoài đồng, 3788 trong dungeon.

Thu nhập theo nguồn trong 6 giờ:

| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |
|---|---|---|---|---|---|---|
| Quái ngoài đồng (vật rơi) | 18987 | 17440 | 0 | 0 | 42 | 0 |
| Cây và đá | 0 | 0 | 43702 | 32597 | 0 | 0 |
| Công trình sản xuất | 938 | 0 | 2136 | 841 | 0 | 0 |
| Thưởng nhiệm vụ | 1310 | 885 | 720 | 540 | 9 | 23 |
| Dungeon: nhặt, qua tầng, chuỗi | 13671 | 609 | 0 | 0 | 0 | 0 |
| Dungeon: thưởng chặng | 6600 | 0 | 0 | 0 | 25 | 37 |

Thời gian chạy thật: 3.6 s cho 648000 bước (5.5 µs mỗi bước).

## Seed 4: ĐẠT

| Mốc | Hạn chót | Bot | Kết quả |
|---|---|---|---|
| Vượt tầng 5 | 0:45:00 | 0:15:35 | ĐẠT |
| Vượt tầng 10 | 1:30:00 | 0:30:58 | ĐẠT |
| Vượt tầng 15 | 3:00:00 | 1:09:19 | ĐẠT |
| Vượt tầng 20 | 6:00:00 | 2:18:23 | ĐẠT |
| Vượt tầng 25 | không bắt buộc | 3:54:11 | — |
| Đoạn dài nhất không tiến bộ (cả 6 giờ) | dưới 0:30:00 | 0:04:55 (bắt đầu ở 2:30:37) | ĐẠT |

Bảng tiến độ (mỗi 15 phút mô phỏng):

| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0:14:59 | 7 | 5232 | 4 | 3 | 5, 5, 8 | 18 | Kho3 Gỗ3 Quán1 Mỏ3 Tập1 Chợ2 Cổng1 | 0 | 3 | vàng 95, thịt 15, gỗ 40, quặng 141, san hô 0, vé 4 | 4 | q13 Tuyển thêm 2 lượt (1/2) |
| 0:29:59 | 9 | 9910 | 7 | 4 | 10, 9, 9, 9 | 24 | Kho4 Gỗ4 Quán1 Mỏ3 Tập2 Chợ3 Cổng2 | 1 | 8 | vàng 30, thịt 4, gỗ 186, quặng 134, san hô 0, vé 3 | 21 | q26 Hạ boss tầng 10: Cua Càng Thép Chúa (0/1) |
| 0:44:59 | 11 | 11595 | 10 | 4 | 13, 12, 12, 12 | 33 | Kho5 Gỗ4 Quán2 Mỏ3 Tập2+ Chợ3 Cổng2 | 2 | 10 | vàng 80, thịt 17, gỗ 851, quặng 67, san hô 5, vé 27 | 43 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 0:59:59 | 11 | 15263 | 10 | 5 | 14, 14, 9, 14, 14 | 33 | Kho5 Gỗ4 Quán2 Mỏ3+ Tập3 Chợ3 Cổng2+ | 2 | 10 | vàng 221, thịt 11, gỗ 908, quặng 73, san hô 1, vé 30 | 46 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 1:15:00 | 13 | 19030 | 12 | 5 | 16, 15, 15, 15, 15 | 39 | Kho5 Gỗ5 Quán2 Mỏ4 Tập3 Chợ4 Cổng3 | 3 | 15 | vàng 34, thịt 14, gỗ 1942, quặng 99, san hô 9, vé 37 | 74 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:30:00 | 14 | 20107 | 12 | 5 | 18, 18, 18, 17, 17 | 42 | Kho5 Gỗ5+ Quán2 Mỏ5 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 164, thịt 31, gỗ 556, quặng 178, san hô 13, vé 44 | 81 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:45:00 | 15 | 20899 | 12 | 5 | 20, 19, 19, 19, 19 | 45 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 267, thịt 8, gỗ 2447, quặng 691, san hô 17, vé 59 | 95 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:00:00 | 16 | 25286 | 12 | 6 | 20, 20, 20, 20, 20, 19 | 48 | Kho6 Gỗ6 Quán2 Mỏ5+ Tập4 Chợ5 Cổng3+ | 3 | 15 | vàng 219, thịt 22, gỗ 610, quặng 127, san hô 11, vé 36 | 104 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:15:00 | 17 | 26066 | 12 | 6 | 22, 21, 21, 21, 21, 20 | 51 | Kho6+ Gỗ6 Quán2 Mỏ6 Tập4 Chợ5 Cổng3+ | 3 | 15 | vàng 45, thịt 72, gỗ 2540, quặng 387, san hô 14, vé 1 | 124 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:30:00 | 18 | 26890 | 12 | 6 | 23, 23, 22, 22, 22, 22 | 54 | Kho7 Gỗ7 Quán2 Mỏ6 Tập4 Chợ6 Cổng4 | 4 | 20 | vàng 60, thịt 118, gỗ 3333, quặng 748, san hô 23, vé 39 | 154 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:45:00 | 19 | 27288 | 12 | 6 | 24, 24, 23, 23, 23, 23 | 54 | Kho7+ Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 202, thịt 27, gỗ 1079, quặng 102, san hô 23, vé 60 | 174 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:00:00 | 19 | 28210 | 12 | 6 | 25, 24, 24, 24, 24, 24 | 56 | Kho8 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4 | 4 | 20 | vàng 58, thịt 30, gỗ 4069, quặng 1003, san hô 25, vé 70 | 184 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:14:59 | 20 | 29571 | 12 | 6 | 25, 25, 25, 25, 24, 24 | 57 | Kho8 Gỗ7 Quán2 Mỏ6 Tập4+ Chợ6 Cổng4+ | 4 | 20 | vàng 217, thịt 116, gỗ 1458, quặng 13, san hô 26, vé 87 | 200 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:29:59 | 20 | 35489 | 12 | 7 | 25, 25, 25, 21, 25, 25, 24 | 60 | Kho8 Gỗ7 Quán2 Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 9, thịt 47, gỗ 4754, quặng 69, san hô 23, vé 62 | 215 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:44:59 | 21 | 36276 | 12 | 7 | 26, 25, 25, 25, 25, 25, 25 | 61 | Kho8 Gỗ7 Quán2+ Mỏ6 Tập5 Chợ6 Cổng4+ | 4 | 20 | vàng 247, thịt 157, gỗ 6922, quặng 276, san hô 26, vé 44 | 236 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:59:59 | 22 | 36945 | 12 | 7 | 26, 26, 26, 26, 26, 26, 26 | 63 | Kho8 Gỗ7 Quán3 Mỏ6+ Tập5 Chợ6+ Cổng5 | 5 | 25 | vàng 106, thịt 52, gỗ 6507, quặng 93, san hô 41, vé 92 | 276 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:14:59 | 22 | 37552 | 12 | 7 | 27, 27, 27, 26, 26, 26, 26 | 66 | Kho8 Gỗ7 Quán3 Mỏ7 Tập5 Chợ7 Cổng5 | 5 | 25 | vàng 60, thịt 109, gỗ 7871, quặng 1079, san hô 41, vé 114 | 297 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:29:59 | 22 | 37869 | 12 | 7 | 28, 27, 27, 27, 27, 27, 27 | 66 | Kho8 Gỗ7 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 13, thịt 142, gỗ 3131, quặng 426, san hô 43, vé 126 | 309 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:44:59 | 23 | 38374 | 12 | 7 | 28, 28, 28, 28, 28, 28, 27 | 67 | Kho8 Gỗ7+ Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 57, thịt 77, gỗ 5292, quặng 355, san hô 49, vé 154 | 336 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:59:59 | 23 | 38871 | 12 | 7 | 29, 29, 29, 29, 28, 28, 28 | 68 | Kho8+ Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 271, thịt 3, gỗ 6479, quặng 555, san hô 51, vé 166 | 348 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:14:59 | 24 | 39215 | 12 | 7 | 29, 29, 29, 29, 29, 29, 28 | 70 | Kho9 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ7 Cổng5 | 5 | 25 | vàng 31, thịt 99, gỗ 8831, quặng 1551, san hô 54, vé 191 | 372 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:29:59 | 24 | 44301 | 12 | 8 | 30, 29, 29, 29, 29, 29, 15, 29 | 72 | Kho9 Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5 | 5 | 25 | vàng 137, thịt 31, gỗ 10811, quặng 2491, san hô 42, vé 200 | 381 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:44:59 | 25 | 45664 | 12 | 8 | 30, 29, 29, 29, 29, 25, 29, 29 | 75 | Kho9 Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5 | 5 | 25 | vàng 263, thịt 66, gỗ 11848, quặng 2233, san hô 46, vé 228 | 408 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:59:59 | 25 | 46192 | 12 | 8 | 30, 30, 29, 29, 29, 29, 29, 29 | 75 | Kho9 Gỗ8 Quán3 Mỏ7 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 51, thịt 237, gỗ 4925, quặng 356, san hô 48, vé 244 | 424 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |

Lượt dungeon: 16 (thắng 16, thua 0). Cả đội gục ngoài đồng: 6 lần. Chuyến về làng: 139. Quái hạ: 9245 ngoài đồng, 3795 trong dungeon.

Thu nhập theo nguồn trong 6 giờ:

| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |
|---|---|---|---|---|---|---|
| Quái ngoài đồng (vật rơi) | 19309 | 17242 | 0 | 0 | 46 | 0 |
| Cây và đá | 0 | 0 | 48196 | 32761 | 0 | 0 |
| Công trình sản xuất | 993 | 0 | 2045 | 859 | 0 | 0 |
| Thưởng nhiệm vụ | 1310 | 885 | 720 | 540 | 9 | 23 |
| Dungeon: nhặt, qua tầng, chuỗi | 14089 | 568 | 0 | 0 | 0 | 0 |
| Dungeon: thưởng chặng | 6650 | 0 | 0 | 0 | 26 | 37 |

Thời gian chạy thật: 3.4 s cho 648000 bước (5.3 µs mỗi bước).

## Seed 5: ĐẠT

| Mốc | Hạn chót | Bot | Kết quả |
|---|---|---|---|
| Vượt tầng 5 | 0:45:00 | 0:15:50 | ĐẠT |
| Vượt tầng 10 | 1:30:00 | 0:30:43 | ĐẠT |
| Vượt tầng 15 | 3:00:00 | 1:06:39 | ĐẠT |
| Vượt tầng 20 | 6:00:00 | 2:11:27 | ĐẠT |
| Vượt tầng 25 | không bắt buộc | 3:46:14 | — |
| Đoạn dài nhất không tiến bộ (cả 6 giờ) | dưới 0:30:00 | 0:09:30 (bắt đầu ở 5:15:56) | ĐẠT |

Bảng tiến độ (mỗi 15 phút mô phỏng):

| Thời gian | Cấp NC | CP đội | Hero có | Ô đội | Cấp hero trong đội | Nấc | Công trình (cấp) | Chặng | Tầng | Tài nguyên | Tuyển | Nhiệm vụ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0:14:59 | 6 | 5048 | 3 | 3 | 5, 5, 9 | 18 | Kho3+ Gỗ3 Quán1 Mỏ3 Tập1 Chợ2 Cổng1 | 0 | 3 | vàng 4, thịt 18, gỗ 66, quặng 106, san hô 0, vé 5 | 5 | q13 Tuyển thêm 2 lượt (2/2) |
| 0:29:59 | 9 | 9429 | 6 | 4 | 10, 11, 11, 11 | 27 | Kho4 Gỗ4 Quán1 Mỏ3 Tập2 Chợ2 Cổng2 | 1 | 8 | vàng 46, thịt 29, gỗ 470, quặng 21, san hô 0, vé 3 | 21 | q26 Hạ boss tầng 10: Cua Càng Thép Chúa (0/1) |
| 0:44:59 | 11 | 11157 | 9 | 4 | 13, 13, 13, 12 | 33 | Kho5 Gỗ4 Quán2 Mỏ3 Tập2+ Chợ2 Cổng2 | 2 | 10 | vàng 144, thịt 18, gỗ 931, quặng 211, san hô 4, vé 34 | 42 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 0:59:59 | 12 | 15175 | 9 | 5 | 15, 15, 15, 7, 15 | 36 | Kho5 Gỗ4+ Quán2 Mỏ3 Tập3 Chợ3 Cổng2+ | 2 | 10 | vàng 56, thịt 16, gỗ 603, quặng 108, san hô 0, vé 0 | 48 | q32 Hạ boss tầng 15: Mắt Đá (0/1) |
| 1:15:00 | 14 | 18714 | 10 | 5 | 15, 15, 15, 15, 15 | 42 | Kho5 Gỗ5 Quán2 Mỏ4 Tập3 Chợ3 Cổng3 | 3 | 15 | vàng 101, thịt 40, gỗ 1943, quặng 677, san hô 16, vé 21 | 74 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:30:00 | 15 | 19972 | 12 | 5 | 19, 18, 18, 18, 18 | 45 | Kho5+ Gỗ5 Quán2 Mỏ4 Tập3+ Chợ4 Cổng3 | 3 | 15 | vàng 159, thịt 20, gỗ 1143, quặng 44, san hô 20, vé 33 | 86 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 1:45:00 | 16 | 20867 | 12 | 5 | 20, 20, 19, 19, 19 | 48 | Kho6 Gỗ5 Quán2 Mỏ4 Tập4 Chợ4 Cổng3+ | 3 | 15 | vàng 57, thịt 63, gỗ 205, quặng 33, san hô 22, vé 49 | 101 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:00:00 | 17 | 25438 | 12 | 6 | 21, 21, 21, 21, 20, 20 | 50 | Kho6 Gỗ6 Quán2 Mỏ5 Tập4 Chợ4 Cổng3+ | 3 | 15 | vàng 225, thịt 41, gỗ 2830, quặng 70, san hô 22, vé 2 | 110 | q36 Nâng Cổng Xoáy lên cấp 4 (0/1) |
| 2:15:00 | 18 | 26292 | 12 | 6 | 23, 23, 22, 22, 22, 22 | 52 | Kho6+ Gỗ6+ Quán2 Mỏ5 Tập4 Chợ5 Cổng4 | 4 | 20 | vàng 201, thịt 109, gỗ 2633, quặng 98, san hô 33, vé 37 | 152 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:30:00 | 19 | 27154 | 12 | 6 | 24, 24, 23, 23, 23, 23 | 57 | Kho7 Gỗ7 Quán2 Mỏ5 Tập4 Chợ5 Cổng4 | 4 | 20 | vàng 117, thịt 105, gỗ 4530, quặng 803, san hô 35, vé 47 | 162 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 2:45:00 | 19 | 27951 | 12 | 6 | 25, 25, 24, 24, 24, 24 | 57 | Kho7 Gỗ7 Quán2 Mỏ5 Tập4+ Chợ5 Cổng4 | 4 | 20 | vàng 159, thịt 21, gỗ 3292, quặng 719, san hô 38, vé 68 | 182 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:00:00 | 20 | 29445 | 12 | 6 | 25, 25, 25, 25, 25, 25 | 60 | Kho7 Gỗ7 Quán2 Mỏ5 Tập4+ Chợ5 Cổng4 | 4 | 20 | vàng 50, thịt 168, gỗ 5000, quặng 1956, san hô 40, vé 5 | 191 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:14:59 | 20 | 29827 | 12 | 6 | 26, 26, 26, 26, 26, 25 | 60 | Kho7 Gỗ7 Quán2 Mỏ5 Tập4+ Chợ5 Cổng4+ | 4 | 20 | vàng 219, thịt 149, gỗ 2268, quặng 994, san hô 40, vé 18 | 211 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:29:59 | 21 | 36229 | 12 | 7 | 26, 26, 22, 26, 26, 26, 26 | 63 | Kho7 Gỗ7 Quán2 Mỏ6 Tập5 Chợ5+ Cổng4+ | 4 | 20 | vàng 193, thịt 74, gỗ 4421, quặng 176, san hô 35, vé 31 | 224 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:44:59 | 22 | 37262 | 12 | 7 | 27, 27, 26, 26, 26, 26, 26 | 65 | Kho7+ Gỗ7 Quán2+ Mỏ6 Tập5 Chợ6 Cổng5 | 4 | 21 | vàng 9, thịt 183, gỗ 3721, quặng 111, san hô 38, vé 58 | 250 | q40 Hạ boss tầng 25: Thuyền Trưởng Ma (0/1) |
| 3:59:59 | 22 | 37810 | 12 | 7 | 28, 27, 27, 27, 27, 27, 27 | 66 | Kho8 Gỗ7 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 288, thịt 143, gỗ 4916, quặng 487, san hô 53, vé 104 | 288 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:14:59 | 23 | 38426 | 12 | 7 | 28, 28, 28, 28, 27, 27, 27 | 69 | Kho8 Gỗ7 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 5 | 25 | vàng 108, thịt 195, gỗ 7039, quặng 1071, san hô 54, vé 129 | 312 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:29:59 | 23 | 38647 | 12 | 7 | 29, 28, 28, 28, 28, 28, 28 | 69 | Kho8 Gỗ7 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 123, thịt 170, gỗ 2971, quặng 404, san hô 58, vé 139 | 322 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:44:59 | 24 | 38990 | 12 | 7 | 29, 29, 29, 29, 29, 28, 28 | 69 | Kho8 Gỗ7+ Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 256, thịt 208, gỗ 5230, quặng 1230, san hô 60, vé 167 | 349 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 4:59:59 | 24 | 39902 | 12 | 7 | 30, 30, 29, 29, 29, 29, 29 | 72 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 270, thịt 197, gỗ 7400, quặng 1703, san hô 62, vé 179 | 361 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:14:59 | 25 | 41086 | 12 | 7 | 30, 30, 30, 30, 30, 30, 29 | 75 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5+ Chợ6 Cổng5 | 5 | 25 | vàng 72, thịt 172, gỗ 7988, quặng 1470, san hô 69, vé 209 | 390 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:29:59 | 25 | 46607 | 12 | 8 | 30, 30, 30, 30, 30, 21, 30, 30 | 75 | Kho8 Gỗ8 Quán3 Mỏ7 Tập6 Chợ6 Cổng5+ | 5 | 25 | vàng 183, thịt 48, gỗ 612, quặng 260, san hô 61, vé 221 | 402 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:44:59 | 25 | 47262 | 12 | 8 | 30, 30, 30, 30, 30, 27, 30, 30 | 75 | Kho8 Gỗ8 Quán3 Mỏ7+ Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 75, thịt 149, gỗ 1140, quặng 213, san hô 66, vé 252 | 432 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |
| 5:59:59 | 26 | 47799 | 12 | 8 | 30, 30, 30, 30, 30, 30, 30, 30 | 76 | Kho8 Gỗ8 Quán3 Mỏ8 Tập6 Chợ7 Cổng5+ | 5 | 25 | vàng 287, thịt 658, gỗ 4773, quặng 368, san hô 72, vé 266 | 446 | q41 Hạ boss tầng 30: Vua Nhện Rạn (0/1) |

Lượt dungeon: 16 (thắng 16, thua 0). Cả đội gục ngoài đồng: 4 lần. Chuyến về làng: 153. Quái hạ: 10203 ngoài đồng, 3809 trong dungeon.

Thu nhập theo nguồn trong 6 giờ:

| Nguồn | vàng | thịt | gỗ | quặng | san hô | vé |
|---|---|---|---|---|---|---|
| Quái ngoài đồng (vật rơi) | 22351 | 19295 | 0 | 0 | 70 | 0 |
| Cây và đá | 0 | 0 | 47764 | 33916 | 0 | 0 |
| Công trình sản xuất | 845 | 0 | 2005 | 791 | 0 | 0 |
| Thưởng nhiệm vụ | 1310 | 885 | 720 | 540 | 9 | 23 |
| Dungeon: nhặt, qua tầng, chuỗi | 13631 | 574 | 0 | 0 | 0 | 0 |
| Dungeon: thưởng chặng | 6650 | 0 | 0 | 0 | 26 | 37 |

Thời gian chạy thật: 3.4 s cho 648000 bước (5.3 µs mỗi bước).
