// Entry of the view layer, created by Bootstrap. Owns the layers (world, joystick, HUD, panels, dialogs,
// toasts, fade), picks the data source, runs the per-frame loop and routes one-shot events.
// Layer order (= touch priority, front-most last): world < joystick < hud < panels < dialogs < toasts < fade.
import { Node, Component, UITransform, Vec3, director, AudioSource, Label } from 'cc';
import { getLoader } from '../AssetLoader';
import { Assets } from './kit/Assets';
import { Layout, W } from './kit/Layout';
import { BAND } from './kit/Theme';
import { node, rect, setBand, opacity } from './kit/Ui';
import { Services } from './kit/Services';
import { Toasts, Dialogs } from './kit/Overlays';
import { Panel } from './kit/Panel';
import { Ctx } from './Ctx';
import { Source, Cmd, CmdResult } from './model/Source';
import { StandInSource } from './model/StandInSource';
import { Mode, ViewEvent } from './model/ViewModel';
import { WorldRenderer } from './world/WorldRenderer';
import { screenDirToCell } from './world/Iso';
import { Joystick } from './hud/Joystick';
import { FieldHud } from './hud/FieldHud';
import { DungeonHud } from './hud/DungeonHud';
import { createSource } from './model/createSource';
import { Screens } from './screens/Screens';

export class GameView implements Ctx {
  src!: Source;
  private root!: Node;
  world!: WorldRenderer;
  joystick!: Joystick;
  fieldHud!: FieldHud;
  dungeonHud!: DungeonHud;
  private hudLayer!: Node;
  private panelLayer!: Node;
  private panels: Panel[] = [];
  toasts!: Toasts;
  dialogs!: Dialogs;
  private fade!: Node;
  private fadeT = 0;
  private lastMode: Mode | '' = '';
  screens!: Screens;
  private audio!: AudioSource;
  private music: AudioSource | null = null;
  private sfxBudget = new Map<string, number[]>();
  private frame = 0;
  private time = 0;

  constructor(private readonly canvas: Node, private readonly host: Component) {}

  async start(): Promise<void> {
    Layout.refresh();
    await Assets.load(getLoader());
    this.src = await createSource();
    this.root = node(this.canvas, 'view', W, Layout.H);
    this.world = new WorldRenderer(this.root, this.src.render());
    this.joystick = new Joystick(this.root);
    this.joystick.onChange = (x, y) => { const c = screenDirToCell(x, y); this.src.send({ t: 'joystick', x: c.x, y: c.y }); };
    this.hudLayer = node(this.root, 'hud');
    this.fieldHud = new FieldHud(this.hudLayer, {
      hero: () => this.screens.openHeroList(), squad: () => this.screens.openSquad(), build: () => this.screens.enterBuild(),
      portal: () => this.send({ t: 'portal' }), settings: () => this.screens.openSettings(), quest: () => this.screens.questTap(),
      guide: () => this.screens.guide(), resTip: (r) => this.screens.resTip(r),
    });
    this.dungeonHud = new DungeonHud(this.hudLayer, () => this.screens.openPause(), () => this.send({ t: 'setAuto', on: !this.src.dungeonHud().auto }));
    this.panelLayer = node(this.root, 'panels');
    this.dialogs = new Dialogs(this.root);
    this.toasts = new Toasts(this.root);
    this.fade = node(this.root, 'fade');
    setBand(this.fade, BAND.fade);
    rect(this.fade, W, 6000, '#000000');
    this.fade.active = false;
    this.audio = this.host.node.addComponent(AudioSource);
    Services.sfx = (n, v) => this.playSfx(n, v);
    Services.toast = (t, e) => this.toasts.toast(t, e);
    Services.big = (t) => this.toasts.big(t);
    Services.confirm = (o) => this.dialogs.confirm(o);
    this.screens = new Screens(this, this.hudLayer);
    Layout.onResize(() => this.relayout());
    this.installDebug();
    this.applyMode(this.src.mode());
  }

