// Squad setup (9), Training yard (10) and Dungeon gate entry (11) of 03-ux-spec.md.
import { Node, UITransform, tween, Vec3 } from 'cc';
import { node, ui, px, label, rect, slice, place, num } from '../kit/Ui';
import { Layout } from '../kit/Layout';
import { C, FS } from '../kit/Theme';
import { Panel } from '../kit/Panel';
import { Button, onTap } from '../kit/Button';
import { HeroCard, levelBadge, resIcon } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { ScrollList } from '../kit/ScrollList';
import { HeroCardV, SquadV, TrainingV } from '../model/ViewModel';
import { cpIcon } from '../hud/FieldHud';

// ------------------------------------------------------------------------------------------------
export class SquadPanel extends Panel {
  readonly id = 'squad';
  protected keepTop = 0;
  protected shadeAlpha = 0.9;
  private held: string | null = null;
  private ringPick: number | null = null;
  private lastCp = -1;
  private cpBand: Node | null = null;
  private cpT = 0;

  protected build(): void {
    const s = this.ctx.src.squad();
    if (this.lastCp < 0) this.lastCp = s.cp;
    this.backButton();
    const T = this.top;
    this.ctext(T, 'Chọn hero.', 0, 150, { size: FS.body, bold: true });
    rect(T, 480, 3, '#FFFFFF', 0.6).node.setPosition(0, -180, 0);
    this.ctext(T, `${s.members.length}/${s.slots}`, 0, 210, { size: FS.big, bold: true, outline: '#000000' });
    // Campfire ring: fire at (360, 440), heroes on a circle r 170 (squashed 0.55 for the iso look).
    const ring = node(T, 'ring'); ring.setPosition(0, -440, 0);
    ui(ring, 'proc/circle', { w: 520, h: 330, color: '#2E7D3A', alpha: 0.7 });
    ui(ring, 'icon/campfire', { w: 96, h: 96, color: '#FF9A3C' });
    s.members.forEach((id, i) => {
      const c = s.cards.find((q) => q.id === id)!;
      const a = Math.PI / 2 + (i / Math.max(1, s.members.length)) * Math.PI * 2;
      const h = node(ring, 'slot' + i, 96, 96); h.setPosition(Math.cos(a) * 170, Math.sin(a) * 110, 0);
      if (this.ringPick === i) ui(h, 'proc/ring', { w: 100, h: 60, color: C.gold }).node.setPosition(0, -40, 0);
      px(h, c.art.replace(':', '/'), { w: 88, h: 88, color: c.tint ?? '#FFFFFF' });
      if (i === 0) {
        const bub = node(h, 'crown', 52, 52); bub.setPosition(36, 48, 0);
        ui(bub, 'proc/circle', { w: 52, h: 52, color: '#FFFFFF' });
        ui(bub, 'icon/crown_a', { w: 38, h: 38, color: '#FFD34D' });
      }
      onTap(h, () => this.tapRing(i, s));
    });
    // Lower card: TỰ XẾP + grid.
    const top = 640;
    const b = this.body(top, { bottomGap: 150 });
    const bh = b.parent!.getComponent(UITransform)!.height;
    const auto = new Button(b, { w: 220, h: 88, text: 'TỰ XẾP', textSize: 30, color: C.blue, name: 'autoAssign',
      onTap: () => { if (this.ctx.send({ t: 'autoAssign' }).ok) { Services.sfx('confirm-01'); this.held = null; this.refresh(); } } });
    auto.root.setPosition(456 - 24 + 110, -10 - 44, 0);
    const listH = bh - 120;
    const sl = new ScrollList(b, 672, listH); sl.root.setPosition(336, -110 - listH / 2, 0);
    const owned = s.cards.filter((c) => c.owned);
    const inSq = s.members.map((id) => owned.find((c) => c.id === id)!).filter(Boolean);
    const rest = owned.filter((c) => s.members.indexOf(c.id) < 0).sort((a, c) => c.cp - a.cp);
    [...inSq, ...rest].forEach((c, i) => {
      const hc = new HeroCard(sl.content); hc.root.name = 'hero-' + c.id; hc.set(c);
      hc.root.setPosition(16 + 74 + (i % 4) * 164, -(92 + Math.floor(i / 4) * 200), 0);
      if (this.held === c.id) hc.lift(true);
      onTap(hc.root, () => this.tapCard(c, s));
    });
    sl.setExtent(Math.ceil((inSq.length + rest.length) / 4) * 200 + 10);
    // "CP old ▶ new" band, 2 s after a change.
    if (s.cp !== this.lastCp) {
      const up = s.cp > this.lastCp;
      const band = node(T, 'cpBand', 480, 64); place(band, 120, top - 80, 480, 64);
      slice(band, 'proc/rrect', 480, 64, '#000000', 0.7);
      cpIcon(band, 40).setPosition(-190, 0, 0);
      label(band, `CP  ${num(this.lastCp)}  ▶  ${num(s.cp)}`, { size: 30, bold: true, color: up ? '#5BE36B' : '#FF5A5A' });
      this.cpBand = band; this.cpT = 2;
      this.lastCp = s.cp;
    }
  }

