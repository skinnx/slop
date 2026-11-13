// Small reusable pieces: progress bar, resource icon, price row, hero card, stars.
import { Node, Sprite, Label, UITransform } from 'cc';
import { node, ui, px, rect, label, slice, setText, setColor } from './Ui';
import { C, RARITY, ATTR, ATTR_ICON } from './Theme';
import { Assets } from './Assets';
import { HeroCardV, Res } from '../model/ViewModel';

/** Horizontal bar: dark background, coloured fill growing from the left. */
export class Bar {
  readonly root: Node;
  readonly fill: Sprite;
  readonly bg: Sprite;
  private pct = -1;
  constructor(parent: Node, readonly w: number, readonly h: number, color: string, bg = '#000000', bgAlpha = 0.8, pad = 0) {
    this.root = node(parent, 'bar', w, h);
    this.bg = rect(this.root, w, h, bg, bgAlpha);
    this.fill = rect(this.root, w - pad * 2, h - pad * 2, color);
    this.fill.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
    this.fill.node.setPosition(-w / 2 + pad, 0, 0);
    this.set(0);
  }
  set(p: number): void {
    const v = Math.max(0, Math.min(1, p));
    if (v === this.pct) return;
    this.pct = v;
    this.fill.node.setScale(v, 1, 1);
  }
  color(c: string): void { setColor(this.fill, c); }
}

/** Icon of a resource at size s, from whichever atlas holds it (04-placeholder-art.md section 3.1). */
export function resIcon(parent: Node, res: Res | 'fragments', s: number): Sprite {
  switch (res) {
    case 'gold': return px(parent, 'pp/0151', { w: s * 1.5, h: s * 1.5 }); // the coin fills only the middle of its tile
    case 'meat': return px(parent, 'food/0008', { w: s, h: s });
    case 'ore': return px(parent, 'pp/0067', { w: s * 1.2, h: s * 1.2 });
    case 'coral': return px(parent, 'pp/0067_red', { w: s * 1.2, h: s * 1.2 });
    case 'wood': return ui(parent, 'icon/resource_wood', { w: s, h: s, color: '#B9773A' });
    case 'tickets': return ui(parent, 'icon/card', { w: s, h: s, color: '#FFD34D' });
    default: return ui(parent, 'icon/cards_stack', { w: s, h: s, color: '#B455F5' });
  }
}
export const RES_NAME: Record<string, string> = { gold: 'Vàng', meat: 'Thịt', wood: 'Gỗ', ore: 'Quặng', coral: 'San Hô Đỏ', tickets: 'Vé Quán' };

/** Row of "icon amount" pairs centred on the node. Amount red when lacking. */
export function priceRow(parent: Node, items: { res: Res; amount: number; lack?: boolean }[], o: { size?: number; icon?: number; gap?: number; color?: string } = {}): Node {
  const row = node(parent, 'price');
  const icon = o.icon ?? 40, fs = o.size ?? 28, gap = o.gap ?? 16;
  const parts: { n: Node; w: number }[] = [];
  for (const it of items) {
    const i = resIcon(row, it.res, icon);
    parts.push({ n: i.node, w: icon + 6 });
    const l = label(row, String(it.amount), { size: fs, bold: true, color: it.lack ? C.lack : o.color ?? '#FFFFFF', outline: '#20304A', align: 'left' });
    l.updateRenderData(true);
    parts.push({ n: l.node, w: l.node.getComponent(UITransform)!.width + gap });
  }
  const total = parts.reduce((a, p) => a + p.w, 0) - gap;
  let x = -total / 2;
  for (const p of parts) {
    const isLabel = !!p.n.getComponent(Label);
    p.n.setPosition(isLabel ? x : x + (icon / 2), 0, 0);
    x += p.w;
  }
  return row;
}

export function stars(parent: Node, n: number, max: number, s = 26): Node {
  const row = node(parent, 'stars');
  for (let i = 0; i < max; i++) {
    const sp = ui(row, i < n ? 'ui/star' : 'ui/star_outline', { w: s, h: s * 0.94 });
    sp.node.setPosition((i - (max - 1) / 2) * (s + 2), 0, 0);
  }
  return row;
}

