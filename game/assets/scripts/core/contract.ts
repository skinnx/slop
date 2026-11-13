// =============================================================================================
// HỢP ĐỒNG GIỮA LÕI VÀ VIEW  (đọc cùng core/README.md)
// =============================================================================================
// File này chỉ có kiểu dữ liệu. View import mọi thứ từ './core/index' (index re-export file này).
// Nguyên tắc:
//   - View CHỈ ĐỌC các object trạng thái (mọi trường readonly) và gửi lệnh qua các hàm của Game.
//   - Object trạng thái được lõi tái sử dụng giữa các bước. Đừng giữ tham chiếu tới một đơn vị
//     qua nhiều frame; hãy tra theo `id` (id không bao giờ được dùng lại trong một phiên).
//   - Các mảng trạng thái (heroes, monsters, pickups...) được sửa tại chỗ; đọc chúng mỗi frame
//     không cấp phát bộ nhớ. Các hàm "get...Info()" có cấp phát: gọi khi mở/cập nhật panel.
//   - Đơn vị khoảng cách: ô. Thời gian: giây (trừ trường có đuôi Ms/At là mili giây của Clock).
// Thay đổi hợp đồng được ghi trong README.md mục "Nhật ký thay đổi hợp đồng".
// =============================================================================================

import { GameData, Rarity, Attribute, HeroRole, SkillType, MonsterKind, ZoneId, ResourceMap } from './data';

export const CONTRACT_VERSION = 3;
export const SAVE_VERSION = 1;

/** Đồng hồ thời gian thực do bên ngoài cấp (view: Date.now; bot: đồng hồ giả). Lõi không tự đọc giờ. */
export interface Clock { nowMs(): number; }

export interface GameOptions {
  data: GameData;
  clock: Clock;
  /** Seed cho save mới. Bỏ qua khi có `save` (seed nằm trong save). Mặc định 1. */
  seed?: number;
  /** Bản lưu lấy từ storage (đã JSON.parse). null/undefined = chơi mới. */
  save?: SaveData | null;
}

/** 'world' = bản đồ liền (làng + đồng); 'build' = chế độ xây; 'dungeon' = trong Hang Xoáy; 'result' = màn thắng/thua. */
export type Mode = 'world' | 'build' | 'dungeon' | 'result';

// ---------------------------------------------------------------------------------------------
// Kết quả của lệnh và của câu hỏi "làm được không"
// ---------------------------------------------------------------------------------------------

export type Reason =
  | ''                     // ok
  | 'wrong_mode'           // lệnh không dùng được ở chế độ hiện tại
  | 'need_player_level'    // n = cấp người chơi cần
  | 'need_storage_level'   // n = cấp Nhà Kho cần (giá > trần kho)
  | 'missing_resources'    // n = số còn thiếu của tài nguyên `key`
  | 'no_builder'           // hết thợ
  | 'max_level'            // đã tối đa
  | 'busy'                 // công trình đang xây/nâng
  | 'not_built'            // chưa có công trình cần thiết (key = id công trình)
  | 'out_of_grid'          // bóng ra ngoài lưới làng
  | 'overlap'              // key = tên công trình bị chồng
  | 'max_count'            // đã xây đủ số lượng
  | 'no_free_cell'         // làng kín chỗ
  | 'not_in_village'       // thủ lĩnh không ở trong làng
  | 'monsters_near'        // có quái đang đuổi
  | 'no_return_point'      // chưa có điểm ra đồng
  | 'not_owned'            // chưa có hero
  | 'already_owned'
  | 'missing_fragments'    // n = số mảnh thiếu
  | 'squad_min'            // đội cần ít nhất 1 hero
  | 'squad_full'
  | 'invalid'              // tham số sai (id không tồn tại, ô sai...)
  | 'need_gate_level'      // n = cấp Cổng Xoáy cần
  | 'need_prev_stage'      // n = chặng phải vượt trước
  | 'need_yard_level'      // n = cấp Sân Tập cần
  | 'nothing_to_collect'
  | 'storage_full'
  | 'quest_not_done'
  | 'no_quest'
  | 'first_draw_pending';  // bộ thẻ đầu tiên chưa đổi được trước lượt tuyển đầu

/**
 * Kết quả kiểm tra. `text` là câu tiếng Việt sẵn sàng hiển thị (ví dụ "Cần cấp người chơi 5"),
 * rỗng khi ok. Lệnh trả về Check: ok = đã thực hiện.
 */
export interface Check {
  readonly ok: boolean;
  readonly reason: Reason;
  readonly n: number;
  readonly key: string;
  readonly text: string;
}

// ---------------------------------------------------------------------------------------------
// Trạng thái đọc mỗi frame
// ---------------------------------------------------------------------------------------------

export type UnitAnim = 'idle' | 'move' | 'windup' | 'cast' | 'dead';

export interface UnitView {
  /** entityId: tăng dần, duy nhất trong phiên. */
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** Hướng nhìn (vector đơn vị trong tọa độ ô). Trên màn iso: quay phải khi faceX − faceY > 0. */
  readonly faceX: number;
  readonly faceY: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly radius: number;
  readonly alive: boolean;
  readonly anim: UnitAnim;
  /** Giây còn lại của lần gồng hiện tại (0 = không gồng). Tổng thời gian gồng: tuning.combat.attackWindupSec. */
  readonly windupT: number;
  /** Giây còn lại của hiệu ứng nháy trắng khi trúng đòn. */
  readonly hitFlashT: number;
  /** id mục tiêu đang đánh (quái/hero), 0 nếu không có. Với hero đang thu thập: −(index nút + 1). */
  readonly targetId: number;
}

