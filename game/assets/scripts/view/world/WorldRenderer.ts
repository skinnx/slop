// Draws a WorldV (field/village or dungeon room) every frame: ground, overlay (telegraphs, shadows, footprints),
// depth-sorted units/buildings/nodes/pickups, and world text. Pure presentation: positions, HP, states all come
// from the WorldV given each frame; the view only adds the motion treatment of 04-placeholder-art.md section 2.
import { Node, SpriteFrame } from 'cc';
import { Assets } from '../kit/Assets';
import { Layout, W } from '../kit/Layout';
import { BAND } from '../kit/Theme';
import { node } from '../kit/Ui';
import { SpriteLayer, rgba, WHITE } from './SpriteLayer';
import { WorldText } from './WorldText';
import { isoX, isoY, depth, cellFromScreen, CELL_W, CELL_H } from './Iso';
import { WorldV, UnitV, BuildingV, ViewEvent, NodeV } from '../model/ViewModel';
import { UnitMotion } from './UnitMotion';

export interface RenderCfg {
  spriteScale: { hero: number; monster: number; elite: number; boss: number; node: number; pickup: number };
  groundColorsField: string[]; groundColorsVillage: string[]; groundColorsDungeon: string[];
  pathColor: string; cameraFollowLerp: number;
}

const BUILDING_ART: Record<string, string> = {
  storage: 'tb/0081', lumber_camp: 'tb/0029', ore_mine: 'tb/0048', tavern: 'tb/0064',
  training_yard: 'tb/0067', market: 'tb/0080', dungeon_gate: 'tb/0025',
};
export function buildingArt(type: string): string { return BUILDING_ART[type] ?? 'tb/0081'; }
const RES_ICON_WORLD: Record<string, string> = { wood: 'icon/resource_wood', ore: 'pp/0067', gold: 'pp/0151', meat: 'food/0008' };

