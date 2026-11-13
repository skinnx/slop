// Recruit reveal (7.3), hero list (8.1) and hero detail (8.2) of 03-ux-spec.md.
import { Node, Label, tween, Vec3, UITransform, input, Input } from 'cc';
import { ScrollList } from '../kit/ScrollList';
import { node, ui, px, label, rect, slice, place, num } from '../kit/Ui';
import { Layout, W } from '../kit/Layout';
import { C, FS, RARITY, ATTR } from '../kit/Theme';
import { Panel } from '../kit/Panel';
import { Button, onTap } from '../kit/Button';
import { Bar, HeroCard, levelBadge, stars, resIcon } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { HeroCardV, RevealV } from '../model/ViewModel';
import { TavernCard } from './TavernPanel';
import { cpIcon } from '../hud/FieldHud';

/** "Nhận Hero": red curtain, orange ribbon, the three cards; each draw lifts its card 0.6 s apart. */
export class RevealScreen extends Panel {
  readonly id = 'reveal';
  protected closeOnShade = false;
  protected shadeAlpha = 0;
  private r: RevealV | null = null;
  private cards: TavernCard[] = [];
  private t = 0;
  private step = -1;
  private hint: Label | null = null;
  private pops: Node[] = [];
  private confetti: { n: Node; vx: number; vy: number; vr: number }[] = [];

  protected build(): void {
    this.r = this.ctx.src.lastReveal();
    const H = Layout.H;
    const ch = H - 120 - Layout.safeTop + 200; // down past the bottom edge
    const bg = node(this.top, 'curtain', W, ch); bg.setPosition(0, -120 - ch / 2, 0);
    rect(bg, W, ch, '#5A1E2E');
    for (let x = 30; x < W; x += 60) rect(bg, 14, ch, '#6E2638').node.setPosition(x - W / 2, 0, 0);
    onTap(bg, () => this.tap());
    for (let i = 0; i < 2; i++) { const s = ui(bg, 'proc/cone', { w: 260, h: 700, color: '#FFF2C0', alpha: 0.18 }); s.node.setPosition(i ? 200 : -200, ch / 2 - 350, 0); s.node.angle = i ? 12 : -12; }
    const rib = node(this.top, 'ribbon'); place(rib, 160, 470, 400, 80);
    slice(rib, 'ui/btn_yellow', 400, 80, '#FF9A3C');
    label(rib, 'NHẬN HERO', { size: 36, bold: true, outline: '#7A3A00' }).node.setPosition(0, 4, 0);
    this.cards = [];
    (this.r?.cards ?? []).forEach((c, i) => {
      const tc = new TavernCard(this.top); place(tc.root, 42 + i * 220, 560, 196, 270); tc.set(c);
      this.cards.push(tc);
    });
    this.hint = label(this.bottom, 'Chạm để tiếp tục', { size: 28, bold: true, outline: '#000000' });
    this.hint.node.setPosition(0, 200, 0);
    this.hint.node.active = false;
    this.confetti = [];
    const cols = ['#FFD34D', '#4CD137', '#3D8BFF', '#E5484D', '#B455F5', '#FFFFFF'];
    for (let i = 0; i < 40; i++) {
      const p = ui(this.top, 'proc/pixel', { w: 8, h: 12, color: cols[i % cols.length] });
      p.node.setPosition(((i * 97) % W) - W / 2, -((i * 53) % 400), 0);
      this.confetti.push({ n: p.node, vx: ((i % 7) - 3) * 8, vy: -120 - (i % 5) * 30, vr: 90 + (i % 4) * 60 });
    }
  }

  tick(dt: number): void {
    this.t += dt;
    for (const c of this.confetti) {
      const p = c.n.position;
      let y = p.y + c.vy * dt;
      if (y < -Layout.H) y = 0;
      c.n.setPosition(p.x + c.vx * dt, y, 0);
      c.n.angle += c.vr * dt;
    }
    if (!this.r) return;
    const next = Math.floor(this.t / 0.6);
    if (next > this.step && next < this.r.draws.length) {
      this.step = next;
      const d = this.r.draws[next];
      const card = this.cards[d.cardIndex];
      if (card) {
        Services.sfx('menu-confirm');
        tween(card.root).by(0.15, { position: new Vec3(0, 30, 0) }).delay(0.3).by(0.15, { position: new Vec3(0, -30, 0) }).start();
        const pop = label(card.root, d.isNew ? 'MỚI!' : `+${d.frags} mảnh`, { size: 32, bold: true, color: C.gold, outline: '#000000' });
        pop.node.setPosition(0, 40, 0);
        tween(pop.node).by(0.6, { position: new Vec3(0, 30, 0) }).start();
        this.pops.push(pop.node);
      }
    }
    if (this.t > this.r.draws.length * 0.6 + 0.2 && this.hint) this.hint.node.active = true;
  }

