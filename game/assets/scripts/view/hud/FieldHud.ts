// HUD of the field and the village (03-ux-spec.md sections 3, 4, 13). One HUD for both: the village is a
// region of the same map. Top bar + resource column + quest card are top-anchored; the four round buttons are
// bottom-anchored. All numbers come from FieldHudV.
import { Node, Label, Sprite, tween, Vec3, Tween } from 'cc';
import { useCharCache, groupAtlases, node, rect, ui, px, label, slice, place, placeB, setBand, setText, setColor, num } from '../kit/Ui';
import { Layout, W } from '../kit/Layout';
import { BAND, C } from '../kit/Theme';
import { Button, onTap } from '../kit/Button';
import { Bar, resIcon, levelBadge } from '../kit/Widgets';
import { FieldHudV, QuestV } from '../model/ViewModel';
import { Assets } from '../kit/Assets';

export interface FieldHudActions {
  hero(): void; squad(): void; build(): void; portal(): void; settings(): void; quest(): void; guide(): void;
  resTip(res: 'meat' | 'wood' | 'ore'): void;
}

/** Gear drawn from shapes (no gear icon in the packs): disc, 8 teeth, centre hole. */
export function gearIcon(parent: Node, s: number, color: string, hole: string): Node {
  const g = node(parent, 'gear', s, s);
  for (let i = 0; i < 8; i++) {
    const t = ui(g, 'proc/pixel', { w: s * 0.25, h: s * 0.36, color });
    t.node.angle = i * 45;
    const a = (i * Math.PI) / 4;
    t.node.setPosition(Math.sin(a) * s * 0.4, Math.cos(a) * s * 0.4, 0);
  }
  ui(g, 'proc/circle', { w: s * 0.8, h: s * 0.8, color });
  ui(g, 'proc/circle', { w: s * 0.3, h: s * 0.3, color: hole });
  return g;
}
/** Magnifier drawn from a ring and a handle. */
export function magnifier(parent: Node, s: number): Node {
  const g = node(parent, 'mag', s, s);
  slice(g, 'proc/rrect', s, s, '#5A6070');
  const r = ui(g, 'proc/ring', { w: s * 0.55, h: s * 0.55, color: '#FFFFFF' }); r.node.setPosition(-s * 0.06, s * 0.06, 0);
  const h = ui(g, 'proc/pixel', { w: s * 0.14, h: s * 0.34, color: '#FFFFFF' }); h.node.angle = 45; h.node.setPosition(s * 0.2, -s * 0.2, 0);
  return g;
}
/** Swirl portal icon (Về làng / Ra đồng). */
export function portalIcon(parent: Node, s: number): Node {
  const g = node(parent, 'portal', s, s);
  ui(g, 'proc/circle', { w: s, h: s, color: '#2E8BFF' });
  ui(g, 'proc/ring', { w: s * 0.8, h: s * 0.8, color: '#9FD0FF' });
  ui(g, 'proc/ring', { w: s * 0.45, h: s * 0.45, color: '#9FD0FF' });
  return g;
}
/** Two crossed swords: the CP icon. */
export function cpIcon(parent: Node, s: number): Node {
  const g = node(parent, 'cp', s, s);
  ui(g, 'icon/sword', { w: s, h: s, color: '#C9CED6' }).node.angle = 45;
  ui(g, 'icon/sword', { w: s, h: s, color: '#C9CED6' }).node.angle = -45;
  return g;
}

export class QuestCard {
  readonly root: Node;
  private bg: Sprite; private pillBg: Sprite; private pill: Label; private text: Label; private icon: Sprite;
  private pulse = false;
  constructor(parent: Node, onCard: () => void, onGuide: () => void) {
    this.root = node(parent, 'quest', 340, 104);
    place(this.root, 200, 132, 340, 104);
    this.bg = slice(this.root, 'ui/rect', 340, 104, C.questBg);
    const ib = node(this.root, 'iconbox', 88, 88); ib.setPosition(-112, -2, 0);
    slice(ib, 'proc/rrect', 80, 80, C.questIcon);
    this.icon = ui(ib, 'icon/structure_house', { w: 60, h: 60, color: '#FFFFFF' });
    this.text = label(this.root, '', { size: 26, color: C.darkText, w: 220, bold: true });
    this.text.node.setPosition(52, -6, 0);
    const pill = node(this.root, 'pill', 150, 36); pill.setPosition(85, 52, 0);
    this.pillBg = slice(pill, 'proc/rrect', 150, 36, '#1B1F2A');
    this.pill = label(pill, '0/1', { size: 22, bold: true });
    onTap(this.root, onCard);
    // Magnifier sits on the card's top-left corner like the reference (spec x 172 would cover the resource column).
    const mag = node(parent, 'magnifier', 88, 88);
    place(mag, 182, 100, 88, 88);
    magnifier(mag, 56);
    onTap(mag, onGuide);
  }
  set(q: QuestV | null): void {
    this.root.active = !!q;
    if (!q) return;
    setText(this.text, q.text);
    setText(this.pill, q.finished ? '—' : q.done ? 'Nhận!' : `${q.cur}/${q.need}`);
    setColor(this.pillBg, q.done ? C.green : '#1B1F2A');
    setColor(this.bg, q.done ? '#BFF2B4' : C.questBg);
    this.icon.spriteFrame = this.icon.spriteFrame; // icon kind fixed in M1 (see README)
    if (q.done !== this.pulse) {
      this.pulse = q.done;
      Tween.stopAllByTarget(this.root);
      this.root.setScale(1, 1, 1);
      if (q.done) tween(this.root).repeatForever(tween<Node>().to(0.4, { scale: new Vec3(1.05, 1.05, 1) }).to(0.4, { scale: new Vec3(1, 1, 1) })).start();
    }
  }
}