export interface HeroUnitView extends UnitView {
  readonly heroId: string;
  /** Vị trí trong thứ tự ô đội (0 = ô 1). */
  readonly slot: number;
  readonly isLeader: boolean;
  /** Giây còn lại tới khi hồi sinh (ngoài đồng). 0 khi còn sống hoặc trong dungeon. */
  readonly reviveT: number;
  /** Giây hồi chiêu còn lại của kỹ năng 1, 2 (−1 = chưa mở). */
  readonly skillCd0: number;
  readonly skillCd1: number;
  /** Giây còn lại của buff ATK (0 = không có). */
  readonly buffT: number;
}

export type MonsterState = 'wander' | 'chase' | 'return' | 'corpse';

export interface MonsterUnitView extends UnitView {
  readonly monsterId: string;
  readonly kind: MonsterKind;
  /** Chỉ số ổ quái ngoài đồng (−1 trong dungeon). */
  readonly campIndex: number;
  readonly state: MonsterState;
  /** Giây xác còn nằm (state 'corpse'); view làm mờ dần. */
  readonly corpseT: number;
  /** Giây còn bị khiêu khích (0 = không). */
  readonly tauntT: number;
  /** Boss: id kỹ năng đang gồng ('' = không). */
  readonly castAbility: string;
  /** Boss đang lao (Húc Lao). */
  readonly dashing: boolean;
}

export interface PickupView {
  readonly id: number;
  readonly item: string;
  readonly amount: number;
  readonly x: number;
  readonly y: number;
  /** true khi đang bay về hero. */
  readonly flying: boolean;
}

/** Vùng đỏ báo đòn của boss. Hình tròn: (x, y, radius). Hình chữ nhật: từ (x, y) theo hướng (dirX, dirY), dài length, rộng width. */
export interface TelegraphView {
  readonly id: number;
  readonly shape: 'circle' | 'rect';
  readonly ability: string;
  readonly sourceId: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly length: number;
  readonly width: number;
  /** Đã trôi qua bao nhiêu giây / tổng số giây. Lớp trong lớn dần theo elapsed / duration. */
  readonly elapsed: number;
  readonly duration: number;
}

export interface ResourceNodeView {
  /** Chỉ số cố định trong field-layout.json → nodes. */
  readonly index: number;
  readonly id: string;
  readonly type: string;
  readonly kind: 'tree' | 'rock';
  readonly resource: string;
  readonly zone: ZoneId;
  readonly x: number;
  readonly y: number;
  readonly durability: number;
  readonly maxDurability: number;
  readonly depleted: boolean;
  /** Vòng bánh đếm giờ mọc lại: còn respawnT trên respawnSec giây. */
  readonly respawnT: number;
  readonly respawnSec: number;
  /**
   * Nút đang nằm trong tầm thu thập của đội: chưa cạn và cách THỦ LĨNH không quá FieldView.gatherRadius.
   * Khi đội đứng yên, hero tự đi tới các nút như vậy để chặt/đập (01 mục 5.3). Nút có inReach = false sẽ không
   * được đụng tới dù đội đứng yên bao lâu: view có thể tô sáng nút trong tầm, hoặc nhắc người chơi lại gần hơn.
   * Cập nhật mỗi bước ở chế độ 'world' / 'build'.
   */
  readonly inReach: boolean;
}

export interface CampView {
  readonly index: number;
  readonly id: string;
  readonly zone: ZoneId;
  readonly monsterId: string;
  readonly x: number;
  readonly y: number;
  readonly alive: number;
  readonly count: number;
  /** Khi ổ trống hẳn: giây còn lại tới khi con đầu tiên mọc lại (vòng bánh ở tâm ổ). 0 nếu ổ còn quái. */
  readonly respawnT: number;
  readonly respawnSec: number;
}

export interface BuildJobView {
  readonly kind: 'build' | 'upgrade';
  readonly targetLevel: number;
  readonly startedAt: number;
  readonly endsAt: number;
}

export interface BuildingView {
  readonly uid: number;
  readonly type: string;
  readonly name: string;
  /** 0 khi đang xây mới (giàn giáo, chưa dùng được). */
  readonly level: number;
  /** Ô góc có x, y nhỏ nhất. Footprint phủ các ô [x, x+w) × [y, y+h). */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly job: BuildJobView | null;
  /** Bộ đệm sản xuất (số nguyên đã làm tròn xuống) và trần của nó; 0/0 với công trình không sản xuất. */
  readonly buffer: number;
  readonly bufferCap: number;
  readonly bufferResource: string;
  /**
   * Dấu hiệu vẽ trên công trình, đã chọn theo thứ tự ưu tiên của 03-ux-spec.md mục 4 (cập nhật mỗi bước):
   *   'job'    đang xây hoặc nâng (giàn giáo / thanh tiến độ + đồng hồ);
   *   'buffer' bộ đệm sản xuất ≥ 1 (bong bóng tài nguyên "số / trần");
   *   'alert'  dấu chấm than: Quán tuyển được (đủ vàng cho 1 lượt); Sân Tập mở được nấc hoặc ô đội;
   *   'check'  dấu check: Cổng Xoáy đủ cấp và CP đội ≥ CP đề nghị của chặng chưa vượt đầu tiên;
   *   'none'   không có gì.
   */
  readonly marker: BuildingMarker;
}

