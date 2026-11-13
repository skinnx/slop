# Số liệu cân bằng, tiến độ và mục tiêu bot (cột mốc 1)

## 1. Dữ liệu ở đâu, chép thế nào

- **Bản gốc của mọi số** là các file JSON trong `docs/design/data/`. Lập trình viên **chép nguyên** các file này sang `game/assets/resources/data/` (cùng tên). Không gõ lại số bằng tay.
- Các bảng trong tài liệu này được in ra từ JSON bằng `tools/gen_tables.py`, chỉ để đọc. Khi lệch nhau, JSON thắng.
- Sinh lại JSON: `cd docs/design/tools && python3 build_data.py ../data`. Kiểm tra: `python3 check.py ../data`. In bảng: `python3 gen_tables.py ../data`. Ba script chỉ dùng thư viện chuẩn của Python 3.
- Mọi file có `"version": 1`. Lõi nên kiểm tra kiểu dữ liệu (validator) khi nạp, như `docs/tech/cocos-3.8-guide.md` mục 2.3 gợi ý.
- Hình (`sprite`) ghi dạng `pack:số`: `td` = kenney-tiny-dungeon, `tb` = kenney-tiny-battle, `urban` = kenney-rpg-urban-kit, `pp` = kenney-pixel-platformer, `food` = kenney-pixel-platformer-food; `composite:rock` = hình ghép (xem `04-placeholder-art.md`).

| File | Nội dung | Mục luật trong `01-game-design.md` |
|---|---|---|
| `tuning.json` | Hằng số toàn cục: bước mô phỏng, bản đồ, vùng, render, đội, chiến đấu, vật rơi, đồng, dungeon, kinh tế, CP, lưu | nhiều mục |
| `heroes.json` | 12 hero: hệ, độ hiếm, vai, HP/ATK cấp 1 (đã nhân độ hiếm), nhịp, tầm, `gatherPower`, kỹ năng, hình | 8 |
| `skills.json` | 24 kỹ năng: loại, hồi chiêu, tham số theo sao | 8.4 |
| `hero-levels.json` | Thịt mỗi cấp, mảnh đột phá, mốc cấp | 8.2, 8.3 |
| `player-levels.json` | EXP mỗi cấp người chơi | 6.5 |
| `buildings.json` | 7 công trình: ô, giới hạn, mỗi cấp: chi phí, thời gian, cấp người chơi cần, hiệu ứng | 7 |
| `training-tree.json` | 90 nấc Sân Tập, 5 nút ô đội | 10.1, 11 |
| `recruit.json` | Giá, tỉ lệ theo cấp Quán, BONUS, trọng số, đổi Vé | 9 |
| `monsters.json` | Quái, tinh anh, boss, kỹ năng boss, hệ số vùng | 6.2, 12 |
| `drop-tables.json` | Bảng rơi, hệ số lượng theo vùng | 6.3 |
| `dungeon.json` | 6 chặng, 30 tầng: CP đề nghị, hệ số, nhóm quái, thưởng | 13 |
| `field-layout.json` | Loại nút tài nguyên, vị trí 145 nút, 32 ổ quái, biển gỗ, đường | 4.1, 6 |
| `quests.json` | 41 nhiệm vụ chính | 14 |

## 2. Hằng số toàn cục quan trọng (`tuning.json`)

| Khóa | Giá trị | Ý nghĩa |
|---|---|---|
| `sim.fixedStepSec` | 1/30 | Bước mô phỏng |
| `squad.moveSpeed` | 3.0 ô/s | Tốc độ đội |
| `squad.attackOnlyWhenIdle` | true | Chỉ đánh khi đứng yên |
| `squad.aggroRadius` / `gatherRadius` / `leashRadius` | 5 / 3 / 4 ô | Chọn mục tiêu quanh thủ lĩnh |
| `squad.startSlots` / `maxSlots` | 3 / 8 | Ô đội |
| `combat.attackWindupSec` | 0.2 s | Gồng trước khi gây sát thương |
| `pickup.magnetRadius` / `autoCollectSec` | 2.5 ô / 6 s | Nhặt vật rơi |
| `field.heroReviveSec` / `monsterRespawnSec` | 8 s / 20 s | Hồi sinh ngoài đồng |
| `dungeon.maxAlive` | 60 | Quái sống tối đa |
| `dungeon.streakTimeoutSec` / `streakMilestone` | 3 s / 20 | Chuỗi hạ gục |
| `economy.builderSlots` | 2 | Thợ xây |
| `economy.offlineCapHours` / `productionBufferHours` | 8 / 8 | Trần ngoại tuyến và bộ đệm sản xuất |
| `hero.growthPerLevel` | 0.03 | +3% chỉ số gốc mỗi cấp |
| `world.zoneRecommendedCp` | z1 1050, z2 4350, z3 10950 | Số trên biển gỗ mỗi vùng |

## 3. Bảng số liệu

### 3.1 Hero (cấp 1, đã nhân độ hiếm)

Độ hiếm nhân HP và ATK: Thường 1.0, Hiếm 1.2, Sử Thi 1.45, Huyền Thoại 1.75. Cột "CP cấp 1" tính theo công thức ở `01` mục 10.2 với kỹ năng 1.

| id | Tên | Hệ | Hiếm | Vai | HP | ATK | Nhịp (s) | Tầm | Thu | Kỹ năng | CP cấp 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bang | Bàng | Sức Mạnh | Thường | tank | 900 | 110 | 1.1 | 0.9 | 1 | Khiên Đập / Hô Vang | 1340 |
| do_neo | Đô Neo | Sức Mạnh | Hiếm | bruiser | 840 | 180 | 1.0 | 0.9 | 2 | Vung Neo / Đạp Đất | 1668 |
| rua_sat | Rùa Sắt | Sức Mạnh | Sử Thi | tank | 1305 | 160 | 1.1 | 0.9 | 1 | Mai Sắt / Sóng Đồng | 1916 |
| kinh_vuong | Kình Vương | Sức Mạnh | Huyền Thoại | bruiser | 1225 | 262 | 1.0 | 0.9 | 1 | Kình Ngư Nộ / Hải Kình Giáng | 2378 |
| se | Sẻ | Nhanh Nhẹn | Thường | archer | 450 | 170 | 0.9 | 4.0 | 1 | Bắn Đôi / Mưa Tên | 1319 |
| muc | Mực | Nhanh Nhẹn | Hiếm | rogue | 660 | 120 | 0.6 | 0.9 | 1 | Dao Xoáy / Mực Đen | 1580 |
| en | Én | Nhanh Nhẹn | Sử Thi | archer | 652 | 246 | 0.9 | 4.0 | 2 | Lao Xuyên / Gió Biển | 1909 |
| dieu | Diều | Nhanh Nhẹn | Huyền Thoại | archer | 788 | 298 | 0.9 | 4.0 | 1 | Diều Hâu Lao / Bão Lông Vũ | 2245 |
| lan | Lan | Trí Tuệ | Thường | healer | 520 | 120 | 1.2 | 3.5 | 1 | Tay Lành / Sương Mát | 1020 |
| dang | Đăng | Trí Tuệ | Hiếm | mage | 576 | 276 | 1.4 | 3.5 | 1 | Lửa Hải Đăng / Chớp Sáng | 1483 |
| san | San | Trí Tuệ | Sử Thi | healer | 754 | 174 | 1.2 | 3.5 | 1 | San Hô Hồi / Kén Bảo Vệ | 1479 |
| trieu | Triều | Trí Tuệ | Huyền Thoại | mage | 840 | 402 | 1.4 | 3.5 | 1 | Sóng Thần / Triều Cường | 2161 |

