// Sanity-checks a packaged .vsix before it is published: identity, author,
// icons, and that the marketplace README and CHANGELOG made it into the package.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const vsixPath = process.argv[2];
if (!vsixPath) {
  console.error('Usage: node scripts/verify-vsix.js <extension.vsix>');
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

function readEntry(entry) {
  return execFileSync('unzip', ['-p', vsixPath, entry], { encoding: 'utf8' });
}

function listEntries() {
  return execFileSync('unzip', ['-Z1', vsixPath], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

try {
  const manifest = readEntry('extension.vsixmanifest');
  const pkg = JSON.parse(readEntry('extension/package.json'));
  const entries = listEntries();
  const identity = manifest.match(/<Identity\b[^>]*\bId="([^"]+)"[^>]*\bVersion="([^"]+)"[^>]*\bPublisher="([^"]+)"/);
  const expectedId = `${source.publisher}.${source.name}`;

  if (!identity || `${identity[3]}.${identity[1]}` !== expectedId) {
    throw new Error(`VSIX identity must be ${expectedId}`);
  }
  if (identity[2] !== source.version) {
    throw new Error(`VSIX version ${identity[2]} does not match package.json ${source.version}`);
  }
  if (pkg.publisher !== source.publisher || pkg.name !== source.name || pkg.author !== source.author) {
    throw new Error('Packaged manifest identity/author differs from package.json');
  }

  const activityIcon = pkg.contributes.viewsContainers.activitybar[0].icon;
  for (const asset of [pkg.icon, activityIcon, 'dist/extension.js', 'dist/webview/index.js']) {
    if (!entries.includes(`extension/${asset}`)) throw new Error(`Missing packaged file: ${asset}`);
  }

  const readmeEntry = entries.find((e) => /^extension\/readme\.md$/i.test(e));
  if (!readmeEntry) throw new Error('Missing packaged README');
  const readme = readEntry(readmeEntry);
  if (/developer guide|npm run |git clone|## Repository layout/i.test(readme)) {
    throw new Error('Packaged README looks like the developer README; package with --readme-path docs/marketplace/README.md');
  }
  if (!entries.some((e) => /^extension\/changelog\.md$/i.test(e))) {
    throw new Error('Missing packaged CHANGELOG');
  }

  const forbidden = entries.filter((e) => /^extension\/(src|test|webview-ui|openspec|node_modules|\.github)\//.test(e) || e.endsWith('.map'));
  if (forbidden.length) throw new Error(`Development files leaked into the package: ${forbidden.slice(0, 5).join(', ')}`);

  console.log(`Verified ${path.basename(vsixPath)}: ${expectedId}@${source.version}, assets, README, CHANGELOG (${entries.length} files)`);
} catch (error) {
  console.error(`VSIX verification failed: ${error.message}`);
  process.exit(1);
}
