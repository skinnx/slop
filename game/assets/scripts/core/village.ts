// Làng: công trình trên lưới, đặt/dời/nâng/hủy, thợ, sản xuất vào bộ đệm, thu (01 mục 7).
import { BuildingDef, BuildingLevelDef, GameData, ResourceMap } from './data';
import {
  BuildingView, BuildJobView, BuildingPanelInfo, BuildMenuEntry, Check, CostInfo, PlacementCheck, SaveBuilding, StatRow,
} from './contract';
import { OK, PLACE_OK, fail, failPlace } from './checks';

export class Building implements BuildingView {
  uid = 0;
  type = '';
  name = '';
  level = 0;
  x = 0; y = 0;
  w = 1; h = 1;
  job: BuildJobView | null = null;
  buffer = 0;
  bufferCap = 0;
  bufferResource = '';
  def: BuildingDef = null;
  /** Bộ đệm thật (số thực); `buffer` là phần nguyên cho view. */
  bufferRaw = 0;
}

/** Kho tài nguyên do Game cài đặt. */
export interface Bank {
  readonly resources: ResourceMap;
  playerLevel(): number;
  cap(resource: string): number;
  missing(cost: ResourceMap): ResourceMap;
  spend(cost: ResourceMap): void;
  /** Hoàn trả, không bị trần kho cắt. */
  refund(cost: ResourceMap): void;
}

function isEmpty(m: ResourceMap): boolean {
  for (const k in m) if (m[k] > 0) return false;
  return true;
}

export function costInfo(bank: Bank, cost: ResourceMap): CostInfo {
  const missing = bank.missing(cost);
  return { cost, missing, affordable: isEmpty(missing) };
}

export class Village {
  buildings: Building[] = [];
  nextUid = 1;
  private data: GameData;
  private bank: Bank;

  constructor(data: GameData, bank: Bank) {
    this.data = data;
    this.bank = bank;
  }

  /** Save mới: đặt các công trình có sẵn (Nhà Kho cấp 1). */
  initNew(): void {
    for (const def of this.data.buildings) {
      if (def.prePlaced) this.add(def, def.prePlaced[0], def.prePlaced[1], 1, null, 0);
    }
  }

  load(list: SaveBuilding[], nextUid: number): void {
    this.buildings.length = 0;
    let maxUid = 0;
    for (const s of list) {
      const def = this.data.buildingById[s.type];
      if (!def) continue;
      const b = this.add(def, s.x, s.y, Math.max(0, Math.min(def.levels.length, s.level)), null, s.buffer);
      b.uid = s.uid;
      if (s.job && s.job.targetLevel >= 1 && s.job.targetLevel <= def.levels.length) {
        b.job = { kind: s.job.kind, targetLevel: s.job.targetLevel, startedAt: s.job.startedAt, endsAt: s.job.endsAt };
      }
      if (s.uid > maxUid) maxUid = s.uid;
    }
    this.nextUid = Math.max(nextUid || 1, maxUid + 1);
  }

  toSave(): SaveBuilding[] {
    return this.buildings.map((b) => ({
      uid: b.uid, type: b.type, level: b.level, x: b.x, y: b.y,
      job: b.job ? { kind: b.job.kind, targetLevel: b.job.targetLevel, startedAt: b.job.startedAt, endsAt: b.job.endsAt } : null,
      buffer: b.bufferRaw,
    }));
  }

  private add(def: BuildingDef, x: number, y: number, level: number, job: BuildJobView | null, buffer: number): Building {
    const b = new Building();
    b.uid = this.nextUid++;
    b.def = def; b.type = def.id; b.name = def.name;
    b.x = x; b.y = y; b.w = def.footprint[0]; b.h = def.footprint[1];
    b.level = level; b.job = job;
    b.bufferRaw = buffer > 0 ? buffer : 0;
    this.refreshBuffer(b);
    this.buildings.push(b);
    return b;
  }

  private refreshBuffer(b: Building): void {
    const lv = b.level >= 1 ? b.def.levels[b.level - 1] : null;
    if (lv && lv.effects.resource) {
      b.bufferResource = lv.effects.resource;
      b.bufferCap = lv.effects.perHour * this.data.tuning.economy.productionBufferHours;
    } else {
      // loại sản xuất đang xây: vẫn cho biết tài nguyên để view vẽ icon
      const l1 = b.def.levels[0];
      b.bufferResource = l1.effects.resource || '';
      b.bufferCap = 0;
    }
    if (b.bufferCap > 0 && b.bufferRaw > b.bufferCap) b.bufferRaw = b.bufferCap;
    b.buffer = Math.floor(b.bufferRaw + 1e-9);
  }

