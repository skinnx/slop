// Picks the data source: the core when it is available, the stand-in otherwise or when asked for
// (harness page URL ?standin=1, or globalThis.__viewStandIn = true before boot).
import { Source } from './Source';
import { StandInSource } from './StandInSource';
import { loadCore } from './CoreSource';

export async function createSource(): Promise<Source> {
  const g = globalThis as any;
  const wantStandIn = !!g.__viewStandIn || (typeof location !== 'undefined' && /[?&]standin=1/.test(location.search));
  if (!wantStandIn) {
    const core = await tryCore();
    if (core) return core;
  }
  return new StandInSource();
}

async function tryCore(): Promise<Source | null> {
  try {
    return await loadCore();
  } catch (e) {
    // Data that fails validation (DataError lists every problem) or a core that does not load: show it loudly,
    // fall back to the stand-in so the screens still render.
    console.error('[view] core unavailable, using stand-in data', e);
    (globalThis as any).__viewCoreError = String(e && (e as Error).stack ? (e as Error).stack : e);
    return null;
  }
}
