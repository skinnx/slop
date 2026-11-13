// Screen metrics in design units. Width is always 720 (Fit Width); height H grows on tall phones.
// Safe-area insets come from sys.getSafeAreaRect() (design units, origin bottom-left).
import { view, sys, screen, ResolutionPolicy } from 'cc';

export const W = 720;
type Fn = () => void;

class LayoutImpl {
  H = 1280;
  safeTop = 0;
  safeBottom = 0;
  private subs: Fn[] = [];
  private hooked = false;

  /** True when the screen is wider than 9:16 and the whole 720 x 1280 design is fitted with side bars. */
  letterboxed = false;

  /**
   * 9:16 and taller: Fit Width (height grows, 03-ux-spec.md section 1). Shorter than 9:16 (tablets, 3:4...):
   * the whole 720 x 1280 design is shown with bars at the sides (SHOW_ALL) instead of cutting the height (QA-02,
   * lead decision). Bootstrap sets FIXED_WIDTH first; this switches when the window shape needs it.
   */
  private applyPolicy(): void {
    const ws = screen.windowSize;
    const wide = ws.height > 0 && ws.width / ws.height > W / 1280 + 0.001;
    if (wide !== this.letterboxed) {
      this.letterboxed = wide;
      view.setDesignResolutionSize(W, 1280, wide ? ResolutionPolicy.SHOW_ALL : ResolutionPolicy.FIXED_WIDTH);
    }
  }

  refresh(): void {
    this.applyPolicy();
    const vis = view.getVisibleSize();
    this.H = Math.max(1, Math.round(vis.height));
    try {
      const r = sys.getSafeAreaRect();
      this.safeBottom = Math.max(0, Math.round(r.y));
      this.safeTop = Math.max(0, Math.round(this.H - (r.y + r.height)));
    } catch {
      this.safeTop = this.safeBottom = 0;
    }
    if (!this.hooked) {
      this.hooked = true;
      view.on('canvas-resize', () => { this.refresh(); this.subs.forEach((f) => f()); });
    }
  }

  /** Calls fn now and on every resize. */
  onResize(fn: Fn): void { this.subs.push(fn); }
  offResize(fn: Fn): void { this.subs = this.subs.filter((f) => f !== fn); }

  /** Cocos y (origin centre, y up) of the top edge below the safe area. */
  get top(): number { return this.H / 2 - this.safeTop; }
  /** Cocos y of the bottom edge above the safe area. */
  get bottom(): number { return -this.H / 2 + this.safeBottom; }
}

export const Layout = new LayoutImpl();