export type BuildingMarker = 'none' | 'job' | 'buffer' | 'alert' | 'check';

export interface PlayerView {
  readonly level: number;
  /** EXP đã tích trong cấp hiện tại (về 0 mỗi khi lên cấp; phần dư được mang sang). */
  readonly exp: number;
  /**
   * TỔNG EXP của cấp hiện tại, tức lượng cần để đi từ đầu cấp này lên cấp kế (không phải phần còn thiếu).
   * Thanh EXP = exp / expToNext; còn thiếu = expToNext − exp. Bằng 0 khi đã ở cấp tối đa.
   */
  readonly expToNext: number;
}

export interface QuestView {
  /** Chỉ số nhiệm vụ hiện tại; = số nhiệm vụ khi đã xong cả chuỗi. */
  readonly index: number;
  readonly id: string;
  readonly type: string;
  readonly text: string;
  readonly progress: number;
  readonly target: number;
  readonly complete: boolean;
  /** true khi đã hết chuỗi; text = câu kết chương. */
  readonly finished: boolean;
  readonly reward: ResourceMap;
  readonly hint: string;
  /** Icon của thẻ nhiệm vụ (display.json → questIcons theo loại; rỗng khi đã hết chuỗi). */
  readonly icon: string;
}

export interface DungeonRunView {
  readonly stage: number;
  readonly floor: number;
  readonly isBossFloor: boolean;
  /** Giây đã trôi qua trong tầng hiện tại. */
  readonly floorTime: number;
  /** Tầng đã sạch quái, cửa ra đang mở. */
  readonly cleared: boolean;
  readonly exitOpen: boolean;
  readonly exitX: number;
  readonly exitY: number;
  /** > 0: đang mờ màn chuyển tầng (giây còn lại). */
  readonly fadeT: number;
  readonly streak: number;
  /** Đồng hồ chuỗi: còn streakT trên tuning.dungeon.streakTimeoutSec giây. */
  readonly streakT: number;
  readonly auto: boolean;
  /** Vật đã nhặt trong lượt (cộng vào kho khi lượt kết thúc). */
  readonly loot: ResourceMap;
  /** id của boss đang sống (0 = không có). Tra trong scene.monsters. */
  readonly bossId: number;
  readonly bossName: string;
  /** Số quái còn lại của tầng (đang sống + chưa sinh). */
  readonly remaining: number;
  readonly roomW: number;
  readonly roomH: number;
}

/** Thế giới đang hiển thị: ngoài đồng/làng hoặc phòng dungeon. Mảng được sửa tại chỗ mỗi bước. */
export interface SceneView {
  readonly kind: 'field' | 'dungeon';
  /** Các hero của đội, theo thứ tự ô đội. */
  readonly heroes: ReadonlyArray<HeroUnitView>;
  /** Quái còn sống và xác đang nằm. */
  readonly monsters: ReadonlyArray<MonsterUnitView>;
  readonly pickups: ReadonlyArray<PickupView>;
  readonly telegraphs: ReadonlyArray<TelegraphView>;
  /** Hero thủ lĩnh hiện tại (null khi cả đội đã gục). Camera bám vào đây. */
  readonly leader: HeroUnitView | null;
  /** Vùng đi được: [minX, minY, maxX, maxY]. */
  readonly bounds: ReadonlyArray<number>;
}

export interface FieldView extends SceneView {
  readonly nodes: ReadonlyArray<ResourceNodeView>;
  readonly camps: ReadonlyArray<CampView>;
  /** > 0: đang gồng "Về làng"/"Ra đồng" (giây còn lại, tổng 1 s). */
  readonly returnChannelT: number;
  /** > 0: cả đội gục, đang chờ hồi sinh ở làng (giây còn lại). */
  readonly wipeT: number;
  /** Điểm ra đồng đã nhớ (null nếu chưa có). */
  readonly returnPoint: ReadonlyArray<number> | null;
  /** Bán kính quanh thủ lĩnh (ô) trong đó đội tự đi tới thu thập nút tài nguyên khi đứng yên. */
  readonly gatherRadius: number;
  /** Bán kính quanh thủ lĩnh (ô) trong đó đội tự đi tới đánh quái khi đứng yên. */
  readonly aggroRadius: number;
  /** Số nút tài nguyên đang có inReach = true. */
  readonly nodesInReach: number;
}

export interface ResultView {
  readonly outcome: 'victory' | 'defeat' | 'left';
  readonly stage: number;
  readonly floorReached: number;
  readonly firstClear: boolean;
  /** Vật nhặt trong lượt. */
  readonly loot: ResourceMap;
  /** Thưởng chặng (rỗng khi thua). */
  readonly stageReward: ResourceMap;
  /** loot + stageReward: thứ thực sự đã cộng vào kho (trước khi bị trần kho cắt). */
  readonly total: ResourceMap;
  readonly kills: number;
  readonly bestStreak: number;
  readonly durationSec: number;
}

/** Báo cáo tiến độ ngoại tuyến, có ngay sau createGame với một save. null nếu chơi mới. */
export interface OfflineReport {
  readonly offlineSec: number;
  /** true khi offlineSec ≥ tuning.save.welcomeBackMinSec: view nên mở panel "Chào mừng trở lại". */
  readonly showPanel: boolean;
  readonly capped: boolean;
  /** Sản lượng đang chờ thu trong từng công trình sản xuất. */
  readonly buffers: ReadonlyArray<{ uid: number; type: string; name: string; resource: string; amount: number }>;
  /** Công trình xây/nâng xong trong lúc vắng. */
  readonly finished: ReadonlyArray<{ uid: number; type: string; name: string; level: number }>;
  readonly tavernRefreshed: boolean;
}

