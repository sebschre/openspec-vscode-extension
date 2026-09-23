const { execFileSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const vsix = path.join(root, 'artifacts', 'extension.vsix');

mkdirSync(path.dirname(vsix), { recursive: true });
execFileSync(process.execPath, [require.resolve('@vscode/vsce/vsce'), 'package', '--no-dependencies', '--out', vsix], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(process.execPath, [path.join(__dirname, 'verify-vsix.js'), vsix, pkg.version], {
  cwd: root,
  stdio: 'inherit',
});