  private tap(): void {
    if (this.hint?.node.active) this.back();
  }
  get done(): boolean { return !!this.hint?.node.active; }
}

/** Grid of hero cards: 4 columns 148 x 184, gap 16, left margin 40 (relative to the panel's left). */
function grid(parent: Node, cards: HeroCardV[], onCard: (c: HeroCardV, card: HeroCard) => void, top: number): { extent: number; views: HeroCard[] } {
  const views: HeroCard[] = [];
  cards.forEach((c, i) => {
    const hc = new HeroCard(parent);
    hc.root.name = 'hero-' + c.id;
    hc.set(c);
    const col = i % 4, row = Math.floor(i / 4);
    hc.root.setPosition(16 + 74 + col * 164, -(top + 92 + row * 200), 0);
    onTap(hc.root, () => onCard(c, hc));
    views.push(hc);
  });
  return { extent: top + Math.ceil(cards.length / 4) * 200, views };
}

export class HeroListPanel extends Panel {
  readonly id = 'heroList';
  private filter: 'ALL' | 'STR' | 'AGI' | 'INT' = 'ALL';
  constructor(private openDetail: (id: string, ids: string[]) => void) { super(); }

  protected build(): void {
    this.backButton();
    this.ribbon('Hero của tôi', 140, undefined, 'icon/pawns');
    const b = this.body(228, { bottomGap: 140 });
    const all = this.ctx.src.heroes();
    const sq = this.ctx.src.squad();
    const owned = all.filter((h) => h.owned).length;
    this.text(b, `Hero ra trận: ${sq.members.length}/${sq.slots}`, 32, 20, { size: 24 });
    this.text(b, `Sở hữu: ${owned}/${all.length}`, 440, 20, { size: 24 });
    const tabs: [typeof this.filter, string][] = [['ALL', 'Tất cả'], ['STR', 'Sức Mạnh'], ['AGI', 'Nhanh'], ['INT', 'Trí Tuệ']];
    tabs.forEach(([k, t], i) => {
      const btn = new Button(b, { w: 150, h: 64, text: t, textSize: 24, color: this.filter === k ? (k === 'ALL' ? C.blue : ATTR[k]) : '#24477F', name: 'filter-' + k, minHit: 64, sound: 'switch-a',
        onTap: () => { this.filter = k; this.refresh(); } });
      btn.root.setPosition(16 + 75 + i * 160, -86, 0);
    });
    // Order: squad (slot order), then CP descending, then not owned.
    const inSq = sq.members.map((id) => all.find((h) => h.id === id)!).filter(Boolean);
    const rest = all.filter((h) => h.owned && sq.members.indexOf(h.id) < 0).sort((a, c) => c.cp - a.cp);
    const notOwned = all.filter((h) => !h.owned);
    const list = [...inSq, ...rest, ...notOwned].filter((h) => this.filter === 'ALL' || h.attr === this.filter);
    const sh = b.parent!.getComponent(UITransform)!;
    const sl = new ScrollList(b, 672, sh.height - 140);
    sl.root.setPosition(336, -140 - (sh.height - 140) / 2, 0);
    const g = grid(sl.content, list, (c) => this.openDetail(c.id, list.map((h) => h.id)), 0);
    sl.setExtent(g.extent + 20);
  }
}

export class HeroDetailPanel extends Panel {
  readonly id = 'heroDetail';
  private holdT = -1;
  private holdAcc = 0;
  private tipNode: Node | null = null;
  constructor(private heroId: string, private ids: string[], private viewOnly = false) { super(); }

