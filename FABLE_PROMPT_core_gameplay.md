# Prompt giao việc cho Fable 5.2: lõi gameplay đầy đủ + lớp hiển thị mỏng

> Cách dùng: dán nguyên phần "PROMPT" vào một phiên mới (effort `high`). Đặt `thinking.display` là `"updates"` hoặc `"summarized"` nếu bạn muốn thấy cập nhật tiến độ.

---

## PROMPT

# Mục tiêu
Xây **lõi gameplay hoàn chỉnh** (thuần TypeScript, không phụ thuộc engine) cho một game mobile 2D isometric, cùng một **lớp hiển thị mỏng** để sau này nối vào Cocos Creator 3.8. Bạn là chủ sở hữu và người bảo trì lâu dài của codebase này, thiết kế do bạn quyết định.

# Vòng lặp lõi (phải bám sát)
Thu thập → Xây dựng → Tuyển hero → Luyện hero → Đánh dungeon → quay lại với hero mạnh hơn.

1. **Thu thập:** nhân vật tự đi chặt cây, đào quặng, săn thịt ngoài địa hình mở. Tài nguyên rơi vào kho.
2. **Xây dựng tự do:** đặt công trình lên lưới tùy ý (kiểm tra va chạm, chi phí, thời gian xây, nâng cấp, phá bỏ). Công trình mở rộng kho, tăng tốc thu thập, mở khóa tuyển hero và luyện hero.
3. **Tuyển hero:** tuyển ở công trình tuyển mộ bằng tài nguyên. Hero có hạng, kỹ năng và vai trò.
4. **Luyện hero:** lên cấp và nâng kỹ năng ở công trình luyện.
5. **Dungeon:** đội nhiều hero **tự đánh**, người chơi chỉ điều khiển bằng một tay (di chuyển và kích hoạt kỹ năng). Quái đông, rơi trang bị và tài nguyên. Độ khó tăng dần theo tầng.

# Điểm yếu của game tham chiếu cần tránh
- Tiến độ chậm sau level cao: đường cong tăng trưởng mượt, không phụ thuộc vào cày vô hạn.
- Kho chứa chật và chi phí duy trì tài nguyên gây khó chịu: giới hạn kho mềm, có công trình mở rộng, không phạt thô bạo.
- Tự chọn hero ưu tiên hạng thay vì sức mạnh thật: chọn đội theo sức mạnh tính toán.
- Hero giới hạn thời gian không lấy lại được: mọi hero đều có đường lấy lại.
- Không có ngoại tuyến: tính tiến độ ngoại tuyến có trần.

# Ràng buộc kiến trúc (bắt buộc)
- **Lõi** nằm ở `core/`, TypeScript thuần, **không import Cocos hay bất kỳ API đồ họa nào**. Chạy được trên Node 22.
- **Dữ liệu điều khiển:** tài nguyên, công trình, hero, quái, kỹ năng, trang bị, tầng dungeon nằm trong file JSON ở `data/`. Không viết cứng số liệu trong code.
- **Mô phỏng tất định:** RNG có seed, bước thời gian cố định, cùng seed cho cùng kết quả.
- **Tuần tự hóa:** lưu và tải trạng thái game, có phiên bản lược đồ.
- **Điểm mở rộng cho sau này, không cần làm bây giờ nhưng không được chặn:** chế tạo (công thức nhập tài nguyên, xuất vật phẩm) và thủ thành (công trình hoặc hero đứng yên làm người phòng thủ, quái đi theo đường). Dùng lại hệ thống tài nguyên, công trình và chiến đấu hiện có.
- **Lớp hiển thị mỏng** ở `view/`: chỉ là adapter. Lõi phát ra sự kiện và trạng thái, lớp view đọc trạng thái, gửi input. Không chứa logic game. Đưa ra giao diện (`interface`) rõ ràng để một script Cocos có thể cắm vào sau. Phần hiển thị trình duyệt tối thiểu (canvas, placeholder hình khối màu) chỉ để kiểm chứng bằng ảnh chụp.

# Tiêu chí hoàn thành (phải kiểm chứng được, kèm bằng chứng)
1. `npm test` chạy xanh, có kiểm thử cho từng hệ thống: thu thập, kho, đặt và nâng cấp công trình, tuyển và luyện hero, chiến đấu, rơi đồ, lưu và tải, ngoại tuyến.
2. Một mô phỏng **không đầu** (headless) chạy từ đầu game, bot đơn giản chơi theo vòng lặp lõi, đạt tầng dungeon N trong thời gian chơi mô phỏng hợp lý. In ra biểu đồ hoặc bảng tiến độ để nhìn đường cong, và sửa số liệu nếu có đoạn bị kẹt hoặc quá dễ.
3. Cùng seed cho cùng kết quả, có kiểm thử xác nhận.
4. Chụp màn hình bằng Playwright ở các thời điểm: bắt đầu, sau khi xây công trình đầu tiên, có đội hero, đang đánh dungeon. Đính kèm ảnh.
5. Không có logic game trong `view/` (kiểm tra bằng cách đọc lại, và lõi biên dịch được mà không có `view/`).

# Cách làm việc
- Làm xuyên suốt tới khi đạt tiêu chí hoàn thành, đừng dừng giữa chừng để hỏi những việc không phụ thuộc câu trả lời của tôi.
- Lỗi và timeout thông thường: chẩn đoán rồi vượt qua. Chỉ dừng nếu việc không thể tiến tiếp nếu thiếu thông tin của tôi, hoặc gặp thứ bị cấm có chủ đích.
- Cứ vài bước thì cập nhật một dòng tình hình.
- Chủ đề: **nguyên bản** (phiêu lưu, hải tặc hoặc vùng đất giả tưởng tự đặt). Không dùng tên, nhân vật, hình ảnh của One Piece hay IP khác.
- Commit theo từng hệ thống nhỏ, thông điệp rõ ràng. Không đẩy lên nhánh khác ngoài nhánh làm việc.

# Báo cáo cuối
Viết cho người đọc thông minh nhưng chưa thấy quá trình làm. Ý chính ở vài câu đầu: cái gì đã làm xong, cái gì chưa, bằng chứng (kết quả kiểm thử, ảnh, bảng tiến độ). Nói rõ các quyết định thiết kế, số liệu cân bằng đã chọn và lý do, và các thay đổi ngoài yêu cầu nếu có. Dùng từ đơn giản, mỗi câu một ý, không dùng thuật ngữ tự đặt khi chưa giải thích.

---

## Ghi chú cho người dùng (không dán vào prompt)

- Prompt cố ý giao **mục tiêu + tiêu chí hoàn thành**, không ra lệnh từng bước, theo hướng dẫn Fable 5.2.
- Các đoạn "Finishing work", "ownership" và "báo cáo rõ ràng" lấy từ hướng dẫn chính thức. Câu ownership làm model chủ động gộp code lặp nhưng tăng token và có thể làm thêm test, tài liệu ngoài yêu cầu, nên hãy xem lại diff.
- Mọi con số kiểm thử và tầng dungeon "N" nên được bạn điền cụ thể trước khi chạy (ví dụ tầng 30 trong 10 giờ chơi mô phỏng).
- Phần Cocos Creator 3.8 (editor, build) bạn làm trên máy Windows hoặc Mac. Prompt này chỉ yêu cầu lõi và adapter.
- Hãy chạy thử và đo chi phí trước. Một phiên dài ở effort `high` có thể tốn nhiều.
