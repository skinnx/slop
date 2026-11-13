import { boot, until, read, st } from './lib/qa.mjs';
export default async function (h) {
  await boot(h);
  await h.tap(360, 640);
  await until(h, (g) => g.mode === 'WORLD');
  await h.wait(600);
  await h.screenshot('00-start');
  const s = await st(h);
  h.note(JSON.stringify(s));
  h.note(JSON.stringify(await read(h, (g) => g.fieldHud)));
  h.note('H=' + await read(h, (g) => g.H));
}