### 3.2 Kỹ năng

| id | Tên | Loại | Hồi (s) | Tham số (sao 1 / 2 / 3) |
|---|---|---|---|---|
| khien_dap | Khiên Đập | strike | 6 | mult [1.8, 2.2, 2.6] |
| ho_vang | Hô Vang | taunt | 10 | radius [3.0, 3.5, 4.0]; durationSec [3, 4, 5] |
| vung_neo | Vung Neo | cleave | 7 | mult [1.6, 1.9, 2.2]; radius [1.5, 1.7, 1.9] |
| dap_dat | Đạp Đất | nova | 9 | mult [1.4, 1.7, 2.0]; radius [2.0, 2.3, 2.6] |
| mai_sat | Mai Sắt | taunt | 9 | radius [3.5, 4.0, 4.5]; durationSec [4, 5, 6] |
| song_dong | Sóng Đồng | nova | 8 | mult [1.6, 1.9, 2.2]; radius [2.2, 2.5, 2.8] |
| kinh_ngu | Kình Ngư Nộ | buff_atk | 14 | pct [0.2, 0.25, 0.3]; durationSec [5, 6, 7] |
| ha_kinh | Hải Kình Giáng | cleave | 8 | mult [2.4, 2.8, 3.2]; radius [2.0, 2.2, 2.4] |
| ban_doi | Bắn Đôi | volley | 6 | mult [1.2, 1.4, 1.6]; count [2, 2, 3] |
| mua_ten | Mưa Tên | volley | 11 | mult [1.0, 1.2, 1.4]; count [4, 5, 6] |
| dao_xoay | Dao Xoáy | nova | 6 | mult [1.3, 1.5, 1.7]; radius [1.6, 1.8, 2.0] |
| muc_den | Mực Đen | strike | 8 | mult [2.5, 3.0, 3.5] |
| lao_xuyen | Lao Xuyên | volley | 7 | mult [1.5, 1.8, 2.1]; count [3, 3, 4] |
| gio_bien | Gió Biển | buff_atk | 15 | pct [0.15, 0.2, 0.25]; durationSec [6, 7, 8] |
| dieu_hau | Diều Hâu Lao | strike | 7 | mult [3.0, 3.5, 4.0] |
| bao_long | Bão Lông Vũ | volley | 10 | mult [1.3, 1.5, 1.7]; count [6, 7, 8] |
| tay_lanh | Tay Lành | heal | 5 | mult [1.8, 2.2, 2.6]; count [1, 1, 2] |
| suong_mat | Sương Mát | heal | 12 | mult [0.8, 1.0, 1.2]; count [8, 8, 8] |
| lua_den | Lửa Hải Đăng | cleave | 7 | mult [1.8, 2.1, 2.4]; radius [1.6, 1.8, 2.0] |
| chop_sang | Chớp Sáng | volley | 9 | mult [1.4, 1.6, 1.8]; count [3, 4, 5] |
| san_ho_hoi | San Hô Hồi | heal | 4 | mult [2.0, 2.4, 2.8]; count [2, 2, 3] |
| ken_bao_ve | Kén Bảo Vệ | heal | 14 | mult [1.2, 1.4, 1.6]; count [8, 8, 8] |
| song_than | Sóng Thần | nova | 9 | mult [2.2, 2.6, 3.0]; radius [3.0, 3.3, 3.6] |
| trieu_cuong | Triều Cường | cleave | 6 | mult [2.0, 2.4, 2.8]; radius [2.0, 2.2, 2.4] |

### 3.3 Cấp hero

| Cấp | Thịt | Mảnh N/R/E/L |
|---|---|---|
| 1→2 | 15 |  |
| 2→3 | 17 |  |
| 3→4 | 18 |  |
| 4→5 | 20 |  |
| 5→6 | 22 | 5/4/3/2 |
| 6→7 | 25 |  |
| 7→8 | 27 |  |
| 8→9 | 30 |  |
| 9→10 | 34 |  |
| 10→11 | 37 | 10/8/6/4 |
| 11→12 | 41 |  |
| 12→13 | 45 |  |
| 13→14 | 50 |  |
| 14→15 | 56 |  |
| 15→16 | 61 | 15/12/9/6 |
| 16→17 | 68 |  |
| 17→18 | 75 |  |
| 18→19 | 83 |  |
| 19→20 | 92 |  |
| 20→21 | 100 | 20/16/12/8 |
| 21→22 | 115 |  |
| 22→23 | 125 |  |
| 23→24 | 140 |  |
| 24→25 | 150 |  |
| 25→26 | 170 | 25/20/15/10 |
| 26→27 | 185 |  |
| 27→28 | 205 |  |
| 28→29 | 230 |  |
| 29→30 | 250 |  |

Tổng thịt 1→30: 2486 ; 1→25: 1446

### 3.4 Cấp người chơi

`exp(L→L+1) = round(10 × L^2.3)` (đa thức, không theo hàm mũ, để không có "tường" cuối game).

| Cấp | EXP | EXP cộng dồn |
|---|---|---|
| 1→2 | 10 | 10 |
| 2→3 | 49 | 59 |
| 3→4 | 125 | 184 |
| 4→5 | 245 | 429 |
| 5→6 | 405 | 834 |
| 6→7 | 615 | 1449 |
| 7→8 | 880 | 2329 |
| 8→9 | 1190 | 3519 |
| 9→10 | 1570 | 5089 |
| 10→11 | 2000 | 7089 |
| 11→12 | 2480 | 9569 |
| 12→13 | 3030 | 12599 |
| 13→14 | 3650 | 16249 |
| 14→15 | 4330 | 20579 |
| 15→16 | 5070 | 25649 |
| 16→17 | 5880 | 31529 |
| 17→18 | 6760 | 38289 |
| 18→19 | 7710 | 45999 |
| 19→20 | 8730 | 54729 |
| 20→21 | 9830 | 64559 |
| 21→22 | 11000 | 75559 |
| 22→23 | 12250 | 87809 |
| 23→24 | 13550 | 101359 |
| 24→25 | 14950 | 116309 |
| 25→26 | 16400 | 132709 |
| 26→27 | 17950 | 150659 |
| 27→28 | 19600 | 170259 |
| 28→29 | 21300 | 191559 |
| 29→30 | 23100 | 214659 |

### 3.5 Công trình theo cấp

