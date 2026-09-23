import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

function readPng(filePath: string) {
  const data = fs.readFileSync(filePath);
  assert.ok(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${filePath} must be PNG`);

  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  for (let offset = 8; offset < data.length;) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      assert.strictEqual(chunk[8], 8, 'PNG must use 8-bit channels');
      assert.strictEqual(chunk[9], 6, 'PNG must be RGBA');
      assert.strictEqual(chunk[12], 0, 'PNG must not be interlaced');
    } else if (type === 'IDAT') {
      idat.push(chunk);
    }
    offset += 12 + length;
    if (type === 'IEND') break;
  }

  const scanlines = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  const rowLength = width * 4;
  let source = 0;
  for (let y = 0; y < height; y++) {
    const filter = scanlines[source++];
    for (let x = 0; x < rowLength; x++) {
      const target = y * rowLength + x;
      const left = x >= 4 ? pixels[target - 4] : 0;
      const above = y ? pixels[target - rowLength] : 0;
      const upperLeft = y && x >= 4 ? pixels[target - rowLength - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const a = Math.abs(p - left);
        const b = Math.abs(p - above);
        const c = Math.abs(p - upperLeft);
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft;
      } else assert.strictEqual(filter, 0, 'Unsupported PNG scanline filter');
      pixels[target] = (scanlines[source++] + predictor) & 255;
    }
  }

  return {
    width,
    height,
    pixel(x: number, y: number) {
      const offset = (y * width + x) * 4;
      return [...pixels.subarray(offset, offset + 4)];
    },
  };
}

describe('Marketplace package branding', () => {
  it('uses Sebastian Schreiber and the sebschre publisher identity', () => {
    assert.strictEqual(pkg.author, 'Sebastian Schreiber <dev@sebastian-schreiber.com>');
    assert.strictEqual(`${pkg.publisher}.${pkg.name}`, 'sebschre.openspec-vscode');
  });

  it('provides a transparent PNG marketplace icon with a dark outline', () => {
    assert.strictEqual(pkg.icon, 'resources/icon.png');
    const icon = readPng(path.join(rootDir, pkg.icon));
    assert.ok(icon.width >= 128 && icon.height >= 128);
    assert.strictEqual(icon.pixel(0, 0)[3], 0, 'Top-left corner must be transparent');
    assert.strictEqual(icon.pixel(icon.width - 1, icon.height - 1)[3], 0, 'Bottom-right corner must be transparent');

    let lightPixels = 0;
    let darkOutlinePixels = 0;
    for (let y = 0; y < icon.height; y++) {
      for (let x = 0; x < icon.width; x++) {
        const [red, green, blue, alpha] = icon.pixel(x, y);
        if (alpha > 240 && red > 230 && green > 230 && blue > 230) lightPixels++;
        if (alpha > 240 && red < 60 && green < 60 && blue < 60) darkOutlinePixels++;
      }
    }
    assert.ok(lightPixels > 1000, 'OpenSpec mark must have a visible light interior');
    assert.ok(darkOutlinePixels > 100, 'OpenSpec mark must have a dark outline');
  });

  it('uses a separate transparent 24×24 monochrome Activity Bar icon', () => {
    const container = pkg.contributes.viewsContainers.activitybar.find((item: { id: string }) => item.id === 'openspec');
    assert.ok(container);
    assert.strictEqual(container.icon, 'resources/activitybar.svg');
    assert.notStrictEqual(container.icon, pkg.icon);
    const svg = fs.readFileSync(path.join(rootDir, container.icon), 'utf8');
    assert.match(svg, /width="24" height="24" viewBox="0 0 24 24"/);
    assert.match(svg, /fill="none"/);
    assert.match(svg, /fill="#d7dae0"/);
    assert.doesNotMatch(svg, /<rect\b/, 'Activity Bar icon must not include a filled background');
  });

  it('keeps the badge mark aligned with the marketplace icon', () => {
    const badge = readPng(path.join(rootDir, 'resources', 'badge.png'));
    assert.strictEqual(badge.width, 220);
    assert.strictEqual(badge.height, 40);
    assert.strictEqual(badge.pixel(0, 0)[3], 0, 'Badge corner must remain transparent');
    for (const [x, y] of [[24, 12], [18, 20], [24, 20], [30, 20], [24, 26]]) {
      const [red, green, blue, alpha] = badge.pixel(x, y);
      assert.ok(alpha > 200 && red > 180 && green > 180 && blue > 180, `Badge mark missing at ${x},${y}`);
    }
  });
});
