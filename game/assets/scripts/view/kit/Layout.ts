// Screen metrics in design units. Width is always 720 (Fit Width); height H grows on tall phones.
// Safe-area insets come from sys.getSafeAreaRect() (design units, origin bottom-left).
import { view, sys } from 'cc';

export const W = 720;
type Fn = () => void;

class LayoutImpl {
  H = 1280;
  safeTop = 0;
  safeBottom = 0;
  private subs: Fn[] = [];
  private hooked = false;

  refresh(): void {
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
