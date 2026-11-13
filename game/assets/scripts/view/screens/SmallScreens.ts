// Title (15), result victory/defeat (12.3, 12.4), pause menu (12.2), settings (14.4), welcome back (14.3).
import { Node, Label, tween, Vec3 } from 'cc';
import { node, ui, px, label, rect, slice, place } from '../kit/Ui';
import { Layout, W } from '../kit/Layout';
import { C, FS } from '../kit/Theme';
import { Panel } from '../kit/Panel';
import { Button, onTap } from '../kit/Button';
import { resIcon } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { ResultV } from '../model/ViewModel';

/** Full-screen base: no top bar kept, opaque background, tap anywhere handled by subclasses. */
abstract class FullScreen extends Panel {
  protected keepTop = 0;
  protected closeOnShade = false;
  protected shadeAlpha = 0;
  protected bg(color: string, alpha = 1): Node {
    const n = node(this.top, 'bg', W, Layout.H + 400);
    n.setPosition(0, -Layout.H / 2 + Layout.safeTop, 0);
    rect(n, W, Layout.H + 400, color, alpha);
    return n;
  }
}

export class TitleScreen extends FullScreen {
  readonly id = 'title';
  private blink: Label | null = null;
  private t = 0;
  constructor(private onStart: () => void) { super(); }
  protected build(): void {
    const H = Layout.H;
    const sky = this.bg('#7EC8F2');
    const sea = rect(sky, W, H * 0.45 + 400, '#3C7DD9'); sea.node.setPosition(0, -(H + 400) / 2 + (H * 0.45 + 400) / 2, 0);
    const isl = node(this.top, 'island'); isl.setPosition(0, -H * 0.62 + Layout.safeTop, 0);
    ui(isl, 'proc/circle', { w: 620, h: 220, color: '#E8D29A' }).node.setPosition(0, -30, 0);
    ui(isl, 'proc/circle', { w: 540, h: 190, color: '#5DBB63' });
    ui(isl, 'proc/circle', { w: 220, h: 120, color: '#4BA351' }).node.setPosition(-150, 40, 0);
    ['td/0097', 'td/0088', 'td/0100', 'td/0084'].forEach((a, i) => px(isl, a, { w: 128, h: 128 }).node.setPosition(-210 + i * 140, 70, 0));
    const logo = label(this.top, 'HẢI ĐỘI ĐẢO SƯƠNG', { size: 64, bold: true, color: '#FFD34D', outline: '#6B3A10', outlineWidth: 6 });
    logo.node.setPosition(0, -300, 0);
    this.blink = label(this.bottom, 'Chạm để tiếp tục', { size: 32, bold: true, outline: '#0E2347' });
    this.blink.node.setPosition(0, 260, 0);
    onTap(sky, () => this.onStart());
  }
  tick(dt: number): void { this.t += dt; if (this.blink) this.blink.node.active = Math.floor(this.t / 0.6) % 2 === 0; }
}

