// =============================================================================================
// ĐIỂM VÀO CỦA LÕI — view chỉ import từ file này:  import { createGame, ... } from './core/index';
// =============================================================================================
// Cách dùng và các quyết định khi cài đặt: xem README.md cùng thư mục.
// Hợp đồng (kiểu trạng thái, lệnh, sự kiện, câu hỏi cho panel): contract.ts.
import { Game, GameOptions } from './contract';
import { GameImpl } from './game';

export * from './contract';
export * from './data';
export { SaveError } from './save';
export { worldToIso, isoToWorld, joystickToWorld, depthKey } from './iso';
export type { Point } from './iso';
export { resourceName, resourceTitle, reasonText } from './checks';

/**
 * Tạo một ván chơi. Chơi mới: bỏ `save`. Tải lại: truyền object save đã JSON.parse; lõi áp tiến độ
 * ngoại tuyến theo `clock` và ghi kết quả vào `game.offlineReport`. Ném SaveError nếu bản lưu hỏng.
 */
export function createGame(options: GameOptions): Game {
  return new GameImpl(options);
}
