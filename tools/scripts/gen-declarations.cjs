// Writes what the 3.8 editor writes to <project>/temp for IDE/tsc: tsconfig.cocos.json + declarations/.
// Usage: node gen-declarations.cjs <engineDir with bin/.declarations/cc.d.ts> <projectDir>
const fs = require('fs');
const path = require('path');
const [engine, project] = process.argv.slice(2).map((p) => path.resolve(p));
const { StatsQuery } = require(path.join(engine, 'node_modules/@cocos/ccbuild'));
(async () => {
  const decl = path.join(project, 'temp/declarations');
  fs.mkdirSync(decl, { recursive: true });
  const ccDts = path.join(engine, 'bin/.declarations/cc.d.ts');
  if (!fs.existsSync(ccDts)) throw new Error(`Missing ${ccDts}. Run "npm run setup" in tools/.`);
  fs.writeFileSync(path.join(decl, 'cc.d.ts'),
    fs.readFileSync(ccDts, 'utf8') +
    '\n/** @deprecated Global variable `cc` was dropped since 3.0. Use ES6 module syntax to import Cocos Creator APIs. */\ndeclare const cc: never;\n');
  const sq = await StatsQuery.create(engine);
  fs.writeFileSync(path.join(decl, 'cc.env.d.ts'), sq.constantManager.genCCEnv());
  fs.copyFileSync(path.join(engine, '@types/jsb.d.ts'), path.join(decl, 'jsb.d.ts'));
  fs.writeFileSync(path.join(decl, 'cc.custom-macro.d.ts'), 'declare module "cc/userland/macro" {\n}\n');
  // Mirrors the editor's generated config (cocos-cli src/core/scripting/intelligence/index.ts).
  const tsconfig = {
    $schema: 'https://json.schemastore.org/tsconfig',
    compilerOptions: {
      target: 'ES2015', module: 'ES2015', strict: true, strictNullChecks: false, noImplicitAny: false,
      strictPropertyInitialization: false,
      // Like the editor: type paths are written relative to the project's own tsconfig.json.
      types: ['./temp/declarations/cc', './temp/declarations/jsb', './temp/declarations/cc.env', './temp/declarations/cc.custom-macro'],
      paths: { 'db://assets/*': ['../assets/*'] },
      experimentalDecorators: true, isolatedModules: true, moduleResolution: 'node', noEmit: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['../assets/**/*', '../extensions/**/*'],
    exclude: ['../node_modules', '../library', '../local', '../build', '../profiles'],
  };
  fs.writeFileSync(path.join(project, 'temp/tsconfig.cocos.json'), JSON.stringify(tsconfig, null, 2));
  console.log('[tools] declarations written to ' + decl);
})().catch((e) => { console.error('[tools] gen-declarations FAILED', e); process.exit(1); });
