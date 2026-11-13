// The single component referenced by Main.scene (by the uuid in Bootstrap.ts.meta).
// Do NOT rename/move this file or edit its .meta. Everything else is created from code.
// This skeleton only proves the pipeline (data, atlas, label, touch); gameplay starts here.
import { _decorator, Component, Node, Sprite, UITransform, Label, Color, Layers, view, ResolutionPolicy,
  input, Input, EventTouch, Vec3 } from 'cc';
import { getLoader, loadPixelAtlas } from './AssetLoader';
const { ccclass } = _decorator;

interface BootData { title: string; atlas: string; pixelScale: number; }

const DESIGN_W = 720;
const DESIGN_H = 1280;

@ccclass('Bootstrap')
export class Bootstrap extends Component {
  private marker: Node | null = null;
  private readonly tmp = new Vec3();

  onLoad(): void {
    // Same values must be set in Project Settings (see docs/tech/cocos-3.8-guide.md).
    view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
  }

  async start(): Promise<void> {
    const loader = getLoader();
    const data = await loader.json<BootData>('data/boot');
    const frames = await loadPixelAtlas(loader, data.atlas);

    // A row of every frame in the atlas, scaled up (checks crisp pixel scaling).
    const names = [...frames.keys()];
    const step = 16 * data.pixelScale + 8;
    const perRow = Math.floor((DESIGN_W - 40) / step);
    names.forEach((name, i) => {
      const n = this.makeNode('frame:' + name);
      const s = n.addComponent(Sprite);
      s.sizeMode = Sprite.SizeMode.RAW;
      s.spriteFrame = frames.get(name)!;
      n.setScale(data.pixelScale, data.pixelScale, 1);
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      n.setPosition(-DESIGN_W / 2 + 20 + step / 2 + col * step, 300 - row * step, 0);
    });

    const title = this.makeNode('title');
    const label = title.addComponent(Label);
    label.string = data.title;
    label.fontSize = 44;
    label.color = new Color(255, 230, 80, 255);
    title.setPosition(0, 520, 0);

    // Diagnostic touch marker: follows the first finger. Replace when gameplay input exists.
    this.marker = this.makeNode('touch-marker');
    const ms = this.marker.addComponent(Sprite);
    ms.sizeMode = Sprite.SizeMode.RAW;
    ms.spriteFrame = frames.get(names[0])!;
    this.marker.setScale(3, 3, 1);
    this.marker.active = false;
    input.on(Input.EventType.TOUCH_START, this.onTouch, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouch, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

    (globalThis as any).__bootstrapReady = true;
  }

  onDestroy(): void {
    input.off(Input.EventType.TOUCH_START, this.onTouch, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouch, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
  }

  private onTouch(e: EventTouch): void {
    if (!this.marker || e.getID() !== e.getAllTouches()[0]?.getID()) return;
    const ui = e.getUILocation();
    this.tmp.set(ui.x, ui.y, 0);
    this.node.getComponent(UITransform)!.convertToNodeSpaceAR(this.tmp, this.tmp);
    this.marker.setPosition(this.tmp);
    this.marker.active = true;
  }

  private onTouchEnd(e: EventTouch): void {
    if (this.marker && e.getAllTouches().length === 0) this.marker.active = false;
  }

  private makeNode(name: string): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    n.addComponent(UITransform);
    this.node.addChild(n);
    return n;
  }
}
