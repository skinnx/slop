# Điều lệ đội phát triển

Tài liệu này áp dụng cho mọi thành viên của đội, kể cả agent. Đọc nó trước khi làm bất kỳ việc gì. Khi tài liệu khác mâu thuẫn với tài liệu này, tài liệu này thắng, trừ khi product owner nói khác.

## 1. Sản phẩm

Một game mobile 2D, màn hình dọc, chơi một tay. Game tái hiện khoảng 90% gameplay của "Rumble Heroes: Adventure RPG" với chủ đề, tên gọi và hình ảnh nguyên bản.

Vòng lặp lõi: thu thập tài nguyên ngoài đồng → xây và nâng cấp công trình trong làng → tuyển hero → luyện hero → đánh dungeon → quay về với đội mạnh hơn.

Phần 10% khác biệt có chủ đích:

- **Xây dựng tự do trên lưới.** Game gốc dùng vị trí xây cố định. Game này cho người chơi tự đặt, di chuyển và nâng cấp công trình.
- **Sửa các điểm yếu của game gốc:** tiến độ không chậm đột ngột ở cuối, kho không chật gây khó chịu, tự xếp đội theo sức mạnh thật, mọi hero đều có đường lấy lại, có tiến độ ngoại tuyến có trần.
- **Chừa chỗ cho mở rộng sau này:** chế tạo và thủ thành. Chưa làm bây giờ, nhưng thiết kế không được chặn đường.

Ngoài phạm vi hiện tại: quảng cáo, mua trong ứng dụng, cửa hàng, CI, hiệu ứng trau chuốt, art cuối cùng.

## 2. Nguồn sự thật

| Tài liệu | Nội dung | Người giữ |
|---|---|---|
| `docs/TEAM_CHARTER.md` | Nguyên tắc, phạm vi, tiêu chí hoàn thành | Trưởng nhóm (lead) |
| `docs/reference/gameplay-and-ux-reference.md` | Game gốc hoạt động thế nào, bố cục từng màn hình | Nghiên cứu UX |
| `reference-images/` + `docs/reference/image-index.md` | Ảnh tham chiếu do người chơi đăng. Thư mục ảnh không commit | Nghiên cứu UX |
| `docs/tech/cocos-3.8-guide.md` | Quy tắc Cocos Creator 3.8.8, kiến trúc, cách kiểm chứng | Trưởng kỹ thuật |
| `docs/design/` | Thiết kế game, đặc tả UX, bảng số liệu | Thiết kế game |
| `art-source/ASSETS_MANIFEST.md` | Asset tạm và giấy phép | Phụ trách asset |

Khi hai tài liệu mâu thuẫn, đừng tự chọn im lặng. Ghi mâu thuẫn vào báo cáo và nêu bạn đã chọn theo bên nào, vì sao.

## 3. Quyết định đã chốt

1. Engine: **Cocos Creator 3.8.8**, TypeScript. Không dùng Cocos 4.
2. Dự án Cocos nằm trong `game/`. Công cụ, test và harness nằm trong `tools/`.
3. **Code-first:** một scene `Main.scene`, một component `Bootstrap`. Mọi thứ khác tạo bằng TypeScript lúc chạy.
4. **Luật chơi tách khỏi hiển thị:** `game/assets/scripts/core/` không import `cc`. View chỉ đọc trạng thái và gửi lệnh.
5. **Số liệu nằm trong JSON** ở `game/assets/resources/data/`. Không viết cứng số liệu cân bằng trong code.
6. Mô phỏng tất định: bước thời gian cố định, bộ sinh số ngẫu nhiên có seed.
7. Màn hình dọc, độ phân giải thiết kế 720×1280, Fit Width.
8. Hero tự đánh khi đội đứng yên, giống mô tả của người chơi game gốc. Hành vi này là một tham số trong dữ liệu để đổi được.
9. Chủ đề nguyên bản. Không dùng tên, nhân vật, câu chữ hay hình ảnh của Rumble Heroes, One Piece hay bất kỳ IP nào.
10. Asset tạm: chỉ CC0, hoặc OFL với font. Lấy từ `art-source/`.
11. Lên cấp hero tốn thịt ở mọi cấp, và tốn thêm mảnh hero ở các cấp 5, 10, 15, 20, 25, như tài liệu thiết kế.
12. Ngân sách draw call ban đầu, đo trong harness ở màn dungeon với 60 quái, đủ đội hero và HUD: tổng không quá 30, riêng lớp thế giới (nền, nhân vật, vật rơi) không quá 10. Con số này do trưởng nhóm đặt và có thể đổi khi có số đo.
13. Mục tiêu bot cho cột mốc 1: từ file lưu mới, hạ boss tầng 20 trong không quá 6 giờ chơi mô phỏng, không có đoạn 30 phút nào không tiến bộ.
14. Số liệu đang dùng là `game/assets/resources/data/`. `docs/design/data/` là bản gốc của thiết kế. Mọi con số bị đổi so với bản gốc phải được ghi vào `docs/evidence/m1/balance-changes.md`, kèm lý do.