/** Level hexagon badge with a number. */
export function levelBadge(parent: Node, level: number | string, s: number, color = '#2E9BFF'): { root: Node; l: Label } {
  const root = node(parent, 'lv', s, s);
  ui(root, 'icon/hexagon', { w: s, h: s, color });
  ui(root, 'icon/hexagon_outline', { w: s, h: s, color: '#FFFFFF' });
  const l = label(root, String(level), { size: Math.round(s * 0.42), bold: true, outline: '#0E2347' });
  return { root, l };
}

/**
 * Hero card shared by hero list, squad setup and tavern (03-ux-spec.md section 8.1): rarity frame,
 * attribute icon top-left, green arrow top-right when it can level, check when in squad, CP strip, level badge.
 */
export class HeroCard {
  readonly root: Node;
  private frame: Sprite;
  private img: Sprite;
  private attr: Sprite;
  private arrow: Sprite;
  private check: Sprite;
  private cp: Label;
  private lv: { root: Node; l: Label };
  private none: Label;
  private strip: Node;
  data: HeroCardV | null = null;

  constructor(parent: Node, readonly w = 148, readonly h = 184) {
    this.root = node(parent, 'card', w, h);
    this.frame = slice(this.root, 'ui/panel', w, h, '#9AA0A6');
    const inner = slice(this.root, 'ui/panel', w - 12, h - 12, '#2A4F8A');
    inner.node.setPosition(0, 0, 0);
    this.img = px(this.root, 'td/0097', { w: 96, h: 96 });
    this.img.node.setPosition(0, 18, 0);
    this.strip = node(this.root, 'strip', w - 12, 40);
    rect(this.strip, w - 12, 40, C.panelEdge, 0.95);
    this.strip.setPosition(0, -h / 2 + 26, 0);
    const sw = ui(this.strip, 'icon/sword', { w: 26, h: 26, color: '#C9CED6' });
    sw.node.setPosition(-20, 0, 0);
    this.cp = label(this.strip, '0', { size: 22, bold: true, align: 'left' });
    this.cp.node.setPosition(-4, 0, 0);
    this.attr = ui(this.root, 'icon/shield', { w: 34, h: 34 });
    this.attr.node.setPosition(-w / 2 + 22, h / 2 - 22, 0);
    this.arrow = ui(this.root, 'ui/arrow_green_n', { w: 30, h: 30 });
    this.arrow.node.setPosition(w / 2 - 20, h / 2 - 20, 0);
    this.check = ui(this.root, 'ui/checkmark', { w: 72, h: 72 });
    this.check.node.setPosition(0, 18, 0);
    this.lv = levelBadge(this.root, 1, 44);
    this.lv.root.setPosition(-w / 2 + 22, -h / 2 + 52, 0);
    this.none = label(this.root, 'Chưa có', { size: 22, bold: true, color: '#C9CED6' });
    this.none.node.setPosition(0, -h / 2 + 26, 0);
  }

  set(d: HeroCardV): void {
    this.data = d;
    setColor(this.frame, d.owned ? RARITY[d.rarity] : '#4A4F5A');
    this.img.spriteFrame = Assets.art(d.art);
    setColor(this.img, d.owned ? d.tint ?? '#FFFFFF' : '#10141C');
    this.attr.spriteFrame = Assets.u(ATTR_ICON[d.attr]);
    setColor(this.attr, ATTR[d.attr]);
    this.arrow.node.active = d.owned && d.canLevel;
    this.check.node.active = d.inSquad;
    this.strip.active = d.owned;
    this.lv.root.active = d.owned;
    this.none.node.active = !d.owned;
    setText(this.cp, d.cp);
    setText(this.lv.l, d.level);
  }

  /** Lifts the card a little ("held" in squad setup). */
  lift(on: boolean): void { this.root.setScale(on ? 1.06 : 1, on ? 1.06 : 1, 1); }
}