  byUid(uid: number): Building {
    for (const b of this.buildings) if (b.uid === uid) return b;
    return null;
  }
  byType(type: string): Building {
    for (const b of this.buildings) if (b.type === type) return b;
    return null;
  }
  /** Cấp đang có hiệu lực của công trình loại `type` (0 nếu chưa xây xong). */
  levelOf(type: string): number {
    const b = this.byType(type);
    return b ? b.level : 0;
  }
  levelDef(type: string): BuildingLevelDef {
    const b = this.byType(type);
    return b && b.level >= 1 ? b.def.levels[b.level - 1] : null;
  }
  at(x: number, y: number): Building {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (const b of this.buildings) if (cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h) return b;
    return null;
  }

  jobsRunning(): number {
    let n = 0;
    for (const b of this.buildings) if (b.job) n++;
    return n;
  }
  buildersFree(): number { return Math.max(0, this.data.tuning.economy.builderSlots - this.jobsRunning()); }

  // ----- đặt và dời -----

  /** Luật hình học: trong lưới, không chồng (kể cả công trình đang xây). */
  checkGeometry(def: BuildingDef, x: number, y: number, ignoreUid: number): PlacementCheck {
    const g = this.data.tuning.world.villageGrid;
    const w = def.footprint[0];
    const h = def.footprint[1];
    if (Math.floor(x) !== x || Math.floor(y) !== y) return failPlace('invalid');
    if (x < g.x0 || y < g.y0 || x + w > g.x0 + g.w || y + h > g.y0 + g.h) return failPlace('out_of_grid');
    for (const b of this.buildings) {
      if (b.uid === ignoreUid) continue;
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return failPlace('overlap', 0, b.name, b.uid);
    }
    return PLACE_OK;
  }

  /** Điều kiện xây mới không phụ thuộc vị trí: đã mở, chưa đủ số lượng, đủ tài nguyên, còn thợ. */
  checkNewBuild(def: BuildingDef): Check {
    if (this.bank.playerLevel() < def.unlockPlayerLevel) return fail('need_player_level', def.unlockPlayerLevel);
    let count = 0;
    for (const b of this.buildings) if (b.type === def.id) count++;
    if (count >= def.maxCount) return fail('max_count');
    const l1 = def.levels[0];
    if (this.bank.playerLevel() < l1.reqPlayerLevel) return fail('need_player_level', l1.reqPlayerLevel);
    const miss = this.bank.missing(l1.cost);
    for (const k in miss) if (miss[k] > 0) return fail('missing_resources', miss[k], k);
    if (this.buildersFree() <= 0) return fail('no_builder');
    return OK;
  }

  checkPlacement(type: string, x: number, y: number): PlacementCheck {
    const def = this.data.buildingById[type];
    if (!def) return failPlace('invalid');
    const pre = this.checkNewBuild(def);
    // chưa mở hoặc đã xây đủ: không có bóng nào hợp lệ
    if (!pre.ok && (pre.reason === 'need_player_level' || pre.reason === 'max_count')) return failPlace(pre.reason, pre.n, pre.key);
    const geo = this.checkGeometry(def, x, y, 0);
    if (!geo.ok) return geo;
    if (!pre.ok) return failPlace(pre.reason, pre.n, pre.key);
    return PLACE_OK;
  }

  checkMove(uid: number, x: number, y: number): PlacementCheck {
    const b = this.byUid(uid);
    if (!b) return failPlace('invalid');
    return this.checkGeometry(b.def, x, y, uid);
  }