  protected build(): void {
    const d = this.ctx.src.hero(this.heroId);
    this.backButton();
    if (!d) return;
    const c = d.card;
    const T = this.top;
    const meat = node(T, 'meat'); place(meat, 16, 136, 180, 52);
    slice(meat, 'proc/rrect', 180, 52, '#0E2347', 0.9);
    resIcon(meat, 'meat', 44).node.setPosition(-62, 0, 0);
    label(meat, num(d.meat), { size: 26, bold: true, align: 'right' }).node.setPosition(76, 0, 0);
    const big = node(T, 'portrait', 360, 280); place(big, 180, 160, 360, 280);
    const img = px(big, c.art.replace(':', '/'), { w: 192, h: 192, color: c.owned ? c.tint ?? '#FFFFFF' : '#10141C' });
    img.node.setPosition(0, -30, 0);
    big.on(Node.EventType.TOUCH_END, (e: any) => {
      const dx = e.getUILocation().x - e.getUIStartLocation().x;
      if (Math.abs(dx) > 60) this.swipe(dx < 0 ? 1 : -1);
    });
    const b = this.body(440, { bottomGap: 150 });
    const bh = b.parent!.getComponent(UITransform)!.height;
    // Badge, level, fragment bar, name.
    const badge = node(b, 'badge', 120, 120); badge.setPosition(24 + 60, -24 - 60, 0);
    slice(badge, 'ui/panel', 120, 120, RARITY[c.rarity]);
    px(badge, c.art.replace(':', '/'), { w: 96, h: 96, color: c.tint ?? '#FFFFFF' });
    const lv = levelBadge(b, c.level, 56); lv.root.setPosition(190, -50, 0);
    this.text(b, 'Cấp', 160, 14, { size: 20, color: '#B9CBE8' });
    if (c.fragNeed) {
      const fb = node(b, 'frag'); fb.setPosition(330, -50, 0);
      const bar = new Bar(fb, 220, 30, '#4CD137', '#000000', 0.8, 3); bar.set(c.frag / c.fragNeed);
      label(fb, `${c.frag}/${c.fragNeed}`, { size: 22, bold: true, outline: '#000000', outlineWidth: 2 });
    }
    this.text(b, c.name, 160, 104, { size: 36, bold: true, outline: '#000000' });
    // CP / ATK / HP boxes.
    const box = (x: number, icon: (p: Node) => Node, cap: string, val: string, delta?: number) => {
      const n = node(b, 'stat', 200, 72); n.setPosition(x + 100, -150 - 36, 0);
      slice(n, 'proc/rrect', 200, 72, '#0E2347', 0.8);
      icon(n).setPosition(-70, 0, 0);
      label(n, cap, { size: 20, color: '#8FB0E0', bold: true }).node.setPosition(-10, 24, 0);
      label(n, val, { size: 28, bold: true, align: 'left' }).node.setPosition(-40, -6, 0);
      if (delta) label(n, '+' + delta, { size: 24, bold: true, color: '#5BE36B', align: 'right' }).node.setPosition(94, -6, 0);
    };
    box(24, (p) => cpIcon(p, 40), 'CP', num(c.cp));
    box(236, (p) => ui(p, 'icon/sword', { w: 40, h: 40, color: '#C9CED6' }).node, 'ATK', num(d.atk), d.maxed ? 0 : d.atkNext);
    box(448, (p) => ui(p, 'icon/suit_hearts', { w: 40, h: 40, color: '#FF5A5A' }).node, 'HP', num(d.hp), d.maxed ? 0 : d.hpNext);
    // Milestones (scrolls when they do not fit).
    // Bottom-up: button (112) at the bottom, skills (130) above it, milestones fill the rest and scroll.
    const mTop = 236, mH = Math.max(120, bh - mTop - 130 - 16 - 136);
    const ms = new ScrollList(b, 640, mH); ms.root.setPosition(336, -mTop - mH / 2, 0);
    d.milestones.forEach((m, i) => {
      const r = node(ms.content, 'ms', 620, 56); r.setPosition(320, -28 - i * 62, 0);
      slice(r, 'proc/rrect', 620, 54, m.reached ? '#2C8FC9' : '#24477F', m.reached ? 1 : 0.6);
      const lb = levelBadge(r, m.level, 44, m.reached ? '#46C35A' : '#5A6070'); lb.root.setPosition(-280, 0, 0);
      label(r, m.text, { size: 22, align: 'left', color: m.reached ? '#FFFFFF' : '#9FB0C8' }).node.setPosition(-244, 0, 0);
      ui(r, m.reached ? 'ui/checkmark' : 'icon/lock_closed', { w: 32, h: 32, color: m.reached ? undefined : '#E8EAEE' }).node.setPosition(280, 0, 0);
    });
    ms.setExtent(d.milestones.length * 62);
    // Skills.
    const sy = mTop + mH + 16;
    d.skills.forEach((s, i) => {
      const n = node(b, 'skill' + i, 300, 130); n.setPosition(24 + 150 + i * 324, -sy - 65, 0);
      slice(n, 'proc/rrect', 300, 126, '#0E2347', 0.8);
      const ic = node(n, 'ic', 100, 100); ic.setPosition(-90, 0, 0);
      slice(ic, 'proc/rrect', 100, 100, s.unlocked ? ATTR[c.attr] : '#5A6070');
      ui(ic, s.unlocked ? 'icon/book_closed' : 'icon/lock_closed', { w: 64, h: 64, color: '#FFFFFF' });
      label(n, s.name, { size: 24, bold: true, w: 170 }).node.setPosition(55, 22, 0);
      stars(n, s.stars, s.maxStars, 26).setPosition(55, -28, 0);
      onTap(n, () => this.skillTip(s, n));
    });
    // Upgrade button.
    if (!this.viewOnly && c.owned) {
      const main = this.mainButton(b, '', 336, -(bh - 68), () => this.levelUp(), 400, 112);
      main.root.name = 'levelUp';
      if (d.maxed || !d.cost) { label(main.visual, 'Tối đa', { size: FS.big, bold: true }); main.setEnabled(false, 'Đã tối đa'); }
      else {
        const pr = node(main.visual, 'pr'); pr.setPosition(0, 24, 0);
        resIcon(pr, 'meat', 36).node.setPosition(-60, 0, 0);
        const txt = d.cost.frags ? `${d.cost.meat} + ${d.cost.frags} mảnh` : String(d.cost.meat);
        label(pr, txt, { size: 28, bold: true, color: d.cost.lackMeat || d.cost.lackFrags ? C.lack : '#FFFFFF', align: 'left', outline: '#20304A' }).node.setPosition(-36, 0, 0);
        label(main.visual, 'NÂNG CẤP', { size: FS.big, bold: true, outline: C.greenDark }).node.setPosition(0, -22, 0);
        main.setEnabled(!d.cost.lackMeat && !d.cost.lackFrags, d.cost.lackFrags ? 'Thiếu mảnh' : 'Thiếu thịt');
        // Hold 0.5 s = repeat 4 levels per second while affordable.
        // The panel rebuilds after each level, destroying this node: the release is then seen by the global input.
        const stop = () => { this.holdT = -1; };
        main.root.on(Node.EventType.TOUCH_START, () => { this.holdT = 0; this.holdAcc = 0; input.once(Input.EventType.TOUCH_END, stop); });
        main.root.on(Node.EventType.TOUCH_END, stop);
        main.root.on(Node.EventType.TOUCH_CANCEL, stop);
      }
    }
  }

