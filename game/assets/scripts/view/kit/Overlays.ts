// Toasts (info/error, big), the pickup banner and the confirm dialog of 03-ux-spec.md sections 3 and 14.
import { Node, Label, tween, Vec3 } from 'cc';
import { node, rect, slice, label, setBand, setText, useCharCache, groupAtlases } from './Ui';
import { Layout, W } from './Layout';
import { BAND, C } from './Theme';
import { Button, onTap } from './Button';
import { resIcon, RES_NAME } from './Widgets';
import { Res } from '../model/ViewModel';

interface ToastItem { n: Node; t: number; }

export class Toasts {
  readonly root: Node;
  private items: ToastItem[] = [];
  private bigNode: Node | null = null;
  private bigT = 0;
  private pickups: { n: Node; res: Res; amount: number; t: number; l: Label }[] = [];

  constructor(parent: Node) {
    this.root = node(parent, 'toasts');
    useCharCache(this.root);
    groupAtlases(this.root);
    setBand(this.root, BAND.toast);
  }

  /** Info/error toast: x 60..660, y 300 from the top, 72 high; 2 s; max 2, the new one pushes the old up. */
  toast(text: string, error = false): void {
    const n = node(this.root, 'toast', 600, 72);
    slice(n, 'proc/rrect', 600, 72, '#000000', 0.75);
    if (error) { const e = rect(n, 600, 4, C.red); e.node.setPosition(0, -34, 0); const e2 = rect(n, 600, 4, C.red); e2.node.setPosition(0, 34, 0); }
    label(n, text, { size: 24, w: 570 });
    this.items.push({ n, t: 0 });
    while (this.items.length > 2) this.items.shift()!.n.destroy();
    this.layoutToasts();
  }
  private layoutToasts(): void {
    const baseY = Layout.top - 300 - 36;
    for (let i = 0; i < this.items.length; i++) this.items[this.items.length - 1 - i].n.setPosition(0, baseY + i * 84, 0);
  }

  /** Big centre text ("Lên cấp!", "Xây xong"): yellow Bold 44, 1.3 -> 1 scale, 1.5 s, at y 0.4 H. */
  big(text: string): void {
    this.bigNode?.destroy();
    const n = node(this.root, 'big');
    label(n, text, { size: 44, bold: true, color: C.gold, outline: '#000000', outlineWidth: 4 });
    n.setPosition(0, Layout.H / 2 - 0.4 * Layout.H, 0);
    n.setScale(1.3, 1.3, 1);
    tween(n).to(0.2, { scale: new Vec3(1, 1, 1) }).start();
    this.bigNode = n;
    this.bigT = 0;
  }

  /** Pickup banner: x 110..610 at y 0.62 H, 60 high, black 60%; same kind merges within 1 s; max 2 lines; 1.2 s. */
  pickup(res: Res, amount: number): void {
    const same = this.pickups.find((p) => p.res === res && p.t < 1.0);
    if (same) { same.amount += amount; same.t = 0; setText(same.l, '+' + same.amount); return; }
    const n = node(this.root, 'pick', 500, 60);
    rect(n, 500, 60, '#000000', 0.6);
    const ic = resIcon(n, res, 44); ic.node.setPosition(-200, 0, 0);
    const nm = label(n, RES_NAME[res] ?? res, { size: 26, bold: true, align: 'left' }); nm.node.setPosition(-165, 0, 0);
    const l = label(n, '+' + amount, { size: 28, bold: true, color: '#5BE36B', align: 'left' }); l.node.setPosition(60, 0, 0);
    this.pickups.push({ n, res, amount, t: 0, l });
    while (this.pickups.length > 2) this.pickups.shift()!.n.destroy();
    this.layoutPickups();
  }
  private layoutPickups(): void {
    const y = Layout.H / 2 - 0.62 * Layout.H;
    for (let i = 0; i < this.pickups.length; i++) this.pickups[this.pickups.length - 1 - i].n.setPosition(0, y + i * 66, 0);
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t > 2) { it.n.destroy(); this.items.splice(i, 1); this.layoutToasts(); }
    }
    if (this.bigNode) {
      this.bigT += dt;
      if (this.bigT > 1.5) { this.bigNode.destroy(); this.bigNode = null; }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.t += dt;
      if (p.t > 1.2) { p.n.destroy(); this.pickups.splice(i, 1); this.layoutPickups(); }
    }
  }

  /** Removes every toast and pickup line (full-screen results start clean). */
  clear(): void {
    for (const i of this.items) i.n.destroy();
    for (const p of this.pickups) p.n.destroy();
    this.items = []; this.pickups = [];
    this.bigNode?.destroy(); this.bigNode = null;
  }

  get state(): { toasts: string[]; big: boolean; pickups: number } {
    return { toasts: this.items.map((i) => i.n.getComponentInChildren(Label)?.string ?? ''), big: !!this.bigNode, pickups: this.pickups.length };
  }
}

/** Confirm dialog: shade 55%, box 560 x 360, title Bold 32, body 24, Hủy (blue) / Đồng ý (green or red). */
export class Dialogs {
  readonly root: Node;
  private open: Node | null = null;
  constructor(parent: Node) {
    this.root = node(parent, 'dialogs');
    setBand(this.root, BAND.dialog);
  }
  get isOpen(): boolean { return !!this.open; }
  get title(): string { return this.open ? this.open.getChildByName('box')!.getComponentInChildren(Label)!.string : ''; }

  confirm(o: { title: string; body: string; ok?: string; danger?: boolean; onOk: () => void; onCancel?: () => void }): void {
    this.close();
    const root = node(this.root, 'dialog', W, Layout.H);
    const shade = rect(root, W, Layout.H, '#000000', 0.55);
    const cancel = () => { this.close(); o.onCancel?.(); };
    onTap(shade.node, cancel);
    const box = node(root, 'box', 560, 360);
    slice(box, 'ui/panel', 560, 360, C.panel);
    onTap(box, () => {});
    const t = label(box, o.title, { size: 32, bold: true, outline: '#000000' });
    t.node.setPosition(0, 130, 0);
    const b = label(box, o.body, { size: 24, w: 500 });
    b.node.setPosition(0, 30, 0);
    const no = new Button(box, { w: 220, h: 96, text: 'Hủy', color: C.blue, name: 'cancel', onTap: cancel });
    no.root.setPosition(-125, -110, 0);
    const yes = new Button(box, { w: 220, h: 96, text: o.ok ?? 'Đồng ý', color: o.danger ? C.red : C.green, name: 'ok', sound: 'confirm-01',
      onTap: () => { this.close(); o.onOk(); } });
    yes.root.setPosition(125, -110, 0);
    this.open = root;
  }
  close(): void { this.open?.destroy(); this.open = null; }
}