// ---------------------------------------------------------------------------------------------
// Sự kiện một lần cho phần trình bày
// ---------------------------------------------------------------------------------------------
// Mọi sự kiện dùng chung một hình dạng để lõi tái sử dụng object (không cấp phát trong vòng lặp).
// Trường nào không dùng thì = 0 / '' / null. Bảng dưới ghi trường có nghĩa của từng loại.
//
//  type              | x, y              | n                  | id              | key              | data
//  ------------------+-------------------+--------------------+-----------------+------------------+---------------
//  attack            | vị trí kẻ đánh    | 1 nếu tầm xa       | id kẻ đánh      | id kỹ năng hoặc ''| id mục tiêu (number) trong `id2`
//  damage            | vị trí mục tiêu   | sát thương         | id mục tiêu     | 'hero' | 'monster'| —
//  heal              | vị trí hero       | lượng hồi          | id hero         | id kỹ năng       | —
//  skill             | vị trí hero       | bán kính (nếu có)  | id hero         | id kỹ năng       | —
//  death             | vị trí            | —                  | id đơn vị       | 'hero' | 'monster'| —
//  revive            | vị trí            | —                  | id hero         | heroId           | —
//  exp               | vị trí quái chết  | EXP                | —               | —                | —
//  gather            | vị trí nút        | số tài nguyên      | index nút       | tài nguyên       | —
//  node_depleted     | vị trí nút        | —                  | index nút       | tài nguyên       | —
//  pickup            | vị trí nhặt       | số lượng           | —               | tài nguyên       | —
//  collect           | tâm công trình    | số lượng           | uid công trình  | tài nguyên       | —
//  player_level      | —                 | cấp mới            | —               | —                | —
//  hero_level        | —                 | cấp mới            | —               | heroId           | —
//  hero_unlocked     | —                 | —                  | —               | heroId           | —
//  streak_bonus      | vị trí thủ lĩnh   | vàng thưởng        | chuỗi hiện tại  | —                | —
//  telegraph         | tâm / gốc         | giây báo           | id telegraph    | id kỹ năng boss  | —
//  boss_ability      | vị trí boss       | —                  | id boss         | id kỹ năng boss  | —   (lúc đòn nổ / gọi bầy)
//  floor_start       | —                 | số tầng            | —               | —                | —
//  floor_clear       | cửa ra            | vàng qua tầng      | số tầng         | —                | —
//  result            | —                 | —                  | —               | outcome          | ResultView
//  mode              | —                 | —                  | —               | chế độ mới       | —
//  build_started     | tâm công trình    | cấp đích           | uid             | loại công trình  | —
//  build_done        | tâm công trình    | cấp mới            | uid             | loại công trình  | —
//  build_cancelled   | tâm công trình    | —                  | uid             | loại công trình  | —
//  building_moved    | tâm công trình    | —                  | uid             | loại công trình  | —
//  recruit           | —                 | số lượt            | —               | —                | RecruitResult
//  cards_refreshed   | —                 | 1 nếu do BONUS     | —               | —                | —
//  squad_changed     | —                 | CP mới             | CP cũ (id)      | —                | —
//  slot_unlocked     | —                 | số ô đội mới       | —               | —                | —
//  training_unlocked | —                 | index nấc          | —               | 'hp' | 'atk'     | —
//  quest_complete    | —                 | index nhiệm vụ     | —               | id nhiệm vụ      | —   (đủ điều kiện, chờ nhận)
//  quest_claimed     | —                 | index nhiệm vụ     | —               | id nhiệm vụ      | ResourceMap thưởng
//  return_start      | vị trí thủ lĩnh   | giây gồng          | —               | 'village'|'field'| —
//  return_cancel     | —                 | —                  | —               | —                | —
//  teleport          | vị trí mới        | —                  | —               | 'village'|'field'|'wipe'|'gate' | —
//  wipe              | —                 | giây chờ           | —               | —                | —
//  toast             | —                 | số kèm theo        | —               | mã toast (ToastKey) | — ; `text` = câu tiếng Việt
//  save_point        | —                 | —                  | —               | —                | —   (view nên gọi game.save() và ghi storage)
//
export type GameEventType =
  | 'attack' | 'damage' | 'heal' | 'skill' | 'death' | 'revive' | 'exp' | 'gather' | 'node_depleted' | 'pickup'
  | 'collect' | 'player_level' | 'hero_level' | 'hero_unlocked' | 'streak_bonus' | 'telegraph' | 'boss_ability'
  | 'floor_start' | 'floor_clear' | 'result' | 'mode' | 'build_started' | 'build_done' | 'build_cancelled'
  | 'building_moved' | 'recruit' | 'cards_refreshed' | 'squad_changed' | 'slot_unlocked' | 'training_unlocked'
  | 'quest_complete' | 'quest_claimed' | 'return_start' | 'return_cancel' | 'teleport' | 'wipe' | 'toast' | 'save_point';

export type ToastKey = 'storage_full' | 'build_done' | 'build_started' | 'collect' | 'monsters_near'
  | 'need_village' | 'player_level' | 'blocked' | 'quest_reward' | 'village_full';

export interface GameEvent {
  readonly type: GameEventType;
  readonly x: number;
  readonly y: number;
  readonly n: number;
  readonly id: number;
  readonly id2: number;
  readonly key: string;
  readonly text: string;
  readonly data: any;
}