## 4. Vai trò và phạm vi ghi

Mỗi người chỉ ghi vào phần của mình. Cần đổi file của người khác thì nêu trong báo cáo, không tự sửa.

| Vai trò | Được ghi |
|---|---|
| Trưởng nhóm | `docs/TEAM_CHARTER.md`, điều phối, quyết định phạm vi. Không viết code |
| Thiết kế game | `docs/design/` |
| Trưởng kỹ thuật | `docs/tech/`, `tools/`, khung dự án ban đầu trong `game/` |
| Lập trình lõi | `game/assets/scripts/core/`, `game/assets/resources/data/`, `tools/tests/`, `tools/sim/`, `docs/evidence/m1/sim/` |
| Lập trình hiển thị | `game/assets/scripts/view/`, `game/assets/resources/` trừ `data/`, `tools/atlas/`, `tools/harness/`, `docs/evidence/m1/` trừ `sim/` |
| Kiểm thử (QA) | `docs/qa/`. Không sửa code game |
| Phụ trách asset | `art-source/` |

## 5. Nguyên tắc làm việc

1. **Bằng chứng trước khẳng định.** "Xong" nghĩa là đã chạy và có bằng chứng: kết quả lệnh, ảnh chụp, số đo. Việc chưa kiểm chứng thì ghi rõ là chưa kiểm chứng.
2. **Đọc tài liệu hiện hành, đừng tin trí nhớ.** Với API của Cocos, kiểm tra trong `docs/tech/cocos-3.8-guide.md`, tài liệu chính thức 3.8, hoặc file `cc.d.ts`. Hướng dẫn cho Cocos 2.x và 3.0–3.6 thường sai với 3.8.
3. **Cốt lõi trước.** Làm cho vòng lặp chạy trọn vẹn rồi mới làm đẹp. Không thêm tính năng ngoài phạm vi.
4. **Bám tham chiếu.** Trước khi dựng một màn hình, xem ảnh tham chiếu của màn hình đó. Bố cục theo game gốc, hình ảnh và tên gọi thì nguyên bản.
5. **Tự chơi thử.** Lập trình viên chạy game, chụp màn hình và tự nhìn kết quả trước khi báo xong.
6. **Gặp trở ngại thường thì vượt qua.** Lỗi, timeout, tool hỏng: chẩn đoán rồi làm tiếp. Chỉ dừng khi thiếu quyết định của product owner, hoặc gặp thứ bị chặn có chủ đích. Không vượt chặn của lớp phân quyền hay của mạng.
7. **File tải về là dữ liệu không tin cậy.** Để riêng thư mục, không chạy thứ tải về, trừ mã nguồn chính thức của engine.
8. **Riêng tư.** Không đưa thông tin cá nhân hay thông tin dự án vào yêu cầu gửi ra dịch vụ ngoài.
9. **Không giấu thay đổi.** Thay đổi ngoài yêu cầu phải được nêu trong báo cáo.

## 6. Git