Cấp 1 là chi phí xây mới. Hiệu ứng của công trình sản xuất ghi "sản lượng/giờ, bộ đệm".

**Nhà Kho** (`storage`), 3×3 ô, mở ở cấp người chơi 1

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | có sẵn | 0 | 1 | trần 300 |
| 2 | wood 90 | 30 | 2 | trần 500 |
| 3 | wood 140, ore 40 | 60 | 4 | trần 800 |
| 4 | wood 215, ore 62 | 120 | 6 | trần 1300 |
| 5 | wood 335, ore 96 | 240 | 8 | trần 2000 |
| 6 | wood 520, ore 150 | 420 | 11 | trần 3200 |
| 7 | wood 805, ore 230 | 600 | 14 | trần 5000 |
| 8 | wood 1250, ore 360 | 900 | 17 | trần 8000 |
| 9 | wood 1930, ore 555 | 1200 | 20 | trần 12000 |
| 10 | wood 3000, ore 860 | 1800 | 23 | trần 18000 |

**Trại Gỗ** (`lumber_camp`), 2×2 ô, mở ở cấp người chơi 1

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 30 | 10 | 1 | 60/giờ, đệm 480 |
| 2 | wood 48 | 30 | 3 | 90/giờ, đệm 720 |
| 3 | wood 77, ore 51 | 60 | 5 | 130/giờ, đệm 1040 |
| 4 | wood 125, ore 82 | 120 | 7 | 180/giờ, đệm 1440 |
| 5 | wood 195, ore 130 | 240 | 9 | 240/giờ, đệm 1920 |
| 6 | wood 315, ore 210 | 420 | 12 | 310/giờ, đệm 2480 |
| 7 | wood 505, ore 335 | 600 | 15 | 390/giờ, đệm 3120 |
| 8 | wood 805, ore 535 | 900 | 18 | 480/giờ, đệm 3840 |
| 9 | wood 1290, ore 860 | 1200 | 21 | 580/giờ, đệm 4640 |
| 10 | wood 2060, ore 1370 | 1800 | 24 | 700/giờ, đệm 5600 |

**Quán Mỏ Neo** (`tavern`), 3×3 ô, mở ở cấp người chơi 2

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 60 | 20 | 2 | oddsTier=1 |
| 2 | wood 300, ore 120 | 120 | 6 | oddsTier=2 |
| 3 | wood 900, ore 400 | 600 | 11 | oddsTier=3 |
| 4 | wood 2400, ore 1100 | 1200 | 16 | oddsTier=4 |
| 5 | wood 5600, ore 2600 | 1800 | 21 | oddsTier=5 |

**Mỏ Quặng** (`ore_mine`), 2×2 ô, mở ở cấp người chơi 3

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 60 | 10 | 3 | 30/giờ, đệm 240 |
| 2 | wood 96 | 30 | 4 | 45/giờ, đệm 360 |
| 3 | wood 155, ore 64 | 60 | 6 | 65/giờ, đệm 520 |
| 4 | wood 245, ore 100 | 120 | 8 | 90/giờ, đệm 720 |
| 5 | wood 395, ore 165 | 240 | 10 | 120/giờ, đệm 960 |
| 6 | wood 630, ore 260 | 420 | 13 | 155/giờ, đệm 1240 |
| 7 | wood 1010, ore 420 | 600 | 16 | 195/giờ, đệm 1560 |
| 8 | wood 1610, ore 670 | 900 | 19 | 240/giờ, đệm 1920 |
| 9 | wood 2580, ore 1070 | 1200 | 22 | 290/giờ, đệm 2320 |
| 10 | wood 4120, ore 1720 | 1800 | 25 | 350/giờ, đệm 2800 |

**Sân Tập** (`training_yard`), 3×3 ô, mở ở cấp người chơi 4

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 100 | 30 | 4 | maxSquadSlotsUnlockable=3 |
| 2 | wood 400, ore 150 | 300 | 7 | maxSquadSlotsUnlockable=4 |
| 3 | wood 1000, ore 450 | 900 | 10 | maxSquadSlotsUnlockable=5 |
| 4 | wood 2000, ore 900 | 1500 | 14 | maxSquadSlotsUnlockable=6 |
| 5 | wood 3600, ore 1600 | 2400 | 18 | maxSquadSlotsUnlockable=7 |
| 6 | wood 6000, ore 2800 | 3600 | 22 | maxSquadSlotsUnlockable=8 |

**Chợ Bến** (`market`), 2×2 ô, mở ở cấp người chơi 5

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 80 | 10 | 5 | 40/giờ, đệm 320 |
| 2 | wood 130, ore 48 | 30 | 6 | 60/giờ, đệm 480 |
| 3 | wood 205, ore 77 | 60 | 8 | 85/giờ, đệm 680 |
| 4 | wood 330, ore 125 | 120 | 10 | 115/giờ, đệm 920 |
| 5 | wood 525, ore 195 | 240 | 12 | 150/giờ, đệm 1200 |
| 6 | wood 840, ore 315 | 420 | 14 | 190/giờ, đệm 1520 |
| 7 | wood 1340, ore 505 | 600 | 17 | 235/giờ, đệm 1880 |
| 8 | wood 2150, ore 805 | 900 | 20 | 285/giờ, đệm 2280 |
| 9 | wood 3440, ore 1290 | 1200 | 23 | 340/giờ, đệm 2720 |
| 10 | wood 5500, ore 2060 | 1800 | 26 | 400/giờ, đệm 3200 |

**Cổng Xoáy** (`dungeon_gate`), 3×3 ô, mở ở cấp người chơi 6

| Cấp | Chi phí | Xây (s) | Cần cấp NC | Hiệu ứng |
|---|---|---|---|---|
| 1 | wood 150 | 30 | 6 | maxStage=1 |
| 2 | wood 600, ore 250 | 300 | 8 | maxStage=2 |
| 3 | wood 1500, ore 700 | 900 | 11 | maxStage=3 |
| 4 | wood 3000, ore 1300 | 1500 | 15 | maxStage=4 |
| 5 | wood 5000, ore 2400 | 2400 | 19 | maxStage=5 |
| 6 | wood 8000, ore 4000 | 3600 | 23 | maxStage=6 |

### 3.6 Sân Tập

Nấc chẵn = HP +12 cho mọi hero, nấc lẻ = ATK +3. Giá `round(6 × 1.07^k)`.

