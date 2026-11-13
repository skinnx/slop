// Quán Mỏ Neo: tab Tuyển and tab Đổi Vé (03-ux-spec.md section 7, reference hero-recruit-pub-01.jpg).
import { Node, Label, Sprite } from 'cc';
import { node, ui, px, label, rect, slice, place, setText, setColor, clock, num } from '../kit/Ui';
import { C, FS, RARITY, ATTR, ATTR_ICON } from '../kit/Theme';
import { Panel } from '../kit/Panel';
import { Button, onTap } from '../kit/Button';
import { Bar, resIcon, levelBadge, HeroCard } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { HeroCardV, TavernV } from '../model/ViewModel';
import { Assets } from '../kit/Assets';
import { ScrollList } from '../kit/ScrollList';

/** Big tavern card 196 x 270 (also used on the reveal screen). */
export class TavernCard {
  readonly root: Node;
  private fragBar: Bar; private fragL: Label; private frame: Sprite; private img: Sprite; private attr: Sprite;
  private isNew: Node; private dup: Label; private lv: { root: Node; l: Label }; private alert: Label;
  constructor(parent: Node) {
    const w = 196, h = 270;
    this.root = node(parent, 'tcard', w, h);
    this.frame = slice(this.root, 'ui/panel', w, h, '#9AA0A6');
    slice(this.root, 'ui/panel', w - 14, h - 14, '#2A4F8A');
    this.img = px(this.root, 'td/0097', { w: 128, h: 128 }); this.img.node.setPosition(0, 22, 0);
    this.attr = ui(this.root, 'icon/shield', { w: 36, h: 36 }); this.attr.node.setPosition(w / 2 - 26, h / 2 - 26, 0);
    const dupN = node(this.root, 'dup', 80, 34); dupN.setPosition(0, h / 2 - 26, 0);
    slice(dupN, 'proc/rrect', 80, 34, '#0E2347');
    this.dup = label(dupN, 'x5', { size: 22, bold: true });
    this.isNew = node(this.root, 'new', 110, 38); this.isNew.setPosition(0, -50, 0);
    slice(this.isNew, 'proc/rrect', 110, 38, '#E5484D');
    label(this.isNew, 'MỚI', { size: 24, bold: true, outline: '#7A1010' });
    const strip = node(this.root, 'strip', w - 14, 44); strip.setPosition(0, -h / 2 + 30, 0);
    rect(strip, w - 14, 44, '#0E2347');
    this.lv = levelBadge(strip, 1, 40); this.lv.root.setPosition(-64, 0, 0);
    this.fragBar = new Bar(strip, 110, 22, '#36C8F0', '#000000', 0.8); this.fragBar.root.setPosition(22, 0, 0);
    this.fragL = label(strip, '0/5', { size: 20, bold: true, outline: '#000000', outlineWidth: 2 }); this.fragL.node.setPosition(22, 0, 0);
    this.alert = label(this.root, '!!', { size: 44, bold: true, color: '#FF3B3B', outline: '#FFFFFF', outlineWidth: 4 });
    this.alert.node.setPosition(0, h / 2 + 6, 0); // "!!" sits on the card's top edge
  }
  set(c: HeroCardV & { isNew?: boolean; dupFrags?: number; highlight?: boolean }, fragOverride?: number): void {
    setColor(this.frame, RARITY[c.rarity]);
    this.img.spriteFrame = Assets.art(c.art);
    setColor(this.img, c.tint ?? '#FFFFFF');
    this.attr.spriteFrame = Assets.u(ATTR_ICON[c.attr]);
    setColor(this.attr, ATTR[c.attr]);
    this.isNew.active = !c.owned;
    this.dup.node.parent!.active = c.owned;
    setText(this.dup, 'x' + (c.dupFrags ?? 5));
    this.alert.node.active = !!c.highlight;
    setText(this.lv.l, c.owned ? c.level : 0);
    const f = fragOverride ?? c.frag;
    if (c.fragNeed) { this.fragBar.set(f / c.fragNeed); setText(this.fragL, `${f}/${c.fragNeed}`); } else { this.fragBar.set(1); setText(this.fragL, '—'); }
  }
}

export class TavernPanel extends Panel {
  readonly id = 'tavern';
  private tab: 'recruit' | 'exchange' = 'recruit';
  private times = 1;
  private v!: TavernV;
  private timerL: Label | null = null;
  private acc = 0;
  constructor(private openHero: (id: string) => void, private openReveal: () => void, private openUpgrade: () => void) { super(); }

