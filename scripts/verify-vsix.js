const { execFileSync } = require('node:child_process');
const path = require('node:path');

const vsixPath = process.argv[2];
if (!vsixPath) {
  console.error('Usage: node scripts/verify-vsix.js <extension.vsix>');
  process.exit(1);
}

function readEntry(entry) {
  return execFileSync('unzip', ['-p', vsixPath, entry], { encoding: 'utf8' });
}

try {
  const manifest = readEntry('extension.vsixmanifest');
  const pkg = JSON.parse(readEntry('extension/package.json'));
  const expectedPublisher = 'sebschre';
  const expectedName = 'openspec-vscode-extension';
  const identity = manifest.match(/<Identity\b[^>]*\bId="([^"]+)"[^>]*\bPublisher="([^"]+)"/);

  if (!identity || identity[1] !== expectedName || identity[2] !== expectedPublisher) {
    throw new Error(`VSIX identity must be ${expectedPublisher}.${expectedName}`);
  }
  if (pkg.name !== expectedName || pkg.publisher !== expectedPublisher) {
    throw new Error(`Packaged manifest identity must be ${expectedPublisher}.${expectedName}`);
  }
  const expectedVersion = process.argv[3];
  if (expectedVersion && (pkg.version !== expectedVersion || !manifest.includes(`Version="${expectedVersion}"`))) {
    throw new Error(`Packaged version must be ${expectedVersion}`);
  }
  if (pkg.author !== 'Sebastian Schreiber <dev@sebastian-schreiber.com>') {
    throw new Error('Packaged author must be Sebastian Schreiber');
  }
  if (pkg.icon !== 'resources/icon.png' || pkg.contributes.viewsContainers.activitybar[0].icon !== 'resources/activitybar.svg') {
    throw new Error('Packaged icon paths do not match the intended assets');
  }

  for (const asset of [pkg.icon, pkg.contributes.viewsContainers.activitybar[0].icon]) {
    execFileSync('unzip', ['-t', vsixPath, `extension/${asset}`], { stdio: 'pipe' });
  }

  console.log(`Verified ${path.basename(vsixPath)}: ${expectedPublisher}.${expectedName}, author, and icon assets`);
} catch (error) {
  console.error(`VSIX verification failed: ${error.message}`);
  process.exit(1);
}