| Cấp NC | Nấc mở (giá quặng) |
|---|---|
| 1 | #0 HP+12 (6), #1 ATK+3 (6), #2 HP+12 (7) |
| 2 | #3 ATK+3 (7), #4 HP+12 (8), #5 ATK+3 (8) |
| 3 | #6 HP+12 (9), #7 ATK+3 (10), #8 HP+12 (10) |
| 4 | #9 ATK+3 (11), #10 HP+12 (12), #11 ATK+3 (13) |
| 5 | #12 HP+12 (14), #13 ATK+3 (14), #14 HP+12 (15) |
| 6 | #15 ATK+3 (17), #16 HP+12 (18), #17 ATK+3 (19) |
| 7 | #18 HP+12 (20), #19 ATK+3 (22), #20 HP+12 (23) |
| 8 | #21 ATK+3 (25), #22 HP+12 (27), #23 ATK+3 (28) |
| 9 | #24 HP+12 (30), #25 ATK+3 (33), #26 HP+12 (35) |
| 10 | #27 ATK+3 (37), #28 HP+12 (40), #29 ATK+3 (43) |
| 11 | #30 HP+12 (46), #31 ATK+3 (49), #32 HP+12 (52) |
| 12 | #33 ATK+3 (56), #34 HP+12 (60), #35 ATK+3 (64) |
| 13 | #36 HP+12 (69), #37 ATK+3 (73), #38 HP+12 (78) |
| 14 | #39 ATK+3 (84), #40 HP+12 (90), #41 ATK+3 (96) |
| 15 | #42 HP+12 (105), #43 ATK+3 (110), #44 HP+12 (120) |
| 16 | #45 ATK+3 (125), #46 HP+12 (135), #47 ATK+3 (145) |
| 17 | #48 HP+12 (155), #49 ATK+3 (165), #50 HP+12 (175) |
| 18 | #51 ATK+3 (190), #52 HP+12 (200), #53 ATK+3 (215) |
| 19 | #54 HP+12 (230), #55 ATK+3 (250), #56 HP+12 (265) |
| 20 | #57 ATK+3 (285), #58 HP+12 (305), #59 ATK+3 (325) |
| 21 | #60 HP+12 (350), #61 ATK+3 (370), #62 HP+12 (400) |
| 22 | #63 ATK+3 (425), #64 HP+12 (455), #65 ATK+3 (490) |
| 23 | #66 HP+12 (520), #67 ATK+3 (560), #68 HP+12 (595) |
| 24 | #69 ATK+3 (640), #70 HP+12 (685), #71 ATK+3 (730) |
| 25 | #72 HP+12 (785), #73 ATK+3 (840), #74 HP+12 (895) |
| 26 | #75 ATK+3 (960), #76 HP+12 (1030), #77 ATK+3 (1100) |
| 27 | #78 HP+12 (1180), #79 ATK+3 (1260), #80 HP+12 (1350) |
| 28 | #81 ATK+3 (1440), #82 HP+12 (1540), #83 ATK+3 (1650) |
| 29 | #84 HP+12 (1760), #85 ATK+3 (1890), #86 HP+12 (2020) |
| 30 | #87 ATK+3 (2160), #88 HP+12 (2310), #89 ATK+3 (2470) |

Tổng quặng cả cây: 37744
| Ô đội | San Hô Đỏ | Cần Sân Tập cấp |
|---|---|---|
| 4 | 2 | 2 |
| 5 | 4 | 3 |
| 6 | 6 | 4 |
| 7 | 9 | 5 |
| 8 | 12 | 6 |

### 3.7 Quái và boss

Ngoài đồng nhân `fieldZoneMult` = z1 0.6, z2 2.0, z3 5.0 cho HP và ATK. Trong dungeon nhân `hpMult`/`atkMult` của tầng. Ví dụ Cua Cát ở Bãi Vỏ Sò: HP 156, ATK 18; Bàng cấp 1 (ATK 110) hạ nó trong 2 nhát.

| id | Tên | Loại | HP gốc | ATK gốc | Nhịp | Tầm | Tốc độ | Bán kính | EXP | Bảng rơi | Kỹ năng |
|---|---|---|---|---|---|---|---|---|---|---|---|
| cua_cat | Cua Cát | normal | 260 | 30 | 1.2 | 0.8 | 1.6 | 0.35 | 4 | field_meat |  |
| chuot_ben | Chuột Bến | normal | 200 | 26 | 1.0 | 0.8 | 2.2 | 0.3 | 4 | field_gold |  |
| sua_nhay | Sứa Nhầy | normal | 330 | 38 | 1.3 | 0.8 | 1.3 | 0.35 | 5 | field_meat |  |
| doi_hang | Dơi Hang | normal | 220 | 34 | 0.9 | 0.8 | 2.8 | 0.3 | 5 | field_gold |  |
| nhen_ran | Nhện Rạn | normal | 300 | 44 | 1.1 | 0.8 | 2.0 | 0.35 | 6 | field_meat |  |
| ma_bien | Hồn Ma Biển | normal | 240 | 40 | 1.4 | 3.0 | 1.6 | 0.35 | 6 | field_gold |  |
| cua_thep | Cua Càng Thép | elite | 2600 | 90 | 1.5 | 1.1 | 1.4 | 0.8 | 40 | field_elite |  |
| d_chuot | Chuột Hang | normal | 200 | 26 | 1.0 | 0.8 | 2.2 | 0.3 | 3 | dungeon_mob |  |
| d_doi | Dơi Hang | normal | 160 | 30 | 0.9 | 0.8 | 2.8 | 0.3 | 3 | dungeon_mob |  |
| d_nhen | Nhện Rạn | normal | 260 | 34 | 1.1 | 0.8 | 2.0 | 0.35 | 3 | dungeon_mob |  |
| d_nhay | Sứa Nhầy | normal | 360 | 30 | 1.3 | 0.8 | 1.3 | 0.35 | 3 | dungeon_mob |  |
| d_ma | Hồn Ma Biển | normal | 200 | 32 | 1.4 | 3.0 | 1.6 | 0.35 | 3 | dungeon_mob |  |
| b_ruong | Rương Nhai | boss | 9000 | 70 | 1.6 | 1.6 | 1.2 | 1.2 | 60 | boss | slam |
| b_cua | Cua Càng Thép Chúa | boss | 9000 | 70 | 1.5 | 1.6 | 1.4 | 1.2 | 60 | boss | slam, charge |
| b_mat | Mắt Đá | boss | 9500 | 72 | 1.7 | 1.6 | 1.0 | 1.2 | 60 | boss | slam, summon |
| b_phuthuy | Phù Thủy Rạn | boss | 8500 | 75 | 1.4 | 1.6 | 1.3 | 1.2 | 60 | boss | slam, charge, summon |
| b_thuyentruong | Thuyền Trưởng Ma | boss | 9500 | 75 | 1.4 | 1.6 | 1.5 | 1.2 | 60 | boss | slam, charge, summon |
| b_vuanhen | Vua Nhện Rạn | boss | 10000 | 78 | 1.3 | 1.6 | 1.6 | 1.2 | 60 | boss | slam, charge, summon |

Kỹ năng boss: Đập Đất (vòng bán kính 3, báo 1.5 s, ×3.0 ATK, hồi 7 s), Húc Lao (chữ nhật 7 × 1.6, báo 1.2 s, ×2.0, hồi 11 s), Gọi Bầy (8 quái, hồi 15 s).

### 3.8 Bảng rơi