  private tapCard(c: HeroCardV, s: SquadV): void {
    Services.sfx('select-01');
    if (c.inSquad) {
      if (s.members.length <= 1) { Services.sfx('error-01'); Services.toast('Đội cần ít nhất 1 hero', true); return; }
      if (this.ctx.send({ t: 'squadRemove', id: c.id }).ok) this.refresh();
      return;
    }
    if (s.members.length < s.slots) { if (this.ctx.send({ t: 'squadAdd', id: c.id }).ok) this.refresh(); return; }
    this.held = this.held === c.id ? null : c.id;
    this.refresh();
  }
  private tapRing(i: number, _s: SquadV): void {
    Services.sfx('select-01');
    if (this.held) {
      const id = this.held; this.held = null;
      if (this.ctx.send({ t: 'squadReplace', slot: i, id }).ok) this.refresh();
      return;
    }
    if (this.ringPick === null) { this.ringPick = i; this.refresh(); return; }
    const a = this.ringPick; this.ringPick = null;
    if (a !== i) this.ctx.send({ t: 'squadSwap', a, b: i });
    this.refresh();
  }
  tick(dt: number): void {
    if (this.cpT > 0) { this.cpT -= dt; if (this.cpT <= 0 && this.cpBand?.isValid) this.cpBand.active = false; }
  }
}

// ------------------------------------------------------------------------------------------------
export class TrainingPanel extends Panel {
  readonly id = 'training';
  private tip: Node | null = null;
  private scrollY: number | null = null;
  private list: ScrollList | null = null;
  constructor(private openUpgrade: () => void) { super(); }