  protected build(): void {
    const v = (this.v = this.ctx.src.tavern());
    this.backButton();
    this.ribbon('Quán Mỏ Neo', 140, 'urban:0104');
    const b = this.body(228, { bottomGap: 140 });
    // Tabs.
    const tabs: ['recruit' | 'exchange', string][] = [['recruit', 'Tuyển'], ['exchange', 'Đổi Vé']];
    tabs.forEach(([k, t], i) => {
      const btn = new Button(this.top, { w: 200, h: 72, text: t, textSize: 28, color: this.tab === k ? C.blue : '#24477F', name: 'tab-' + k, sound: 'switch-a',
        onTap: () => { this.tab = k; this.refresh(); } });
      place(btn.root, 136 + i * 230, 240 - 6, 200, 88);
    });
    void b;
    if (this.tab === 'recruit') this.buildRecruit(v); else this.buildExchange(v);
    const up = new Button(this.bottom, { w: 240, h: 80, text: 'Nâng cấp', textSize: 24, color: C.blue, name: 'upgradeBuilding', onTap: () => this.openUpgrade() });
    up.root.setPosition(220, 64, 0);
  }

  private buildRecruit(v: TavernV): void {
    const T = this.top;
    const bn = node(T, 'bonus'); place(bn, 150, 340, 420, 36);
    label(bn, 'BONUS', { size: 24, bold: true, align: 'left' }).node.setPosition(-210, 34, 0);
    const bar = new Bar(bn, 420, 36, C.bonus, '#120A2A', 0.9, 3); bar.set(v.bonus / v.bonusMax);
    label(bn, `${v.bonus}/${v.bonusMax}`, { size: 22, bold: true, outline: '#000000', outlineWidth: 2 });
    const q = new Button(T, { w: 52, h: 52, text: '?', textSize: 28, color: C.bonus, name: 'bonusHelp',
      onTap: () => Services.toast('Mỗi lượt tuyển +1 BONUS. Đủ 10: bộ thẻ đổi ngay với tỉ lệ hạng cao.') });
    place(q.root, 590, 330, 88, 56);
    const cap = label(T, `Sau ${v.bonusMax - v.bonus} lượt nữa: tăng tỉ lệ hero hạng cao!`, { size: 20, color: '#E8DAFF' });
    cap.node.setPosition(0, -400, 0);
    v.cards.forEach((c, i) => {
      const tc = new TavernCard(T);
      tc.root.name = 'card' + i;
      place(tc.root, 42 + i * 220, 440, 196, 270);
      tc.set(c);
      onTap(tc.root, () => this.openHero(c.id));
    });
    const sw = node(T, 'switch'); place(sw, 300, 734, 400, 100);
    label(sw, 'Đổi hero sau', { size: 22, align: 'right' }).node.setPosition(90, 18, 0);
    this.timerL = label(sw, `${clock(v.refreshSec)}  (${v.refreshCost} vàng)`, { size: 22, bold: true, color: '#7CFC7C', align: 'right' });
    this.timerL.node.setPosition(90, -16, 0);
    const rf = new Button(sw, { w: 72, h: 72, frame: '', name: 'refresh', minHit: 88,
      onTap: () => Services.confirm({ title: 'Đổi bộ hero?', body: `Đổi bộ hero ngay với ${v.refreshCost} vàng?`, onOk: () => { if (this.ctx.send({ t: 'refreshCards' }).ok) this.refresh(); } }) });
    rf.setEnabled(!v.refreshBlocked, v.refreshBlocked ?? '');
    ui(rf.visual, 'proc/circle', { w: 72, h: 72, color: '#F2C230' });
    ui(rf.visual, 'icon/arrow_clockwise', { w: 48, h: 48, color: '#5A3A00' });
    rf.root.setPosition(150, 0, 0);
    this.ctext(T, 'Bạn sẽ nhận một trong các hero.', 0, 856, { size: 24, color: '#B9CBE8' });
    const cost = v.recruitCost[this.times - 1];
    const blocked = v.recruitBlocked[this.times - 1];
    const lack = !!blocked;
    const main = this.mainButton(T, '', 0, -950, () => this.recruit());
    main.root.name = 'recruit';
    const pr = node(main.visual, 'price'); pr.setPosition(0, 24, 0);
    resIcon(pr, 'gold', 36).node.setPosition(-50, 0, 0);
    label(pr, num(cost), { size: 30, bold: true, color: lack ? C.lack : '#FFFFFF', outline: '#20304A', align: 'left' }).node.setPosition(-26, 0, 0);
    label(main.visual, 'TUYỂN', { size: FS.big, bold: true, outline: C.greenDark }).node.setPosition(0, -22, 0);
    main.setEnabled(!lack, blocked ?? '');
    [1, 2, 3].forEach((k, i) => {
      const t = new Button(T, { w: 104, h: 80, text: `${k}x`, textSize: 30, color: this.times === k ? '#3DB4FF' : '#24477F', name: 'times' + k, minHit: 80, sound: 'switch-a',
        onTap: () => { this.times = k; this.refresh(); } });
      place(t.root, 204 + i * 104, 1030, 104, 80);
    });
  }

