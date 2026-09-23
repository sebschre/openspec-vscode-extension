import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

describe('Marketplace Publish Preparation & Branding Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const pkgPath = path.join(rootDir, 'package.json');
  const readmePath = path.join(rootDir, 'README.md');
  const iconPath = path.join(rootDir, 'icon.png');
  const resourcesIconPath = path.join(rootDir, 'resources', 'icon.png');
  const badgePath = path.join(rootDir, 'resources', 'badge.png');

  it('should have valid author attribution in package.json', () => {
    assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.author, 'package.json must contain author field');
    assert.strictEqual(
      pkg.author,
      'Sebastian Schreiber <dev@sebastian-schreiber.com>',
      'Author attribution must match Sebastian Schreiber <dev@sebastian-schreiber.com>'
    );
  });

  it('should have valid extension icon in package.json and filesystem', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.ok(pkg.icon, 'package.json must contain top-level icon field');
    assert.strictEqual(pkg.icon, 'icon.png', 'Top-level icon must be icon.png');

    assert.ok(fs.existsSync(iconPath), 'icon.png must exist at repository root');
    const iconBuffer = fs.readFileSync(iconPath);

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(
      iconBuffer.subarray(0, 8).equals(pngSignature),
      true,
      'Icon must be a valid PNG (non-SVG)'
    );

    // IHDR width and height
    const width = iconBuffer.readUInt32BE(16);
    const height = iconBuffer.readUInt32BE(20);
    assert.ok(width >= 128, `Icon width must be at least 128px, got ${width}`);
    assert.ok(height >= 128, `Icon height must be at least 128px, got ${height}`);
  });

  it('should configure activity bar container icon with the OpenSpec icon', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const activityBar = pkg.contributes?.viewsContainers?.activitybar;

    assert.ok(Array.isArray(activityBar), 'Activity bar containers must be defined');
    const openspecContainer = activityBar.find((c: any) => c.id === 'openspec');
    assert.ok(openspecContainer, 'OpenSpec activity bar container must exist');
    assert.strictEqual(
      openspecContainer.icon,
      'resources/icon.png',
      'Activity bar container icon must reference resources/icon.png'
    );

    assert.ok(fs.existsSync(resourcesIconPath), 'resources/icon.png must exist');
    const resourceIconBuffer = fs.readFileSync(resourcesIconPath);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(
      resourceIconBuffer.subarray(0, 8).equals(pngSignature),
      true,
      'resources/icon.png must be a valid PNG'
    );
  });

  it('should provide a branded badge depicting the OpenSpec icon and referenced in README.md', () => {
    assert.ok(fs.existsSync(badgePath), 'resources/badge.png must exist');
    const badgeBuffer = fs.readFileSync(badgePath);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(
      badgeBuffer.subarray(0, 8).equals(pngSignature),
      true,
      'resources/badge.png must be a valid PNG (non-SVG)'
    );

    assert.ok(fs.existsSync(readmePath), 'README.md must exist');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    assert.ok(
      readmeContent.includes('resources/badge.png'),
      'README.md must reference the OpenSpec badge image (resources/badge.png)'
    );
  });
});