Ngoài đồng nhân `zoneAmountMult` z1 1.0, z2 1.5, z3 2.0. Vàng của `dungeon_mob` nhân `goldMult` của tầng. Boss không rơi gì; thưởng chặng nằm ở `dungeon.json → stages`.

| Bảng | Dòng |
|---|---|
| field_meat | meat 1-2 @100%; gold 1-1 @30% |
| field_gold | gold 1-2 @100%; meat 1-1 @30% |
| field_elite | meat 15-20 @100%; gold 30-40 @100%; coral 1-1 @25% |
| dungeon_mob | gold 1-1 @35%; meat 1-1 @15% |
| boss | gold 0-0 @100% |

### 3.9 Hang Xoáy

`recommendedCp(f) = round50(3100 × 1.0995^(f−1))`. Hệ số quái tính ngược từ CP đề nghị (mục 6.3). Vì số ô đội dự kiến tăng theo chặng (3, 4, 5, 6, 7, 8), hệ số quái đầu chặng mới có thể thấp hơn cuối chặng trước một chút; CP đề nghị vẫn tăng đều.

| Chặng | Tên | Tầng | CP đề nghị | Lần đầu | Đánh lại |
|---|---|---|---|---|---|
| 1 | Hang Rương Cũ | 1–5 | 4550 | 300 vàng, 2 San Hô, 3 Vé | 75 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |
| 2 | Hang Càng Thép | 6–10 | 7300 | 500 vàng, 3 San Hô, 4 Vé | 125 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |
| 3 | Hang Mắt Đá | 11–15 | 11700 | 700 vàng, 4 San Hô, 5 Vé | 175 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |
| 4 | Hang Rạn Phù Thủy | 16–20 | 18800 | 1000 vàng, 5 San Hô, 6 Vé | 250 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |
| 5 | Hang Tàu Ma | 21–25 | 30200 | 1400 vàng, 6 San Hô, 8 Vé | 350 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |
| 6 | Hang Vua Nhện | 26–30 | 48550 | 1900 vàng, 7 San Hô, 10 Vé | 475 vàng, 1 Vé, 35% 1 San Hô (chắc chắn mỗi lần thứ 3) |

| Tầng | Chặng | CP đề nghị | hp/atkMult | goldMult | expMult | Vàng qua tầng | Nhóm quái |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 3100 | 0.379 | 1.0 | 1.0 | 25 | d_chuot×20 ring; d_doi×20 ring |
| 2 | 1 | 3400 | 0.375 | 1.05 | 1.06 | 27 | d_chuot×24 front; d_doi×24 front |
| 3 | 1 | 3750 | 0.385 | 1.103 | 1.124 | 29 | d_chuot×27 front; d_doi×27 ring +4s |
| 4 | 1 | 4100 | 0.4 | 1.158 | 1.191 | 31 | d_chuot×20 ring; d_doi×20 ring +8s; d_chuot×20 ring +16s |
| 5 | 1 | 4550 | 0.562 | 1.216 | 1.262 | 0 | b_ruong×1 boss; d_chuot×15 front; d_doi×15 ring +10s |
| 6 | 2 | 5000 | 0.522 | 1.276 | 1.338 | 37 | d_chuot×14 ring; d_nhen×13 ring; d_doi×13 ring |
| 7 | 2 | 5500 | 0.512 | 1.34 | 1.419 | 40 | d_chuot×16 front; d_nhen×16 front; d_doi×16 front |
| 8 | 2 | 6000 | 0.567 | 1.407 | 1.504 | 43 | d_chuot×27 front; d_doi×27 ring +4s |
| 9 | 2 | 6600 | 0.543 | 1.477 | 1.594 | 46 | d_chuot×20 ring; d_nhen×20 ring +8s; d_doi×20 ring +16s |
| 10 | 2 | 7300 | 0.825 | 1.551 | 1.689 | 0 | b_cua×1 boss; d_chuot×15 front; d_doi×15 ring +10s |
| 11 | 3 | 8000 | 0.713 | 1.629 | 1.791 | 54 | d_nhen×14 ring; d_nhay×13 ring; d_doi×13 ring |
| 12 | 3 | 8800 | 0.698 | 1.71 | 1.898 | 58 | d_nhen×16 front; d_nhay×16 front; d_doi×16 front |
| 13 | 3 | 9700 | 0.756 | 1.796 | 2.012 | 63 | d_nhen×27 front; d_doi×27 ring +4s |
| 14 | 3 | 10650 | 0.737 | 1.886 | 2.133 | 68 | d_nhen×20 ring; d_nhay×20 ring +8s; d_doi×20 ring +16s |
| 15 | 3 | 11700 | 1.184 | 1.98 | 2.261 | 0 | b_mat×1 boss; d_nhen×15 front; d_doi×15 ring +10s |
| 16 | 4 | 12850 | 1.132 | 2.079 | 2.397 | 79 | d_nhay×14 ring; d_ma×13 ring; d_nhen×13 ring |
| 17 | 4 | 14150 | 1.105 | 2.183 | 2.54 | 86 | d_nhay×16 front; d_ma×16 front; d_nhen×16 front |
| 18 | 4 | 15550 | 1.031 | 2.292 | 2.693 | 93 | d_nhay×27 front; d_nhen×27 ring +4s |
| 19 | 4 | 17100 | 1.161 | 2.407 | 2.854 | 100 | d_nhay×20 ring; d_ma×20 ring +8s; d_nhen×20 ring +16s |
| 20 | 4 | 18800 | 1.678 | 2.527 | 3.026 | 0 | b_phuthuy×1 boss; d_nhay×15 front; d_nhen×15 ring +10s |
| 21 | 5 | 20650 | 1.854 | 2.653 | 3.207 | 115 | d_ma×14 ring; d_doi×13 ring; d_nhay×13 ring |
| 22 | 5 | 22700 | 1.787 | 2.786 | 3.4 | 125 | d_ma×16 front; d_doi×16 front; d_nhay×16 front |
| 23 | 5 | 25000 | 1.804 | 2.925 | 3.604 | 135 | d_ma×27 front; d_nhay×27 ring +4s |
| 24 | 5 | 27450 | 1.868 | 3.072 | 3.82 | 145 | d_ma×20 ring; d_doi×20 ring +8s; d_nhay×20 ring +16s |
| 25 | 5 | 30200 | 2.896 | 3.225 | 4.049 | 0 | b_thuyentruong×1 boss; d_ma×15 front; d_nhay×15 ring +10s |
| 26 | 6 | 33200 | 2.739 | 3.386 | 4.292 | 170 | d_nhen×14 ring; d_ma×13 ring; d_nhay×13 ring |
| 27 | 6 | 36500 | 2.638 | 3.556 | 4.549 | 185 | d_nhen×16 front; d_ma×16 front; d_nhay×16 front |
| 28 | 6 | 40150 | 2.446 | 3.733 | 4.822 | 200 | d_nhen×27 front; d_nhay×27 ring +4s |
| 29 | 6 | 44150 | 2.742 | 3.92 | 5.112 | 215 | d_nhen×20 ring; d_ma×20 ring +8s; d_nhay×20 ring +16s |
| 30 | 6 | 48550 | 4.111 | 4.116 | 5.418 | 0 | b_vuanhen×1 boss; d_nhen×15 front; d_nhay×15 ring +10s |

