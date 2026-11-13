// Build mode (03-ux-spec.md section 5): strip "CHẾ ĐỘ XÂY", grid outline, building tray, ghost with ✓/✗,
// selection + move, Nâng cấp button, Xong. The ghost position is view state; its validity, the free cell and
// placing/moving are answered by the source (core rules).
import { Node, Label, UITransform } from 'cc';
import { node, ui, px, label, rect, slice, place, placeB, setBand, setText } from '../kit/Ui';
import { Layout, W } from '../kit/Layout';
import { BAND, C } from '../kit/Theme';
import { Button, onTap } from '../kit/Button';
import { ScrollList } from '../kit/ScrollList';
import { priceRow } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { buildingArt } from '../world/WorldRenderer';
import type { GameView } from '../GameView';
import { BuildModeV } from '../model/ViewModel';

interface Ghost { type: string; x: number; y: number; w: number; h: number; uid: number | null; ox: number; oy: number; }

export class BuildMode {
  readonly root: Node;
  private strip!: Label;
  private tray!: Node;
  private trayHint!: Node;
  private ok!: Button; private no!: Button; private up!: Button;
  private reason!: Label;
  private done!: Button;
  ghost: Ghost | null = null;
  selected: number | null = null;
  private valid = false;
  private reasonText = '';
  private drag: { kind: 'ghost' | 'camera' | 'pending'; sx: number; sy: number; camX: number; camY: number; cell0: { x: number; y: number }; gx: number; gy: number; uid: number | null } | null = null;
  active = false;

  constructor(private gv: GameView, parent: Node) {
    this.root = node(parent, 'build-mode');
    setBand(this.root, BAND.hud);
    this.root.active = false;
  }

  enter(): void {
    this.active = true;
    this.ghost = null; this.selected = null;
    this.root.active = true;
    this.gv.fieldHud.root.active = true;
    this.gv.fieldHud.setBuildMode(true);
    this.gv.world.showGrid = true;
    this.gv.world.manualCamera = true;
    this.gv.joystick.cancel();
    this.gv.joystick.dragHandler = { start: (x, y) => this.dragStart(x, y), move: (x, y) => this.dragMove(x, y), end: (x, y) => this.dragEnd(x, y) };
    this.build();
  }
  exit(): void {
    this.active = false;
    this.root.active = false;
    this.ghost = null; this.selected = null;
    this.gv.fieldHud.setBuildMode(false);
    this.gv.world.showGrid = false;
    this.gv.world.manualCamera = false;
    this.gv.world.ghost = null;
    this.gv.world.selectedUid = null;
    this.gv.joystick.dragHandler = null;
  }

  build(): void {
    this.root.removeAllChildren();
    const v = this.gv.src.buildMode();
    const T = node(this.root, 'top'); T.setPosition(0, Layout.top, 0);
    const B = node(this.root, 'bottom'); B.setPosition(0, Layout.bottom, 0);
    const st = node(T, 'strip'); place(st, 0, 132, W, 64);
    rect(st, W, 64, '#000000', 0.5);
    this.strip = label(st, '', { size: 26, bold: true });
    this.setStrip(v);
    // Tray: y H-330 .. H-130, cards 150 x 190, gap 12, horizontal scroll.
    this.tray = node(B, 'tray'); placeB(this.tray, 0, 330, W, 200);
    rect(this.tray, W, 200, C.panel, 0.9);
    onTap(this.tray, () => {});
    const sl = new ScrollList(this.tray, W, 200, true);
    v.cards.forEach((c, i) => {
      const n = node(sl.content, 'bcard-' + c.type, 150, 190);
      n.setPosition(12 + 75 + i * 162, -100, 0);
      slice(n, 'ui/panel', 150, 190, c.state === 'ok' ? '#2C8FC9' : '#5A6070');
      px(n, buildingArt(c.type), { w: 96, h: 96 }).node.setPosition(0, 36, 0);
      label(n, c.name, { size: 22, bold: true, outline: '#0E2347' }).node.setPosition(0, -24, 0);
      priceRow(n, c.cost, { size: 20, icon: 24, gap: 8 }).setPosition(0, -54, 0);
      const t = label(n, `⏱ ${Math.round(c.buildSec / 60)} phút`, { size: 20, color: '#CFE7FF' }); t.node.setPosition(0, -78, 0);
      if (c.state === 'built') {
        rect(n, 150, 190, '#202020', 0.6);
        label(n, 'Đã xây', { size: 26, bold: true, outline: '#000000' });
      } else if (c.state === 'locked') {
        rect(n, 150, 190, '#202020', 0.6);
        ui(n, 'icon/lock_closed', { w: 56, h: 56, color: '#E8EAEE' }).node.setPosition(0, 20, 0);
        label(n, `Cấp ${c.lockLevel}`, { size: 24, bold: true, outline: '#000000' }).node.setPosition(0, -30, 0);
      }
      onTap(n, () => this.pickCard(c, v));
    });
    sl.setExtent(12 + v.cards.length * 162);
    this.trayHint = node(B, 'trayHint'); placeB(this.trayHint, 0, 200, W, 70);
    rect(this.trayHint, W, 70, C.panel, 0.9);
    label(this.trayHint, 'Kéo để đặt — ✓ để xây', { size: 26, bold: true });
    this.trayHint.active = false;
    this.done = new Button(B, { w: 112, h: 112, text: 'Xong', textSize: 28, color: C.blue, name: 'done', onTap: () => this.finish() });
    placeB(this.done.root, 592, 128, 112, 112);
    // Ghost controls (positioned every frame).
    this.ok = new Button(this.root, { w: 96, h: 96, frame: '', name: 'ghostOk', sound: 'drop-01', onTap: () => this.confirm() });
    ui(this.ok.visual, 'proc/circle', { w: 96, h: 96, color: C.green }); ui(this.ok.visual, 'ui/checkmark', { w: 54, h: 54, color: '#FFFFFF' });
    this.no = new Button(this.root, { w: 96, h: 96, frame: '', name: 'ghostCancel', onTap: () => this.cancel() });
    ui(this.no.visual, 'proc/circle', { w: 96, h: 96, color: C.red }); ui(this.no.visual, 'ui/cross', { w: 54, h: 54, color: '#FFFFFF' });
    this.up = new Button(this.root, { w: 200, h: 88, text: 'Nâng cấp', textSize: 28, color: C.green, name: 'ghostUpgrade',
      onTap: () => { const uid = this.selected; this.cancel(); if (uid !== null) this.gv.screens.openUpgrade(uid); } });
    this.reason = label(this.root, '', { size: 24, bold: true, color: '#FFFFFF', outline: '#7A1010' });
    this.updateControls();
  }

