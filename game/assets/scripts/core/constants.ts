// Hằng số luật mà tài liệu thiết kế ghi bằng chữ nhưng KHÔNG có trong JSON (xem README, mục
// "Hằng số không có trong JSON"). Không phải nút chỉnh cân bằng; nếu thiết kế muốn chỉnh thì chuyển
// sang tuning.json.

/** Xác quái nằm 1 s rồi biến mất (01 mục 6.2). */
export const CORPSE_SEC = 1.0;
/** Gồng 1 s khi bấm Về làng / Ra đồng (01 mục 4.3). */
export const RETURN_CHANNEL_SEC = 1.0;
/** Boss lao hết chiều dài trong 0.4 s (01 mục 12.3). */
export const CHARGE_DASH_SEC = 0.4;
/** Gọi Bầy: quái sinh quanh boss bán kính 2 ô (01 mục 12.3). */
export const SUMMON_RADIUS = 2.0;
/** Kỹ năng đánh thêm tầm: volley chọn quái trong attackRange + 1 (01 mục 8.4). */
export const VOLLEY_EXTRA_RANGE = 1.0;
/** Mỗi kỹ năng ở 2 sao cộng thêm 0.05 vào skillCpBonus (01 mục 10.2). */
export const CP_BONUS_PER_EXTRA_STAR = 0.05;
/** Số sao tối đa trong M1 (sao 3 để sau). */
export const MAX_STARS_M1 = 2;
/** Bán kính va chạm của nút tài nguyên khi tính tầm đánh (thiết kế không ghi). */
export const NODE_RADIUS = 0.4;
/** Vật rơi được nhặt khi cách hero không quá khoảng này (thiết kế không ghi). */
export const PICKUP_TOUCH_DIST = 0.3;
/** Ổ quái cách thủ lĩnh xa hơn khoảng này thì quái trong ổ đứng yên, không lảng vảng (tối ưu, ngoài tầm nhìn). */
export const CAMP_ACTIVE_DIST = 16;
/** Quái về tới ổ khi cách điểm nhà dưới khoảng này. */
export const HOME_ARRIVE_DIST = 0.3;
/** Sai số cho phép khi so đồng hồ đếm lùi với 0 (đồng hồ là số thực, bước là 1/30 s). */
export const TIME_EPS = 1e-6;
/** Giới hạn số sự kiện giữ lại nếu view/bot quên clearEvents(). */
export const MAX_EVENTS = 4096;