### 3.10 Tuyển hero

Giá 100 vàng/lượt, 1x/2x/3x, đổi thẻ 30 phút hoặc 50 vàng, +5 mảnh mỗi lượt trùng, +1 Vé mỗi lượt, BONUS mỗi 10 lượt. Tỉ lệ theo cấp Quán: `01` mục 9.2. Đổi Vé: `01` mục 9.4.

### 3.11 Nhiệm vụ chính

| id | Loại | Tham số | Chữ | Thưởng | Chỉ đường |
|---|---|---|---|---|---|
| q01 | gather | {"resource": "wood", "count": 10} | Chặt cây lấy 10 gỗ | gold 50 | node:tree |
| q02 | kill | {"monster": "cua_cat", "count": 3} | Hạ 3 Cua Cát | meat 15 | camp:cua_cat |
| q03 | hero_level | {"level": 2} | Nâng một hero lên cấp 2 | meat 20 | ui:hero_list |
| q04 | build | {"building": "lumber_camp"} | Xây: Trại Gỗ | wood 40 | ui:build_button |
| q05 | gather | {"resource": "ore", "count": 10} | Đập đá lấy 10 quặng | gold 50 | node:rock |
| q06 | build | {"building": "tavern"} | Xây: Quán Mỏ Neo | gold 100 | ui:build_button |
| q07 | recruit | {"count": 1} | Tuyển 1 hero ở Quán Mỏ Neo | wood 50 | building:tavern |
| q08 | auto_assign | {} | Mở Xếp đội và bấm TỰ XẾP | meat 30 | ui:squad_button |
| q09 | kill | {"monster": "chuot_ben", "count": 5} | Hạ 5 Chuột Bến | gold 60 | camp:chuot_ben |
| q10 | build | {"building": "ore_mine"} | Xây: Mỏ Quặng | ore 30 | ui:build_button |
| q11 | collect | {"building": "lumber_camp", "count": 1} | Thu gỗ ở Trại Gỗ | wood 30 | building:lumber_camp |
| q12 | upgrade | {"building": "storage", "level": 2} | Nâng Nhà Kho lên cấp 2 | ore 30 | building:storage |
| q13 | recruit | {"count": 2} | Tuyển thêm 2 lượt | gold 100 | building:tavern |
| q14 | hero_level | {"level": 5} | Nâng một hero lên cấp 5 | meat 40 | ui:hero_list |
| q15 | build | {"building": "training_yard"} | Xây: Sân Tập | ore 40 | ui:build_button |
| q16 | training | {"count": 2} | Mở 2 nấc ở Sân Tập | ore 40 | building:training_yard |
| q17 | build | {"building": "market"} | Xây: Chợ Bến | gold 100 | ui:build_button |
| q18 | kill | {"zone": "z1", "count": 20} | Hạ 20 quái ở Bãi Vỏ Sò | meat 50 | zone:z1 |
| q19 | build | {"building": "dungeon_gate"} | Xây: Cổng Xoáy | gold 100 | ui:build_button |
| q20 | clear_floor | {"floor": 1} | Vượt tầng 1 Hang Xoáy | gold 100 | building:dungeon_gate |
| q21 | clear_floor | {"floor": 5} | Hạ boss tầng 5: Rương Nhai | tickets 3 | building:dungeon_gate |
| q22 | slots | {"count": 4} | Mở ô đội thứ 4 ở Sân Tập | wood 200 | building:training_yard |
| q23 | upgrade | {"building": "lumber_camp", "level": 3} | Nâng Trại Gỗ lên cấp 3 | ore 100 | building:lumber_camp |
| q24 | kill | {"monster": "sua_nhay", "count": 10} | Hạ 10 Sứa Nhầy ở Rừng Dừa Rậm | meat 80 | camp:sua_nhay |
| q25 | upgrade | {"building": "dungeon_gate", "level": 2} | Nâng Cổng Xoáy lên cấp 2 | gold 150 | building:dungeon_gate |
| q26 | clear_floor | {"floor": 10} | Hạ boss tầng 10: Cua Càng Thép Chúa | coral 1 | building:dungeon_gate |
| q27 | hero_level | {"level": 10} | Nâng một hero lên cấp 10 | meat 150 | ui:hero_list |
| q28 | upgrade | {"building": "tavern", "level": 2} | Nâng Quán Mỏ Neo lên cấp 2 | tickets 5 | building:tavern |
| q29 | kill | {"monster": "doi_hang", "count": 20} | Hạ 20 Dơi Hang | gold 200 | camp:doi_hang |
| q30 | training | {"count": 30} | Mở tổng cộng 30 nấc ở Sân Tập | ore 300 | building:training_yard |
| q31 | upgrade | {"building": "storage", "level": 5} | Nâng Nhà Kho lên cấp 5 | wood 400 | building:storage |
| q32 | clear_floor | {"floor": 15} | Hạ boss tầng 15: Mắt Đá | coral 2 | building:dungeon_gate |
| q33 | slots | {"count": 5} | Mở ô đội thứ 5 | tickets 5 | building:training_yard |
| q34 | kill | {"monster": "nhen_ran", "count": 20} | Hạ 20 Nhện Rạn ở Gò Đá Lam | meat 200 | camp:nhen_ran |
| q35 | kill | {"monster": "cua_thep", "count": 1} | Hạ Cua Càng Thép (quái tinh anh) | coral 1 | camp:cua_thep |
| q36 | upgrade | {"building": "dungeon_gate", "level": 4} | Nâng Cổng Xoáy lên cấp 4 | gold 300 | building:dungeon_gate |
| q37 | clear_floor | {"floor": 20} | Hạ boss tầng 20: Phù Thủy Rạn | coral 2 | building:dungeon_gate |
| q38 | hero_level | {"level": 20} | Nâng một hero lên cấp 20 | meat 300 | ui:hero_list |
| q39 | slots | {"count": 6} | Mở ô đội thứ 6 | tickets 10 | building:training_yard |
| q40 | clear_floor | {"floor": 25} | Hạ boss tầng 25: Thuyền Trưởng Ma | coral 3 | building:dungeon_gate |
| q41 | clear_floor | {"floor": 30} | Hạ boss tầng 30: Vua Nhện Rạn | gold 1000 | building:dungeon_gate |

## 4. Tiến độ mong muốn

Số dưới đây là **mục tiêu thiết kế**, khớp với mô hình kinh tế (`tools/check.py`, mục 6). Bot và QA so với bảng này.

