// Floating joystick (03-ux-spec.md section 3.1). A full-screen touch node placed BELOW every button in draw
// order, so buttons, the quest card and panels get their touches first (Cocos dispatches touches to the
// front-most node and swallows them). The strip y < 260 from the top is excluded. Only the first finger steers.
import { Node, EventTouch, Sprite } from 'cc';
import { node, ui, setBand, setColor } from '../kit/Ui';
import { Layout, W } from '../kit/Layout';
import { BAND } from '../kit/Theme';

const R = 110;

export class Joystick {
  readonly root: Node;
  private base: Node;
  private knob: Node;
  private baseFill: Sprite; private baseRing: Sprite; private knobS: Sprite;
  private finger: number | null = null;
  private ox = 0; private oy = 0;
  private releaseT = -1;
  enabled = true;
  /** Current vector (length 0..1, dead zone applied by the core). */
  vx = 0; vy = 0;
  onChange: ((x: number, y: number) => void) | null = null;
  /** Optional: first touch outside any button (used by build mode to scroll the camera instead). */
  dragHandler: { start(x: number, y: number): boolean; move(x: number, y: number): void; end(x: number, y: number): void } | null = null;
  private dragging = false;
  private downAt = 0; private downX = 0; private downY = 0;
  /** Quick tap on the world (press + release within 0.25 s, moved < 12): 03-ux-spec.md section 4. */
  onWorldTap: ((x: number, y: number) => void) | null = null;

  constructor(parent: Node) {
    this.root = node(parent, 'joystick', W, 4000);
    setBand(this.root, BAND.joystick);
    this.base = node(this.root, 'base', 2 * R, 2 * R);
    this.baseFill = ui(this.base, 'proc/circle', { w: 2 * R, h: 2 * R, color: '#FFFFFF', alpha: 0.15 });
    this.baseRing = ui(this.base, 'proc/ring220', { w: 2 * R, h: 2 * R, color: '#FFFFFF', alpha: 0.6 });
    this.knob = node(this.base, 'knob', 100, 100);
    this.knobS = ui(this.knob, 'proc/circle', { w: 100, h: 100, color: '#FFFFFF', alpha: 0.6 });
    this.rest();
    this.root.on(Node.EventType.TOUCH_START, this.onStart, this);
    this.root.on(Node.EventType.TOUCH_MOVE, this.onMove, this);
    this.root.on(Node.EventType.TOUCH_END, this.onEnd, this);
    this.root.on(Node.EventType.TOUCH_CANCEL, this.onEnd, this);
  }

  /** Resting place (360, H - 300), faded: base 35%, knob 50%. */
  rest(): void {
    this.base.setPosition(0, Layout.bottom + 300, 0);
    this.knob.setPosition(0, 0, 0);
    setColor(this.baseFill, '#FFFFFF', 0.15 * 0.35 / 0.6); setColor(this.baseRing, '#FFFFFF', 0.35); setColor(this.knobS, '#FFFFFF', 0.5);
  }

  /** Releases the finger (panel opened, mode changed): the squad stops at once. */
  cancel(): void {
    if (this.finger !== null && !this.dragging) this.set(0, 0);
    this.finger = null;
    this.dragging = false;
    this.rest();
  }

  setVisible(on: boolean): void { this.base.active = on; }

  private toLocal(e: EventTouch): { x: number; y: number } {
    const p = e.getUILocation();
    return { x: p.x - W / 2, y: p.y - Layout.H / 2 };
  }

  private onStart(e: EventTouch): void {
    if (this.finger !== null) return;
    const ui = e.getUILocation();
    if (Layout.H - ui.y < 260 + Layout.safeTop) return;
    if (this.dragHandler) {
      if (this.dragHandler.start(ui.x, ui.y)) { this.finger = e.getID(); this.dragging = true; }
      return;
    }
    if (!this.enabled) return;
    this.finger = e.getID();
    this.downAt = Date.now(); this.downX = ui.x; this.downY = ui.y;
    const p = this.toLocal(e);
    this.ox = p.x; this.oy = p.y;
    this.releaseT = -1;
    this.base.setPosition(p.x, p.y, 0);
    setColor(this.baseFill, '#FFFFFF', 0.15); setColor(this.baseRing, '#FFFFFF', 0.6); setColor(this.knobS, '#FFFFFF', 0.6);
  }

  private onMove(e: EventTouch): void {
    if (e.getID() !== this.finger) return;
    if (this.dragging) { const u = e.getUILocation(); this.dragHandler?.move(u.x, u.y); return; }
    const p = this.toLocal(e);
    let dx = p.x - this.ox, dy = p.y - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    this.knob.setPosition(dx, dy, 0);
    this.set(dx / R, dy / R);
  }

  private onEnd(e: EventTouch): void {
    if (e.getID() !== this.finger) return;
    this.finger = null;
    if (this.dragging) { this.dragging = false; const u = e.getUILocation(); this.dragHandler?.end(u.x, u.y); return; }
    this.knob.setPosition(0, 0, 0);
    this.set(0, 0);
    this.releaseT = 0.15;
    const u = e.getUILocation();
    if (Date.now() - this.downAt < 250 && Math.hypot(u.x - this.downX, u.y - this.downY) < 12) this.onWorldTap?.(u.x, u.y);
  }

  update(dt: number): void {
    if (this.releaseT >= 0) {
      this.releaseT -= dt;
      if (this.releaseT < 0) this.rest();
    }
  }

  private set(x: number, y: number): void {
    this.vx = x; this.vy = y;
    this.onChange?.(x, y);
  }

  get active(): boolean { return this.finger !== null; }
}
