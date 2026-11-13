// The ONLY place that knows how files are fetched.
// Editor/preview/build: ResourcesLoader (assets/resources, path without extension).
// tools/harness: replaces it with a fetch-based loader via setLoader(). Nothing else differs.
import { resources, JsonAsset, ImageAsset, Texture2D, SpriteFrame, Rect, Size, Vec2, TTFFont, AudioClip } from 'cc';

export interface AssetLoader {
  /** Parsed JSON of assets/resources/<path>.json */
  json<T = unknown>(path: string): Promise<T>;
  /** Decoded image of assets/resources/<path>.png (works for every image import type). */
  image(path: string): Promise<ImageAsset>;
  /** TTF font of assets/resources/<path>.ttf (use as label.font with useSystemFont = false). */
  font(path: string): Promise<TTFFont>;
  /** Audio clip of assets/resources/<path> (.ogg or .mp3; pass the path WITHOUT extension, ext is the real one). */
  audio(path: string, ext: string): Promise<AudioClip>;
}

export class ResourcesLoader implements AssetLoader {
  json<T>(path: string): Promise<T> {
    return new Promise((ok, fail) => resources.load(path, JsonAsset, (err, a) => (err ? fail(err) : ok(a.json as T))));
  }
  image(path: string): Promise<ImageAsset> {
    return new Promise((ok, fail) => resources.load(path, ImageAsset, (err, a) => (err ? fail(err) : ok(a))));
  }
  font(path: string): Promise<TTFFont> {
    return new Promise((ok, fail) => resources.load(path, TTFFont, (err, a) => (err ? fail(err) : ok(a))));
  }
  audio(path: string, _ext: string): Promise<AudioClip> {
    return new Promise((ok, fail) => resources.load(path, AudioClip, (err, a) => (err ? fail(err) : ok(a))));
  }
}

let current: AssetLoader | null = null;
export function getLoader(): AssetLoader {
  return current ?? (current = new ResourcesLoader());
}
export function setLoader(loader: AssetLoader): void {
  current = loader;
}

/** Frame map written by tools/scripts/pack-atlas.mjs next to the atlas PNG. */
export interface AtlasJson {
  image: string;
  width: number;
  height: number;
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
}

/**
 * Loads `<path>.png` + `<path>-frames.json` and returns one SpriteFrame per frame.
 * All frames share ONE texture, so sprites batch (also on native, where dynamic atlas is off).
 * Pixel art: NEAREST filtering, no mipmaps, and packable=false so the dynamic atlas never
 * copies the frame into a linear-filtered shared texture.
 */
export async function loadPixelAtlas(loader: AssetLoader, path: string): Promise<Map<string, SpriteFrame>> {
  const [img, meta] = await Promise.all([loader.image(path), loader.json<AtlasJson>(path + '-frames')]);
  const tex = new Texture2D();
  tex.image = img;
  tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
  tex.setMipFilter(Texture2D.Filter.NONE);
  tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
  const out = new Map<string, SpriteFrame>();
  for (const name of Object.keys(meta.frames)) {
    const f = meta.frames[name];
    const sf = new SpriteFrame();
    // Set texture, rect AND originalSize together: setting only `rect` leaves originalSize at the
    // full texture size, and Sprite.SizeMode.RAW would then draw the frame at atlas size.
    sf.reset({ texture: tex, rect: new Rect(f.x, f.y, f.w, f.h), originalSize: new Size(f.w, f.h), offset: new Vec2(0, 0), isRotate: false });
    sf.packable = false;
    out.set(name, sf);
  }
  return out;
}
