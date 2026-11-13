// Node-building helpers used by every screen. Coordinates follow 03-ux-spec.md: x 0..720 from the left,
// y downward from the top (top-anchored containers) or upward from the bottom (bottom-anchored containers).
import { Node, UITransform, Layers, Sprite, SpriteFrame, Label, Color, HorizontalTextAlignment, VerticalTextAlignment,
  Sorting2D, UIOpacity } from 'cc';
import { Assets } from './Assets';
import { hex, FS } from './Theme';
import { W } from './Layout';

const bands = new WeakMap<Node, number>();

/** Gives a subtree its draw-order band (see Theme.BAND). */
export function setBand(n: Node, band: number): void {
  bands.set(n, band);
}
function bandOf(n: Node | null): number {
  for (let p = n; p; p = p.parent) {
    const b = bands.get(p);
    if (b !== undefined) return b;
  }
  return 0;
}
function sortRenderer(n: Node, text: boolean): void {
  const s = n.addComponent(Sorting2D);
  s.sortingOrder = bandOf(n) * 2 + (text ? 1 : 0);
}
/** Re-applies the band of the node's current parent chain to every renderer below `root` (after re-parenting). */
export function rebandTree(root: Node): void {
  const walk = (n: Node) => {
    const s = n.getComponent(Sorting2D);
    if (s) s.sortingOrder = bandOf(n) * 2 + (n.getComponent(Label) ? 1 : 0);
    n.children.forEach(walk);
  };
  walk(root);
}

export function node(parent: Node | null, name = 'n', w = 0, h = 0): Node {
  const n = new Node(name);
  n.layer = Layers.Enum.UI_2D;
  n.addComponent(UITransform).setContentSize(w, h);
  if (parent) parent.addChild(n);
  return n;
}

export function size(n: Node, w: number, h: number): Node {
  n.getComponent(UITransform)!.setContentSize(w, h);
  return n;
}
export function sizeOf(n: Node): { w: number; h: number } {
  const t = n.getComponent(UITransform)!;
  return { w: t.width, h: t.height };
}

/** Top-anchored spec rect (top-left x, y, w, h; y down) -> centre in a container whose origin is the top edge, x centre. */
export function place(n: Node, x: number, y: number, w?: number, h?: number): Node {
  const s = w === undefined ? sizeOf(n) : { w, h: h! };
  if (w !== undefined) size(n, w, h!);
  n.setPosition(x + s.w / 2 - W / 2, -(y + s.h / 2), 0);
  return n;
}
/** Bottom-anchored spec rect: x from the left, `fromBottom` = distance of the rect's TOP edge above the bottom (spec "y H-k" -> k). */
export function placeB(n: Node, x: number, fromBottom: number, w?: number, h?: number): Node {
  const s = w === undefined ? sizeOf(n) : { w, h: h! };
  if (w !== undefined) size(n, w, h!);
  n.setPosition(x + s.w / 2 - W / 2, fromBottom - s.h / 2, 0);
  return n;
}
/** Local rect inside a parent whose content origin is its own top-left corner (anchor 0,1). */
export function placeIn(n: Node, x: number, y: number, w?: number, h?: number): Node {
  const s = w === undefined ? sizeOf(n) : { w, h: h! };
  if (w !== undefined) size(n, w, h!);
  n.setPosition(x + s.w / 2, -(y + s.h / 2), 0);
  return n;
}

export interface SpriteOpts { color?: Color | string; alpha?: number; sliced?: boolean; w?: number; h?: number; name?: string; }

function applyColor(s: Sprite | Label, color?: Color | string, alpha?: number): void {
  if (color === undefined && alpha === undefined) return;
  const c = typeof color === 'string' ? hex(color) : color ?? Color.WHITE;
  s.color = alpha === undefined ? c : new Color(c.r, c.g, c.b, Math.round(alpha * 255));
}