  // ---------------- Ctx ----------------
  send(cmd: Cmd): CmdResult {
    const r = this.src.send(cmd);
    if (!r.ok && r.reason) { this.toasts.toast(r.reason, true); this.playSfx('error-01'); }
    return r;
  }
  open(p: Panel): void {
    this.joystick.cancel();
    p.mount(this.panelLayer, BAND.panel0 + this.panels.length, this);
    this.panels.push(p);
  }
  close(p: Panel): void {
    const i = this.panels.indexOf(p);
    if (i < 0) return;
    this.panels.splice(i, 1);
    p.root.destroy();
    p.onClosed();
    this.top()?.refresh();
  }
  closeAll(): void { while (this.panels.length) this.close(this.panels[this.panels.length - 1]); }
  top(): Panel | null { return this.panels.length ? this.panels[this.panels.length - 1] : null; }
  get panelStack(): Panel[] { return this.panels; }

  /** Black fade 0.4 s on mode changes (03-ux-spec.md section 16). */
  flash(sec = 0.4): void { this.fadeT = sec; this.fade.active = true; opacity(this.fade, 1); }

  // ---------------- loop ----------------
  update(dt: number): void {
    if (!this.src) return;
    this.frame++;
    this.time += dt;
    const d = Math.min(dt, 0.1);
    this.src.tick(d);
    const mode = this.src.mode();
    if (mode !== this.lastMode) this.applyMode(mode);
    for (const e of this.src.drainEvents()) this.onEvent(e);
    if (mode === 'WORLD' || mode === 'BUILD' || mode === 'DUNGEON') {
      this.world.update(d, this.src.world());
    }
    if (mode === 'WORLD') this.fieldHud.set(this.src.fieldHud());
    if (mode === 'DUNGEON') this.dungeonHud.set(this.src.dungeonHud(), d);
    this.joystick.enabled = (mode === 'WORLD' || mode === 'DUNGEON') && this.panels.length === 0 && !this.dialogs.isOpen && !this.screens.blocksJoystick();
    if (!this.joystick.enabled && this.joystick.active && !this.joystick.dragHandler) this.joystick.cancel();
    this.joystick.update(d);
    this.top()?.tick(d);
    this.screens.update(d, mode);
    this.toasts.update(d);
    if (this.fadeT > 0) {
      this.fadeT -= d;
      opacity(this.fade, Math.max(0, Math.min(1, this.fadeT / 0.2)));
      if (this.fadeT <= 0) this.fade.active = false;
    }
  }

  private applyMode(mode: Mode): void {
    const prev = this.lastMode;
    this.lastMode = mode;
    if (prev && (prev === 'DUNGEON' || mode === 'DUNGEON' || mode === 'RESULT')) this.flash();
    this.closeAll();
    this.dialogs.close();
    this.joystick.cancel();
    this.fieldHud.root.active = mode === 'WORLD';
    this.dungeonHud.root.active = mode === 'DUNGEON';
    this.world.root.active = mode !== 'TITLE' && mode !== 'RESULT';
    this.joystick.setVisible(mode === 'WORLD' || mode === 'DUNGEON');
    this.screens.onMode(mode, prev);
    this.refreshMusic();
  }

  private onEvent(e: ViewEvent): void {
    this.world.onEvent(e);
    switch (e.t) {
      case 'toast': this.toasts.toast(e.text, !!e.error); if (e.error) this.playSfx('error-01'); break;
      case 'big': this.toasts.big(e.text); break;
      case 'pickup': this.toasts.pickup(e.res, e.amount); this.playSfx(e.res === 'gold' ? 'pickup-coin' : 'pickup-item', 1, 4); break;
      case 'floor': this.dungeonHud.showFloor(e.floor); break;
      case 'fade': this.flash(0.6); break;
      case 'sound': this.playSfx(e.name); break;
      case 'damage': this.playSfx('hit-01', 0.5, 6); break;
      case 'streakBonus': this.playSfx('pickup-coin'); break;
      default:
    }
    this.screens.onEvent(e);
  }