  private setStrip(v: BuildModeV): void { setText(this.strip, `CHẾ ĐỘ XÂY  —  Thợ rảnh: ${v.freeBuilders}/${v.builders}`); }

  private centerCell(): { x: number; y: number } { return this.gv.world.cellAtUi(W / 2, Layout.H / 2); }

  private pickCard(c: BuildModeV['cards'][number], _v: BuildModeV): void {
    if (c.state === 'built') { Services.sfx('error-01'); Services.toast('Đã xây đủ', true); return; }
    if (c.state === 'locked') { Services.sfx('error-01'); Services.toast(`Cần cấp người chơi ${c.lockLevel}`, true); return; }
    Services.sfx('select-01');
    this.selected = null;
    const cc = this.centerCell();
    const free = this.gv.src.nearestFree(c.type, Math.floor(cc.x - c.w / 2), Math.floor(cc.y - c.h / 2));
    if (!free) { Services.toast('Làng đã kín chỗ', true); return; }
    this.ghost = { type: c.type, x: free.x, y: free.y, w: c.w, h: c.h, uid: null, ox: free.x, oy: free.y };
    this.revalidate();
  }

  private selectBuilding(uid: number): void {
    const b = this.gv.src.world().buildings.find((q) => q.uid === uid);
    if (!b) return;
    Services.sfx('select-01');
    this.selected = uid;
    this.ghost = { type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, uid, ox: b.x, oy: b.y };
    this.revalidate();
  }

  private revalidate(): void {
    const g = this.ghost;
    if (!g) { this.valid = false; return; }
    if (g.uid !== null && g.x === g.ox && g.y === g.oy) { this.valid = true; this.reasonText = ''; return; }
    const r = this.gv.src.canPlace(g.type, g.x, g.y, g.uid);
    this.valid = r.ok; this.reasonText = r.ok ? '' : r.reason ?? '';
  }

  private confirm(): void {
    const g = this.ghost;
    if (!g) return;
    if (!this.valid) { Services.sfx('error-01'); Services.toast(this.reasonText || 'Không đặt được ở đây', true); return; }
    if (g.uid !== null) {
      if (g.x !== g.ox || g.y !== g.oy) this.gv.send({ t: 'move', uid: g.uid, x: g.x, y: g.y });
    } else if (this.gv.send({ t: 'place', type: g.type, x: g.x, y: g.y }).ok) Services.sfx('build-drop');
    this.ghost = null; this.selected = null;
    this.build();
  }
  private cancel(): void { this.ghost = null; this.selected = null; this.updateControls(); }
  private finish(): void { this.ghost = null; this.selected = null; this.gv.send({ t: 'exitBuild' }); }