  protected build(): void {
    const v = this.ctx.src.training();
    this.backButton();
    const T = this.top;
    const cnt = (x: number, res: 'ore' | 'coral', n: number) => {
      const c = node(T, 'count-' + res); place(c, x, 140, 200, 52);
      slice(c, 'proc/rrect', 200, 52, '#0E2347', 0.9);
      resIcon(c, res, 44).node.setPosition(-74, 0, 0);
      label(c, num(n), { size: 28, bold: true, align: 'right' }).node.setPosition(86, 0, 0);
    };
    cnt(296, 'ore', v.ore); cnt(508, 'coral', v.coral);
    this.ribbon('Sân Tập', 200, 'urban:0131');
    const b = this.body(288, { bottomGap: 150 });
    const bh = b.parent!.getComponent(UITransform)!.height;
    const sl = new ScrollList(b, 660, bh - 110); sl.root.setPosition(336, -6 - (bh - 110) / 2, 0);
    this.list = sl;
    // Tree from the bottom up: node k at y = base - k * 90 (content coordinates grow downward).
    const n = v.nodes.length;
    const total = n * 90 + 200;
    const yOf = (k: number) => total - 100 - k * 90;
    const C0 = sl.content;
    // Reached-level area (light) vs not (dark): the boundary is the level divider of the player's level.
    const reachTop = yOf(v.playerLevel * 3) + 45;
    const dark = rect(C0, 660, reachTop, '#0F1E3A'); dark.node.getComponent(UITransform)!.setAnchorPoint(0.5, 1); dark.node.setPosition(330, 0, 0);
    const light = rect(C0, 660, total - reachTop, '#2C8FC9', 0.55); light.node.getComponent(UITransform)!.setAnchorPoint(0.5, 1); light.node.setPosition(330, -reachTop, 0);
    rect(C0, 8, total, '#36C8F0', 0.5).node.setPosition(145, -total / 2, 0);
    rect(C0, 8, total, '#4CD137').node.setPosition(525, -total / 2, 0);
    for (let k = 0; k < n; k++) {
      const nd = v.nodes[k];
      const y = yOf(k);
      if (k % 3 === 0) {
        const lvl = Math.floor(k / 3) + 1;
        rect(C0, 600, 3, '#36C8F0', 0.8).node.setPosition(330, -(y + 45), 0);
        levelBadge(C0, lvl, 64).root.setPosition(330, -(y + 45), 0);
      } else ui(C0, 'proc/circle', { w: 12, h: 12, color: '#FFFFFF', alpha: 0.6 }).node.setPosition(330, -y, 0);
      const cell = node(C0, 'node' + k, 120, 80); cell.setPosition(145, -y, 0);
      const col = nd.state === 'done' ? '#3D8BFF' : nd.state === 'open' ? '#FFD34D' : '#5A6070';
      slice(cell, 'proc/rrect', 112, 76, col);
      slice(cell, 'proc/rrect', 100, 64, nd.state === 'locked' ? '#3A3F4A' : '#24477F');
      ui(cell, nd.stat === 'HP' ? 'icon/suit_hearts' : 'icon/sword', { w: 36, h: 36, color: nd.state === 'locked' ? '#202020' : nd.stat === 'HP' ? '#FF5A5A' : '#C9CED6' }).node.setPosition(-22, 4, 0);
      label(cell, `+${nd.amount}`, { size: 24, bold: true, align: 'left' }).node.setPosition(2, 2, 0);
      if (nd.state === 'open') tween(cell).repeatForever(tween<Node>().to(0.4, { scale: new Vec3(1.06, 1.06, 1) }).to(0.4, { scale: new Vec3(1, 1, 1) })).start();
      onTap(cell, () => this.nodeTip(nd, cell));
    }
    // Squad slot buttons on the right, level rows 2..6.
    v.slots.forEach((s, i) => {
      const y = yOf((i + 2) * 3) + 45;
      const cell = node(C0, 'slot' + s.slot, 120, 120); cell.setPosition(525, -y, 0);
      slice(cell, 'ui/panel', 120, 120, s.state === 'done' ? '#3D8BFF' : s.state === 'open' ? '#FFD34D' : '#9AA0A6');
      ui(cell, 'icon/pawns', { w: 64, h: 64, color: '#FFFFFF' }).node.setPosition(0, 8, 0);
      label(cell, `Ô ${s.slot}`, { size: 22, bold: true, outline: '#000000' }).node.setPosition(0, -40, 0);
      onTap(cell, () => this.slotTip(s, cell));
    });
    sl.setExtent(total);
    const next = v.nodes.findIndex((q) => q.state !== 'done');
    sl.scrollTo(this.scrollY ?? (yOf(Math.max(0, next)) - (bh - 110) / 2));
    const up = new Button(b, { w: 240, h: 80, text: 'Nâng cấp công trình', textSize: 22, color: C.blue, name: 'upgradeBuilding', onTap: () => this.openUpgrade() });
    up.root.setPosition(672 - 140, -(bh - 52), 0);
  }

