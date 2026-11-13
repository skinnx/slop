// The single component referenced by Main.scene (by the uuid in Bootstrap.ts.meta).
// Do NOT rename/move this file or edit its .meta. Everything else is created from code.
// It only sets the design resolution and hands the Canvas node to the view layer (scripts/view/GameView.ts).
import { _decorator, Component, view, ResolutionPolicy } from 'cc';
import { GameView } from './view/GameView';
const { ccclass } = _decorator;

const DESIGN_W = 720;
const DESIGN_H = 1280;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
  private game: GameView | null = null;

  onLoad(): void {
    // Same values must be set in Project Settings (see docs/tech/cocos-3.8-guide.md).
    view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
  }

  async start(): Promise<void> {
    this.game = new GameView(this.node, this);
    await this.game.start();
    (globalThis as any).__bootstrapReady = true;
  }

  update(dt: number): void {
    this.game?.update(dt);
  }

  onDestroy(): void {
    this.game?.destroy();
  }
}