| Thời gian chơi | Người chơi mới nên đạt được |
|---|---|
| 5 phút | Cấp người chơi 3. Đã chặt cây, đập đá, hạ cua và chuột ở Bãi Vỏ Sò. Bàng cấp 4–5. Đã xây Trại Gỗ; Quán Mỏ Neo đang xây hoặc vừa xong; lượt tuyển đầu (Sẻ) ở khoảng phút 6. Đang ở nhiệm vụ 7–9. |
| 30 phút | Cấp người chơi 8. Đủ 7 loại công trình (Nhà Kho cấp 2–3). 5–6 hero, đội 3 người cấp khoảng 7, CP khoảng 6800. Khoảng 25 nấc Sân Tập. **Đã vượt chặng 1 (tầng 5)**, có 2 San Hô Đỏ. Đã sang Rừng Dừa Rậm. |
| 2 giờ | Cấp người chơi 14. 10–12 hero, đội 5 người cấp khoảng 15, CP khoảng 19000. Khoảng 40 nấc. **Đã vượt chặng 3 (tầng 15)**. Đang farm Gò Đá Lam. Nhà Kho cấp 5. |
| 10 giờ | Cấp người chơi 24. Đủ 12 hero, đội 7 người cấp 25–26, CP khoảng 40000. 72 nấc. **Đã vượt chặng 5 (tầng 25)** (mô hình: 6.6–7.3 giờ). Chặng 6 (CP đề nghị 48550) là mục tiêu tiếp theo, cần thêm vài giờ. |

## 5. Mục tiêu bot mô phỏng (tiêu chí hoàn thành M1)

### 5.1 Mục tiêu

**Từ một save mới, bot headless (không hiển thị) phải hạ boss tầng 20 (vượt chặng 4) trong không quá 6 giờ thời gian chơi mô phỏng, và không bị kẹt.**

Các mốc kiểm tra dọc đường (phải đạt, trễ hơn là lỗi cân bằng hoặc lỗi bot):

| Mốc | Hạn chót (giờ mô phỏng) | Mô hình dự kiến |
|---|---|---|
| Vượt tầng 5 | 0:45 | 0:16 |
| Vượt tầng 10 | 1:30 | 0:37–0:43 |
| Vượt tầng 15 | 3:00 | 1:30–1:45 |
| **Vượt tầng 20** | **6:00** | **3:04–3:10** |
| (Tham khảo) vượt tầng 25 | không bắt buộc | 6:36–7:16 |

Hạn chót rộng khoảng gấp đôi mô hình vì mô hình bỏ qua đi lại, né đòn, tốc độ thật của chiến đấu.

- "Kẹt" = trong 30 phút mô phỏng liên tiếp không có tiến bộ nào: không lên cấp người chơi, không công trình nào lên cấp, không hero nào lên cấp, không mở nấc mới, không vượt tầng mới. Kẹt là thất bại.
- Thời gian chơi mô phỏng = số bước × 1/30 s, tính cả thời gian trong panel (bot mở panel tức thì, 0 s) và trong dungeon. Không có thời gian ngoại tuyến.
- Bảng tiến độ bot phải in mỗi 15 phút mô phỏng: thời gian, cấp người chơi, CP đội, số hero sở hữu, số ô đội, cấp các hero trong đội, số nấc Sân Tập, cấp từng công trình, chặng cao nhất đã vượt, tài nguyên đang có, tổng lượt tuyển, nhiệm vụ hiện tại. Lưu bảng ở dạng CSV hoặc Markdown cạnh kết quả test.

### 5.2 Chính sách bot gợi ý

Bot chơi qua đúng các lệnh mà view gửi (joystick, mở panel, bấm nút), không đọc ghi trực tiếp vào state. Thứ tự ưu tiên mỗi khi rảnh:

1. Nhận thưởng nhiệm vụ nếu xong.
2. Nếu có quái hay nút trong tầm: đứng yên cho đội đánh. Ngoài đồng chỉ đi tới mục tiêu kế tiếp khi xung quanh không còn gì.
3. Trong dungeon: nếu thủ lĩnh hoặc phần lớn đội nằm trong vùng đỏ báo đòn, đi thẳng ra khỏi vùng (hướng ra xa tâm vòng, hoặc vuông góc với hình chữ nhật), rồi đứng lại. Hết quái thì đi tới cửa ra.
4. Xây công trình mới đã mở theo thứ tự: Trại Gỗ, Quán Mỏ Neo, Mỏ Quặng, Sân Tập, Chợ Bến, Cổng Xoáy.
5. Nếu CP đội ≥ CP đề nghị của chặng kế mà Cổng Xoáy chưa đủ cấp: dành gỗ và quặng cho Cổng Xoáy. Nếu đủ San Hô Đỏ cho ô đội kế mà Sân Tập chưa đủ cấp: dành tài nguyên cho Sân Tập. Nếu chi phí đó lớn hơn trần kho: nâng Nhà Kho trước.
6. Nâng công trình rẻ nhất còn nâng được (khi còn thợ).
7. Mở ô đội khi đủ San Hô Đỏ. Mở nấc Sân Tập khi còn quặng sau khi chừa 1/3 giá của công trình định nâng.
8. Tiêu hết vàng vào tuyển (100 vàng/lượt). Dùng Vé để mở hero Sử Thi/Huyền Thoại chưa có; nếu hero trong đội cần mảnh để đột phá thì đổi 8 Vé lấy 5 mảnh.
9. Lên cấp hero trong đội, hero cấp thấp nhất trước. Bấm TỰ XẾP sau mỗi lần có hero mới hoặc lên cấp.
10. Nếu CP ≥ CP đề nghị chặng kế và Cổng đủ cấp: vào chặng kế. Mỗi 30 phút, đánh lại chặng cao nhất đã vượt một lần (San Hô Đỏ, vàng).
11. Ngoài đồng: farm vùng cao nhất có CP đề nghị ≤ CP đội. Nếu nhiệm vụ hiện tại yêu cầu quái của vùng khác, về vùng đó.
12. Về làng thu sản lượng ít nhất mỗi 20 phút.

## 6. Đã kiểm tra những gì bằng số học

Script: `tools/check.py` (chạy trên JSON thật trong `data/`). Kết quả lần chạy cuối: **không có vấn đề**.

### 6.1 Kiểm tra tĩnh

1. **Không chi phí nào vượt khả năng chứa.** Với mọi cấp của mọi công trình, mọi chi phí gỗ/quặng ≤ trần Nhà Kho cao nhất mà người chơi được xây ở `reqPlayerLevel` của cấp đó. Riêng Nhà Kho: chi phí lên cấp L ≤ trần của cấp L−1. Mọi giá thịt lên cấp hero và mọi giá quặng của nấc Sân Tập cũng ≤ trần kho ở cấp mở tương ứng.
2. **Không tầng nào không với tới.** CP tối đa trong M1 (8 hero mạnh nhất cấp 30, đủ 90 nấc, đủ hiệu ứng sở hữu) = 54568. Tầng khó nhất (30) đề nghị 48550. Mọi tầng ≤ CP tối đa.
3. **Không tài nguyên cụt.** Mỗi tài nguyên có ít nhất một nguồn và một chỗ tiêu:

