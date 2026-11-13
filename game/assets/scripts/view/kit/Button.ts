// Button: a transparent hit area (at least 88 x 88, 03-ux-spec.md section 2.2) holding a visual child.
// Press = scale 0.95 + click sound; a press that moved more than 12 units is a drag (scroll), not a tap.
// Disabled: grey, a tap shakes it, plays error and shows the reason as a toast.
import { Node, EventTouch, Sprite, Label, tween, Tween, Vec3 } from 'cc';
import { node, slice, label, ui, px, setColor, setText, size, opacity } from './Ui';
import { Services } from './Services';
import { C, FS } from './Theme';

export interface ButtonOpts {
  w: number; h: number;
  /** 9-slice frame of the UI atlas (default: grey depth button tinted with `color`). */
  frame?: string;
  color?: string;
  text?: string; textSize?: number; textColor?: string; outline?: string;
  /** Minimum hit size (default 88). */
  minHit?: number;
  sound?: string;
  name?: string;
  onTap?: () => void;
}

export const TAP_SLOP = 12;

/** Adds tap detection to any node (used by buttons, cards, list rows). */
export function onTap(n: Node, fn: (e: EventTouch) => void, press?: (down: boolean) => void): void {
  let moved = false;
  n.on(Node.EventType.TOUCH_START, (e: EventTouch) => { moved = false; press?.(true); e.propagationStopped = false; });
  n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
    const a = e.getUIStartLocation(), b = e.getUILocation();
    if (!moved && Math.hypot(a.x - b.x, a.y - b.y) > TAP_SLOP) { moved = true; press?.(false); }
  });
  n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { press?.(false); if (!moved) fn(e); });
  n.on(Node.EventType.TOUCH_CANCEL, () => press?.(false));
}

export class Button {
  readonly root: Node;
  readonly visual: Node;
  readonly bg: Sprite | null;
  lbl: Label | null = null;
  private enabled = true;
  private reason = '';
  private color: string;
  onTap: (() => void) | null;

  constructor(parent: Node, private o: ButtonOpts) {
    const hit = o.minHit ?? 88;
    this.root = node(parent, o.name ?? 'btn', Math.max(o.w, hit), Math.max(o.h, hit));
    this.visual = node(this.root, 'vis', o.w, o.h);
    this.color = o.color ?? C.green;
    this.bg = o.frame === '' ? null : slice(this.visual, o.frame ?? 'ui/btn_grey', o.w, o.h, o.frame ? undefined : this.color);
    if (o.text !== undefined) {
      this.lbl = label(this.visual, o.text, { size: o.textSize ?? FS.big, bold: true, color: o.textColor ?? '#FFFFFF', outline: o.outline ?? '#20304A' });
      this.lbl.node.setPosition(0, 3, 0);
    }
    this.onTap = o.onTap ?? null;
    onTap(this.root, () => this.fire(), (down) => this.press(down));
  }

  private press(down: boolean): void {
    Tween.stopAllByTarget(this.visual);
    this.visual.setScale(down ? 0.95 : 1, down ? 0.95 : 1, 1);
  }

  private fire(): void {
    if (!this.enabled) {
      Services.sfx('error-01');
      if (this.reason) Services.toast(this.reason, true);
      Tween.stopAllByTarget(this.visual);
      this.visual.setPosition(0, 0, 0);
      tween(this.visual).by(0.0375, { position: v3(8) }).by(0.075, { position: v3(-16) }).by(0.0375, { position: v3(8) }).start();
      return;
    }
    Services.sfx(this.o.sound ?? 'click-01');
    this.onTap?.();
  }

  setEnabled(on: boolean, reason = ''): this {
    this.enabled = on;
    this.reason = reason;
    if (this.bg && !this.o.frame) setColor(this.bg, on ? this.color : C.grey);
    else if (this.o.frame === '') opacity(this.visual, on ? 1 : 0.5); // custom-drawn buttons: dim when locked
    return this;
  }
  get isEnabled(): boolean { return this.enabled; }
  setColor(c: string): this { this.color = c; if (this.bg && this.enabled) setColor(this.bg, c); return this; }
  setText(s: string): this { if (this.lbl) setText(this.lbl, s); return this; }
  /** Adds an icon (ui or world atlas) centred at (x, y) inside the button. */
  icon(name: string, w: number, h: number, x = 0, y = 0, color?: string, world = false): Sprite {
    const s = (world ? px : ui)(this.visual, name, { w, h, color });
    s.node.setPosition(x, y, 0);
    return s;
  }
  resize(w: number, h: number): void { size(this.visual, w, h); if (this.bg) size(this.bg.node, w, h); }
}

function v3(x: number): Vec3 { return new Vec3(x, 0, 0); }
