// Harness-only engine bootstrap. Replaces what the editor build gets from settings.json and the
// "internal" bundle: builtin effects (compiled by tools/scripts/effects) and the builtin 2D materials.
import { game, Game, EffectAsset, Material, builtinResMgr, color, DebugMode } from 'cc';

function registerBuiltins(effects: any[]): void {
  for (const e of effects) {
    const effect = Object.assign(new EffectAsset(), e) as EffectAsset;
    effect.name = String(e.name).split('/').pop()!;
    (effect as any).hideInEditor = true;
    effect.onLoaded();
  }
  // Same material set as the engine's own test fixture (tests/fixtures/builtin-material.ts).
  const toCompile: Material[] = (builtinResMgr as any)._materialsToBeCompiled;
  const mk = (uuid: string, effectName: string, defines: Record<string, boolean> = {}, after?: (m: Material) => void): void => {
    const m = new Material();
    (m as any)._uuid = uuid;
    m.initialize({ effectName, defines });
    after?.(m);
    builtinResMgr.addAsset(uuid, m);
    toCompile.push(m);
  };
  mk('missing-effect-material', 'builtin-unlit', { USE_COLOR: true }, (m) => m.setProperty('mainColor', color('#ffff00')));
  mk('missing-material', 'builtin-unlit', { USE_COLOR: true }, (m) => m.setProperty('mainColor', color('#ff00ff')));
  mk('default-clear-stencil', 'builtin-clear-stencil', { USE_TEXTURE: false });
  mk('ui-base-material', 'builtin-sprite', { USE_TEXTURE: false });
  mk('ui-sprite-material', 'builtin-sprite', { USE_TEXTURE: true, CC_USE_EMBEDDED_ALPHA: false, IS_GRAY: false });
  mk('ui-alpha-test-material', 'builtin-sprite', { USE_TEXTURE: true, USE_ALPHA_TEST: true, CC_USE_EMBEDDED_ALPHA: false, IS_GRAY: false });
  mk('ui-sprite-gray-material', 'builtin-sprite', { USE_TEXTURE: true, CC_USE_EMBEDDED_ALPHA: false, IS_GRAY: true });
  mk('ui-sprite-alpha-sep-material', 'builtin-sprite', { USE_TEXTURE: true, CC_USE_EMBEDDED_ALPHA: true, IS_GRAY: false });
  mk('ui-sprite-gray-alpha-sep-material', 'builtin-sprite', { USE_TEXTURE: true, CC_USE_EMBEDDED_ALPHA: true, IS_GRAY: true });
  mk('ui-graphics-material', 'builtin-graphics');
}

export async function bootEngine(effectsUrl: string): Promise<void> {
  const res = await fetch(effectsUrl);
  if (!res.ok) throw new Error(`Cannot load ${effectsUrl} (${res.status}). Run "npm run setup" in tools/.`);
  const effects = await res.json();
  game.once(Game.EVENT_POST_SUBSYSTEM_INIT, () => registerBuiltins(effects));
  // showFPS needs the profiler effect, which the harness does not compile; keep it off.
  await game.init({ debugMode: DebugMode.INFO, overrideSettings: { rendering: { renderMode: 2 }, profiling: { showFPS: false } } } as any);
  game.run();
}
