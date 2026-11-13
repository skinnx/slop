// Kết quả kiểm tra và câu chữ tiếng Việt cho từng lý do (theo 01 mục 7.5 và 03 mục 5, 10, 11).
import { Check, PlacementCheck, Reason } from './contract';

const RESOURCE_NAMES: { [id: string]: string } = {
  gold: 'vàng', meat: 'thịt', wood: 'gỗ', ore: 'quặng', coral: 'San Hô Đỏ', tickets: 'Vé Quán',
};

/** Tên tài nguyên viết thường để ghép câu ("Thu gỗ +120"). */
export function resourceName(id: string): string { return RESOURCE_NAMES[id] || id; }
/** Tên tài nguyên viết hoa chữ đầu ("Vàng +6"). */
export function resourceTitle(id: string): string {
  const s = resourceName(id);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const OK: Check = { ok: true, reason: '', n: 0, key: '', text: '' };
export const PLACE_OK: PlacementCheck = { ok: true, reason: '', n: 0, key: '', text: '', blockerUid: 0 };

export function reasonText(reason: Reason, n: number, key: string): string {
  switch (reason) {
    case '': return '';
    case 'wrong_mode': return 'Không làm được lúc này';
    case 'need_player_level': return 'Cần cấp người chơi ' + n;
    case 'need_storage_level': return 'Cần Nhà Kho cấp ' + n;
    case 'missing_resources': return n > 0 && key ? 'Thiếu ' + n + ' ' + resourceName(key) : 'Thiếu tài nguyên';
    case 'no_builder': return n > 0 ? 'Đang có ' + n + ' công trình đang xây' : 'Hết thợ';
    case 'max_level': return 'Đã tối đa';
    case 'busy': return 'Đang xây dựng';
    case 'not_built': return 'Chưa xây ' + key;
    case 'out_of_grid': return 'Ra ngoài làng';
    case 'overlap': return 'Chồng lên ' + key;
    case 'max_count': return 'Đã xây';
    case 'no_free_cell': return 'Làng đã kín chỗ';
    case 'not_in_village': return 'Về làng để xây dựng';
    case 'monsters_near': return 'Có quái ở gần!';
    case 'no_return_point': return 'Chưa có điểm ra đồng';
    case 'not_owned': return 'Chưa có hero này';
    case 'already_owned': return 'Đã có hero này';
    case 'missing_fragments': return 'Thiếu ' + n + ' mảnh';
    case 'squad_min': return 'Đội cần ít nhất 1 hero';
    case 'squad_full': return 'Đội đã đủ người';
    case 'invalid': return 'Không hợp lệ';
    case 'need_gate_level': return 'Cần Cổng Xoáy cấp ' + n;
    case 'need_prev_stage': return 'Vượt chặng ' + n + ' trước';
    case 'need_yard_level': return 'Cần Sân Tập cấp ' + n;
    case 'nothing_to_collect': return 'Chưa có gì để thu';
    case 'storage_full': return 'Nhà Kho đầy! Nâng cấp Nhà Kho để chứa thêm.';
    case 'quest_not_done': return 'Chưa xong nhiệm vụ';
    case 'no_quest': return 'Hoàn thành Chương 1!';
    case 'first_draw_pending': return 'Hãy tuyển lượt đầu tiên trước';
  }
  return '';
}

export function fail(reason: Reason, n = 0, key = ''): Check {
  return { ok: false, reason, n, key, text: reasonText(reason, n, key) };
}

export function failPlace(reason: Reason, n = 0, key = '', blockerUid = 0): PlacementCheck {
  return { ok: false, reason, n, key, text: reasonText(reason, n, key), blockerUid };
}