  private tooltip(at: Node, title: string, body: string, price: { res: 'ore' | 'coral'; n: number; lack: boolean } | null, enabled: boolean, reason: string, onOk: () => void, left: boolean): void {
    this.tip?.destroy();
    const t = node(this.top, 'tooltip', 380, 340);
    const p = at.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3());
    const lp = this.top.getComponent(UITransform)!.convertToNodeSpaceAR(p);
    t.setPosition(left ? lp.x + 260 : lp.x - 260, Math.min(-300, Math.max(lp.y, -Layout.H + 400)), 0);
    slice(t, 'ui/panel', 380, 340, '#FFFFFF');
    const hd = rect(t, 372, 90, C.blue); hd.node.setPosition(0, 120, 0);
    label(t, title, { size: 40, bold: true, outline: '#000000' }).node.setPosition(0, 120, 0);
    label(t, body, { size: 26, bold: true, color: C.darkText, w: 340 }).node.setPosition(0, 20, 0);
    const btn = new Button(t, { w: 330, h: 110, text: '', color: C.green, name: 'unlock', onTap: () => { onOk(); } });
    btn.root.setPosition(0, -100, 0);
    if (price) {
      resIcon(btn.visual, price.res, 40).node.setPosition(-50, 22, 0);
      label(btn.visual, String(price.n), { size: 30, bold: true, color: price.lack ? C.lack : '#FFFFFF', align: 'left', outline: '#20304A' }).node.setPosition(-24, 22, 0);
    }
    label(btn.visual, enabled ? 'MỞ' : reason, { size: enabled ? 32 : 22, bold: true, outline: C.greenDark, w: 300 }).node.setPosition(0, -22, 0);
    btn.setEnabled(enabled, reason);
    onTap(t, () => {});
    this.tip = t;
  }
  private nodeTip(nd: TrainingV['nodes'][number], at: Node): void {
    Services.sfx('select-01');
    const v = this.ctx.src.training();
    const lack = v.ore < nd.cost;
    const enabled = nd.state === 'open' && !lack;
    const reason = nd.state === 'done' ? 'Đã mở' : nd.state === 'locked' ? `Cần cấp người chơi ${nd.reqPlayerLevel}` : 'Thiếu quặng';
    this.tooltip(at, nd.stat, `Mọi hero ${nd.stat} +${nd.amount}`, nd.state === 'done' ? null : { res: 'ore', n: nd.cost, lack }, enabled, reason,
      () => { if (this.ctx.send({ t: 'trainingUnlock', index: nd.index }).ok) { Services.sfx('confirm-01'); this.keepScroll(); } }, true);
  }
  private slotTip(s: TrainingV['slots'][number], at: Node): void {
    Services.sfx('select-01');
    const v = this.ctx.src.training();
    const lack = v.coral < s.cost;
    const enabled = s.state === 'open' && !lack;
    const reason = s.state === 'done' ? 'Đã mở' : s.state === 'locked' ? s.lockText : 'Thiếu San Hô Đỏ';
    this.tooltip(at, 'Số ô đội', 'Ô đội tối đa +1', s.state === 'done' ? null : { res: 'coral', n: s.cost, lack }, enabled, reason,
      () => { if (this.ctx.send({ t: 'slotUnlock', slot: s.slot }).ok) { Services.sfx('confirm-01'); this.keepScroll(); } }, false);
  }
  private keepScroll(): void { this.scrollY = this.list?.scroll ?? null; this.tip = null; this.refresh(); }
}

// ------------------------------------------------------------------------------------------------
export class GatePanel extends Panel {
  readonly id = 'gate';
  private stage: number | null = null;
  constructor(private openUpgrade: () => void) { super(); }

