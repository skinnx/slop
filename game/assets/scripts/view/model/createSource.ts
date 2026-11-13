// Picks the data source: the core when it is available, the stand-in otherwise or when asked for
// (harness page URL ?standin=1, or globalThis.__viewStandIn = true before boot).
import { Source } from './Source';
import { StandInSource } from './StandInSource';
import { loadCore } from './CoreSource';

/**
 * The stand-in is reachable ONLY through the explicit developer flag. If the core or its data fails to load,
 * the result is an error (GameView shows an error screen) — never a silent fake game (QA-10).
 */
export async function createSource(): Promise<Source | { error: string }> {
  const g = globalThis as any;
  const wantStandIn = !!g.__viewStandIn || (typeof location !== 'undefined' && /[?&]standin=1/.test(location.search));
  if (wantStandIn) return new StandInSource();
  try {
    return await loadCore();
  } catch (e) {
    console.error('[view] core failed to load', e);
    return { error: String(e && (e as Error).message ? (e as Error).message : e) };
  }
}
