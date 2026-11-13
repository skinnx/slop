// Shared helpers for tools/ scripts. Node built-ins only (setup.mjs runs before npm ci).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(TOOLS, '..');
export const GAME = path.join(REPO, 'game');
export const CACHE = path.join(TOOLS, '.cache');
export const ENGINE = path.join(CACHE, 'cocos-engine');
export const ENGINE_WEB = path.join(CACHE, 'engine-web');
export const PINS = JSON.parse(fs.readFileSync(path.join(TOOLS, 'pins.json'), 'utf8'));

export class StepError extends Error {}

export function log(msg) {
  process.stdout.write(`[tools] ${msg}\n`);
}

/** Runs a command, streams output, throws StepError with a hint on failure. */
export function run(cmd, args, { cwd = TOOLS, hint = '', env = {} } = {}) {
  log(`$ ${[cmd, ...args].join(' ')}   (in ${path.relative(REPO, cwd) || '.'})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) {
    throw new StepError(`Command failed (exit ${r.status}): ${cmd} ${args.join(' ')}${hint ? `\n  Hint: ${hint}` : ''}`);
  }
}

/** Runs a command and returns trimmed stdout (no streaming). */
export function capture(cmd, args, { cwd = TOOLS } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new StepError(`Command failed: ${cmd} ${args.join(' ')}\n${r.stderr}`);
  return r.stdout.trim();
}

/** Uuid compression used by Cocos to reference script classes in scenes (5 hex + base64). */
export function compressUuid(uuid) {
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const h = uuid.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/.test(h)) throw new Error(`Bad uuid: ${uuid}`);
  let r = h.slice(0, 5);
  for (let i = 5; i < 32; i += 3) {
    const v = parseInt(h.substr(i, 3), 16);
    r += B[v >> 6] + B[v & 63];
  }
  return r;
}

export const NETWORK_HINT =
  'Network download failed. In the cloud container, read /root/.ccr/README.md and run ' +
  '`curl -sS "$HTTPS_PROXY/__agentproxy/status"`. A 403/407 means the host is blocked by policy: report it, do not work around it.';