// ---------------------------------------------------------------------------------------------
// Dữ liệu cho panel (có cấp phát; gọi khi mở hoặc cần vẽ lại panel)
// ---------------------------------------------------------------------------------------------

export interface CostInfo {
  /** Giá theo tài nguyên. */
  readonly cost: ResourceMap;
  /** Tài nguyên nào đang thiếu và thiếu bao nhiêu (rỗng nếu đủ). Dùng để tô đỏ. */
  readonly missing: ResourceMap;
  readonly affordable: boolean;
}

export interface BuildMenuEntry {
  readonly type: string;
  readonly name: string;
  readonly desc: string;
  readonly w: number;
  readonly h: number;
  readonly cost: CostInfo;
  readonly buildSec: number;
  readonly unlockPlayerLevel: number;
  /** 'locked' = chưa đủ cấp người chơi; 'built' = đã đủ maxCount; 'available' = chọn được. */
  readonly state: 'locked' | 'built' | 'available';
  /** Lý do không xây được ngay (thiếu tài nguyên, hết thợ...) — không xét vị trí. */
  readonly check: Check;
}

export interface PlacementCheck extends Check {
  /** uid công trình bị chồng (0 nếu không). */
  readonly blockerUid: number;
}

export interface StatRow {
  /** Mã dòng: 'cap' | 'perHour' | 'bufferCap' | 'buffer' | 'oddsE' | 'oddsL' | 'maxSlots' | 'maxStage'. */
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Chênh lệch ở cấp kế (0 nếu không đổi hoặc đã tối đa). */
  readonly delta: number;
  /** true: value và delta là tỉ lệ (0.07 = 7%). */
  readonly percent: boolean;
  /** Icon của dòng (display.json → statRowIcons). */
  readonly icon: string;
}

export interface BuildingPanelInfo {
  readonly uid: number;
  readonly type: string;
  readonly name: string;
  readonly desc: string;
  readonly level: number;
  readonly maxLevel: number;
  readonly job: BuildJobView | null;
  /** Giây còn lại của việc đang chạy (0 nếu không có). */
  readonly jobRemainingSec: number;
  readonly rows: ReadonlyArray<StatRow>;
  /** Giá và thời gian nâng lên cấp kế (null khi đã tối đa). */
  readonly upgradeCost: CostInfo | null;
  readonly upgradeSec: number;
  readonly canUpgrade: Check;
  readonly canCancel: boolean;
  readonly canCollect: Check;
}

export interface SkillInfo {
  readonly id: string;
  readonly name: string;
  readonly type: SkillType;
  /** Tên tiếng Việt của loại kỹ năng (display.json → skillTypeNames), ví dụ "Chém vùng". */
  readonly typeName: string;
  /** Tên tiếng Việt của từng tham số trong `params` (display.json → skillParamNames), ví dụ { mult: "Hệ số" }. */
  readonly paramNames: { [key: string]: string };
  readonly desc: string;
  readonly cooldownSec: number;
  readonly unlocked: boolean;
  /** 0 = chưa mở, 1–2 trong M1. Sao 3 luôn khóa. */
  readonly stars: number;
  readonly unlockLevel: number;
  readonly star2Level: number;
  /** Tham số ở sao hiện tại (hoặc sao 1 nếu chưa mở) và ở sao kế (null nếu đã 2 sao). */
  readonly params: { [key: string]: number };
  readonly nextParams: { [key: string]: number } | null;
}

export interface MilestoneInfo {
  readonly level: number;
  readonly type: string;
  readonly desc: string;
  readonly reached: boolean;
}

export interface HeroInfo {
  readonly id: string;
  readonly name: string;
  readonly attribute: Attribute;
  readonly rarity: Rarity;
  readonly role: HeroRole;
  readonly ranged: boolean;
  readonly flavor: string;
  readonly sprite: string;
  readonly tint: string;
  readonly owned: boolean;
  readonly inSquad: boolean;
  /** Vị trí ô đội (−1 nếu ngoài đội). */
  readonly squadIndex: number;
  /** Cấp hiện tại (1 nếu chưa có: số liệu xem trước). */
  readonly level: number;
  readonly maxLevel: number;
  readonly hp: number;
  readonly atk: number;
  readonly cp: number;
  /** Mức tăng ở cấp kế ("+X" xanh). 0 khi đã tối đa. */
  readonly hpNext: number;
  readonly atkNext: number;
  readonly attackInterval: number;
  readonly attackRange: number;
  readonly gatherPower: number;
  readonly fragments: number;
  /** Mảnh cần cho lần đột phá kế tiếp (0 = không còn đột phá). Thanh "mảnh có / mảnh cần". */
  readonly fragmentsForNextBreakthrough: number;
  /** Giá lên cấp kế: thịt và mảnh (mảnh = 0 ngoài cấp đột phá). null khi đã tối đa hoặc chưa có. */
  readonly levelUpMeat: number;
  readonly levelUpFragments: number;
  readonly canLevelUp: Check;
  readonly milestones: ReadonlyArray<MilestoneInfo>;
  readonly skills: ReadonlyArray<SkillInfo>;
}

export interface SquadInfo {
  readonly slots: number;
  readonly maxSlots: number;
  readonly heroIds: ReadonlyArray<string>;
  readonly cp: number;
  /** Kết quả nếu bấm TỰ XẾP ngay bây giờ. */
  readonly autoHeroIds: ReadonlyArray<string>;
  readonly autoCp: number;
  /** Có hero ngoài đội mạnh hơn hero yếu nhất trong đội, hoặc còn ô trống mà có hero rảnh (mũi tên xanh ở nút Đội). */
  readonly canImprove: boolean;
}