  private relayout(): void {
    this.root.getComponent(UITransform)!.setContentSize(W, Layout.H);
    this.fieldHud.build();
    this.dungeonHud.build();
    this.joystick.rest();
    for (const p of this.panels) p.layout();
    this.screens.relayout();
  }

  // ---------------- audio ----------------
  /** Plays a sound with an optional rate limit (max `perTenth` plays every 0.1 s), 04-placeholder-art.md section 4. */
  playSfx(name: string, volume = 1, perTenth = 0): void {
    if (!this.src.settings().sfx) return;
    const clip = Assets.sounds.get(name);
    if (!clip) return;
    if (perTenth) {
      const list = this.sfxBudget.get(name) ?? [];
      while (list.length && this.time - list[0] > 0.1) list.shift();
      if (list.length >= perTenth) return;
      list.push(this.time);
      this.sfxBudget.set(name, list);
    }
    this.audio.playOneShot(clip, volume);
  }
  private playMusic(name: string): void {
    if (!this.music) { this.music = this.host.node.addComponent(AudioSource); this.music.loop = true; this.music.volume = 0.5; }
    const clip = Assets.sounds.get(name) ?? null;
    if (!this.src.settings().music || !clip) { this.music.stop(); return; }
    if (this.music.clip === clip && this.music.playing) return;
    this.music.stop();
    this.music.clip = clip;
    this.music.play();
  }
  refreshMusic(): void {
    const m = this.lastMode;
    this.playMusic(m === 'TITLE' ? 'menu-loop' : m === 'DUNGEON' ? 'runner-room' : 'platformer-room');
  }

  // ---------------- debug object for harness scenarios ----------------
  private installDebug(): void {
    const self = this;
    const find = (name: string): Node | null => {
      // Depth-first; the last active match wins (front-most, which is what a tap would hit).
      let found: Node | null = null;
      const walk = (n: Node) => { if (!n.activeInHierarchy) return; if (n.name === name) found = n; n.children.forEach(walk); };
      walk(self.root);
      return found;
    };
    (globalThis as any).__game = {
      get source() { return self.src.kind; },
      get mode() { return self.src.mode(); },
      get panels() { return self.panels.map((p) => p.id); },
      get dialog() { return self.dialogs.isOpen ? self.dialogs.title : null; },
      get toasts() { return self.toasts.state; },
      get frame() { return self.frame; },
      get H() { return Layout.H; },
      get safe() { return { top: Layout.safeTop, bottom: Layout.safeBottom }; },
      get world() { return self.world.stats; },
      get joystick() { return { x: self.joystick.vx, y: self.joystick.vy, enabled: self.joystick.enabled }; },
      get fieldHud() { return self.src.mode() === 'WORLD' ? self.src.fieldHud() : null; },
      get dungeonHud() { return self.src.mode() === 'DUNGEON' ? self.src.dungeonHud() : null; },
      get state() { return self.src.debug(); },
      get screen() { return self.screens.debug(); },
      /** UI coordinates (origin bottom-left, design units) of the centre of the front-most active node named `name`. */
      where(name: string) {
        const n = find(name);
        if (!n) return null;
        const p = n.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, 0, 0));
        const c = self.canvas.getComponent(UITransform)!.convertToNodeSpaceAR(p);
        return { x: Math.round(c.x + W / 2), y: Math.round(c.y + Layout.H / 2) };
      },
      /** Texts of every active label under the front-most node named `name` (or the whole view). */
      texts(name?: string) {
        const n = name ? find(name) : self.root;
        return n ? n.getComponentsInChildren(Label).filter((l) => l.node.activeInHierarchy).map((l) => l.string) : [];
      },
      /** UI coordinates of a cell (world). */
      cellToUi(x: number, y: number) { return self.world.uiOfCell(x, y); },
      send(cmd: Cmd) { return self.src.send(cmd); },
      /** Runs the game `sec` seconds at once (core source only). For scenarios that need a later state. */
      fastForward(sec: number) { (self.src as any).fastForward?.(sec); },
      get standIn() { return self.src instanceof StandInSource ? self.src : null; },
      totalFrames: () => director.getTotalFrames(),
    };
  }

  destroy(): void {}
}
