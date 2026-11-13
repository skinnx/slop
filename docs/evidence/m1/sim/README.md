# Bằng chứng mô phỏng phần lõi (cột mốc 1)

Mọi file ở đây do lệnh sinh ra; chạy lại lệnh sẽ cho cùng kết quả (trừ dòng "thời gian chạy thật").
Chạy từ `tools/` sau `npm run setup`.

| File | Lệnh | Nội dung |
|---|---|---|
| `bot-report.md`, `seed-N.csv` | `npm run sim -- --seeds 1,2,3,4,5,6,7,8,9,10 --hours 6 --out ../docs/evidence/m1/sim` | Bot chơi từ save mới, 10 seed × 6 giờ mô phỏng. Bảng tóm tắt theo hạn chót, rồi với mỗi seed: bảng ĐẠT/TRƯỢT, bảng tiến độ mỗi 15 phút, số lượt dungeon, thu nhập theo nguồn. CSV là cùng bảng tiến độ |
| `bot-run.log` | như trên | Nguyên văn những gì lệnh in ra, kèm mã thoát |
| `reference-10h/` | `npm run sim -- --seeds 1,2,3 --hours 10 --out ../docs/evidence/m1/sim/reference-10h` | Tham khảo: chạy 10 giờ để xem tầng 25 và 30 (không thuộc tiêu chí) |
| `difficulty.md` | `npm run sim:difficulty -- --out ../docs/evidence/m1/sim` | Tỉ lệ thắng từng chặng theo tỉ lệ CP đội / CP đề nghị |
| `typecheck.log` | `npm run typecheck` | Kết quả `tsc` cho `game/` và `tools/` |
| `tests.log` | `npx vitest run --reporter=verbose` | Kết quả từng test |

Mặc định `npm run sim` chạy 5 seed (1–5) × 6 giờ, mất khoảng 20 giây, và thoát với mã khác 0 nếu có mốc nào trượt.

Cách đọc kết quả: thời gian là thời gian chơi mô phỏng (số bước × 1/30 s), tính cả trong dungeon; panel mở tức thì;
không có thời gian ngoại tuyến. "Tiến bộ" = lên cấp người chơi, công trình lên cấp, hero lên cấp, mở nấc Sân Tập,
vượt tầng mới (`docs/design/02-balance.md` mục 5.1).

Bot chỉ dùng `core/index.ts` và các lệnh của người chơi (`tools/sim/bot.ts`); test
`tools/tests/core/determinism.test.ts` chặn việc bot với vào trạng thái bên trong.