export interface TavernCard {
  readonly heroId: string;
  readonly name: string;
  readonly rarity: Rarity;
  readonly attribute: Attribute;
  readonly owned: boolean;
  readonly level: number;
  readonly fragments: number;
  readonly fragmentsForNextBreakthrough: number;
  /** Mảnh nhận nếu trúng thẻ này khi đã có hero (nhãn "x5"). */
  readonly duplicateFragments: number;
}

export interface TicketExchangeInfo {
  readonly id: string;
  readonly desc: string;
  readonly tickets: number;
  /** Hero chọn được cho dòng này. */
  readonly eligibleHeroIds: ReadonlyArray<string>;
  readonly check: Check;
}

export interface TavernInfo {
  readonly built: boolean;
  readonly level: number;
  readonly cards: ReadonlyArray<TavernCard>;
  /** Giây tới lần tự đổi thẻ kế. */
  readonly refreshInSec: number;
  readonly manualRefreshGold: number;
  readonly canRefresh: Check;
  readonly bonus: number;
  readonly bonusEvery: number;
  readonly costGold: number;
  readonly multi: ReadonlyArray<number>;
  /** canRecruit[i] ứng với multi[i]. */
  readonly canRecruit: ReadonlyArray<Check>;
  /** Mỗi nút 1x / 2x / 3x: số lượt, tổng giá vàng, có đủ vàng không, và lý do nếu bị khóa. */
  readonly recruitOptions: ReadonlyArray<RecruitOption>;
  readonly tickets: number;
  readonly exchanges: ReadonlyArray<TicketExchangeInfo>;
  readonly totalDraws: number;
  /** Tỉ lệ độ hiếm của cấp Quán hiện tại. */
  readonly odds: { [rarity: string]: number };
}

export interface RecruitOption {
  readonly times: number;
  readonly costGold: number;
  readonly affordable: boolean;
  readonly check: Check;
}

export interface RecruitDraw {
  /**
   * Bộ thẻ lúc rút lượt này và thẻ trúng. Từ hợp đồng v2, mọi lượt của một lần bấm 2x/3x dùng CÙNG bộ thẻ
   * đang hiện lúc bấm, nên `cards` giống nhau cho mọi phần tử của `RecruitResult.draws`.
   */
  readonly cards: ReadonlyArray<string>;
  readonly pickIndex: number;
  readonly heroId: string;
  readonly isNew: boolean;
  readonly fragmentsGained: number;
  readonly fragmentsBefore: number;
  readonly fragmentsAfter: number;
  /** Lượt này làm đầy thanh BONUS. Bộ thẻ đổi sau khi cả lần bấm kết thúc (xem RecruitResult.bonusRefreshed). */
  readonly bonusTriggered: boolean;
  /** Hero mới đã tự vào ô đội trống. */
  readonly joinedSquad: boolean;
}

export interface RecruitResult {
  readonly draws: ReadonlyArray<RecruitDraw>;
  readonly goldSpent: number;
  readonly ticketsGained: number;
  /** Bộ thẻ đang hiện lúc bấm nút: mọi lượt trong `draws` rút từ bộ này. */
  readonly cards: ReadonlyArray<string>;
  /** Thanh BONUS đầy trong lần bấm này: sau khi rút xong, Quán đã đổi sang bộ thẻ BONUS (`cardsAfter`). */
  readonly bonusRefreshed: boolean;
  /** Bộ thẻ của Quán sau lần bấm (bằng `cards` nếu không có BONUS). */
  readonly cardsAfter: ReadonlyArray<string>;
}

export interface TrainingNodeInfo {
  readonly index: number;
  readonly stat: 'hp' | 'atk';
  readonly value: number;
  readonly ore: number;
  readonly reqPlayerLevel: number;
  readonly state: 'unlocked' | 'available' | 'locked';
}

export interface SlotNodeInfo {
  readonly slot: number;
  readonly coral: number;
  readonly reqYardLevel: number;
  readonly state: 'unlocked' | 'available' | 'locked';
  readonly check: Check;
}

export interface TrainingInfo {
  readonly built: boolean;
  readonly yardLevel: number;
  readonly nodesUnlocked: number;
  readonly totalNodes: number;
  /** Tổng cộng phẳng đã mở cho mọi hero. */
  readonly flatHp: number;
  readonly flatAtk: number;
  readonly nodes: ReadonlyArray<TrainingNodeInfo>;
  readonly canUnlockNext: Check;
  readonly slotNodes: ReadonlyArray<SlotNodeInfo>;
  readonly squadSlots: number;
}

export interface StageInfo {
  readonly stage: number;
  readonly name: string;
  readonly firstFloor: number;
  readonly bossFloor: number;
  readonly recommendedCp: number;
  readonly squadCp: number;
  /** squadCp / recommendedCp. */
  readonly ratio: number;
  readonly label: string;
  readonly color: string;
  /** Nhãn "Khó": view hỏi xác nhận trước khi vào. */
  readonly hard: boolean;
  readonly cleared: boolean;
  readonly repeatClears: number;
  readonly firstClear: ResourceMap;
  readonly repeatClear: { gold: number; coralChance: number; coralPityEvery: number; tickets: number };
  /** Lần đánh lại kế có chắc chắn rơi San Hô Đỏ không (bảo hiểm). */
  readonly nextRepeatGuaranteesCoral: boolean;
  readonly bossId: string;
  readonly bossName: string;
  readonly canEnter: Check;
}

