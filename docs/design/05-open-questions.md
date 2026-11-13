# Câu hỏi cho product owner

Chỉ gồm các quyết định thuộc về product owner. Mỗi câu có **mặc định**; công việc đi tiếp theo mặc định cho tới khi owner trả lời. Đổi mặc định chỉ cần sửa dữ liệu hoặc chữ, không phải làm lại hệ thống.

| # | Câu hỏi | Mặc định đang dùng | Ảnh hưởng nếu đổi |
|---|---|---|---|
| 1 | Tên game là gì? | Tên tạm **Hải Đội Đảo Sương**, mã `tidecrew` (khóa lưu `tidecrew.save.v1`) | Chữ trên màn tiêu đề và logo. Đổi mã thì đổi khóa lưu |
| 2 | Chủ đề "làng chài phiêu lưu trên đảo sương, hero mang biệt danh hải sản" có ổn không, hay muốn nghiêng hẳn về cướp biển (tàu, kho báu, thuyền trưởng)? | Làng chài phiêu lưu, có chút màu cướp biển (boss Thuyền Trưởng Ma, Quán Mỏ Neo) | Tên trong JSON và chữ; luật không đổi |
| 3 | Có giữ **Đổi Vé** (mỗi lượt tuyển cho 1 vé, đổi vé lấy mảnh hoặc hero chưa có) không? Đây là cách bảo đảm mọi hero lấy lại được; nó cũng ảnh hưởng tới kinh tế nếu sau này có cửa hàng | Giữ | Bỏ thì hero Huyền Thoại có thể rất lâu mới có; phải thay bằng cơ chế khác cho mục "mọi hero lấy được" |
| 4 | Làm mới bộ thẻ Quán ngay lập tức bằng **50 vàng** (game gốc dùng gem/quảng cáo) có được không? | 50 vàng | Đổi giá trong `recruit.json` |
| 5 | Trần tiến độ ngoại tuyến bao nhiêu giờ? | 8 giờ (cả bộ đệm sản xuất cũng 8 giờ) | `economy.offlineCapHours`, `productionBufferHours` |
| 6 | Số ô đội tối đa trong M1? Game gốc thấy tới 6/6, các nguồn nói 8–10 | 8 | Thêm nút ô trong `training-tree.json`; cân bằng lại CP đề nghị chặng 6 |
| 7 | Vào dungeon miễn phí trong M1, hay cần vé (như "Dungeon Scroll" của game gốc) ngay từ M1? | Miễn phí; vé để sau | Thêm tài nguyên và chi phí vào dungeon; mô hình tiến độ đổi |
| 8 | Hình công trình tạm là nhà máy hiện đại của Kenney Tiny Battle (lệch chủ đề làng chài). Chấp nhận cho M1? | Chấp nhận | Phụ trách asset phải tìm pack khác trước khi QA so ảnh |
| 9 | Ngôn ngữ: M1 chỉ tiếng Việt? | Chỉ tiếng Việt; chữ nằm trong JSON và một bảng chữ của view để dịch sau | Thêm bảng dịch |