  protected build(): void {
    const g = this.ctx.src.gate(this.stage);
    this.stage = g.stage;
    this.backButton();
    this.ribbon('Cổng Xoáy', 200, 'urban:0185').getChildByName('lb')!.setPosition(170, 4, 0); // title right of the CP bubble
    const b = this.body(288, { bottomGap: 150 });
    const bh = b.parent!.getComponent(UITransform)!.height;
    const T = this.top;
    // Recommended vs team CP bubble, overlapping the ribbon (like the reference).
    const bub = node(T, 'cpBubble', 320, 110); place(bub, 80, 196, 320, 110);
    slice(bub, 'ui/panel', 320, 110, '#FFFFFF');
    const row = (y: number, t: string, v: number, col: string) => {
      label(bub, t, { size: 22, bold: true, color: C.darkText, align: 'right' }).node.setPosition(-30, y, 0);
      cpIcon(bub, 30).setPosition(-6, y, 0);
      label(bub, num(v), { size: 28, bold: true, color: col, align: 'left' }).node.setPosition(16, y, 0);
    };
    row(22, 'Đề nghị', g.recommendedCp, C.darkText);
    row(-22, 'Đội bạn', g.teamCp, g.teamCp < g.recommendedCp ? '#8A3FD1' : '#2E8B3A');
    this.ctext(b, g.difficulty.label, 336, 32 + 20, { size: 28, bold: true, color: g.difficulty.color, outline: '#000000' });
    this.ctext(b, `Chặng ${g.stage}: ${g.stageName}`, 336, 82, { size: 30, bold: true, color: C.gold });
    this.ctext(b, g.floors, 336, 118, { size: 22, color: '#B9CBE8' });
    const arrow = (dir: -1 | 1, en: boolean) => {
      const a = new Button(b, { w: 88, h: 88, frame: '', name: dir < 0 ? 'prev' : 'next', sound: 'switch-a',
        onTap: () => { this.stage = (this.stage ?? 1) + dir; this.refresh(); } });
      ui(a.visual, dir < 0 ? 'ui/arrow_w' : 'ui/arrow_e', { w: 56, h: 56 });
      a.root.setPosition(dir < 0 ? 70 : 602, -100, 0);
      a.root.active = en;
    };
    arrow(-1, g.canPrev); arrow(1, g.canNext);
    // Round preview (dark room + boss).
    const pv = node(b, 'preview', 300, 300); pv.setPosition(336, -300, 0);
    ui(pv, 'proc/circle', { w: 300, h: 300, color: '#FFFFFF' });
    ui(pv, 'proc/circle', { w: 284, h: 284, color: '#34374F' });
    for (let i = -2; i <= 2; i++) px(pv, 'proc/diamond', { w: 120, h: 60, color: i % 2 ? '#3B3F5C' : '#2A2D44' }).node.setPosition(i * 60, -60 + Math.abs(i) * 10, 0);
    px(pv, g.bossArt.replace(':', '/'), { w: 160, h: 160, color: g.bossTint ?? '#FFFFFF' }).node.setPosition(0, 10, 0);
    if (g.locked) {
      ui(pv, 'proc/circle', { w: 284, h: 284, color: '#000000', alpha: 0.6 });
      ui(pv, 'icon/lock_closed', { w: 96, h: 96, color: '#E8EAEE' });
    }
    this.ctext(b, 'Phần thưởng có thể nhận', 336, 475, { size: 24, bold: true });
    const icons: ('gold' | 'coral' | 'tickets')[] = ['gold', 'coral', 'tickets'];
    icons.forEach((r, i) => {
      const c = node(b, 'rw' + r, 96, 96); c.setPosition(336 + (i - 1) * 112, -550, 0);
      slice(c, 'proc/rrect', 96, 96, '#E8A33A');
      resIcon(c, r, 60);
    });
    const first = g.rewardsFirst.map((r) => `${r.amount} ${r.res === 'gold' ? 'vàng' : r.res === 'coral' ? 'San Hô' : 'vé'}`).join(', ');
    this.ctext(b, g.cleared ? 'Đã vượt ✓  Lặp lại: ' + g.rewardsRepeat.map((r) => `${r.amount} ${r.res === 'gold' ? 'vàng' : 'vé'}`).join(', ') : `Lần đầu: ${first}`, 336, 625, { size: 22, color: '#CFE7FF' });
    rect(b, 600, 2, '#FFFFFF', 0.3).node.setPosition(336, -650, 0);
    this.ctext(b, g.locked ?? 'Vào hang để nhận thưởng!', 336, 676, { size: 24, color: g.locked ? C.lack : '#B9CBE8' });
    const enter = this.mainButton(b, 'VÀO', 336, -Math.max(770, bh - 75), () => this.enter(g.difficulty.label === 'Khó'));
    enter.root.name = 'enter';
    enter.setEnabled(!g.locked, g.locked ?? '');
    const up = new Button(this.bottom, { w: 240, h: 80, text: 'Nâng cấp', textSize: 24, color: C.blue, name: 'upgradeBuilding', onTap: () => this.openUpgrade() });
    up.root.setPosition(220, 64, 0);
  }

  private enter(hard: boolean): void {
    const go = () => { this.ctx.send({ t: 'enterDungeon', stage: this.stage ?? 1 }); };
    if (hard) Services.confirm({ title: 'Đội còn yếu', body: 'Đội của bạn yếu hơn đề nghị. Vẫn vào?', onOk: go });
    else go();
  }
}