export interface DungeonInfo {
  readonly built: boolean;
  readonly gateLevel: number;
  readonly bestStageCleared: number;
  readonly bestFloorCleared: number;
  /** Chặng nên hiện mặc định: chặng chưa vượt đầu tiên. */
  readonly defaultStage: number;
  /** Chặng chưa vượt đầu tiên mà Cổng đủ cấp và CP đội ≥ CP đề nghị (0 = không có). Cùng điều kiện với marker 'check'. */
  readonly readyStage: number;
  readonly stages: ReadonlyArray<StageInfo>;
}

/** Đích của nút kính lúp (chỉ đường). */
export interface QuestHint {
  /** 'world' = mũi tên chỉ tới (x, y) trong bản đồ; 'ui' = làm nảy một nút HUD; 'none' = không có gì để chỉ. */
  readonly kind: 'world' | 'ui' | 'none';
  readonly x: number;
  readonly y: number;
  /** 'build_button' | 'hero_list' | 'squad_button' khi kind = 'ui'. */
  readonly ui: string;
  /** Chuỗi gốc trong quests.json. */
  readonly raw: string;
}

// ---------------------------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------------------------

export interface SaveBuilding {
  uid: number; type: string; level: number; x: number; y: number;
  job: { kind: 'build' | 'upgrade'; targetLevel: number; startedAt: number; endsAt: number } | null;
  buffer: number;
}

/** Bản lưu: dữ liệu thuần, JSON.stringify được. Lõi tạo và đọc; view chỉ ghi/đọc chuỗi. */
export interface SaveData {
  saveVersion: number;
  createdAt: number;
  lastSaveAt: number;
  rng: { seed: number; state: number; dungeonRuns: number };
  player: { level: number; exp: number };
  resources: ResourceMap;
  buildings: SaveBuilding[];
  nextBuildingUid: number;
  heroes: { id: string; level: number; fragments: number }[];
  squad: string[];
  squadSlots: number;
  training: { nodesUnlocked: number };
  tavern: { cards: string[]; nextRefreshAt: number; bonus: number; totalDraws: number };
  dungeon: { bestStageCleared: number; bestFloorCleared: number; repeatClears: { [stage: string]: number }; auto: boolean };
  quest: { index: number; progress: number };
  world: { leaderPos: number[]; returnPoint: number[] | null };
  settings: { music: boolean; sfx: boolean };
  stats: { playSec: number; kills: number };
  inventory: { [key: string]: any };
}

// ---------------------------------------------------------------------------------------------
// Game: mọi thứ view gọi
// ---------------------------------------------------------------------------------------------

export interface Game {
  // ----- vòng lặp -----
  /** Bước mô phỏng cố định (tuning.sim.fixedStepSec). View gọi bằng bộ tích lũy từ update(dt). */
  readonly stepSec: number;
  /** Chạy đúng một bước. Không gọi khi menu tạm dừng dungeon đang mở. */
  step(): void;
  /** Số bước đã chạy trong phiên. */
  readonly tick: number;

  // ----- trạng thái đọc mỗi frame (không cấp phát) -----
  readonly data: GameData;
  readonly mode: Mode;
  /** Thế giới đang hiển thị: field khi mode là 'world'/'build'/'result', dungeon khi mode là 'dungeon'. */
  readonly scene: SceneView;
  readonly field: FieldView;
  /** Phòng dungeon hiện tại (chỉ dùng khi mode = 'dungeon'). */
  readonly dungeonScene: SceneView;
  /** Thông tin lượt dungeon; null ngoài dungeon. */
  readonly run: DungeonRunView | null;
  /** Kết quả lượt vừa xong; null trừ khi mode = 'result'. */
  readonly result: ResultView | null;
  readonly player: PlayerView;
  /** Tài nguyên đang có. Đọc trực tiếp: resources.gold, resources.meat... */
  readonly resources: Readonly<ResourceMap>;
  /** Trần kho của tài nguyên (Infinity nếu không có trần). */
  storageCap(resource: string): number;
  /** Lực chiến đội hiện tại. */
  readonly squadCp: number;
  /** id các hero trong đội theo thứ tự ô. */
  readonly squad: ReadonlyArray<string>;
  readonly squadSlots: number;
  readonly buildings: ReadonlyArray<BuildingView>;
  /** Số thợ đang rảnh / tổng số thợ. */
  readonly buildersFree: number;
  readonly buildersTotal: number;
  readonly quest: QuestView;
  /** Vùng của thủ lĩnh ngoài đồng ('village' | 'z1' | 'z2' | 'z3'). */
  readonly leaderZone: ZoneId;
  /** Tổng thời gian chơi (giây mô phỏng). */
  readonly playSec: number;
  readonly settings: { readonly music: boolean; readonly sfx: boolean };
  /** Báo cáo ngoại tuyến của lần tải này (null nếu chơi mới). */
  readonly offlineReport: OfflineReport | null;

  // ----- sự kiện -----
  /** Sự kiện tích lũy từ lần clearEvents() trước (gồm cả sự kiện do lệnh sinh ra). Chỉ đọc events[0..eventCount). */
  readonly events: ReadonlyArray<GameEvent>;
  readonly eventCount: number;
  /** View gọi mỗi frame sau khi đã xử lý xong events. */
  clearEvents(): void;

