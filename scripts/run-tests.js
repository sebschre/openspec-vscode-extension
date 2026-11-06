// Bundles every test/*.test.ts with esbuild (aliasing `vscode` to the mock) and
// runs them with the built-in Node test runner.
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outdir = path.join(root, 'dist-test');
const filter = process.argv.slice(2);

const entryPoints = fs
  .readdirSync(path.join(root, 'test'))
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => filter.length === 0 || filter.some((needle) => f.includes(needle)))
  .map((f) => path.join('test', f));

if (entryPoints.length === 0) {
  console.error(`No test files match: ${filter.join(', ')}`);
  process.exit(1);
}

fs.rmSync(outdir, { recursive: true, force: true });
esbuild.buildSync({
  absWorkingDir: root,
  entryPoints,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outdir,
  alias: { vscode: './test/mockVscode.ts' },
  logLevel: 'warning',
});

const files = entryPoints.map((e) => path.join(outdir, path.basename(e).replace(/\.ts$/, '.js')));
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, OPENSPEC_TELEMETRY: '0' },
});
process.exit(result.status ?? 1);