/** Small deterministic hash for decoration placement (presentation only). */
function hash2(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Proj { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; frame: string; color: number; spin: boolean; }
interface Fx { kind: 'arc' | 'ring' | 'area' | 'chip'; x: number; y: number; t: number; dur: number; color: number; size: number; angle: number; dx?: number; dy?: number; frame?: string; }

export class WorldRenderer {
  readonly root: Node;
  readonly ground: SpriteLayer;
  readonly overlay: SpriteLayer;
  readonly units: SpriteLayer;
  readonly text: WorldText;
  camX = 0; camY = 0;
  /** When set, the camera stays where build mode put it instead of following the leader. */
  manualCamera = false;
  private time = 0;
  private motion = new UnitMotion();
  private projs: Proj[] = [];
  private fx: Fx[] = [];
  private shake = new Map<number, number>();
  private groundKey = '';
  private lastArea = '';
  /** Highlight of the building selected in build mode (uid) and ghost footprint. */
  selectedUid: number | null = null;
  ghost: { type: string; x: number; y: number; w: number; h: number; valid: boolean } | null = null;
  showGrid = false;
  private lastWorld: WorldV | null = null;

  constructor(parent: Node, private cfg: RenderCfg) {
    this.root = node(parent, 'world');
    this.ground = new SpriteLayer(this.root, 'ground', BAND.ground, false);
    this.overlay = new SpriteLayer(this.root, 'overlay', BAND.ground, false);
    this.units = new SpriteLayer(this.root, 'units', BAND.units, true);
    this.text = new WorldText(this.root);
  }

  setConfig(cfg: RenderCfg): void { this.cfg = cfg; }

  /** Cell under a screen point given in UI coordinates (origin bottom-left). */
  cellAtUi(uiX: number, uiY: number): { x: number; y: number } {
    const sx = uiX - W / 2 + this.camX, sy = uiY - Layout.H / 2 + this.camY;
    return cellFromScreen(sx, sy);
  }
  /** UI coordinate (origin bottom-left) of a cell. */
  uiOfCell(x: number, y: number): { x: number; y: number } {
    return { x: isoX(x, y) - this.camX + W / 2, y: isoY(x, y) - this.camY + Layout.H / 2 };
  }

  snapCamera(w: WorldV): void { this.camX = isoX(w.focusX, w.focusY); this.camY = isoY(w.focusX, w.focusY); }

  onEvent(e: ViewEvent): void {
    const w = this.lastWorld;
    switch (e.t) {
      case 'damage':
        this.text.float(String(e.amount), isoX(e.x, e.y), isoY(e.x, e.y) + 70, { color: e.onHero ? '#FF7070' : '#FF3B3B', size: 26, droppable: !e.onHero });
        this.motion.hit(e.targetId, this.time);
        break;
      case 'heal':
        this.text.float('+' + e.amount, isoX(e.x, e.y), isoY(e.x, e.y) + 80, { color: '#5BE36B', size: 28 });
        break;
      case 'exp': {
        // EXP of kills close in time and space is merged into one "EXP N" (several deaths in one swing).
        const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y) + 50;
        const a = this.expAcc;
        if (a && Math.abs(a.x / a.n - sx) < 160 && Math.abs(a.y / a.n - sy) < 100) { a.sum += e.amount; a.x += sx; a.y += sy; a.n++; }
        else { this.flushExp(); this.expAcc = { sum: e.amount, x: sx, y: sy, n: 1, t0: this.time }; }
        break;
      }
      case 'gather': {
        this.text.float('+' + e.amount, isoX(e.x, e.y), isoY(e.x, e.y) + 110, { color: '#FFFFFF', size: 24 });
        this.shake.set(e.nodeId, this.time);
        const frame = e.res === 'wood' ? 'pp/0007' : 'pp/0067';
        for (let i = 0; i < 3; i++) this.fx.push({ kind: 'chip', x: isoX(e.x, e.y), y: isoY(e.x, e.y) + 30, t: 0, dur: 0.3, color: WHITE, size: e.res === 'wood' ? 1.5 : 1, angle: 0, dx: (i - 1) * 50, dy: 40 + i * 10, frame });
        break;
      }
      case 'attack': {
        const u = w?.units.find((q) => q.id === e.unitId);
        if (!u) break;
        this.motion.attack(u.id, this.time, e.tx - u.x, e.ty - u.y, e.ranged);
        const ux = isoX(u.x, u.y), uy = isoY(u.x, u.y) + 30, tx = isoX(e.tx, e.ty), ty = isoY(e.tx, e.ty) + 30;
        if (e.ranged) {
          const magic = e.color !== undefined;
          this.projs.push({ x0: ux, y0: uy, x1: tx, y1: ty, t: 0, dur: 0.15, frame: magic ? 'proc/circle' : 'td/0131', color: magic ? rgba(e.color!, 1) : WHITE, spin: !magic });
        } else {
          this.fx.push({ kind: 'arc', x: tx, y: ty, t: 0, dur: 0.15, color: WHITE, size: 1, angle: Math.atan2(ty - uy, tx - ux) * 57.3 });
        }
        if (e.skill) {
          this.fx.push({ kind: 'ring', x: ux, y: uy - 30, t: 0, dur: 0.3, color: rgba(e.color ?? '#FFFFFF', 0.9), size: 1, angle: 0 });
          this.text.float(e.skill, ux, uy + 90, { color: '#FFFFFF', size: 22, dur: 0.8, rise: 20 });
        }
        break;
      }
      case 'death':
        this.motion.die(e.unitId, this.time);
        break;
      case 'skill': {
        // Ring in the attribute colour 0.5 -> 1.5 in 0.3 s, name above the head 0.8 s, area flash for cleave/nova.
        const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y);
        this.fx.push({ kind: 'ring', x: sx, y: sy, t: 0, dur: 0.3, color: rgba(e.color, 0.9), size: 1, angle: 0 });
        if (e.radius > 0) this.fx.push({ kind: 'area', x: sx, y: sy, t: 0, dur: 0.2, color: rgba(e.color, 0.3), size: e.radius, angle: 0 });
        if (e.name) this.text.float(e.name, sx, sy + 90, { color: '#FFFFFF', size: 22, dur: 0.8, rise: 20 });
        break;
      }
      case 'teleport':
        if (w) this.snapCamera(w);
        break;
      case 'streakBonus':
        if (w) this.text.float('Thưởng chuỗi! +' + e.amount, isoX(w.focusX, w.focusY), isoY(w.focusX, w.focusY) + 160, { color: '#FFD34D', size: 30, dur: 1.2, rise: 50 });
        break;
      default:
    }
  }

  private expAcc: { sum: number; x: number; y: number; n: number; t0: number } | null = null;
  private flushExp(): void {
    const a = this.expAcc;
    if (!a) return;
    this.expAcc = null;
    this.text.float('EXP ' + a.sum, a.x / a.n, a.y / a.n, { color: '#FFFFFF', size: 22, dur: 0.8 });
  }

  update(dt: number, w: WorldV): void {
    this.time += dt;
    if (this.expAcc && this.time - this.expAcc.t0 > 0.25) this.flushExp();
    this.lastWorld = w;
    if (this.lastArea !== w.area) { this.lastArea = w.area; this.groundKey = ''; this.snapCamera(w); this.motion.clear(); }
    if (!this.manualCamera) {
      const k = 1 - Math.pow(1 - this.cfg.cameraFollowLerp, dt * 60);
      this.camX += (isoX(w.focusX, w.focusY) - this.camX) * k;
      this.camY += (isoY(w.focusX, w.focusY) - this.camY) * k;
    }
    this.root.setPosition(Math.round(-this.camX), Math.round(-this.camY), 0);
    const H = Layout.H;
    for (const L of [this.ground, this.overlay, this.units]) {
      L.cullL = this.camX - W / 2 - 60; L.cullR = this.camX + W / 2 + 60;
      L.cullB = this.camY - H / 2 - 200; L.cullT = this.camY + H / 2 + 60;
    }
    this.drawGround(w);
    this.overlay.begin();
    this.units.begin();
    if (w.area === 'dungeon') this.drawRoom(w); else this.drawBuildings(w);
    for (const n of w.nodes) this.drawNode(n);
    for (const s of w.signs) this.drawSign(s.x, s.y, s.name, s.cp, s.weak);
    for (const p of w.pickups) this.drawPickup(p.kind, p.x, p.y);
    for (const t of w.telegraphs) this.drawTelegraph(t);
    this.motion.sync(w.units, this.time, dt);
    for (const u of w.units) this.drawUnit(u, dt);
    this.motion.drawCorpses(this, this.time);
    this.drawProjectilesAndFx(dt);
    this.overlay.end();
    this.units.end();
    this.text.update(dt);
    this.text.sweep();
  }

  // ---------------- ground ----------------
  private drawGround(w: WorldV): void {
    const H = Layout.H;
    // Visible cell range (bounding box of the four screen corners), +2 cells margin.
    const cs = [cellFromScreen(this.camX - W / 2, this.camY - H / 2), cellFromScreen(this.camX + W / 2, this.camY - H / 2),
      cellFromScreen(this.camX - W / 2, this.camY + H / 2), cellFromScreen(this.camX + W / 2, this.camY + H / 2)];
    const x0 = Math.floor(Math.min(...cs.map((c) => c.x))) - 3, x1 = Math.ceil(Math.max(...cs.map((c) => c.x))) + 3;
    const y0 = Math.floor(Math.min(...cs.map((c) => c.y))) - 3, y1 = Math.ceil(Math.max(...cs.map((c) => c.y))) + 3;
    const key = `${w.area}:${x0 >> 1}:${y0 >> 1}:${x1 >> 1}:${y1 >> 1}`;
    if (key === this.groundKey) return;
    this.groundKey = key;
    const g = this.ground;
    g.begin();
    const saved = [g.cullL, g.cullR, g.cullB, g.cullT];
    g.cullL = this.camX - W / 2 - 400; g.cullR = this.camX + W / 2 + 400; g.cullB = this.camY - H / 2 - 300; g.cullT = this.camY + H / 2 + 300;
    const dia2 = Assets.w('proc/diamond2'), dia = Assets.w('proc/diamond');
    if (w.area === 'dungeon') {
      const room = w.room!;
      const [c0, c1] = this.cfg.groundColorsDungeon;
      for (let by = Math.max(0, y0 >> 1); by <= Math.min((room.h >> 1) - 1, y1 >> 1); by++) {
        for (let bx = Math.max(0, x0 >> 1); bx <= Math.min((room.w >> 1) - 1, x1 >> 1); bx++) {
          g.push(dia2, isoX(bx * 2 + 1, by * 2 + 1), isoY(bx * 2 + 1, by * 2 + 1), 0, 1, 1, rgba((bx + by) % 2 ? c1 : c0));
        }
      }
      // Traps: decoration only (M1), 3 per room at deterministic cells.
      for (let i = 0; i < 3; i++) {
        const tx = 3 + Math.floor(hash2(room.floor, i) * (room.w - 6)), ty = 5 + Math.floor(hash2(i, room.floor) * (room.h - 10));
        g.push(Assets.w('td/0041'), isoX(tx + 0.5, ty + 0.5), isoY(tx + 0.5, ty + 0.5), 0, 6, 3, 0xffffffb0);
      }
    } else {
      const map = w.map!;
      const v = map.village;
      for (let by = y0 >> 1; by <= y1 >> 1; by++) {
        for (let bx = x0 >> 1; bx <= x1 >> 1; bx++) {
          const cx = bx * 2 + 1, cy = by * 2 + 1;
          const inMap = bx >= 0 && by >= 0 && bx * 2 + 2 <= map.w && by * 2 + 2 <= map.h;
          if (!inMap) { g.push(dia2, isoX(cx, cy), isoY(cx, cy), 0, 1, 1, rgba('#3C7DD9')); continue; }
          const inVillage = cx >= v.x0 && cx < v.x0 + v.w && cy >= v.y0 && cy < v.y0 + v.h;
          const cols = inVillage ? this.cfg.groundColorsVillage : this.cfg.groundColorsField;
          g.push(dia2, isoX(cx, cy), isoY(cx, cy), 0, 1, 1, rgba((bx + by) % 2 ? cols[1] : cols[0]));
        }
      }
      const water = rgba('#3C7DD9'), wave = rgba('#5A9BEA'), path = rgba(this.cfg.pathColor), edge = rgba('#4B9A51');
      const cxm = map.w / 2, cym = map.h / 2;
      for (let y = Math.max(0, y0); y <= Math.min(map.h - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(map.w - 1, x1); x++) {
          const sx = isoX(x + 0.5, y + 0.5), sy = isoY(x + 0.5, y + 0.5);
          if (x < 1 || y < 1 || x >= map.w - 1 || y >= map.h - 1) {
            g.push(dia, sx, sy, 0, 1, 1, water);
            g.push(dia, sx, sy + 4, 0, 0.9, 0.9, wave);
            continue;
          }
          const d = Math.max(Math.abs(x + 0.5 - cxm), Math.abs(y + 0.5 - cym));
          if (map.zoneEdges.some((e) => Math.abs(d - e) < 0.5)) g.push(dia, sx, sy, 0, 1, 1, edge);
        }
      }
      for (const [x, y] of map.paths) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) g.push(dia, isoX(x + 0.5, y + 0.5), isoY(x + 0.5, y + 0.5), 0, 1, 1, path);
      // Grass tufts and flowers: 0-2 per checker block, position from a hash of the block.
      for (let by = Math.max(1, y0 >> 1); by <= Math.min((map.h >> 1) - 2, y1 >> 1); by++) {
        for (let bx = Math.max(1, x0 >> 1); bx <= Math.min((map.w >> 1) - 2, x1 >> 1); bx++) {
          const n = Math.floor(hash2(bx, by) * 3);
          for (let i = 0; i < n; i++) {
            const fx = bx * 2 + hash2(bx + i, by * 7) * 2, fy = by * 2 + hash2(bx * 5, by + i) * 2;
            const flower = hash2(bx * 3 + i, by * 11) < 0.12;
            const fr = Assets.w(flower ? 'fol/0010' : 'fol/000' + (1 + Math.floor(hash2(bx, by + i) * 6)));
            g.push(fr, isoX(fx, fy), isoY(fx, fy), 0, 1, 1, flower ? 0xffffffd0 : rgba('#3E8E46', 0.7));
          }
        }
      }
    }
    [g.cullL, g.cullR, g.cullB, g.cullT] = saved;
    g.end();
    if (this.showGrid) this.groundKey = '';
  }

  // ---------------- dungeon room ----------------
  private drawRoom(w: WorldV): void {
    const room = w.room!;
    const wall = Assets.w('td/0040'), banner = Assets.w('td/0029'), spike = Assets.w('proc/pixel'), glow = Assets.w('proc/circle');
    const spikeCol = rgba('#C9CED6');
    // Back walls are two blocks high with spikes; front walls (x = -1, y = -1) one block, so they do not hide the
    // squad standing next to them (decision, see view/README.md).
    const wallCell = (x: number, y: number, i: number, front = false) => {
      const sx = isoX(x + 0.5, y + 0.5), sy = isoY(x + 0.5, y + 0.5) - 30;
      const d = depth(x + 0.5, y + 0.5);
      const isBanner = !front && i % 4 === 2;
      this.units.push(isBanner ? banner : wall, sx, sy, d, 6, 6, WHITE, 0, 0);
      if (front) return;
      this.units.push(wall, sx, sy + 48, d + 0.001, 6, 6, WHITE, 0, 0);
      for (let k = -1; k <= 1; k++) this.units.push(spike, sx + k * 24, sy + 144, d + 0.002, 6 / 8, 18 / 8, spikeCol, 0, 0);
      if (isBanner) this.units.push(glow, sx, sy + 80, d + 0.003, 80 / 64, 80 / 64, rgba('#FFB347', 0.18 + 0.07 * Math.sin(this.time * 9 + i)), 0, 0.5);
    };
    // Walls ring the room: row y = -1 and column x = -1 (front edges) and y = h, x = w (back edges).
    let i = 0;
    for (let x = -1; x <= room.w; x++) { wallCell(x, room.h, i++); wallCell(x, -1, i++, x < room.w); }
    for (let y = 0; y < room.h; y++) { wallCell(-1, y, i++, true); wallCell(room.w, y, i++); }
    if (room.exit) {
      const ex = isoX(room.exit.x, room.exit.y), ey = isoY(room.exit.x, room.exit.y);
      const r = 1.6 * CELL_W / 64;
      this.overlay.push(glow, ex, ey, 0, r, r / 2, rgba('#2E8BFF'));
      this.overlay.push(Assets.w('proc/ring'), ex, ey, 0, r * 0.9, r * 0.45, rgba('#9FD0FF'), 0);
      this.overlay.push(Assets.w('proc/ring'), ex, ey, 0, r * 0.6 * (1 + 0.1 * Math.sin(this.time * 6)), r * 0.3, rgba('#9FD0FF'));
      this.units.push(Assets.w('ui/arrow_s'), ex, ey + 120 + Math.abs(Math.sin(this.time * 4)) * 20, depth(room.exit.x, room.exit.y) + 5, 1, 1, WHITE, 0, 0);
    }
  }

  // ---------------- buildings ----------------
  private drawBuildings(w: WorldV): void {
    const dia = Assets.w('proc/diamond');
    if (this.showGrid && w.map) {
      const v = w.map.village, occupied = new Set<string>();
      for (const b of w.buildings) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) occupied.add(x + ',' + y);
      for (let y = v.y0; y < v.y0 + v.h; y++) for (let x = v.x0; x < v.x0 + v.w; x++) {
        if (!occupied.has(x + ',' + y)) this.overlay.push(Assets.w('proc/dline'), isoX(x + 0.5, y + 0.5), isoY(x + 0.5, y + 0.5), 0, 1, 1, 0xffffff80);
      }
    }
    for (const b of w.buildings) this.drawBuilding(b, dia);
    if (this.ghost) {
      const g = this.ghost;
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      // Drawn in the unit layer on top of everything: a ghost behind a tall building must stay visible.
      this.units.push(dia, isoX(cx, cy), isoY(cx, cy), 1e6, g.w, g.h, rgba(g.valid ? '#4CD137' : '#E5484D', 0.45));
      const sc = g.w >= 3 ? 18 : 12;
      this.units.push(Assets.w(buildingArt(g.type)), isoX(cx, cy), isoY(cx, cy) - 10, 1e6 + 1, sc, sc, 0xffffffb3, 0, 0);
    }
  }

  private drawBuilding(b: BuildingV, dia: SpriteFrame): void {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const sx = isoX(cx, cy), sy = isoY(cx, cy), d = depth(cx, cy);
    const moving = this.ghost && this.selectedUid === b.uid;
    if (moving) return; // drawn as the ghost while being moved
    const scaffold = b.job && b.job.kind === 'build';
    this.overlay.push(dia, sx, sy, 0, b.w, b.h, scaffold ? rgba('#8B6B4A') : rgba('#C8A878', 0.8));
    if (this.selectedUid === b.uid) {
      const a = 0.5 + 0.5 * Math.abs(Math.sin(this.time * 4));
      this.units.push(Assets.w('proc/ring'), sx, sy, 1e6, b.w * 1.9, b.h * 0.95, rgba('#FFD34D', a));
    }
    const sc = b.w >= 3 ? 18 : 12;
    const topY = sy - 10 + 16 * sc;
    if (scaffold) {
      const crate = Assets.w('td/0063');
      const corners = [[b.x + 0.5, b.y + 0.5], [b.x + b.w - 0.5, b.y + 0.5], [b.x + 0.5, b.y + b.h - 0.5], [b.x + b.w - 0.5, b.y + b.h - 0.5]];
      for (const [x, y] of corners) {
        this.units.push(Assets.w('proc/pixel'), isoX(x, y), isoY(x, y), depth(x, y), 0.5, 7.5, rgba('#C8A878'), 0, 0);
        this.units.push(crate, isoX(x, y), isoY(x, y), depth(x, y) + 0.01, 4, 4, WHITE, 0, 0);
      }
      this.units.push(Assets.w('pp/0086'), sx, sy, d, 5, 5, WHITE, 0, 0);
    } else {
      this.units.push(Assets.w(buildingArt(b.type)), sx, sy - 10, d, sc, sc, WHITE, 0, 0);
      if (b.type === 'dungeon_gate') {
        const r = (b.w * 0.6 * CELL_W) / 64 / 2;
        this.units.push(Assets.w('proc/circle'), sx, sy + 90, d + 0.01, r, r, rgba('#2E8BFF'), 0, 0.5);
        this.units.push(Assets.w('proc/ring'), sx, sy + 90, d + 0.02, r, r, rgba('#9FD0FF'), this.time * 90, 0.5);
      }
    }
    // Name under the footprint, one icon above (priority: job > buffer > badge), 03-ux-spec.md section 4.
    this.text.keyedLabel('bn' + b.uid, b.name, sx, sy - b.h * 30 - 18, { size: 24 });
    const iy = (scaffold ? sy + 100 : topY) + 16;
    if (b.job) {
      const pct = Math.max(0, Math.min(1, b.job.pct));
      this.units.push(Assets.w('proc/pixel'), sx, iy + 8, d + 20, 128 / 8, 24 / 8, 0x000000c0, 0, 0.5);
      this.units.push(Assets.w('proc/pixel'), sx - 60 + 60 * pct, iy + 8, d + 21, (120 * pct) / 8, 16 / 8, rgba('#4CD137'), 0, 0.5);
      this.text.keyedLabel('bj' + b.uid, clockShort(b.job.remainSec), sx, iy + 36, { size: 22 });
    } else if (b.buffer && b.buffer.amount >= 1) {
      this.units.push(Assets.w('ui/bubble'), sx, iy, d + 20, 1, 1, WHITE, 0, 0);
      this.units.push(Assets.w(RES_ICON_WORLD[b.buffer.res] ?? 'pp/0151'), sx, iy + 32, d + 21, b.buffer.res === 'wood' ? 1.2 : 2, b.buffer.res === 'wood' ? 1.2 : 2, WHITE, 0, 0.5);
      this.text.keyedLabel('bb' + b.uid, `${Math.floor(b.buffer.amount)}/${b.buffer.cap}`, sx, iy + 78, { size: 22 });
    } else if (b.badge === 'exclaim') {
      const bob = Math.abs(Math.sin(this.time * 3)) * 6;
      this.units.push(Assets.w('proc/circle'), sx, iy + bob, d + 20, 56 / 64, 56 / 64, rgba('#FFD34D'), 0, 0);
      this.text.keyedLabel('bx' + b.uid, '!', sx, iy + 28 + bob, { size: 40, color: '#000000', outline: '#FFD34D' });
    } else if (b.badge === 'check') {
      this.units.push(Assets.w('ui/check'), sx, iy, d + 20, 1.6, 1.6, WHITE, 0, 0);
    }
  }

  // ---------------- nodes, pickups, signs, telegraphs ----------------
  private drawNode(n: NodeV): void {
    const sx = isoX(n.x, n.y), sy = isoY(n.x, n.y), d = depth(n.x, n.y);
    const st = this.shake.get(n.id);
    const jx = st !== undefined && this.time - st < 0.1 ? Math.sin((this.time - st) * 120) * 3 : 0;
    const sc = this.cfg.spriteScale.node;
    const circ = Assets.w('proc/circle');
    if (!n.depleted) {
      if (n.kind === 'tree') {
        this.units.push(Assets.w('tb/0197'), sx, sy, d + 0.5, 3, 1.5, 0xffffff80, 0, 0.5);
        this.units.push(Assets.art(n.art), sx + jx, sy - 4, d, sc, sc, n.tint ? rgba(n.tint) : WHITE, 0, 0);
      } else {
        this.units.push(circ, sx + jx, sy, d, 56 / 64, 40 / 64, rgba('#A7AEB8'), 0, 0.2);
        this.units.push(circ, sx - 6 + jx, sy + 10, d + 0.01, 40 / 64, 28 / 64, rgba('#C9CED6'), 0, 0.2);
        this.units.push(Assets.w('pp/0067'), sx - 8 + jx, sy + 22, d + 0.02, 2, 2, WHITE, 0, 0);
        this.units.push(Assets.w('pp/0067'), sx + 10 + jx, sy + 16, d + 0.03, 2, 2, WHITE, 0, 0);
      }
    } else {
      if (n.kind === 'tree') {
        this.units.push(circ, sx, sy, d, 28 / 64, 18 / 64, rgba('#8B5A2B'), 0, 0.5);
        this.units.push(Assets.w('proc/ring'), sx, sy, d + 0.01, 28 / 64, 18 / 64, rgba('#5C3A1A'), 0, 0.5);
      } else {
        for (let i = 0; i < 3; i++) this.units.push(circ, sx + (i - 1) * 14, sy + (i % 2) * 6, d + i * 0.01, 12 / 64, 9 / 64, rgba('#8C939C'), 0, 0.5);
      }
      const p = n.respawnPct;
      const icon = p < 0.25 ? 'icon/timer_CW_25' : p < 0.5 ? 'icon/timer_CW_50' : p < 0.75 ? 'icon/timer_CW_75' : 'icon/timer_100';
      this.units.push(Assets.w(icon), sx, sy + 30, d + 1, 1, 1, WHITE, 0, 0);
    }
  }

  private drawPickup(kind: string, x: number, y: number): void {
    const sx = isoX(x, y), sy = isoY(x, y), d = depth(x, y);
    const sc = this.cfg.spriteScale.pickup;
    const frame = kind === 'gold' ? (Math.floor(this.time / 0.15) % 2 ? 'pp/0152' : 'pp/0151') : kind === 'meat' ? 'food/0008' : 'pp/0067_red';
    this.units.push(Assets.w(frame), sx, sy, d, sc, sc, WHITE, 0, 0);
  }

  private drawSign(x: number, y: number, name: string, cp: number, weak: boolean): void {
    const sx = isoX(x, y), sy = isoY(x, y);
    this.units.push(Assets.w('pp/0086'), sx, sy, depth(x, y), 5, 5, WHITE, 0, 0);
    this.text.keyedLabel(`sg${x},${y}`, `${name} ⚔ ${cp}`, sx, sy + 110, { size: 22, color: weak ? '#C77DFF' : '#FFFFFF' });
  }

  private drawTelegraph(t: WorldV['telegraphs'][number]): void {
    const red = '#FF2020';
    const sx = isoX(t.x, t.y), sy = isoY(t.x, t.y);
    if (t.kind === 'circle') {
      const rx = (t.radius! * 60 * Math.SQRT2 * 2) / 256, ry = rx / 2;
      this.overlay.push(Assets.w('proc/circle256'), sx, sy, 0, rx, ry, rgba(red, 0.25));
      this.overlay.push(Assets.w('proc/ring256'), sx, sy, 0, rx, ry, rgba(red, 1));
      this.overlay.push(Assets.w('proc/circle256'), sx, sy, 0, rx * t.pct, ry * t.pct, rgba(red, 0.35));
    } else {
      const ex = t.x + t.dirX! * t.len!, ey = t.y + t.dirY! * t.len!;
      const dx = isoX(ex, ey) - sx, dy = isoY(ex, ey) - sy;
      const len = Math.hypot(dx, dy), ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const wpx = t.width! * 45;
      const px = Assets.w('proc/pixel');
      this.overlay.push(px, sx + dx / 2, sy + dy / 2, 0, len / 8, wpx / 8, rgba(red, 0.25), ang);
      this.overlay.push(px, sx + (dx * t.pct) / 2, sy + (dy * t.pct) / 2, 0, (len * t.pct) / 8, wpx / 8, rgba(red, 0.35), ang);
    }
  }

  // ---------------- units ----------------
  private drawUnit(u: UnitV, _dt: number): void {
    const sc = this.cfg.spriteScale[u.kind === 'hero' ? 'hero' : u.kind === 'monster' ? 'monster' : u.kind];
    const m = this.motion.pose(u, this.time);
    const sx = isoX(u.x, u.y) + m.dx, sy = isoY(u.x, u.y) + m.dy, d = depth(u.x, u.y);
    if (m.alpha <= 0) return;
    this.overlay.push(Assets.w('tb/0197'), isoX(u.x, u.y), isoY(u.x, u.y), 0, sc * 0.75, sc * 0.5, rgba('#FFFFFF', 0.5 * m.alpha), 0, 0.5);
    const tint = m.flash ? rgba('#FF7070') : m.grey ? rgba('#808080', 0.7) : u.tint ? rgba(u.tint, m.alpha) : rgba('#FFFFFF', m.alpha);
    this.units.push(Assets.art(u.art), sx, sy, d, sc * m.face * m.sx, sc * m.sy, tint, m.rot, 0);
    if (m.weaponRot !== null && u.weapon) {
      this.units.push(Assets.art(u.weapon), sx + 20 * m.face, sy + sc * 8, d + 0.01, sc * 0.8 * m.face, sc * 0.8, WHITE, m.weaponRot * m.face, 0);
    }
    if (u.leader && u.kind === 'hero') this.units.push(Assets.w('icon/crown_a'), sx, sy + sc * 16 + 4, d + 0.02, 0.9, 0.9, rgba('#FFD34D'), 0, 0);
    const showBar = (u.kind === 'hero' || u.kind === 'elite') && u.act !== 'dead' && u.hp < u.hpMax;
    if (showBar) {
      const pct = Math.max(0, u.hp / u.hpMax);
      const by = sy + sc * 16 + (u.leader ? 30 : 8);
      this.units.push(Assets.w('proc/pixel'), sx, by, d + 0.03, 50 / 8, 8 / 8, 0x000000d0, 0, 0.5);
      this.units.push(Assets.w('proc/pixel'), sx - 24 + 24 * pct, by, d + 0.04, (48 * pct) / 8, 6 / 8, u.kind === 'hero' ? rgba('#4CD137') : rgba('#E5484D'), 0, 0.5);
    }
  }

  /** Used by UnitMotion for corpses that already left the core state. */
  drawCorpse(art: string, tint: string | undefined, kind: UnitV['kind'], x: number, y: number, rot: number, alpha: number, face: number): void {
    const sc = this.cfg.spriteScale[kind === 'hero' ? 'hero' : kind === 'monster' ? 'monster' : kind];
    this.units.push(Assets.art(art), isoX(x, y), isoY(x, y), depth(x, y), sc * face, sc, tint ? rgba(tint, alpha) : rgba('#FFFFFF', alpha), rot, 0);
  }

  private drawProjectilesAndFx(dt: number): void {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) { this.projs.splice(i, 1); continue; }
      const x = p.x0 + (p.x1 - p.x0) * k, y = p.y0 + (p.y1 - p.y0) * k;
      const ang = (Math.atan2(p.y1 - p.y0, p.x1 - p.x0) * 180) / Math.PI - 90;
      if (p.spin) this.units.push(Assets.w(p.frame), x, y, -1e6, 2, 2, p.color, ang, 0.5);
      else this.units.push(Assets.w(p.frame), x, y, -1e6, 0.25, 0.25, p.color, 0, 0.5);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { this.fx.splice(i, 1); continue; }
      const a = Math.round(255 * (1 - k));
      if (f.kind === 'arc') this.units.push(Assets.w('proc/arc'), f.x, f.y, -1e6, 1, 1, (0xffffff00 | a) >>> 0, -f.angle, 0.5);
      else if (f.kind === 'ring') { const s = 0.5 + k; this.units.push(Assets.w('proc/ring'), f.x, f.y, -1e6, s * 2, s, ((f.color & 0xffffff00) | a) >>> 0, 0, 0.5); }
      else if (f.kind === 'area') { const rx = (f.size * 60 * Math.SQRT2 * 2) / 256; this.overlay.push(Assets.w('proc/circle256'), f.x, f.y, 0, rx, rx / 2, ((f.color & 0xffffff00) | Math.round((f.color & 255) * (1 - k))) >>> 0); }
      else if (f.kind === 'chip') this.units.push(Assets.w(f.frame!), f.x + f.dx! * k, f.y + f.dy! * k - 60 * k * k, -1e6, f.size, f.size, WHITE, k * 360, 0.5);
    }
  }

  get stats(): { ground: number; overlay: number; units: number; floaters: number; droppedNumbers: number } {
    return { ground: this.ground.count, overlay: this.overlay.count, units: this.units.count, floaters: this.text.activeFloaters, droppedNumbers: this.text.dropped };
  }
}

function clockShort(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (x: number) => (x < 10 ? '0' + x : String(x));
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}
export { CELL_H };