export class FieldHud {
  readonly root: Node;
  private top!: Node; private bottom!: Node; private side!: Node;
  private lv!: { root: Node; l: Label };
  private cp!: Label; private gold!: Label; private coral!: Label; private expBar!: Bar; private expL!: Label;
  private resL: Label[] = []; private resBars: Bar[] = [];
  quest!: QuestCard;
  heroBtn!: Button; squadBtn!: Button; buildBtn!: Button; portalBtn!: Button;
  private squadL!: Label; private squadArrow!: Sprite; private squadLeader!: Sprite;
  private buildL!: Label; private portalL!: Label;
  private channel!: Bar;

  constructor(parent: Node, private act: FieldHudActions) {
    this.root = node(parent, 'field-hud');
    useCharCache(this.root);
    groupAtlases(this.root);
    setBand(this.root, BAND.hud);
    this.build();
  }

  build(): void {
    this.root.removeAllChildren();
    this.resL = []; this.resBars = [];
    this.top = node(this.root, 'top'); this.top.setPosition(0, Layout.top, 0);
    this.bottom = node(this.root, 'bottom'); this.bottom.setPosition(0, Layout.bottom, 0);
    const T = this.top;
    // Top bar background, extended up through the safe area (notch strip).
    const bar = rect(T, W, 120 + Layout.safeTop, C.topBar); bar.node.setPosition(0, -60 + Layout.safeTop / 2, 0);
    const edge = rect(T, W, 4, C.panelEdge); edge.node.setPosition(0, -120, 0);
    onTap(bar.node, () => {});
    this.lv = levelBadge(T, 1, 92);
    place(this.lv.root, 10, 10, 92, 96);
    const cpN = node(T, 'cp'); place(cpN, 112, 16, 228, 56);
    cpIcon(cpN, 44).setPosition(-88, 0, 0);
    this.cp = label(cpN, '0', { size: 40, bold: true, align: 'left', outline: '#0E2347' }); this.cp.node.setPosition(-58, 2, 0);
    const pill = (x: number, w: number, res: 'gold' | 'coral') => {
      const n = node(T, res); place(n, x, 22, w, 52);
      slice(n, 'proc/rrect', w, 44, '#0E2347', 0.9);
      resIcon(n, res, 44).node.setPosition(-w / 2 + 22, 0, 0);
      const l = label(n, '0', { size: 30, bold: true, align: 'right' }); l.node.setPosition(w / 2 - 12, 1, 0);
      return l;
    };
    this.gold = pill(372, 168, 'gold');
    this.coral = pill(552, 156, 'coral');
    const ex = node(T, 'exp'); place(ex, 112, 90, 596, 12);
    this.expBar = new Bar(ex, 596, 12, '#36C8F0', '#000000', 0.9);
    this.expL = label(T, 'EXP 0%', { size: 20, bold: true, align: 'right', color: '#CFE7FF' });
    this.expL.node.setPosition(708 - W / 2, -110, 0);
    // Resource column: meat, wood, ore (hidden with the quest card and gear in build mode).
    this.side = node(T, 'side');
    const S = this.side;
    (['meat', 'wood', 'ore'] as const).forEach((r, i) => {
      const n = node(S, 'res-' + r); place(n, 8, 136 + i * 60, 210, 52);
      const b = new Bar(n, 150, 40, C.green, '#0E2347', 0.85); b.root.setPosition(28, 0, 0);
      resIcon(n, r, 48).node.setPosition(-78, 0, 0);
      const l = label(n, '0', { size: 28, bold: true, align: 'right', outline: '#0E2347' }); l.node.setPosition(96, 1, 0);
      this.resL.push(l); this.resBars.push(b);
      onTap(n, () => this.act.resTip(r));
    });
    this.quest = new QuestCard(S, () => this.act.quest(), () => this.act.guide());
    const gear = node(S, 'settings', 88, 88); place(gear, 624, 136, 88, 88);
    gearIcon(gear, 64, '#C9CED6', C.topBar);
    onTap(gear, () => this.act.settings());
    // Bottom buttons.
    const round = (x: number, fromBottom: number, name: string, fn: () => void) => {
      const b = new Button(this.bottom, { w: 112, h: 112, frame: '', name, onTap: fn });
      ui(b.visual, 'ui/round', { w: 112, h: 112, color: '#2A5BA8' });
      ui(b.visual, 'proc/circle', { w: 96, h: 96, color: C.topBar }).node.setPosition(0, 4, 0);
      placeB(b.root, x, fromBottom, 112, 112);
      return b;
    };
    this.heroBtn = round(16, 264, 'hero', () => this.act.hero());
    this.heroBtn.icon('icon/pawns', 64, 64, 0, 6, '#FFFFFF');
    this.squadBtn = round(16, 136, 'squad', () => this.act.squad());
    this.squadLeader = px(this.squadBtn.visual, 'td/0097', { w: 64, h: 64 }); this.squadLeader.node.setPosition(0, 14, 0);
    const sp = node(this.squadBtn.visual, 'count', 76, 30); sp.setPosition(0, -32, 0);
    slice(sp, 'proc/rrect', 76, 30, '#1E9E3A');
    this.squadL = label(sp, '1/3', { size: 22, bold: true });
    this.squadArrow = ui(this.squadBtn.visual, 'ui/arrow_green_n', { w: 34, h: 34 }); this.squadArrow.node.setPosition(42, 42, 0);
    this.buildBtn = round(592, 264, 'build', () => this.act.build());
    this.buildBtn.icon('icon/structure_house', 56, 56, 0, 12, '#FFFFFF');
    this.buildL = label(this.buildBtn.visual, 'Xây', { size: 24, bold: true, outline: '#000000' }); this.buildL.node.setPosition(0, -34, 0);
    this.portalBtn = round(592, 136, 'portal', () => this.act.portal());
    portalIcon(this.portalBtn.visual, 60).setPosition(0, 12, 0);
    this.portalL = label(this.portalBtn.visual, 'Về làng', { size: 22, bold: true, outline: '#000000' }); this.portalL.node.setPosition(0, -36, 0);
    const ch = node(this.bottom, 'channel'); ch.setPosition(0, 420, 0);
    this.channel = new Bar(ch, 300, 16, '#9FD0FF');
    ch.active = false;
  }