  private buildExchange(v: TavernV): void {
    const T = this.top;
    const top = node(T, 'tickets'); place(top, 48, 340, 300, 52);
    resIcon(top, 'tickets', 44).node.setPosition(-128, 0, 0);
    label(top, `Vé Quán: ${v.tickets}`, { size: FS.body, bold: true, align: 'left' }).node.setPosition(-96, 0, 0);
    const list = new ScrollList(T, 640, 640);
    place(list.root, 40, 410, 640, 640);
    v.exchange.forEach((e, i) => {
      const row = node(list.content, 'ex-' + e.id, 640, 120);
      row.setPosition(320, -60 - i * 128, 0);
      slice(row, 'proc/rrect', 640, 116, '#24477F');
      ui(row, e.id === 'frags' ? 'icon/cards_stack' : 'icon/pawns', { w: 64, h: 64, color: e.id === 'frags' ? '#B455F5' : RARITY[e.id] ?? '#FFFFFF' }).node.setPosition(-270, 0, 0);
      label(row, e.label, { size: 24, align: 'left', w: 300 }).node.setPosition(-226, 10, 0);
      const pr = node(row, 'p'); pr.setPosition(-226 + 20, -32, 0);
      resIcon(pr, 'tickets', 30).node.setPosition(0, 0, 0);
      label(pr, String(e.price), { size: 24, bold: true, color: v.tickets < e.price ? C.lack : '#FFFFFF', align: 'left' }).node.setPosition(22, 0, 0);
      const btn = new Button(row, { w: 160, h: 88, text: 'ĐỔI', textSize: 28, color: C.green, name: 'exchange-' + e.id,
        onTap: () => this.ctx.open(new HeroPickPanel(e.eligible, e.label, (heroId, name) => Services.confirm({ title: 'Đổi Vé?', body: `${e.label}: ${name}, giá ${e.price} vé?`,
          onOk: () => { if (this.ctx.send({ t: 'exchange', id: e.id, heroId }).ok) { Services.sfx('confirm-01'); this.ctx.close(this.ctx.top()!); this.afterExchange(); } } }))) });
      btn.root.setPosition(220, 0, 0);
      btn.setEnabled(e.enabled, e.reason);
    });
    list.setExtent(v.exchange.length * 128);
  }

  /** Hook: open the reveal screen after an exchange that gave a hero (set by Screens). */
  afterExchange: () => void = () => {};

  private recruit(): void {
    if (this.ctx.send({ t: 'recruit', count: this.times }).ok) { Services.sfx('menu-confirm'); this.openReveal(); }
  }

  tick(dt: number): void {
    this.acc += dt;
    if (this.acc < 1 || !this.timerL) return;
    this.acc = 0;
    const v = this.ctx.src.tavern();
    if (v.cards.map((c) => c.id).join() !== this.v.cards.map((c) => c.id).join()) { this.refresh(); return; }
    setText(this.timerL, `${clock(v.refreshSec)}  (${v.refreshCost} vàng)`);
  }
}

/** Grid of the heroes a ticket exchange can give (03-ux-spec.md 7.2: "lưới chọn hero, chỉ hiện hero hợp lệ"). */
export class HeroPickPanel extends Panel {
  readonly id = 'heroPick';
  constructor(private ids: string[], private title: string, private onPick: (id: string, name: string) => void) { super(); }
  protected build(): void {
    this.backButton();
    this.ribbon('Chọn hero', 140, undefined, 'icon/pawns');
    const b = this.body(228, { bottomGap: 140 });
    this.ctext(b, this.title, 336, 30, { size: 24, w: 600 });
    const all = this.ctx.src.heroes().filter((h) => this.ids.indexOf(h.id) >= 0);
    all.forEach((c, i) => {
      const hc = new HeroCard(b); hc.root.name = 'pick-' + c.id; hc.set({ ...c, owned: true, inSquad: false, canLevel: false });
      hc.root.setPosition(16 + 74 + (i % 4) * 164, -(80 + 92 + Math.floor(i / 4) * 200), 0);
      onTap(hc.root, () => this.onPick(c.id, c.name));
    });
    if (!all.length) this.ctext(b, 'Không có hero phù hợp', 336, 200, { size: 26 });
  }
}
