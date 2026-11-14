// Dungeon combat HUD (03-ux-spec.md section 12.1). No village top bar. Kept small on purpose: it is on screen
// in the draw-call budget scene, so its sprites come from the UI atlas plus hero portraits from the world
// atlas (grouped in one strip), and all text is CHAR-cached.
import { Node, Label, Sprite, tween, Tween, Vec3 } from 'cc';
import { useCharCache, groupAtlases, node, ui, px, label, place, placeB, setBand, setText, setColor, num, rect } from '../kit/Ui';
import { Layout } from '../kit/Layout';
import { BAND, C } from '../kit/Theme';
import { Button } from '../kit/Button';
import { Bar, resIcon } from '../kit/Widgets';
import { DungeonHudV } from '../model/ViewModel';
import { Assets } from '../kit/Assets';

export class DungeonHud {
  readonly root: Node;
  private floor!: Label; private gold!: Label;
  private streakN!: Node; private streakRing!: Sprite; private streakArc!: Sprite[]; private kill!: Label;
  private bossN!: Node; private bossBar!: Bar; private bossName!: Label;
  private squadN!: Node; private slots: { n: Node; img: Sprite; bar: Bar; x: Sprite }[] = [];
  autoBtn!: Button; pauseBtn!: Button;
  private autoBg!: Sprite;
  private floorBanner!: Label; private bannerT = 0;

  constructor(parent: Node, private onPause: () => void, private onAuto: () => void) {
    this.root = node(parent, 'dungeon-hud');
    useCharCache(this.root);
    groupAtlases(this.root);
    setBand(this.root, BAND.hud);
    this.build();
  }

