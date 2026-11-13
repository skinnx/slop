// One command from nothing to a working toolchain. Safe to re-run: finished steps are skipped.
// Usage (from tools/): npm run setup        Force a step again: delete tools/.cache/stamps/<step>.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { TOOLS, GAME, CACHE, ENGINE, ENGINE_WEB, PINS, StepError, NETWORK_HINT, log, run, capture } from './lib.mjs';

const STAMPS = path.join(CACHE, 'stamps');
const started = Date.now();
const hash = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

/** Runs fn unless a stamp with the same key exists and every `outputs` path exists. */
async function step(name, key, outputs, fn) {
  const stampFile = path.join(STAMPS, name + '.json');
  const k = hash(key);
  if (fs.existsSync(stampFile) && JSON.parse(fs.readFileSync(stampFile, 'utf8')).key === k && outputs.every((o) => fs.existsSync(o))) {
    log(`skip  ${name} (already done)`);
    return;
  }
  const t = Date.now();
  log(`start ${name}`);
  await fn();
  for (const o of outputs) if (!fs.existsSync(o)) throw new StepError(`Step ${name} finished but ${o} is missing.`);
  fs.mkdirSync(STAMPS, { recursive: true });
  fs.writeFileSync(stampFile, JSON.stringify({ key: k, at: new Date().toISOString() }));
  log(`done  ${name} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
}

function gitHead(dir) {
  try { return capture('git', ['rev-parse', 'HEAD'], { cwd: dir }); } catch { return ''; }
}

function shallowClone(repo, tag, commit, dest, sparse) {
  if (fs.existsSync(dest) && gitHead(dest) === commit) return;
  fs.rmSync(dest, { recursive: true, force: true });
  const args = ['clone', '--depth', '1', '--branch', tag, '-c', 'advice.detachedHead=false'];
  if (sparse) args.push('--filter=blob:none', '--sparse');
  run('git', [...args, repo, dest], { hint: NETWORK_HINT });
  if (sparse) run('git', ['sparse-checkout', 'set', ...sparse], { cwd: dest, hint: NETWORK_HINT });
  const head = gitHead(dest);
  if (head !== commit) throw new StepError(`${repo} tag ${tag} is at ${head}, expected ${commit} (pins.json). Refusing to continue.`);
}

async function main() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 22) throw new StepError(`Node ${process.versions.node} found; Node >= 22 is required.`);
  fs.mkdirSync(CACHE, { recursive: true });

  const lock = fs.readFileSync(path.join(TOOLS, 'package-lock.json'), 'utf8');
  await step('tools-npm-ci', lock, [path.join(TOOLS, 'node_modules/esbuild')], () =>
    run('npm', ['ci', '--no-audit', '--no-fund'], { hint: NETWORK_HINT }));

  await step('engine-clone', PINS.engine, [path.join(ENGINE, 'package.json')], () =>
    shallowClone(PINS.engine.repo, PINS.engine.tag, PINS.engine.commit, ENGINE));

  await step('engine-npm-ci', PINS.engine.commit, [path.join(ENGINE, 'node_modules/@cocos/ccbuild')], () =>
    // --ignore-scripts: postinstall builds native tools we do not need (and that need extra toolchains).
    run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: ENGINE, hint: NETWORK_HINT }));

  const ext = path.join(ENGINE, 'native/external');
  await step('engine-external', PINS.engineExternal, [path.join(ext, 'emscripten/external-wasm.d.ts')], () =>
    shallowClone(PINS.engineExternal.repo, PINS.engineExternal.tag, PINS.engineExternal.commit, ext, PINS.engineExternal.sparse));

  const ccDts = path.join(ENGINE, 'bin/.declarations/cc.d.ts');
  await step('engine-declarations', PINS.engine.commit, [ccDts], () => {
    run('npm', ['run', 'build:debug-infos'], { cwd: ENGINE });
    run('npm', ['run', 'build:declaration'], { cwd: ENGINE });
  });

  const ccJs = path.join(ENGINE_WEB, 'cc.js');
  await step('engine-web', [PINS.engine.commit, PINS.engineFeatures, PINS.browserTargets, fs.readFileSync(path.join(TOOLS, 'scripts/build-engine-web.cjs'), 'utf8')], [ccJs], () =>
    run('node', [path.join(TOOLS, 'scripts/build-engine-web.cjs'), ENGINE, ENGINE_WEB, path.join(TOOLS, 'pins.json')]));

  const shdc = path.join(CACHE, 'shdc/shdc-lib.js');
  await step('shdc-download', PINS.shdc, [shdc], () => {
    fs.mkdirSync(path.dirname(shdc), { recursive: true });
    run('curl', ['-fsSL', '--retry', '2', '-o', shdc + '.part', PINS.shdc.url], { hint: NETWORK_HINT });
    const got = crypto.createHash('sha256').update(fs.readFileSync(shdc + '.part')).digest('hex');
    if (got !== PINS.shdc.sha256) throw new StepError(`shdc-lib.js sha256 ${got} != pinned ${PINS.shdc.sha256}.`);
    fs.renameSync(shdc + '.part', shdc);
  });

  const effectsJson = path.join(ENGINE_WEB, 'builtin-2d-effects.json');
  const effectSrc = ['browser-entry.js', 'build-compiler.mjs', 'compile-effects.mjs'].map((f) => fs.readFileSync(path.join(TOOLS, 'scripts/effects', f), 'utf8'));
  await step('effects', [PINS.engine.commit, PINS.shdc.sha256, PINS.effects, effectSrc], [effectsJson], () => {
    run('node', [path.join(TOOLS, 'scripts/effects/build-compiler.mjs'), ENGINE, shdc, path.join(ENGINE_WEB, 'effect-compiler.js')]);
    run('node', [path.join(TOOLS, 'scripts/effects/compile-effects.mjs'), ENGINE, ENGINE_WEB, effectsJson, ...PINS.effects]);
  });

  // Always regenerate: cheap, and game/temp may have been wiped (or overwritten by the editor).
  run('node', [path.join(TOOLS, 'scripts/gen-declarations.cjs'), ENGINE, GAME]);

  const du = capture('du', ['-sh', CACHE, path.join(TOOLS, 'node_modules')]).replace(/\t/g, ' ').split('\n').join(', ');
  log(`SETUP OK in ${((Date.now() - started) / 1000).toFixed(0)} s. Disk: ${du}`);
  log('Next: npm run typecheck && npm test && npm run harness -- harness/scenarios/example.mjs');
}

main().catch((e) => {
  console.error(`\n[tools] SETUP FAILED: ${e.message}`);
  if (!(e instanceof StepError)) console.error(e.stack);
  process.exit(1);
});
