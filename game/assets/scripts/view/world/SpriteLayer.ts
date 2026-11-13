// A pooled layer of sprites rebuilt every frame from a list of "draw items".
// Nodes never change parent or sibling index: each frame the items are sorted by depth and written, in order,
// into the pooled nodes (frame, position, scale, angle, colour), and unused nodes are hidden. All frames come
// from one atlas, so the whole layer is one batch whatever is shown. Setters run only when a value changes.
import { Node, Sprite, SpriteFrame, UITransform, Color, Sorting2D } from 'cc';
import { node, setBand, ORDER_PER_BAND } from '../kit/Ui';

interface Slot {
  n: Node;
  s: Sprite;
  t: UITransform;
  frame: SpriteFrame | null;
  x: number; y: number; sx: number; sy: number; rot: number; ay: number;
  w: number; h: number;
  rgba: number;
  on: boolean;
}

export class SpriteLayer {
  readonly root: Node;
  private slots: Slot[] = [];
  // Item buffers (struct of arrays, reused every frame: no allocation per frame).
  private n = 0;
  private fr: (SpriteFrame | null)[] = [];
  private px: number[] = []; private py: number[] = [];
  private sx: number[] = []; private sy: number[] = [];
  private rot: number[] = []; private ay: number[] = [];
  private w: number[] = []; private h: number[] = [];
  private col: number[] = [];
  private dep: number[] = [];
  private order: number[] = [];
  private readonly tmpColor = new Color();
  /** Visible rect in layer space (items outside are skipped). */
  cullL = -1e9; cullR = 1e9; cullB = -1e9; cullT = 1e9;

  constructor(parent: Node, name: string, private readonly band: number, private readonly sorted: boolean) {
    this.root = node(parent, name);
    setBand(this.root, band);
  }

  get count(): number { return this.n; }

  begin(): void { this.n = 0; }

  /**
   * Adds one sprite. (x, y) is the anchor point in layer space; anchorY 0 = feet, 0.5 = centre.
   * w/h = drawn size before scale (defaults to the frame size). rgba = 0xRRGGBBAA.
   */
  push(frame: SpriteFrame, x: number, y: number, d = 0, sx = 1, sy = 1, rgba = 0xffffffff, rot = 0, anchorY = 0.5, w = 0, h = 0): void {
    const ww = (w || frame.rect.width) * Math.abs(sx), hh = (h || frame.rect.height) * Math.abs(sy);
    if (x + ww / 2 < this.cullL || x - ww / 2 > this.cullR || y + hh < this.cullB || y - hh > this.cullT) return;
    const i = this.n++;
    this.fr[i] = frame; this.px[i] = x; this.py[i] = y; this.dep[i] = d;
    this.sx[i] = sx; this.sy[i] = sy; this.col[i] = rgba >>> 0; this.rot[i] = rot; this.ay[i] = anchorY;
    this.w[i] = w || frame.rect.width; this.h[i] = h || frame.rect.height;
  }

  end(): void {
    const n = this.n;
    const order = this.order;
    order.length = n;
    for (let i = 0; i < n; i++) order[i] = i;
    if (this.sorted) {
      const dep = this.dep;
      order.sort((a, b) => dep[a] - dep[b] || a - b);
    }
    while (this.slots.length < n) this.slots.push(this.makeSlot());
    for (let k = 0; k < n; k++) this.write(this.slots[k], order[k]);
    for (let k = n; k < this.slots.length; k++) {
      const s = this.slots[k];
      if (s.on) { s.on = false; s.n.active = false; }
    }
  }

  private makeSlot(): Slot {
    const n = node(this.root, 'u');
    const s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.CUSTOM;
    s.trim = false;
    n.addComponent(Sorting2D).sortingOrder = this.band * ORDER_PER_BAND; // same rule as kit/Ui.ts
    n.active = false;
    return { n, s, t: n.getComponent(UITransform)!, frame: null, x: NaN, y: NaN, sx: NaN, sy: NaN, rot: NaN, ay: 0.5, w: 0, h: 0, rgba: -1, on: false };
  }
  private write(s: Slot, i: number): void {
    if (!s.on) { s.on = true; s.n.active = true; }
    const f = this.fr[i]!;
    if (s.frame !== f) { s.frame = f; s.s.spriteFrame = f; }
    if (s.w !== this.w[i] || s.h !== this.h[i]) { s.w = this.w[i]; s.h = this.h[i]; s.t.setContentSize(s.w, s.h); }
    if (s.ay !== this.ay[i]) { s.ay = this.ay[i]; s.t.setAnchorPoint(0.5, s.ay); }
    if (s.x !== this.px[i] || s.y !== this.py[i]) { s.x = this.px[i]; s.y = this.py[i]; s.n.setPosition(s.x, s.y, 0); }
    if (s.sx !== this.sx[i] || s.sy !== this.sy[i]) { s.sx = this.sx[i]; s.sy = this.sy[i]; s.n.setScale(s.sx, s.sy, 1); }
    if (s.rot !== this.rot[i]) { s.rot = this.rot[i]; s.n.angle = s.rot; }
    const c = this.col[i];
    if (s.rgba !== c) {
      s.rgba = c;
      this.tmpColor.set((c >>> 24) & 255, (c >>> 16) & 255, (c >>> 8) & 255, c & 255);
      s.s.color = this.tmpColor;
    }
  }
}

/** '#RRGGBB' + alpha 0..1 -> 0xRRGGBBAA. */
export function rgba(hex: string, a = 1): number {
  return ((parseInt(hex.slice(1, 7), 16) << 8) | Math.round(a * 255)) >>> 0;
}
export const WHITE = 0xffffffff;