export class ResultScreen extends FullScreen {
  readonly id = 'result';
  private rays: Node | null = null;
  private items: Node[] = [];
  private t = 0;
  constructor(private r: ResultV, private onContinue: () => void) { super(); }
  protected build(): void {
    const r = this.r;
    this.items = [];
    const bg = r.victory ? this.bg('#000000', 0.85) : this.bg('#14213D');
    onTap(bg, () => this.onContinue());
    if (r.victory) {
      this.rays = node(this.top, 'rays'); this.rays.setPosition(0, -390, 0);
      for (let i = 0; i < 12; i++) { const s = ui(this.rays, 'proc/pixel', { w: 8, h: 600, color: '#FFFFFF', alpha: 0.08 }); s.node.angle = i * 15; }
      const badge = node(this.top, 'badge', 280, 280); place(badge, 220, 220, 280, 280);
      for (const sgn of [-1, 1]) { const f = ui(badge, 'icon/flag_triangle', { w: 110, h: 110, color: '#E5484D' }); f.node.setPosition(sgn * 150, 60, 0); f.node.setScale(-sgn, 1, 1); }
      ui(badge, 'icon/hexagon', { w: 280, h: 280, color: '#FFC531' });
      ui(badge, 'icon/hexagon', { w: 220, h: 220, color: '#2A4F8A' });
      px(badge, r.leaderArt.replace(':', '/'), { w: 160, h: 160, color: r.leaderTint ?? '#FFFFFF' });
      const rib = node(this.top, 'ribbon'); place(rib, 150, 520, 420, 96);
      slice(rib, 'ui/btn_red', 420, 96);
      label(rib, 'CHIẾN THẮNG!', { size: 44, bold: true, outline: '#5A0A0A', outlineWidth: 4 }).node.setPosition(0, 4, 0);
      const box = node(this.top, 'rewards'); place(box, 60, 640, 600, 260);
      slice(box, 'ui/panel', 600, 260, C.panel);
      label(box, 'PHẦN THƯỞNG', { size: 30, bold: true, outline: '#000000' }).node.setPosition(0, 96, 0);
      this.rewardRow(box, -20);
      if (r.firstClearText) this.ctext(this.top, r.firstClearText, 0, 940, { size: 28, bold: true, color: C.gold });
    } else {
      for (let i = 0; i < 24; i++) ui(bg, 'icon/skull', { w: 90, h: 90, color: '#1E2C4D' }).node.setPosition(((i % 4) - 1.5) * 180 + (Math.floor(i / 4) % 2) * 90, (H2(i) - 2.5) * 220, 0);
      const cone = ui(this.top, 'proc/cone', { w: 360, h: 460, color: '#5AB4FF', alpha: 0.5 }); cone.node.setPosition(0, -330, 0);
      this.ctext(this.top, 'TOÀN ĐỘI GỤC NGÃ', 0, 140, { size: 56, bold: true, outline: '#000000', outlineWidth: 5 });
      const hero = px(this.top, r.leaderArt.replace(':', '/'), { w: 160, h: 160, color: '#808080' });
      hero.node.angle = 90; hero.node.setPosition(-20, -470, 0);
      ui(this.top, 'icon/flag_square', { w: 120, h: 120, color: '#FFFFFF' }).node.setPosition(70, -420, 0);
      ui(this.top, 'proc/circle', { w: 300, h: 60, color: '#5AB4FF', alpha: 0.5 }).node.setPosition(0, -540, 0);
      const box = node(this.top, 'tips'); place(box, 60, 620, 600, 380);
      rect(box, 600, 380, '#0B1428', 0.85);
      label(box, 'Làm đội mạnh hơn!', { size: 30, bold: true }).node.setPosition(0, 150, 0);
      rect(box, 520, 2, '#FFFFFF', 0.6).node.setPosition(0, 115, 0);
      const tips: [string, string][] = [['tb/0064', 'Tuyển hero ở Quán Mỏ Neo.'], ['tb/0067', 'Nâng cấp ở Sân Tập.'], ['td/0097', 'Nâng cấp hero bằng thịt.']];
      tips.forEach(([art, t], i) => {
        px(box, art, { w: 72, h: 72 }).node.setPosition(-230, 50 - i * 95, 0);
        label(box, t, { size: 26, align: 'left' }).node.setPosition(-170, 50 - i * 95, 0);
      });
      const loot = r.rewards.map((x) => `${x.amount} ${x.res === 'gold' ? 'vàng' : x.res === 'meat' ? 'thịt' : x.res}`).join('  ');
      this.ctext(this.top, `Đã nhặt: ${loot || 'không có'}`, 0, 1036, { size: 26, bold: true });
    }
    this.ctext(this.bottom, 'Chạm để về làng.', 0, -Math.min(220, Math.max(150, Layout.H - 1090)), { size: 26, color: '#C9D4E8' });
  }
  private rewardRow(box: Node, y: number): void {
    const n = this.r.rewards.length;
    this.r.rewards.forEach((rw, i) => {
      const c = node(box, 'rw' + i, 112, 112); c.setPosition((i - (n - 1) / 2) * 128, y, 0);
      slice(c, 'proc/rrect', 112, 112, '#E8A33A');
      resIcon(c, rw.res, 72).node.setPosition(0, 8, 0);
      label(c, String(rw.amount), { size: 26, bold: true, outline: '#000000', align: 'right' }).node.setPosition(50, -36, 0);
      c.setScale(0, 0, 1);
      this.items.push(c);
    });
  }
  tick(dt: number): void {
    this.t += dt;
    if (this.rays) this.rays.angle += 20 * dt;
    this.items.forEach((c, i) => { if (this.t > 0.2 + i * 0.15 && c.scale.x === 0) tween(c).to(0.15, { scale: new Vec3(1, 1, 1) }).start(); });
  }
}
function H2(i: number): number { return Math.floor(i / 4); }

