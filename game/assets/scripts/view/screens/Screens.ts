// Navigation between screens and panels (03-ux-spec.md section 16): which panel a building opens, title and
// result screens, build mode, pause, guide arrow, welcome back. GameView calls onMode/onEvent/update.
import { Node } from 'cc';
import { node, ui, setBand } from '../kit/Ui';
import { BAND } from '../kit/Theme';
import { Services } from '../kit/Services';
import { Mode, ViewEvent } from '../model/ViewModel';
import type { GameView } from '../GameView';
import { BuildingPanel } from './BuildingPanel';
import { TavernPanel } from './TavernPanel';
import { RevealScreen, HeroListPanel, HeroDetailPanel } from './HeroPanels';
import { SquadPanel, TrainingPanel, GatePanel } from './SquadTrainingGate';
import { TitleScreen, ResultScreen, PauseMenu, SettingsPanel, WelcomePanel } from './SmallScreens';
import { BuildMode } from './BuildMode';
import { Panel } from '../kit/Panel';
import { isoX, isoY } from '../world/Iso';
import { Layout, W } from '../kit/Layout';

export class Screens {
  readonly build: BuildMode;
  private guideNode: Node;
  private guideT = 0;
  private guideTarget: { x: number; y: number } | null = null;
  private welcomeChecked = false;
  private paused = false;

  constructor(private gv: GameView, hudLayer: Node) {
    this.build = new BuildMode(gv, hudLayer);
    this.guideNode = node(hudLayer, 'guide');
    setBand(this.guideNode, BAND.hud);
    ui(this.guideNode, 'ui/arrow_yellow_e', { w: 64, h: 64 });
    this.guideNode.active = false;
    gv.joystick.onWorldTap = (x, y) => this.worldTap(x, y);
  }

  blocksJoystick(): boolean { return this.build.active; }

  onMode(mode: Mode, prev: Mode | ''): void {
    if (prev === 'BUILD') this.build.exit();
    if (mode === 'BUILD') this.build.enter();
    this.paused = false;
    if (mode === 'TITLE') this.gv.open(new TitleScreen(() => this.gv.send({ t: 'title' })));
    if (mode === 'RESULT') {
      const r = this.gv.src.result();
      if (r) { this.gv.open(new ResultScreen(r, () => this.gv.send({ t: 'resultContinue' }))); Services.sfx(r.victory ? 'level-up' : 'error-01'); }
    }
    if (mode === 'WORLD' && !this.welcomeChecked) {
      this.welcomeChecked = true;
      const w = this.gv.src.welcome();
      if (w) this.gv.open(new WelcomePanel(w));
    }
  }

  onEvent(e: ViewEvent): void { void e; }

  update(_dt: number, mode: Mode): void {
    this.build.update();
    if (this.guideT > 0 && this.guideTarget && mode === 'WORLD') {
      this.guideT -= _dt;
      const w = this.gv.src.world();
      const lx = isoX(w.focusX, w.focusY) - this.gv.world.camX, ly = isoY(w.focusX, w.focusY) - this.gv.world.camY + 40;
      const tx = isoX(this.guideTarget.x, this.guideTarget.y) - this.gv.world.camX, ty = isoY(this.guideTarget.x, this.guideTarget.y) - this.gv.world.camY;
      const a = Math.atan2(ty - ly, tx - lx);
      this.guideNode.active = this.guideT > 0;
      this.guideNode.setPosition(lx + Math.cos(a) * 90, ly + Math.sin(a) * 90, 0);
      this.guideNode.angle = (a * 180) / Math.PI;
    } else this.guideNode.active = false;
  }

  relayout(): void { if (this.build.active) this.build.build(); }

  // ----- HUD actions -----
  openHeroList(): void {
    this.gv.open(new HeroListPanel((id, ids) => this.gv.open(new HeroDetailPanel(id, ids))));
  }
  openSquad(): void { this.gv.open(new SquadPanel()); }
  openSettings(): void {
    const p = new SettingsPanel();
    p.afterToggle = () => this.gv.refreshMusic();
    this.gv.open(p);
  }
  enterBuild(): void { this.gv.send({ t: 'enterBuild' }); }
  openUpgrade(uid: number): void { this.gv.open(new BuildingPanel(uid)); }
  openPause(): void {
    if (this.paused) return;
    this.paused = true;
    this.gv.send({ t: 'pause', on: true });
    const p: Panel = new PauseMenu(() => { this.paused = false; this.gv.send({ t: 'pause', on: false }); this.gv.close(p); },
      () => { this.paused = false; this.gv.close(p); this.gv.send({ t: 'pause', on: false }); this.gv.send({ t: 'leaveDungeon' }); });
    this.gv.open(p);
  }
  questTap(): void {
    const q = this.gv.src.fieldHud().quest;
    if (q && q.done) {
      const r = this.gv.send({ t: 'claimQuest' });
      if (r.ok) Services.sfx('confirm-01');
    } else this.guide();
  }
  guide(): void {
    const h = this.gv.src.questHint();
    if (h.kind === 'ui') this.gv.fieldHud.bounce(h.ui as 'build_button');
    else if (h.kind === 'world') { this.guideTarget = { x: h.x, y: h.y }; this.guideT = 6; }
    else Services.toast('Không có gì để chỉ đường');
  }
  resTip(r: 'meat' | 'wood' | 'ore'): void {
    const v = this.gv.src.fieldHud();
    const names = { meat: 'Thịt', wood: 'Gỗ', ore: 'Quặng' };
    Services.toast(`${names[r]} ${v.res[r]} / ${v.res.cap} (Nhà Kho cấp ${v.res.storageLevel})`);
  }

  openBuilding(uid: number): void {
    const b = this.gv.src.building(uid);
    if (!b) return;
    Services.sfx('select-01');
    const up = () => this.openUpgrade(uid);
    if (b.type === 'tavern' && b.level > 0) this.gv.open(new TavernPanel((id) => this.gv.open(new HeroDetailPanel(id, [id], true)), () => this.gv.open(new RevealScreen()), up));
    else if (b.type === 'training_yard' && b.level > 0) this.gv.open(new TrainingPanel(up));
    else if (b.type === 'dungeon_gate' && b.level > 0) this.gv.open(new GatePanel(up));
    else this.openUpgrade(uid);
  }

  private worldTap(x: number, y: number): void {
    if (this.gv.src.mode() !== 'WORLD') return;
    const c = this.gv.world.cellAtUi(x, y);
    // Hit area: footprint, widened to at least 120 x 120 on screen: try the cell and its neighbours.
    let uid = this.gv.src.buildingAt(Math.floor(c.x), Math.floor(c.y));
    if (uid === null) {
      // the building picture stands above its footprint: also try one cell "below" on screen
      for (const [dx, dy] of [[-1, -1], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]) { uid = this.gv.src.buildingAt(Math.floor(c.x + dx), Math.floor(c.y + dy)); if (uid !== null) break; }
    }
    if (uid !== null) this.openBuilding(uid);
    void W; void Layout;
  }

  debug(): Record<string, unknown> {
    const top = this.gv.top();
    return {
      build: this.build.active ? this.build.debug() : null,
      guide: this.guideNode.active,
      guideTarget: this.guideTarget, guideAngle: this.guideNode.angle,
      reveal: top instanceof RevealScreen ? { done: top.done } : null,
      heroDetail: top instanceof HeroDetailPanel ? top.hero : null,
    };
  }
}
