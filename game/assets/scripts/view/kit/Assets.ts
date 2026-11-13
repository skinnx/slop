// Everything the view draws or plays, loaded once through the AssetLoader seam (works in harness and editor build).
import { Texture2D, SpriteFrame, Rect, Size, Vec2, TTFFont, AudioClip } from 'cc';
import { AssetLoader, AtlasJson } from '../../AssetLoader';

interface ViewAtlasJson extends AtlasJson {
  filter?: 'nearest' | 'linear';
  frames: Record<string, { x: number; y: number; w: number; h: number; border?: [number, number, number, number] }>;
}

/** Sound files under resources/audio (name -> extension). Mapping: docs/design/04-placeholder-art.md section 4. */
export const SOUNDS: Record<string, string> = {
  'click-01': '.ogg', 'confirm-01': '.ogg', 'error-01': '.ogg', 'select-01': '.ogg', 'drop-01': '.ogg',
  'switch-a': '.ogg', 'switch-b': '.ogg', 'hit-01': '.ogg', 'chop-wood-hit-01': '.ogg', 'mine-rock-hit-01': '.ogg',
  'tree-fall-01': '.ogg', 'build-drop': '.mp3', 'menu-confirm': '.mp3', 'level-up': '.mp3', 'pickup-coin': '.ogg',
  'pickup-item': '.mp3', 'menu-loop': '.ogg', 'platformer-room': '.ogg', 'runner-room': '.ogg',
};

async function loadAtlas(loader: AssetLoader, path: string, into: Map<string, SpriteFrame>): Promise<Texture2D> {
  const [img, meta] = await Promise.all([loader.image(path), loader.json<ViewAtlasJson>(path + '-frames')]);
  const tex = new Texture2D();
  tex.image = img;
  const f = meta.filter === 'linear' ? Texture2D.Filter.LINEAR : Texture2D.Filter.NEAREST;
  tex.setFilters(f, f);
  tex.setMipFilter(Texture2D.Filter.NONE);
  tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
  for (const name of Object.keys(meta.frames)) {
    const r = meta.frames[name];
    const sf = new SpriteFrame();
    sf.reset({ texture: tex, rect: new Rect(r.x, r.y, r.w, r.h), originalSize: new Size(r.w, r.h), offset: new Vec2(0, 0), isRotate: false });
    sf.packable = false; // keep it out of the dynamic atlas (that one is linear-filtered and differs per platform)
    if (r.border) { sf.insetLeft = r.border[0]; sf.insetTop = r.border[1]; sf.insetRight = r.border[2]; sf.insetBottom = r.border[3]; }
    into.set(name, sf);
  }
  return tex;
}

class AssetsImpl {
  /** NEAREST atlas: pixel art, ground, world shapes. Names like 'td/0097', 'proc/diamond2'. */
  readonly world = new Map<string, SpriteFrame>();
  /** LINEAR atlas: UI pack, 64 px icons, UI shapes. Names like 'ui/panel', 'icon/sword', 'proc/circle'. */
  readonly ui = new Map<string, SpriteFrame>();
  bold: TTFFont | null = null;
  regular: TTFFont | null = null;
  readonly sounds = new Map<string, AudioClip>();
  fontError = '';

  async load(loader: AssetLoader): Promise<void> {
    await Promise.all([loadAtlas(loader, 'textures/world', this.world), loadAtlas(loader, 'textures/ui', this.ui)]);
    try {
      [this.bold, this.regular] = await Promise.all([loader.font('fonts/BeVietnamPro-Bold'), loader.font('fonts/BeVietnamPro-Regular')]);
    } catch (e) {
      // 04-placeholder-art.md section 3: fall back to the system font when the TTF cannot be loaded.
      this.fontError = String(e);
      console.warn('[view] font load failed, using system font', e);
    }
    // Audio loads in the background: the game never waits for sound.
    for (const name of Object.keys(SOUNDS)) {
      loader.audio('audio/' + name, SOUNDS[name]).then((c) => this.sounds.set(name, c)).catch((e) => console.warn('[view] audio', name, e));
    }
  }

  /** Frame from the world atlas (pixel art). Throws on a typo so missing art is loud. */
  w(name: string): SpriteFrame {
    const f = this.world.get(name);
    if (!f) throw new Error(`[view] no world frame '${name}'`);
    return f;
  }
  /** Frame from the UI atlas. */
  u(name: string): SpriteFrame {
    const f = this.ui.get(name);
    if (!f) throw new Error(`[view] no ui frame '${name}'`);
    return f;
  }
  /** 'td:0097' style (art mapping) -> world frame. */
  art(spec: string): SpriteFrame {
    return this.w(spec.replace(':', '/'));
  }
}

export const Assets = new AssetsImpl();