  build(): void {
    this.root.removeAllChildren();
    this.slots = [];
    const T = node(this.root, 'top'); T.setPosition(0, Layout.top, 0);
    const B = node(this.root, 'bottom'); B.setPosition(0, Layout.bottom, 0);
    const fl = node(T, 'floor'); place(fl, 24, 40, 200, 64);
    ui(fl, 'icon/flag_triangle', { w: 56, h: 56, color: '#7FE0FF' }).node.setPosition(-68, 0, 0);
    this.floor = label(fl, '1F', { size: 36, bold: true, align: 'left', outline: '#000000' }); this.floor.node.setPosition(-30, 2, 0);
    const g = node(T, 'gold'); place(g, 24, 116, 200, 56);
    resIcon(g, 'gold', 48).node.setPosition(-72, 0, 0);
    this.gold = label(g, '0', { size: 32, bold: true, align: 'left', outline: '#000000' }); this.gold.node.setPosition(-30, 2, 0);
    // Streak counter: skull in a red ring; the ring is the 3 s streak clock (12 segments that switch off).
    this.streakN = node(T, 'streak'); this.streakN.setPosition(0, -96, 0);
    ui(this.streakN, 'proc/circle', { w: 112, h: 112, color: '#1A1A22', alpha: 0.85 });
    this.streakArc = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = ui(this.streakN, 'proc/pixel', { w: 10, h: 22, color: '#E5484D' });
      s.node.setPosition(Math.sin(a) * 56, Math.cos(a) * 56, 0);
      s.node.angle = (-a * 180) / Math.PI;
      this.streakArc.push(s);
    }
    this.streakRing = ui(this.streakN, 'proc/ring', { w: 128, h: 128, color: '#5A1A1E', alpha: 0.6 });
    ui(this.streakN, 'icon/skull', { w: 72, h: 72, color: '#FFFFFF' });
    this.kill = label(this.streakN, '0 KILL', { size: 48, bold: true, outline: '#000000' }); this.kill.node.setPosition(0, -98, 0);
    label(this.streakN, 'Thưởng chuỗi', { size: 22, bold: true, color: '#7FD8FF', outline: '#000000', outlineWidth: 2 }).node.setPosition(0, -140, 0);
    this.pauseBtn = new Button(T, { w: 88, h: 88, frame: '', name: 'pause', onTap: () => this.onPause() });
    place(this.pauseBtn.root, 616, 40, 88, 88);
    for (const dx of [-12, 12]) { const p = ui(this.pauseBtn.visual, 'proc/pixel', { w: 14, h: 44, color: '#FFFFFF' }); p.node.setPosition(dx, 0, 0); }
    this.bossN = node(T, 'boss'); place(this.bossN, 110, 260, 500, 28); // spec 12.1: y 260
    this.bossBar = new Bar(this.bossN, 500, 28, '#E5484D', '#000000', 0.85, 3);
    this.bossName = label(this.bossN, '', { size: 22, bold: true, outline: '#000000' }); this.bossName.node.setPosition(0, 1, 0); // on the bar: the kill labels end at y 240
    // Squad health strip: one 64 x 80 cell per hero (portrait + bar), bottom-left.
    this.squadN = node(B, 'squad');
    placeB(this.squadN, 16, 150, 0, 0);
    this.autoBtn = new Button(B, { w: 104, h: 120, frame: '', name: 'auto', onTap: () => this.onAuto() });
    placeB(this.autoBtn.root, 600, 150, 104, 120);
    this.autoBg = ui(this.autoBtn.visual, 'proc/circle', { w: 96, h: 96, color: '#2E6FD8', alpha: 0.6 });
    this.autoBg.node.setPosition(0, 12, 0);
    this.autoBtn.icon('icon/arrow_clockwise', 60, 60, 0, 12, '#FFFFFF');
    label(this.autoBtn.visual, 'AUTO', { size: 24, bold: true, outline: '#000000' }).node.setPosition(0, -44, 0);
    // "Tầng N" sits in the HUD's top area under the streak counter and the boss bar (y 330 from the top), not over
    // the fight in the middle of the screen (QA-05); shown 1 s.
    this.floorBanner = label(T, '', { size: 48, bold: true, color: '#FFFFFF', outline: '#000000', outlineWidth: 4 });
    this.floorBanner.node.setPosition(0, -330, 0);
    this.floorBanner.node.active = false;
  }

  /** Short bounce of the run's gold counter when gold is picked up (the dungeon has no pickup strip). */
  pulseGold(): void {
    const n = this.gold.node;
    Tween.stopAllByTarget(n);
    n.setScale(1.25, 1.25, 1);
    tween(n).to(0.15, { scale: new Vec3(1, 1, 1) }).start();
  }

  /** "Tầng 2" big text in the middle for 0.8 s when a floor starts. */
  showFloor(n: number): void {
    setText(this.floorBanner, `Tầng ${n}`);
    this.floorBanner.node.active = true;
    this.bannerT = 1.0;
  }

  set(v: DungeonHudV, dt: number): void {
    setText(this.floor, `${v.floor}F`);
    setText(this.gold, num(v.runGold));
    this.streakN.active = v.streak > 0;
    if (v.streak > 0) {
      setText(this.kill, `${v.streak} KILL`);
      const on = Math.ceil(v.streakPct * 12);
      for (let i = 0; i < 12; i++) { const a = this.streakArc[i].node; const vis = i < on; if (a.active !== vis) a.active = vis; }
    }
    void this.streakRing;
    this.bossN.active = !!v.boss;
    if (v.boss) { this.bossBar.set(v.boss.hp / v.boss.hpMax); setText(this.bossName, v.boss.name); }
    while (this.slots.length < v.squad.length) {
      const i = this.slots.length;
      const n = node(this.squadN, 'h' + i, 64, 80); n.setPosition(32 + i * 70, -40, 0);
      rect(n, 64, 80, '#0E2347', 0.7);
      const img = px(n, 'td/0097', { w: 56, h: 56 }); img.node.setPosition(0, 8, 0);
      const bar = new Bar(n, 56, 10, C.green, '#000000', 0.9); bar.root.setPosition(0, -30, 0);
      const x = px(n, 'ui/cross', { w: 40, h: 40 }); x.node.setPosition(0, 8, 0); // world-atlas copy: drawn above the portrait
      this.slots.push({ n, img, bar, x });
    }
    this.slots.forEach((s, i) => {
      const h = v.squad[i];
      s.n.active = !!h;
      if (!h) return;
      const f = Assets.art(h.art);
      if (s.img.spriteFrame !== f) s.img.spriteFrame = f;
      setColor(s.img, h.dead ? '#606060' : h.tint ?? '#FFFFFF');
      s.bar.set(h.hpPct);
      s.x.node.active = h.dead;
    });
    setColor(this.autoBg, v.auto ? '#4CD137' : '#2E6FD8', v.auto ? 0.9 : 0.5);
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.floorBanner.node.active = false; }
  }
}