  private skillTip(s: { name: string; kind: string; cooldownSec: number; desc: string; stars: number; unlocked: boolean; unlockLevel: number }, at: Node): void {
    this.tipNode?.destroy();
    const t = node(this.top, 'tooltip', 560, 220);
    place(t, 80, 700, 560, 220);
    slice(t, 'ui/panel', 560, 220, '#FFFFFF');
    label(t, s.name, { size: 28, bold: true, color: C.darkText }).node.setPosition(0, 80, 0);
    label(t, `${s.kind} · Hồi chiêu ${s.cooldownSec} giây`, { size: 22, color: '#44506A' }).node.setPosition(0, 44, 0);
    label(t, s.desc, { size: 22, color: C.darkText, w: 520 }).node.setPosition(0, -10, 0);
    label(t, s.unlocked ? `Sao hiện tại: ${s.stars}` : `Mở ở cấp ${s.unlockLevel}`, { size: 22, bold: true, color: '#2E6FD8' }).node.setPosition(0, -74, 0);
    onTap(t, () => { t.destroy(); this.tipNode = null; });
    this.tipNode = t;
    void at;
  }

  private levelUp(): boolean {
    const r = this.ctx.send({ t: 'heroLevelUp', id: this.heroId });
    if (r.ok) { Services.sfx('level-up'); this.refresh(); }
    return r.ok;
  }

  private swipe(dir: number): void {
    const i = this.ids.indexOf(this.heroId);
    if (i < 0) return;
    this.heroId = this.ids[(i + dir + this.ids.length) % this.ids.length];
    this.refresh();
  }

  tick(dt: number): void {
    if (this.holdT < 0) return;
    this.holdT += dt;
    if (this.holdT < 0.5) return;
    this.holdAcc += dt;
    if (this.holdAcc >= 0.25) { this.holdAcc = 0; if (!this.levelUp()) this.holdT = -1; }
  }
  get hero(): string { return this.heroId; }
}