  // ----- dragging (from the joystick's full-screen touch node) -----
  private dragStart(x: number, y: number): boolean {
    const cell = this.gv.world.cellAtUi(x, y);
    const w = this.gv.world;
    const g = this.ghost;
    const onGhost = g && cell.x >= g.x - 0.3 && cell.x < g.x + g.w + 0.3 && cell.y >= g.y - 0.3 && cell.y < g.y + g.h + 0.3;
    const uidUnder = this.gv.src.buildingAt(Math.floor(cell.x), Math.floor(cell.y));
    this.drag = { kind: onGhost ? 'ghost' : 'pending', sx: x, sy: y, camX: w.camX, camY: w.camY, cell0: cell, gx: g?.x ?? 0, gy: g?.y ?? 0, uid: uidUnder };
    return true;
  }
  private dragMove(x: number, y: number): void {
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pending' && Math.hypot(x - d.sx, y - d.sy) > 12) {
      if (d.uid !== null && !this.ghost) { this.selectBuilding(d.uid); d.kind = 'ghost'; d.gx = this.ghost!.x; d.gy = this.ghost!.y; }
      else d.kind = 'camera';
    }
    if (d.kind === 'camera') {
      const w = this.gv.world;
      w.camX = d.camX - (x - d.sx); w.camY = d.camY - (y - d.sy);
      this.clampCamera();
    } else if (d.kind === 'ghost' && this.ghost) {
      const c = this.gv.world.cellAtUi(x, y);
      const nx = d.gx + Math.round(c.x - d.cell0.x), ny = d.gy + Math.round(c.y - d.cell0.y);
      if (nx !== this.ghost.x || ny !== this.ghost.y) { this.ghost.x = nx; this.ghost.y = ny; this.revalidate(); }
    }
  }
  private dragEnd(x: number, y: number): void {
    const d = this.drag;
    this.drag = null;
    if (!d || d.kind !== 'pending') return;
    void x; void y;
    // A tap: on a building selects it; on empty ground deselects (same as ✗).
    if (d.uid !== null && (!this.ghost || this.ghost.uid !== d.uid)) { if (!this.ghost || this.ghost.uid !== null) this.selectBuilding(d.uid); }
    else if (!this.ghost || this.ghost.uid !== null) this.cancel();
  }
  private clampCamera(): void {
    const map = this.gv.src.world().map;
    if (!map) return;
    const v = map.village;
    const c = this.centerCell();
    const cx = Math.max(v.x0 - 4, Math.min(v.x0 + v.w + 4, c.x)), cy = Math.max(v.y0 - 4, Math.min(v.y0 + v.h + 4, c.y));
    if (cx !== c.x || cy !== c.y) { this.gv.world.camX += ((cx - cy) - (c.x - c.y)) * 60; this.gv.world.camY += ((cx + cy) - (c.x + c.y)) * 30; }
  }

  update(): void {
    if (!this.active) return;
    this.setStrip(this.gv.src.buildMode());
    this.updateControls();
  }

  private updateControls(): void {
    const g = this.ghost;
    const w = this.gv.world;
    w.ghost = g ? { type: g.type, x: g.x, y: g.y, w: g.w, h: g.h, valid: this.valid } : null;
    w.selectedUid = this.selected;
    if (!this.ok) return;
    this.tray.active = !g || g.uid !== null;
    this.trayHint.active = !!g && g.uid === null;
    this.ok.root.active = this.no.root.active = !!g;
    this.up.root.active = !!g && g.uid !== null;
    this.reason.node.active = !!g && !this.valid;
    if (!g) return;
    const top = w.uiOfCell(g.x + g.w, g.y + g.h);  // far (top) corner of the footprint
    const bot = w.uiOfCell(g.x, g.y);                // near (bottom) corner
    const cx = w.uiOfCell(g.x + g.w / 2, g.y + g.h / 2).x - W / 2;
    let y = top.y + 24 + 48 + g.h * 60;
    if (y > Layout.H - 196 - Layout.safeTop - 60) y = bot.y - 24 - 48;
    this.ok.root.setPosition(cx + 60, y - Layout.H / 2, 0);
    this.no.root.setPosition(cx - 60, y - Layout.H / 2, 0);
    this.ok.setEnabled(this.valid, this.reasonText);
    this.up.root.setPosition(cx, bot.y - Layout.H / 2 - 64, 0);
    setText(this.reason, this.reasonText);
    this.reason.node.setPosition(cx, bot.y - Layout.H / 2 - (g.uid !== null ? 130 : 30), 0);
    void UITransform;
  }

  debug(): Record<string, unknown> {
    return { ghost: this.ghost ? { ...this.ghost, valid: this.valid, reason: this.reasonText } : null, selected: this.selected };
  }
}
