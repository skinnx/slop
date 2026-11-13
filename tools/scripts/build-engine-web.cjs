// Builds the Cocos 3.8.8 engine (from tools/.cache/cocos-engine) into ONE ES module file for the harness.
// Usage: node build-engine-web.cjs <engineDir> <outDir> <pins.json>
const path = require('path');
const fs = require('fs');
const [engineArg, outArg, pinsArg] = process.argv.slice(2);
const engine = path.resolve(engineArg);
const out = path.resolve(outArg);
const pins = JSON.parse(fs.readFileSync(pinsArg, 'utf8'));
const { buildEngine } = require(path.join(engine, 'node_modules/@cocos/ccbuild'));
(async () => {
  const t = Date.now();
  const res = await buildEngine({
    engine,
    out,
    mode: 'BUILD',
    platform: 'HTML5',
    moduleFormat: 'esm',
    features: pins.engineFeatures,
    compress: false,
    sourceMap: false,
    split: false,
    nativeCodeBundleMode: 'wasm',
    assetURLFormat: 'relative-from-chunk',
    flags: { DEBUG: true },
    // Required: the default (old) targets make Babel emit broken loop code
    // ("ReferenceError: _i is not defined" in insertBuiltinBindings).
    targets: pins.browserTargets,
  });
  if (!res.exports || res.exports.cc !== 'cc.js') throw new Error('Unexpected build output: ' + JSON.stringify(res.exports));
  console.log(`[tools] engine built in ${((Date.now() - t) / 1000).toFixed(1)} s -> ${path.join(out, 'cc.js')}`);
})().catch((e) => {
  console.error('[tools] engine build FAILED', e);
  process.exit(1);
});
