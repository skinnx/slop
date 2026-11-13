// Runs in Chromium next to the built cc.js. Exposes window.__compileEffects(effectSources, chunkSources).
const shdc = require('shdc-lib');
window.__compileEffects = (effects, chunks) => {
  shdc.options.throwOnWarning = false;
  shdc.options.throwOnError = true;
  shdc.options.skipParserTest = true;
  for (const [name, src] of Object.entries(chunks)) shdc.addChunk(name, src);
  shdc.options.chunkSearchFn = (names) => {
    for (const n of names) if (chunks[n] !== undefined) return { name: n, content: chunks[n] };
    return {};
  };
  return Object.entries(effects).map(([name, src]) => shdc.buildEffect(name, src));
};
