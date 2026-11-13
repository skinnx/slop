// World-space text: pooled floating numbers (damage, EXP, gather, heal) and keyed labels (building names,
// signposts, timers). All are CHAR-cache labels in one band, so they draw in one batch above the units.
import { Node, Label, Color, UIOpacity } from 'cc';
import { useCharCache, node, setBand, label, setText } from '../kit/Ui';
import { BAND, hex } from '../kit/Theme';

interface Floater { l: Label; t: number; dur: number; x: number; y: number; rise: number; base: Color; scale0: number; }

export class WorldText {
  readonly root: Node;
  private floaters: Floater[] = [];
  private free: Label[] = [];
  private keyed = new Map<string, { l: Label; used: boolean }>();
  private readonly tmp = new Color();
  /** At most this many floating texts at once (oldest recycled): a crowd stays readable, one batch either way. */
  static readonly MAX_FLOATERS = 32;
  /** Number of floaters dropped because there was no free spot (debug/measurement). */
  dropped = 0;

  constructor(parent: Node) {
    this.root = node(parent, 'world-text');
    useCharCache(this.root);
    setBand(this.root, BAND.worldText);
  }

  /** Number or short text that rises and fades. size/color per 03-ux-spec.md section 3 "Số nổi". */
  float(text: string, x: number, y: number, o: { size?: number; color?: string; outline?: string; dur?: number; rise?: number; scale0?: number; droppable?: boolean } = {}): void {
    // Readability in a crowd: a new number never starts on top of a young one. Try the spot, then step up
    // (one line) and sideways a few times; a droppable number (damage on monsters) with no free spot is skipped.
    const fs = o.size ?? 26;
    let placed = false;
    for (let k = 0; k < 5 && !placed; k++) {
      const cx = x + (k === 0 ? 0 : (k % 2 ? 26 : -26)), cy = y + Math.ceil(k / 2) * (fs + 2);
      if (!this.crowded(cx, cy, fs)) { x = cx; y = cy; placed = true; }
    }
    if (!placed && o.droppable) { this.dropped++; return; }
    let l: Label;
    if (this.floaters.length >= WorldText.MAX_FLOATERS) {
      const old = this.floaters.shift()!;
      l = old.l;
    } else {
      l = this.free.pop() ?? label(this.root, '', { size: 26, bold: true, outline: '#000000', outlineWidth: 2 });
    }
    l.node.active = true;
    l.fontSize = o.size ?? 26;
    l.lineHeight = Math.round(l.fontSize * 1.3);
    setText(l, text);
    const base = hex(o.color ?? '#FF4040');
    // Colour is baked into CHAR glyphs: set it once (no per-frame alpha in the colour); fade with UIOpacity.
    if (!l.color.equals(base)) l.color = base;
    (l.node.getComponent(UIOpacity) ?? l.node.addComponent(UIOpacity)).opacity = 255;
    this.floaters.push({ l, t: 0, dur: o.dur ?? 0.6, x, y, rise: o.rise ?? 40, base, scale0: o.scale0 ?? 1 });
    l.node.setPosition(x, y, 0);
  }

  /** True when a floater younger than 0.35 s currently covers (x, y). */
  private crowded(x: number, y: number, fs: number): boolean {
    for (const f of this.floaters) {
      if (f.t > 0.35) continue;
      const p = f.l.node.position;
      if (Math.abs(p.x - x) < 44 && Math.abs(p.y - y) < fs * 0.85) return true;
    }
    return false;
  }

  /** A label that persists while it is re-requested every frame (removed after a frame without request). */
  keyedLabel(key: string, text: string, x: number, y: number, o: { size?: number; color?: string; outline?: string; bold?: boolean } = {}): Label {
    let e = this.keyed.get(key);
    if (!e) {
      e = { l: label(this.root, text, { size: o.size ?? 24, bold: o.bold ?? true, color: o.color ?? '#FFFFFF', outline: o.outline ?? '#000000', outlineWidth: 3 }), used: true };
      this.keyed.set(key, e);
    }
    e.used = true;
    if (!e.l.node.active) e.l.node.active = true;
    setText(e.l, text);
    if (o.color) { const c = hex(o.color); if (!e.l.color.equals(c)) e.l.color = c; }
    e.l.node.setPosition(x, y, 0);
    return e.l;
  }

  update(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) {
        f.l.node.active = false;
        this.free.push(f.l);
        this.floaters.splice(i, 1);
        continue;
      }
      f.l.node.setPosition(f.x, f.y + f.rise * Math.min(1, k * 1.5), 0);
      const s = f.scale0 + (1 - f.scale0) * Math.min(1, k * 4);
      f.l.node.setScale(s, s, 1);
      f.l.node.getComponent(UIOpacity)!.opacity = Math.round(255 * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4));
    }
  }

  /** Call once per frame after all keyedLabel() calls: hides labels that were not requested. */
  sweep(): void {
    for (const e of this.keyed.values()) {
      if (!e.used && e.l.node.active) e.l.node.active = false;
      e.used = false;
    }
  }

  get activeFloaters(): number { return this.floaters.length; }
}
