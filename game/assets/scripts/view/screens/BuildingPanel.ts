// Building upgrade panel (03-ux-spec.md section 6, reference building-upgrade-mining-camp-01.jpg).
import { Node } from 'cc';
import { node, ui, px, label, rect, slice, setText, num, clock } from '../kit/Ui';
import { C, FS } from '../kit/Theme';
import { Panel } from '../kit/Panel';
import { Button } from '../kit/Button';
import { Bar, priceRow } from '../kit/Widgets';
import { Services } from '../kit/Services';
import { BuildingPanelV } from '../model/ViewModel';
import { buildingArt } from '../world/WorldRenderer';
import { Label } from 'cc';

export class BuildingPanel extends Panel {
  readonly id = 'building';
  private v: BuildingPanelV | null = null;
  private timer: Label | null = null;
  private bar: Bar | null = null;
  private acc = 0;
  constructor(private uid: number) { super(); }

  protected build(): void {
    const v = (this.v = this.ctx.src.building(this.uid));
    this.backButton();
    if (!v) return;
    this.ribbon(v.name, 200, v.npc);
    const b = this.body(288, { bottomGap: 150 });
    // Picture with a soft round glow behind it.
    ui(b, 'proc/circle', { w: 300, h: 300, color: '#2B5296' }).node.setPosition(336, -160, 0);
    px(b, buildingArt(v.type).replace('tb/', 'tb/'), { w: 224, h: 224 }).node.setPosition(336, -160, 0);
    let y = 330;
    if (v.job) {
      const jb = node(b, 'job'); jb.setPosition(336, -y + 10, 0);
      this.bar = new Bar(jb, 400, 20, C.green);
      this.bar.set(v.job.pct);
      this.timer = label(jb, clock(v.job.remainSec), { size: 24, bold: true }); this.timer.node.setPosition(0, -26, 0);
      y += 50;
    }
    rect(b, 672, 64, '#163463').node.setPosition(336, -y - 32, 0);
    const maxed = v.level >= v.maxLevel;
    this.ctext(b, maxed ? `Cấp ${v.level} (tối đa)` : `Cấp ${v.level} ▶ ${v.level + 1}`, 336, y + 32, { size: FS.big, bold: true });
    y += 84;
    for (const r of v.rows) {
      const row = node(b, 'row', 600, 64); row.setPosition(336, -y - 32, 0);
      slice(row, 'proc/rrect', 600, 60, '#24477F');
      ui(row, r.icon, { w: 36, h: 36, color: '#CFE7FF' }).node.setPosition(-270, 0, 0);
      label(row, r.label, { size: FS.body, align: 'left' }).node.setPosition(-240, 0, 0);
      if (r.action) {
        label(row, r.value, { size: FS.body, bold: true, align: 'right' }).node.setPosition(130, 0, 0);
        const btn = new Button(row, { w: 120, h: 64, text: r.action.label, textSize: 26, color: C.green, name: 'collect', minHit: 72,
          onTap: () => { const res = this.ctx.send({ t: 'collect', uid: this.uid }); if (res.ok) { Services.sfx('confirm-01'); this.refresh(); } } });
        btn.root.setPosition(220, 0, 0);
        btn.setEnabled(r.action.enabled, 'Chưa có gì để thu');
      } else {
        const val = label(row, r.value, { size: FS.body, bold: true, align: 'right' });
        val.node.setPosition(r.delta ? 180 : 280, 0, 0);
        if (r.delta && !maxed) label(row, r.delta, { size: FS.body, bold: true, color: '#5BE36B', align: 'left' }).node.setPosition(192, 0, 0);
      }
      y += 70;
    }
    this.ctext(b, v.note, 336, y + 20, { size: FS.small, color: '#B9CBE8' });
    y += 50;
    if (!maxed) {
      const main = this.mainButton(b, '', 336, -y - 60, () => this.upgrade());
      main.root.name = 'upgrade';
      const pr = priceRow(main.visual, v.cost.map((c) => ({ res: c.res, amount: c.amount, lack: c.lack })), { size: 26, icon: 36 });
      pr.setPosition(0, 26, 0);
      label(main.visual, v.blocked ?? 'NÂNG CẤP', { size: v.blocked ? 24 : FS.big, bold: true, outline: '#1E6B12' }).node.setPosition(0, -20, 0);
      main.setEnabled(!v.blocked && !v.job, v.blocked ?? 'Đang nâng cấp');
      const t = node(b, 'time'); t.setPosition(336, -y - 140, 0);
      ui(t, 'icon/hourglass', { w: 26, h: 26 }).node.setPosition(-40, 0, 0);
      label(t, clock(v.buildSec), { size: FS.small, align: 'left' }).node.setPosition(-22, 0, 0);
      y += 160;
    }
    if (v.job) {
      const cancel = new Button(b, { w: 240, h: 80, text: 'Hủy xây', textSize: 28, color: C.red, name: 'cancelJob',
        onTap: () => Services.confirm({ title: 'Hủy nâng cấp?', body: 'Hoàn lại 100% tài nguyên.', danger: true,
          onOk: () => { if (this.ctx.send({ t: 'cancelJob', uid: this.uid }).ok) this.refresh(); } }) });
      cancel.root.setPosition(336, -y - 40, 0);
    }
  }

  private upgrade(): void {
    const v = this.v!;
    const r = this.ctx.send({ t: 'upgrade', uid: this.uid });
    if (r.ok) {
      Services.sfx('build-drop');
      Services.toast(`Bắt đầu nâng ${v.name} lên cấp ${v.level + 1}`);
      this.back();
    }
  }

  tick(dt: number): void {
    this.acc += dt;
    if (this.acc < 0.5) return;
    this.acc = 0;
    const v = this.ctx.src.building(this.uid);
    if (!v) return;
    if (!!v.job !== !!this.v?.job || v.level !== this.v?.level) { this.refresh(); return; }
    if (v.job && this.timer && this.bar) { setText(this.timer, clock(v.job.remainSec)); this.bar.set(v.job.pct); }
    void num; void Node;
  }
}
