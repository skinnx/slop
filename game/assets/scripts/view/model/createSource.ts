// Picks the data source: the core when it is available, the stand-in otherwise or when asked for
// (harness page URL ?standin=1, or globalThis.__viewStandIn = true before boot).
import { Source } from './Source';
import { StandInSource } from './StandInSource';

export async function createSource(): Promise<Source> {
  const g = globalThis as any;
  const wantStandIn = !!g.__viewStandIn || (typeof location !== 'undefined' && /[?&]standin=1/.test(location.search));
  if (!wantStandIn) {
    const core = await tryCore();
    if (core) return core;
  }
  return new StandInSource();
}

/** Replaced when the core contract is bound (CoreSource). */
async function tryCore(): Promise<Source | null> {
  return null;
}