  // ----- lệnh: di chuyển -----
  /**
   * Vector joystick TRONG TỌA ĐỘ Ô CỦA LÕI (không phải tọa độ màn hình): (1, 0) = đi theo chiều +x của lưới.
   * Độ dài = độ lệch joystick 0..1 (đã chia cho bán kính joystick); dài hơn 1 thì lõi chuẩn hóa về 1.
   * Tốc độ thủ lĩnh = tuning.squad.moveSpeed × độ dài (ô/giây, như nhau theo mọi hướng của lưới); độ dài dưới
   * tuning.combat.joystickDeadZonePct = đứng yên. (0, 0) = thả tay. Gọi mỗi khi đổi.
   * View đổi vector joystick trên màn hình iso sang vector lưới bằng joystickToWorld() trong index.ts.
   */
  setJoystick(x: number, y: number): void;
  /** Nút "Về làng" (ngoài làng) / "Ra đồng" (trong làng). */
  returnToVillage(): Check;
  goToField(): Check;
  canReturnToVillage(): Check;
  canGoToField(): Check;

  // ----- lệnh: xây dựng -----
  canEnterBuildMode(): Check;
  enterBuildMode(): Check;
  exitBuildMode(): Check;
  getBuildMenu(): BuildMenuEntry[];
  /** Kiểm tra đặt một công trình MỚI loại `type` tại ô (x, y) (ô góc nhỏ nhất). Dùng để tô bóng xanh/đỏ. */
  checkPlacement(type: string, x: number, y: number): PlacementCheck;
  /** Kiểm tra dời công trình `uid` tới ô (x, y). */
  checkMove(uid: number, x: number, y: number): PlacementCheck;
  /** Ô hợp lệ gần (nearX, nearY) nhất cho bóng mới; null nếu làng kín chỗ. `ignoreUid` = công trình đang dời. */
  findFreeCell(type: string, nearX: number, nearY: number, ignoreUid?: number): { x: number; y: number } | null;
  placeBuilding(type: string, x: number, y: number): PlacementCheck;
  moveBuilding(uid: number, x: number, y: number): PlacementCheck;
  upgradeBuilding(uid: number): Check;
  cancelBuildingJob(uid: number): Check;
  /** Nút "Thu" trong panel (đi lại gần công trình thì lõi tự thu). */
  collectBuilding(uid: number): Check;
  /** Nút "THU HẾT" của panel Chào mừng trở lại. Trả về tổng đã thu theo tài nguyên. */
  collectAll(): ResourceMap;
  getBuildingPanel(uid: number): BuildingPanelInfo | null;
  /** Công trình đầu tiên có loại `type` (kể cả đang xây), null nếu chưa có. */
  findBuilding(type: string): BuildingView | null;
  /** Công trình phủ ô chứa điểm (x, y), null nếu không có. */
  buildingAt(x: number, y: number): BuildingView | null;

  // ----- lệnh: hero và đội -----
  getHeroList(): HeroInfo[];
  getHeroInfo(heroId: string): HeroInfo | null;
  levelUpHero(heroId: string): Check;
  getSquadInfo(): SquadInfo;
  /** Đặt cả đội một lần (thứ tự = thứ tự ô; phần tử đầu là thủ lĩnh). */
  setSquad(heroIds: string[]): Check;
  squadAdd(heroId: string): Check;
  squadRemove(heroId: string): Check;
  /** Đổi chỗ hai ô đội (0-based). */
  squadSwap(slotA: number, slotB: number): Check;
  /** Thay hero ở ô `slot` bằng hero ngoài đội. */
  squadReplace(slot: number, heroId: string): Check;
  autoAssign(): Check;

  // ----- lệnh: Quán Mỏ Neo -----
  getTavernInfo(): TavernInfo;
  /** times = 1 | 2 | 3. Kết quả chi tiết nằm trong sự kiện 'recruit' và giá trị trả về của lastRecruit. */
  recruit(times: number): Check;
  readonly lastRecruit: RecruitResult | null;
  refreshCards(): Check;
  exchangeTickets(exchangeId: string, heroId: string): Check;

  // ----- lệnh: Sân Tập -----
  getTrainingInfo(): TrainingInfo;
  unlockTrainingNode(): Check;
  unlockSquadSlot(): Check;

  // ----- lệnh: dungeon -----
  getDungeonInfo(): DungeonInfo;
  enterDungeon(stage: number): Check;
  /** "Rời hang" trong menu tạm dừng: kết thúc lượt như thua. */
  leaveDungeon(): Check;
  setAuto(on: boolean): void;
  /** Chạm màn kết quả: về làng cạnh Cổng Xoáy. */
  closeResult(): Check;

  // ----- lệnh: nhiệm vụ -----
  claimQuest(): Check;
  getQuestHint(): QuestHint;

  // ----- cài đặt, lưu -----
  setSetting(key: 'music' | 'sfx', on: boolean): void;
  /** Ảnh chụp để ghi vào storage. Trong dungeon trả về trạng thái trước khi vào hang (01 mục 15.1). */
  save(): SaveData;

  // ----- tọa độ -----
  /** Vùng của điểm (x, y) ngoài đồng. */
  zoneAt(x: number, y: number): ZoneId;
  /** Ô lưới chứa điểm thế giới. */
  cellAt(x: number, y: number): { cx: number; cy: number };
  /** Ô có nằm trong lưới làng không. */
  inVillageGrid(cx: number, cy: number): boolean;
}