/** Sprite with a frame from either atlas. Size = frame size unless w/h given. */
export function sprite(parent: Node, frame: SpriteFrame, o: SpriteOpts = {}): Sprite {
  const n = node(parent, o.name ?? 'sp');
  const s = n.addComponent(Sprite);
  s.sizeMode = Sprite.SizeMode.CUSTOM;
  s.trim = false;
  if (o.sliced) s.type = Sprite.Type.SLICED;
  s.spriteFrame = frame;
  const r = frame.rect;
  size(n, o.w ?? r.width, o.h ?? r.height);
  applyColor(s, o.color, o.alpha);
  sortRenderer(n, false);
  return s;
}
export const ui = (parent: Node, name: string, o: SpriteOpts = {}) => sprite(parent, Assets.u(name), o);
export const px = (parent: Node, name: string, o: SpriteOpts = {}) => sprite(parent, Assets.w(name), o);
/** Plain filled rectangle (UI atlas white pixel). */
export function rect(parent: Node, w: number, h: number, color: string, alpha?: number): Sprite {
  return sprite(parent, Assets.u('proc/pixel'), { w, h, color, alpha });
}
/** 9-slice panel/button background from the UI atlas. */
export function slice(parent: Node, name: string, w: number, h: number, color?: string, alpha?: number): Sprite {
  return sprite(parent, Assets.u(name), { w, h, color, alpha, sliced: true });
}
export function setColor(s: Sprite | Label, color: string, alpha?: number): void {
  applyColor(s, color, alpha);
}

export interface LabelOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  /** Outline colour (width 3 by default). */
  outline?: string;
  outlineWidth?: number;
  align?: 'left' | 'center' | 'right';
  /** Wrap width; height grows. */
  w?: number;
  lineHeight?: number;
  name?: string;
}

/**
 * Label in Be Vietnam Pro, CHAR cache mode: every label shares one glyph texture, so all labels of a band
 * batch into one draw call. Line height is 1.3 x size so Vietnamese stacked diacritics are not clipped.
 */
export function label(parent: Node, text: string, o: LabelOpts = {}): Label {
  const n = node(parent, o.name ?? 'lb');
  const l = n.addComponent(Label);
  const font = o.bold ? Assets.bold : Assets.regular;
  if (font) { l.useSystemFont = false; l.font = font; } else { l.useSystemFont = true; l.fontFamily = 'Arial'; l.isBold = !!o.bold; }
  const fs = o.size ?? FS.body;
  l.fontSize = fs;
  l.lineHeight = o.lineHeight ?? Math.round(fs * 1.3);
  l.horizontalAlign = o.align === 'left' ? HorizontalTextAlignment.LEFT : o.align === 'right' ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.CENTER;
  l.verticalAlign = VerticalTextAlignment.CENTER;
  if (o.w) {
    l.overflow = Label.Overflow.RESIZE_HEIGHT;
    l.enableWrapText = true;
    size(n, o.w, l.lineHeight);
  } else {
    l.overflow = Label.Overflow.NONE;
  }
  if (o.align === 'left') n.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
  if (o.align === 'right') n.getComponent(UITransform)!.setAnchorPoint(1, 0.5);
  if (o.outline) {
    l.enableOutline = true;
    l.outlineColor = hex(o.outline);
    l.outlineWidth = o.outlineWidth ?? 3;
  }
  l.color = hex(o.color ?? '#FFFFFF');
  setText(l, text);
  sortRenderer(n, true);
  return l;
}

/**
 * CHAR mode draws each glyph in a cell 1.26 x font size high (engine font-utils.ts), which cuts the upper mark of
 * Vietnamese capitals such as Ắ, Ễ, Ỡ. Labels holding such a capital use cache mode NONE (own texture, one more
 * draw call, nothing clipped). In CHAR mode an outline widens every glyph cell by 2 x outline width, so spacingX
 * takes it back.
 */
function hasTallCapital(s: string): boolean {
  for (const ch of s) {
    if (ch < '\u00C0' || ch.toUpperCase() !== ch || ch.toLowerCase() === ch) continue;
    const marks = ch.normalize('NFD').slice(1).replace('\u0323', '');
    if (marks.length > 0) return true;
  }
  return false;
}

/** Sets text only when it changed (labels re-layout on every assignment) and picks the cache mode (see above). */
export function setText(l: Label, s: string | number): void {
  const v = String(s);
  if (l.string === v) return;
  const mode = hasTallCapital(v) ? Label.CacheMode.NONE : Label.CacheMode.CHAR;
  if (l.cacheMode !== mode) l.cacheMode = mode;
  l.spacingX = mode === Label.CacheMode.CHAR && l.enableOutline ? -2 * l.outlineWidth : 0;
  l.string = v;
}

export function opacity(n: Node, a: number): UIOpacity {
  const o = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
  o.opacity = Math.round(a * 255);
  return o;
}

/** Thousands separator with a dot (Vietnamese style): 12500 -> "12.500". */
export function num(v: number): string {
  const s = String(Math.floor(Math.abs(v)));
  const out = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return v < 0 ? '-' + out : out;
}
/** Seconds -> "m:ss" or "h:mm:ss". */
export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (x: number) => (x < 10 ? '0' + x : String(x));
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}
