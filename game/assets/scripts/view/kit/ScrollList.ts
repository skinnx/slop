// Scrolling area clipped by a rectangular Mask. Dragging more than 12 units scrolls (and the child under the
// finger does not count it as a tap, see Button.onTap). Content origin: top-left (vertical) of the viewport.
import { Node, EventTouch, Mask, UITransform, Graphics } from 'cc';
import { node } from './Ui';
import { TAP_SLOP } from './Button';

export class ScrollList {
  readonly root: Node;
  readonly content: Node;
  private offset = 0;
  private extent = 0;
  private start = 0;
  private dragging = false;

  constructor(parent: Node, readonly w: number, readonly h: number, readonly horizontal = false) {
    this.root = node(parent, 'scroll', w, h);
    const mask = this.root.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    // Graphics created by the mask needs no band: stencil only.
    void Graphics;
    this.content = node(this.root, 'content');
    this.place();
    this.root.on(Node.EventType.TOUCH_START, (e: EventTouch) => { this.start = this.offset; this.dragging = false; void e; }, this, true);
    this.root.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
      const a = e.getUIStartLocation(), b = e.getUILocation();
      const d = this.horizontal ? a.x - b.x : b.y - a.y;
      if (!this.dragging && Math.abs(d) > TAP_SLOP) this.dragging = true;
      if (this.dragging) this.scrollTo(this.start + d);
    }, this, true);
  }

  /** Total content length along the scroll axis. */
  setExtent(len: number): void { this.extent = len; this.scrollTo(this.offset); }

  scrollTo(v: number): void {
    const max = Math.max(0, this.extent - (this.horizontal ? this.w : this.h));
    this.offset = Math.max(0, Math.min(max, v));
    this.place();
  }
  get scroll(): number { return this.offset; }
  get maxScroll(): number { return Math.max(0, this.extent - (this.horizontal ? this.w : this.h)); }

  private place(): void {
    // content local origin = viewport top-left corner, shifted by the scroll offset
    if (this.horizontal) this.content.setPosition(-this.w / 2 - this.offset, this.h / 2, 0);
    else this.content.setPosition(-this.w / 2, this.h / 2 + this.offset, 0);
  }

  /** Size of the viewport transform. */
  get transform(): UITransform { return this.root.getComponent(UITransform)!; }
}