  set(v: FieldHudV): void {
    setText(this.lv.l, v.level);
    setText(this.cp, num(v.cp));
    setText(this.gold, num(v.gold));
    setText(this.coral, num(v.coral));
    this.expBar.set(v.expPct);
    setText(this.expL, `EXP ${Math.floor(v.expPct * 100)}%`);
    const vals = [v.res.meat, v.res.wood, v.res.ore];
    vals.forEach((x, i) => {
      setText(this.resL[i], num(x));
      const p = v.res.cap > 0 ? x / v.res.cap : 0;
      this.resBars[i].set(p);
      this.resBars[i].color(p >= 0.95 ? C.red : C.green);
    });
    this.quest.set(v.quest);
    const lf = Assets.art(v.leaderArt);
    if (this.squadLeader.spriteFrame !== lf) this.squadLeader.spriteFrame = lf;
    setText(this.squadL, `${v.squadCount}/${v.squadSlots}`);
    this.squadArrow.node.active = v.squadHint;
    this.buildBtn.setEnabled(v.inVillage, 'Về làng để xây dựng');
    this.portalBtn.root.active = v.portal !== null;
    setText(this.portalL, v.portal === 'field' ? 'Ra đồng' : 'Về làng');
    this.portalBtn.setEnabled(!v.portalBlocked, 'Có quái ở gần!');
    this.channel.root.parent!.active = v.channelPct !== null;
    if (v.channelPct !== null) this.channel.set(v.channelPct);
  }

  /** Build mode keeps only the top bar (03-ux-spec.md section 5). */
  setBuildMode(on: boolean): void {
    this.side.active = !on;
    this.bottom.active = !on;
  }

  /** Bounce + glow of a HUD button for the guide (quest hint 'ui:*'). */
  bounce(which: 'build_button' | 'hero_list' | 'squad_button'): void {
    const b = which === 'build_button' ? this.buildBtn : which === 'hero_list' ? this.heroBtn : this.squadBtn;
    const glow = ui(b.root, 'proc/ring', { w: 140, h: 140, color: C.gold });
    tween(b.visual).repeat(6, tween<Node>().to(0.25, { scale: new Vec3(1.12, 1.12, 1) }).to(0.25, { scale: new Vec3(1, 1, 1) })).start();
    setTimeout(() => glow.node.isValid && glow.node.destroy(), 3000);
  }
}