  findFreeCell(type: string, nearX: number, nearY: number, ignoreUid: number): { x: number; y: number } | null {
    const def = this.data.buildingById[type];
    if (!def) return null;
    const g = this.data.tuning.world.villageGrid;
    const w = def.footprint[0];
    const h = def.footprint[1];
    let best: { x: number; y: number } = null;
    let bestD = Infinity;
    for (let y = g.y0; y + h <= g.y0 + g.h; y++) {
      for (let x = g.x0; x + w <= g.x0 + g.w; x++) {
        if (!this.checkGeometry(def, x, y, ignoreUid).ok) continue;
        const dx = x + w / 2 - nearX;
        const dy = y + h / 2 - nearY;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { x, y }; }
      }
    }
    return best;
  }

  /** Xây mới (đã kiểm tra bằng checkPlacement). Trả tiền ngay, chiếm một thợ. */
  place(type: string, x: number, y: number, now: number): Building {
    const def = this.data.buildingById[type];
    const l1 = def.levels[0];
    this.bank.spend(l1.cost);
    const b = this.add(def, x, y, 0, { kind: 'build', targetLevel: 1, startedAt: now, endsAt: now + l1.buildSec * 1000 }, 0);
    return b;
  }

  // ----- nâng cấp -----

  /** Cấp Nhà Kho thấp nhất có trần ≥ mọi khoản trong `cost` (0 nếu cấp hiện tại đã đủ, −1 nếu không cấp nào đủ). */
  storageLevelNeeded(cost: ResourceMap): number {
    let over = false;
    for (const k in cost) if (cost[k] > this.bank.cap(k)) over = true;
    if (!over) return 0;
    const st = this.data.buildingById.storage;
    for (const lv of st.levels) {
      let fits = true;
      for (const k in cost) {
        const cap = lv.effects.cap && lv.effects.cap[k] !== undefined ? lv.effects.cap[k] : Infinity;
        if (cost[k] > cap) fits = false;
      }
      if (fits) return lv.level;
    }
    return -1;
  }

  checkUpgrade(b: Building): Check {
    if (b.job) return fail('busy');
    if (b.level >= b.def.levels.length) return fail('max_level');
    const next = b.def.levels[b.level];
    // thứ tự ưu tiên theo 01 mục 7.5
    if (this.bank.playerLevel() < next.reqPlayerLevel) return fail('need_player_level', next.reqPlayerLevel);
    const need = this.storageLevelNeeded(next.cost);
    if (need !== 0) return fail('need_storage_level', need > 0 ? need : this.data.buildingById.storage.levels.length);
    const miss = this.bank.missing(next.cost);
    for (const k in miss) if (miss[k] > 0) return fail('missing_resources', miss[k], k);
    if (this.buildersFree() <= 0) return fail('no_builder', this.jobsRunning());
    return OK;
  }

  upgrade(b: Building, now: number): void {
    const next = b.def.levels[b.level];
    this.bank.spend(next.cost);
    b.job = { kind: 'upgrade', targetLevel: next.level, startedAt: now, endsAt: now + next.buildSec * 1000 };
  }

  /** Hủy: hoàn 100% tài nguyên. Hủy xây mới thì công trình biến mất. Trả về true nếu công trình bị gỡ. */
  cancel(b: Building): boolean {
    const lv = b.def.levels[b.job.targetLevel - 1];
    this.bank.refund(lv.cost);
    const wasBuild = b.job.kind === 'build';
    b.job = null;
    if (wasBuild) {
      const i = this.buildings.indexOf(b);
      if (i >= 0) this.buildings.splice(i, 1);
      return true;
    }
    return false;
  }

  // ----- thời gian -----

  private produce(b: Building, ms: number): void {
    if (ms <= 0 || b.level < 1) return;
    const e = b.def.levels[b.level - 1].effects;
    if (!e.resource || !(e.perHour > 0)) return;
    const cap = e.perHour * this.data.tuning.economy.productionBufferHours;
    if (b.bufferRaw >= cap) return;
    b.bufferRaw += e.perHour * ms / 3600000;
    if (b.bufferRaw > cap) b.bufferRaw = cap;
    b.buffer = Math.floor(b.bufferRaw + 1e-9);
  }

  /**
   * Chạy sản xuất và timer xây từ mốc `from` tới `to` (ms). Công trình xong giữa chừng sản xuất ở cấp cũ
   * tới lúc xong rồi ở cấp mới. Gọi `onDone` cho từng công trình vừa xong.
   */
  advance(from: number, to: number, onDone: (b: Building) => void): void {
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      if (b.job && b.job.endsAt <= to) {
        const end = b.job.endsAt;
        this.produce(b, end - from);
        b.level = b.job.targetLevel;
        b.job = null;
        this.refreshBuffer(b);
        this.produce(b, to - Math.max(from, end));
        onDone(b);
      } else {
        this.produce(b, to - from);
      }
    }
  }

  /** Dời mọi mốc thời gian tuyệt đối (khi thời gian vắng mặt bị trần cắt hoặc đồng hồ lùi). */
  shiftTimestamps(deltaMs: number): void {
    for (const b of this.buildings) {
      if (!b.job) continue;
      b.job = { kind: b.job.kind, targetLevel: b.job.targetLevel, startedAt: b.job.startedAt + deltaMs, endsAt: b.job.endsAt + deltaMs };
    }
  }

  /** Lấy `amount` khỏi bộ đệm (đã được Game tính theo trần kho). */
  takeFromBuffer(b: Building, amount: number): void {
    b.bufferRaw -= amount;
    if (b.bufferRaw < 0) b.bufferRaw = 0;
    b.buffer = Math.floor(b.bufferRaw + 1e-9);
  }

  /** Khoảng cách từ điểm tới footprint (0 nếu ở trong). */
  distToFootprint(b: Building, x: number, y: number): number {
    const dx = x < b.x ? b.x - x : (x > b.x + b.w ? x - (b.x + b.w) : 0);
    const dy = y < b.y ? b.y - y : (y > b.y + b.h ? y - (b.y + b.h) : 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ----- dữ liệu cho panel -----

  buildMenu(): BuildMenuEntry[] {
    const out: BuildMenuEntry[] = [];
    for (const def of this.data.buildings) {
      const l1 = def.levels[0];
      const check = this.checkNewBuild(def);
      let count = 0;
      for (const b of this.buildings) if (b.type === def.id) count++;
      const state = count >= def.maxCount ? 'built' : (this.bank.playerLevel() < def.unlockPlayerLevel ? 'locked' : 'available');
      out.push({
        type: def.id, name: def.name, desc: def.desc, w: def.footprint[0], h: def.footprint[1],
        cost: costInfo(this.bank, l1.cost), buildSec: l1.buildSec, unlockPlayerLevel: def.unlockPlayerLevel,
        state, check,
      });
    }
    return out;
  }

  private rows(b: Building): StatRow[] {
    const cur = b.level >= 1 ? b.def.levels[b.level - 1].effects : null;
    const nextLv = b.level < b.def.levels.length ? b.def.levels[b.level].effects : null;
    const rows: StatRow[] = [];
    const row = (key: string, label: string, a: number, bNext: number | null, percent = false) => {
      rows.push({ key, label, value: a, delta: bNext === null ? 0 : bNext - a, percent });
    };
    const e0 = b.def.levels[0].effects;
    const hours = this.data.tuning.economy.productionBufferHours;
    if (e0.cap) {
      let key = '';
      for (const k in e0.cap) { key = k; break; }
      row('cap', 'Sức chứa mỗi loại', cur ? cur.cap[key] : 0, nextLv ? nextLv.cap[key] : null);
    }
    if (e0.resource) {
      row('perHour', 'Sản lượng / giờ', cur ? cur.perHour : 0, nextLv ? nextLv.perHour : null);
      row('bufferCap', 'Bộ đệm tối đa', cur ? cur.perHour * hours : 0, nextLv ? nextLv.perHour * hours : null);
      row('buffer', 'Đang chờ thu', b.buffer, null);
    }
    if (e0.oddsTier !== undefined) {
      const odds = this.data.recruit.odds;
      const a = cur ? odds[cur.oddsTier - 1] : null;
      const n = nextLv ? odds[nextLv.oddsTier - 1] : null;
      row('oddsE', 'Tỉ lệ Sử Thi', a ? a.E : 0, n ? n.E : null, true);
      row('oddsL', 'Tỉ lệ Huyền Thoại', a ? a.L : 0, n ? n.L : null, true);
    }
    if (e0.maxSquadSlotsUnlockable !== undefined) {
      row('maxSlots', 'Ô đội mở được tối đa', cur ? cur.maxSquadSlotsUnlockable : 0, nextLv ? nextLv.maxSquadSlotsUnlockable : null);
    }
    if (e0.maxStage !== undefined) row('maxStage', 'Chặng cao nhất', cur ? cur.maxStage : 0, nextLv ? nextLv.maxStage : null);
    return rows;
  }

  panel(b: Building, now: number, canCollect: Check): BuildingPanelInfo {
    const max = b.def.levels.length;
    const next = b.level < max ? b.def.levels[b.level] : null;
    // đang xây mới: nút nâng cấp chưa có nghĩa; đang nâng: hiện giá của cấp đang nâng
    return {
      uid: b.uid, type: b.type, name: b.name, desc: b.def.desc, level: b.level, maxLevel: max,
      job: b.job, jobRemainingSec: b.job ? Math.max(0, (b.job.endsAt - now) / 1000) : 0,
      rows: this.rows(b),
      upgradeCost: next ? costInfo(this.bank, next.cost) : null,
      upgradeSec: next ? next.buildSec : 0,
      canUpgrade: this.checkUpgrade(b),
      canCancel: !!b.job,
      canCollect,
    };
  }
}