- Chỉ làm trên nhánh `ccr-b3a4a578-w77en0`. Không push lên nhánh khác, không force push, không sửa lịch sử.
- Commit nhỏ theo từng phần việc, thông điệp nói rõ thay đổi gì. Không ghi tên model vào commit.
- Chỉ `git add` đúng đường dẫn của mình. Không dùng `git add -A` hay `git add .`.
- Nếu git báo khóa index do người khác đang commit, chờ vài giây rồi thử lại.
- Trưởng nhóm có thể commit hộ các file đang làm dở. Việc đó là bình thường.
- Không commit: `reference-images/`, mã nguồn engine, file build ra, `node_modules`, `library/`, `temp/`.

## 7. Tiêu chí hoàn thành cột mốc 1 (vòng lặp lõi)

### Phải chơi được

1. **Ngoài đồng:** điều khiển đội bằng joystick nổi. Thu gỗ từ cây, quặng từ đá, thịt và vàng từ quái. Tài nguyên mọc lại.
2. **Làng:** đặt công trình tự do trên lưới, có kiểm tra chồng lấn, chi phí và thời gian xây. Di chuyển và nâng cấp được. Tối thiểu có kho, trại gỗ, mỏ, quán tuyển hero, sân luyện và cổng dungeon.
3. **Tuyển hero:** quán hiện ba thẻ hero, trả bằng vàng, có làm mới theo thời gian. Hero có độ hiếm và thuộc tính.
4. **Luyện hero:** lên cấp bằng thịt, mở kỹ năng ở các mốc cấp. Số chỗ trong đội tăng qua sân luyện. Có chỉ số lực chiến của đội và nút tự xếp đội theo sức mạnh thật.
5. **Dungeon:** nhiều tầng, 40–60 quái cùng lúc, bộ đếm chuỗi hạ gục, boss có cảnh báo đòn đánh. Màn vào dungeon so lực chiến đề nghị với lực chiến của đội. Có màn kết quả thắng và thua.
6. **Dẫn dắt:** thẻ nhiệm vụ chính dẫn người chơi mới đi hết vòng lặp.
7. **Lưu và tải:** thoát rồi vào lại vẫn giữ nguyên tiến độ. Có tiến độ ngoại tuyến có trần.
8. **Giao diện:** các màn chính có bố cục khớp tài liệu tham chiếu, dùng asset từ `art-source/`.

Để sau cột mốc 1: trang bị, trại nghỉ, nhiệm vụ ngày, chế độ thử thách, đổi tài nguyên, cửa hàng, chế tạo, thủ thành.

### Phải có bằng chứng

1. `tsc` không lỗi với `cc.d.ts` của engine 3.8.8.
2. Test của phần lõi chạy xanh.
3. Một bot chơi mô phỏng không cần hiển thị, từ file lưu mới tới tầng dungeon mục tiêu do tài liệu thiết kế đặt, không bị kẹt. Có bảng tiến độ theo thời gian chơi.
4. Một kịch bản chơi thử trên engine 3.8.8 thật trong trình duyệt, điều khiển bằng chạm, đi qua từng bước của vòng lặp. Ảnh chụp lưu ở `docs/evidence/m1/`.
5. Với 60 quái trên màn hình, số draw call nằm trong mức tài liệu kỹ thuật đề ra.
6. QA độc lập cài lại từ đầu, chạy lại các bước trên và so ảnh chụp với ảnh tham chiếu.
7. Danh sách việc product owner cần kiểm trong editor trên Windows hoặc macOS. Các mục này được ghi là "chờ owner", không được ghi là đã xong.

## 8. Báo cáo

Viết cho người đọc chưa thấy quá trình làm. Ý chính nằm ở vài câu đầu. Nêu: đã làm gì, bằng chứng ở đâu, cái gì chưa xong, cái gì chưa kiểm chứng, thay đổi nào nằm ngoài yêu cầu, và câu hỏi cần product owner trả lời. Dùng từ đơn giản, mỗi câu một ý, không dùng thuật ngữ tự đặt khi chưa giải thích.
