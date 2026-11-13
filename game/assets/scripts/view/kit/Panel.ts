// The common panel pattern of 03-ux-spec.md section 2.3: the top bar stays visible, the world below it is
// shaded 55%, a title ribbon (with the keeper's portrait), a dark-blue body, a green main button, and a square
// back button bottom-left. Panels stack; back/close returns to the parent. Subclasses implement build().
import { Node, tween, Tween, Vec3, UITransform } from 'cc';
import { node, rect, slice, label, px, ui, setBand, place, placeB, opacity } from './Ui';
import { Layout, W } from './Layout';
import { C, FS } from './Theme';
import { Button, onTap } from './Button';
import type { Ctx } from '../Ctx';

export const TOP_BAR_H = 120;

export abstract class Panel {
  root!: Node;
  /** Origin at the top edge of the safe area, x centre. Children use place(x, y, w, h) with spec coordinates. */
  top!: Node;
  /** Origin at the bottom edge of the safe area. Children use placeB(x, fromBottom, w, h). */
  bottom!: Node;
  protected ctx!: Ctx;
  /** Covers the world below the top bar; tapping it closes the panel (set false to disable). */
  protected closeOnShade = true;
  /** Height of the area kept visible at the top (the HUD top bar). 0 = full-screen panel. */
  protected keepTop = TOP_BAR_H;
  protected shadeAlpha = 0.55;
  private slide!: Node;
  /** Name for the debug object and scenarios. */
  abstract readonly id: string;

  mount(parent: Node, band: number, ctx: Ctx): void {
    this.ctx = ctx;
    this.root = node(parent, 'panel:' + this.id, W, Layout.H);
    setBand(this.root, band);
    this.layout();
    this.slide.setPosition(0, -Layout.H, 0);
    tween(this.slide).to(0.2, { position: new Vec3(0, 0, 0) }, { easing: 'quadOut' }).start();
  }

  /** (Re)builds everything; called on mount and on screen resize. */
  layout(): void {
    this.root.removeAllChildren();
    this.root.getComponent(UITransform)!.setContentSize(W, Layout.H);
    const shadeH = Layout.H - (this.keepTop ? this.keepTop + Layout.safeTop : 0);
    const shade = rect(this.root, W, shadeH, '#000000', this.shadeAlpha);
    shade.node.setPosition(0, -Layout.H / 2 + shadeH / 2, 0);
    onTap(shade.node, () => { if (this.closeOnShade) this.back(); });
    this.slide = node(this.root, 'slide', W, Layout.H);
    this.top = node(this.slide, 'top');
    this.top.setPosition(0, Layout.top, 0);
    this.bottom = node(this.slide, 'bottom');
    this.bottom.setPosition(0, Layout.bottom, 0);
    this.build();
  }

  protected abstract build(): void;

  /** Re-reads data and redraws. Default: full rebuild without the slide animation. */
  refresh(): void {
    Tween.stopAllByTarget(this.slide);
    this.layout();
  }
  /** Called every frame while the panel is on top (timers). */
  tick(_dt: number): void {}

  /** True once the slide-in animation has finished (scenarios wait for it before tapping). */
  get settled(): boolean { return !!this.slide && this.slide.isValid && Math.abs(this.slide.position.y) < 0.5; }

  back(): void { this.ctx.close(this); }
  onClosed(): void {}

  // ---------- builders for the common pattern ----------

  /** Swallows touches on the panel body so they do not reach the shade. */
  protected blocker(n: Node): void { onTap(n, () => {}); }

  /** Title ribbon x 24..696 at spec y, 88 high, with an optional NPC portrait (world-atlas art spec) on its left. */
  protected ribbon(title: string, y: number, npc?: string, npcIcon?: string): Node {
    const r = node(this.top, 'ribbon');
    place(r, 24, y, 672, 88);
    slice(r, 'ui/rect_blue', 672, 88);
    const t = label(r, title, { size: FS.title, bold: true, outline: '#000000', outlineWidth: 3 });
    t.node.setPosition(npc || npcIcon ? 50 : 0, 4, 0);
    if (npc || npcIcon) {
      const p = node(r, 'npc', 120, 120);
      p.setPosition(-336 + 50, 4, 0);
      ui(p, 'proc/circle', { w: 120, h: 120, color: '#FFFFFF' });
      ui(p, 'proc/ring', { w: 120, h: 120, color: C.panelEdge });
      if (npc) px(p, npc.replace(':', '/'), { w: 84, h: 84 });
      else ui(p, npcIcon!, { w: 72, h: 72, color: C.blue });
    }
    return r;
  }

  /** Panel body from spec y to `bottomGap` above the bottom edge (or fixed height h). Origin: its top-left corner. */
  protected body(y: number, o: { bottomGap?: number; h?: number; x?: number; w?: number } = {}): Node {
    const x = o.x ?? 24, w = o.w ?? 672;
    const h = o.h ?? Math.max(200, Layout.H - Layout.safeTop - Layout.safeBottom - y - (o.bottomGap ?? 150));
    const b = node(this.top, 'body', w, h);
    place(b, x, y, w, h);
    slice(b, 'ui/panel', w, h, C.panel);
    this.blocker(b);
    const inner = node(b, 'inner', w, h);
    inner.getComponent(UITransform)!.setAnchorPoint(0, 1);
    inner.setPosition(-w / 2, h / 2, 0);
    return inner;
  }

  /** Back button 96 x 96 at x 24, 24 above the bottom edge. */
  protected backButton(): Button {
    const b = new Button(this.bottom, { w: 96, h: 96, frame: 'ui/sq_blue', name: 'back', onTap: () => this.back() });
    b.icon('ui/arrow_w', 44, 44, 0, 3, '#FFFFFF');
    placeB(b.root, 20, 120, 104, 104);
    return b;
  }

  /** Big green main button (400 x 120) centred at local (x, y) of `parent`. */
  protected mainButton(parent: Node, text: string, x: number, y: number, onTap: () => void, w = 400, h = 120): Button {
    const b = new Button(parent, { w, h, text, textSize: FS.big, color: C.green, outline: C.greenDark, onTap, name: 'main' });
    b.root.setPosition(x, y, 0);
    return b;
  }

  /** Text helper in a body (origin top-left): left-aligned at (x, y) centre-line. */
  protected text(parent: Node, s: string, x: number, y: number, o: Parameters<typeof label>[2] = {}) {
    const l = label(parent, s, { align: 'left', ...o });
    l.node.setPosition(x, -y, 0);
    return l;
  }
  protected ctext(parent: Node, s: string, x: number, y: number, o: Parameters<typeof label>[2] = {}) {
    const l = label(parent, s, o);
    l.node.setPosition(x, -y, 0);
    return l;
  }
  protected fade(n: Node, a: number): void { opacity(n, a); }
}