export class PauseMenu extends Panel {
  readonly id = 'pause';
  protected keepTop = 0;
  protected closeOnShade = false;
  constructor(private onResume: () => void, private onLeave: () => void) { super(); }
  protected build(): void {
    const box = node(this.top, 'box', 520, 420);
    box.setPosition(0, -Layout.H / 2 + Layout.safeTop, 0);
    slice(box, 'ui/panel', 520, 420, C.panel);
    label(box, 'Tạm dừng', { size: FS.title, bold: true, outline: '#000000' }).node.setPosition(0, 140, 0);
    const go = new Button(box, { w: 400, h: 112, text: 'Tiếp tục', color: C.green, outline: C.greenDark, name: 'resume', onTap: () => this.onResume() });
    go.root.setPosition(0, 20, 0);
    const lv = new Button(box, { w: 400, h: 96, text: 'Rời hang', color: C.red, name: 'leave',
      onTap: () => Services.confirm({ title: 'Rời hang?', body: 'Bạn giữ vàng và thịt đã nhặt nhưng không nhận thưởng chặng.', danger: true, ok: 'Rời hang', onOk: () => this.onLeave() }) });
    lv.root.setPosition(0, -120, 0);
  }
  back(): void { this.onResume(); }
}

export class SettingsPanel extends Panel {
  readonly id = 'settings';
  protected build(): void {
    const s = this.ctx.src.settings();
    this.backButton();
    const box = node(this.top, 'box', 560, 520);
    box.setPosition(0, -Math.max(260 + 120, Layout.H / 2 - Layout.safeTop), 0);
    slice(box, 'ui/panel', 560, 520, C.panel);
    this.blocker(box);
    label(box, 'Cài đặt', { size: FS.title, bold: true, outline: '#000000' }).node.setPosition(0, 200, 0);
    const toggle = (y: number, text: string, key: 'music' | 'sfx', on: boolean) => {
      label(box, text, { size: FS.body, bold: true, align: 'left' }).node.setPosition(-220, y, 0);
      const t = new Button(box, { w: 88, h: 48, frame: '', name: 'toggle-' + key, sound: 'switch-a', onTap: () => { this.ctx.send({ t: 'setting', key, on: !on }); this.refresh(); this.afterToggle?.(); } });
      slice(t.visual, 'proc/rrect', 88, 48, on ? C.green : '#5A6070');
      ui(t.visual, 'proc/circle', { w: 40, h: 40, color: '#FFFFFF' }).node.setPosition(on ? 20 : -20, 0, 0);
      t.root.setPosition(190, y, 0);
    };
    toggle(100, 'Nhạc', 'music', s.music);
    toggle(10, 'Âm thanh', 'sfx', s.sfx);
    label(box, `Phiên bản: ${s.version}`, { size: FS.small, color: '#B9CBE8' }).node.setPosition(0, -80, 0);
    const del = new Button(box, { w: 300, h: 88, text: 'Xóa dữ liệu', textSize: 28, color: C.red, name: 'reset',
      onTap: () => Services.confirm({ title: 'Xóa dữ liệu?', body: 'Mọi tiến độ sẽ mất.', danger: true, ok: 'Xóa',
        onOk: () => Services.confirm({ title: 'Chắc chắn chưa?', body: 'Không thể hoàn tác.', danger: true, ok: 'Xóa hết', onOk: () => this.ctx.send({ t: 'resetSave' }) }) }) });
    del.root.setPosition(0, -180, 0);
  }
  afterToggle: (() => void) | null = null;
}

export class WelcomePanel extends Panel {
  readonly id = 'welcome';
  protected build(): void {
    const w = this.data;
    this.backButton();
    this.ribbon('Chào mừng trở lại!', 200);
    const b = this.body(288, { h: 560 });
    if (!w) return;
    const h = Math.floor(w.awaySec / 3600), m = Math.floor((w.awaySec % 3600) / 60);
    this.ctext(b, `Bạn đã đi ${h} giờ ${m} phút (tính tối đa ${w.capHours} giờ)`, 336, 50, { size: 24, w: 600 });
    w.lines.forEach((t, i) => {
      const r = node(b, 'line', 600, 64); r.setPosition(336, -130 - i * 72, 0);
      slice(r, 'proc/rrect', 600, 60, '#24477F');
      label(r, t, { size: FS.body, align: 'left' }).node.setPosition(-280, 0, 0);
    });
    const main = this.mainButton(b, 'THU HẾT', 336, -460, () => { this.ctx.send({ t: 'collectAll' }); Services.sfx('confirm-01'); this.back(); });
    main.root.name = 'collectAll';
  }
  constructor(private data: { awaySec: number; capHours: number; lines: string[] }) { super(); }
}