| Tài nguyên | Nguồn | Chỗ tiêu |
|---|---|---|
| Vàng | quái, Chợ Bến, dungeon, nhiệm vụ | tuyển, làm mới thẻ |
| Thịt | quái, nhiệm vụ | lên cấp hero |
| Gỗ | cây, Trại Gỗ, nhiệm vụ | mọi công trình |
| Quặng | đá, Mỏ Quặng, nhiệm vụ | công trình (từ cấp 2–3), Sân Tập |
| San Hô Đỏ | thưởng chặng, Cua Càng Thép, nhiệm vụ | ô đội |
| Vé Quán | tuyển, dungeon, nhiệm vụ | đổi mảnh/hero (đổi mảnh không giới hạn) |
| Mảnh | tuyển trùng, đổi Vé | đột phá hero |
| EXP | quái | cấp người chơi |

4. **San Hô Đỏ đủ cho ô đội.** Nguồn cố định: 27 (lần đầu vượt 6 chặng) + 9 (nhiệm vụ) = 36 ≥ 33 cần cho ô 4–8. Thêm nguồn lặp có bảo hiểm (1 San Hô mỗi 3 lần đánh lại một chặng) và Cua Càng Thép (25%).

### 6.2 Mô hình tiến độ theo phút

`check.py` chạy một người chơi giả 10 giờ, bước 60 s, theo chính sách ở 5.2, với 5 seed. Giả định:

- Ngoài đồng: 35% thời gian chặt cây, 25% đập đá, 40% đánh quái; mỗi lần chuyển mục tiêu mất 2.5 s; tối đa 4 cây, 3 đá, 10 quái mỗi phút (ổ quái mọc lại 20 s và phải đi giữa các ổ).
- Sát thương đội thật tính từ chỉ số hero (ATK / nhịp × 1.2 cho kỹ năng), hiệu suất 75%.
- Dungeon: vào chặng khi CP ≥ CP đề nghị; mỗi tầng mất khoảng 3 lần thời gian giải tích + 15 s.
- Sản lượng được thu liên tục; nhiệm vụ được nhận ngay khi xong.

Kết quả (seed 1; 4 seed khác lệch dưới 15%):

| Phút | Cấp NC | CP | Hero có | Ô đội | Cấp hero trong đội | Nấc | Chặng | Công trình (cấp) | Tuyển |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 3 | 1550 | 1 | 3 | 5 | 0 | 0 | Kho1 Gỗ2 | 0 |
| 30 | 8 | 6823 | 6 | 3 | 7, 7, 7 | 24 | 1 | Kho2 Gỗ2 Quán1 Mỏ2 Tập1 Chợ1 Cổng1 | 19 |
| 60 | 11 | 12442 | 11 | 4 | 9, 7, 7, 7 | 33 | 2 | Kho5 Gỗ3 Quán1 Mỏ3 Tập2 Chợ2 Cổng2 | 38 |
| 120 | 14 | 19579 | 12 | 5 | 15, 15, 15, 14, 11 | 42 | 3 | Kho5 Gỗ5 Quán1 Mỏ4 Tập3 Chợ3 Cổng3 | 68 |
| 180 | 16 | 21833 | 12 | 5 | 18, 18, 18, 18, 18 | 48 | 3 | Kho6 Gỗ6 Quán2 Mỏ5 Tập3 Chợ4 Cổng3 | 88 |
| 240 | 18 | 27731 | 12 | 6 | 21, 21, 21, 20, 20, 10 | 54 | 4 | Kho6 Gỗ6 Quán2 Mỏ6 Tập4 Chợ5 Cổng4 | 131 |
| 360 | 20 | 35042 | 12 | 7 | 22, 22, 22, 22, 22, 21, 18 | 60 | 4 | Kho7 Gỗ7 Quán3 Mỏ6 Tập5 Chợ6 Cổng4 | 173 |
| 480 | 23 | 37233 | 12 | 7 | 24, 24, 24, 24, 24, 24, 23 | 67 | 5 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 245 |
| 600 | 24 | 40737 | 12 | 7 | 26, 26, 26, 26, 26, 25, 25 | 72 | 5 | Kho8 Gỗ8 Quán3 Mỏ7 Tập5 Chợ6 Cổng5 | 294 |

Phút vượt chặng theo 5 seed: chặng 1: 16; chặng 2: 37–43; chặng 3: 90–105; chặng 4: 184–190; chặng 5: 396–436. Nhiệm vụ 40 (tầng 25) xong ở khoảng phút 437.

Nguồn vàng trong 10 giờ (seed 1): đồng khoảng 10400, dungeon khoảng 16100, nhiệm vụ 1310, Chợ Bến khoảng 1450; tổng khoảng 290 lượt tuyển.

### 6.3 Mô hình chiến đấu dùng để đặt hệ số quái

`tools/model.py`, giải tích, không phải mô phỏng thời gian thực:

- Đội có CP = C có sát thương mỗi giây ≈ `0.45 × C / 4 × 1.25` (45% CP nằm ở phần tấn công, kỹ năng +25%) và tổng HP ≈ `0.55 × C`.
- Thời gian dọn N quái máu h: `T = N × h / (DPS × 0.75)`. Tối đa `4 + 3n` quái đánh đội cùng lúc (n = số hero).
- Sát thương nhận = DPS quái × số quái đang đánh × T, giảm dần khi quái chết. Boss: thêm Đập Đất và Húc Lao với giả định né được 60%.
- "Đủ mạnh" = sát thương nhận ≤ 60% tổng HP. Từ đó giải ra hệ số quái mỗi tầng để CP cần đúng bằng CP đề nghị.

### 6.4 Điều chưa kiểm được

- Mô hình không chạy chiến đấu thật. Bot thật có thể nhanh hơn hoặc chậm hơn. Nếu bot trượt hạn chót, xem 7.
- Thời gian dọn tầng ước lượng (cột `estClearSec` trong `dungeon.json`) chỉ là bậc độ lớn.

## 7. Nút chỉnh khi bot trượt mục tiêu

Lập trình viên **được** đổi các số dưới đây (trong JSON hoặc `build_data.py`) để bot đạt mục tiêu, và **phải ghi** thay đổi vào báo cáo. Không đổi luật.

| Triệu chứng | Chỉnh |
|---|---|
| Đội thua ở tầng có CP đề nghị ≤ CP đội | Giảm `hpMult`/`atkMult` của mọi tầng cùng một tỉ lệ (ví dụ × 0.85), giữ `recommendedCp` |
| Đội thắng dễ ở CP 0.6 lần đề nghị | Tăng `hpMult`/`atkMult` cùng tỉ lệ |
| CP tăng quá chậm (thiếu thịt) | Tăng `field_meat` min/max |
| Thiếu gỗ cho Cổng Xoáy | Giảm chi phí gỗ của Cổng Xoáy hoặc tăng `perHour` của Trại Gỗ |
| Kẹt vì cấp người chơi | Giảm hệ số 10 trong công thức EXP |
