# Prompt giao việc cho Fable 5.2: gameplay chạy được bằng ô vuông

> Cách dùng: dán nguyên phần "PROMPT" vào một phiên mới (effort `high`). Bản này đã rút gọn: không CI, không quy trình nặng.

---

## PROMPT

# Mục tiêu
Làm một game mobile 2D isometric **chơi được từ đầu đến cuối**, dùng **ô vuông và hình khối màu** thay cho art (hero là ô xanh, quái là ô đỏ, cây là ô xanh lá, công trình là ô nâu...). Mục đích là tự chơi thử và cảm nhận gameplay, chưa cần đẹp. Bạn là chủ sở hữu codebase này, thiết kế do bạn quyết định.

# Vòng lặp lõi (bám sát)
Thu thập → Xây dựng → Tuyển hero → Luyện hero → Đánh dungeon → quay lại với hero mạnh hơn.

- **Thu thập:** nhân vật tự đi chặt cây, đào quặng, săn thịt, mang về kho.
- **Xây dựng tự do:** đặt công trình lên lưới tùy ý, có chi phí, thời gian xây, nâng cấp. Công trình mở rộng kho, tăng tốc thu thập, mở tuyển và luyện hero.
- **Tuyển và luyện hero:** hero có hạng, kỹ năng, vai trò. Lên cấp bằng tài nguyên.
- **Dungeon:** đội hero tự đánh, người chơi chỉ điều khiển một tay (di chuyển, kích hoạt kỹ năng). Quái đông, rơi đồ, độ khó tăng dần.

# Chọn ngay từ đầu để sau này không bị kẹt
- Thiết kế dạng dữ liệu (số liệu hero, công trình, quái nằm trong file dữ liệu, không viết cứng) để sau này thêm **chế tạo** và **thủ thành** mà không phải viết lại.
- Tách logic game khỏi phần hiển thị, để sau này nối vào Cocos Creator 3.8 mà không phải viết lại luật chơi. Cách tách cụ thể do bạn chọn.
- Chạy được trong trình duyệt để tôi (và bạn) chơi thử ngay.

# Tránh những điểm yếu của game tham chiếu
Tiến độ không chậm đột ngột ở cuối, kho không chật gây khó chịu, hero tự chọn theo sức mạnh thật, mọi hero đều lấy lại được, có tiến độ ngoại tuyến có trần.

# Cách làm việc
- Tự chơi thử bằng cách chạy game, chụp màn hình, sửa cho đến khi vòng lặp lõi chạy trơn từ đầu tới dungeon.
- Chủ đề **nguyên bản**, không dùng One Piece hay IP khác.
- Làm xuyên suốt, đừng dừng để hỏi những việc không phụ thuộc vào tôi.

# Báo cáo cuối
Ngắn gọn, ý chính ở đầu: cái gì chơi được, cái gì còn thiếu, và cách chạy game. Kèm vài ảnh chụp màn hình.

---

## Ghi chú cho người dùng (không dán vào prompt)

- Đã bỏ: kiểm thử tự động bắt buộc, CI, kiểm tra tất định, định dạng báo cáo dài, quy định commit chi tiết. Fable tự quyết cách tổ chức. Nếu thấy mã lộn xộn sau này thì thêm yêu cầu cụ thể.
- Vẫn giữ hai ràng buộc rẻ nhưng có giá trị: dữ liệu tách khỏi code, và logic tách khỏi hiển thị.
- Rủi ro của việc rút gọn: Fable có thể làm xong nhanh hơn nhưng khó nhận ra lỗi cân bằng nếu không có bot mô phỏng. Nếu cần, chỉ thêm một dòng: "chạy thử mô phỏng nhiều giờ chơi để xem đường cong tiến độ".
- Hãy đo chi phí bằng một lần chạy thử trước.
