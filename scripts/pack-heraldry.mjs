// Development-only atlas packing. Requires ImageMagick; never runs in the game.
// Repacking preserves every pixel and rectangle in the original rider region.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const art = join(root, 'public/art');
const source = join(art, 'steppe-heraldry-source.png');
const image = join(art, 'steppe-classes-motion.png');
const metadata = join(art, 'steppe-classes-motion.json');
const temporary = mkdtempSync(join(tmpdir(), 'steppe-heraldry-'));
const magick = (...args) => {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'ImageMagick is required');
  return result.stdout.trim();
};
const pieces = [
  'emblem-flame-sun',
  'emblem-wolf',
  'emblem-hawk',
  'emblem-cloud',
  'emblem-knot',
  'trim-steppe-fret',
  'trim-cloud-scroll',
  'trim-horn-curl',
  'trim-braided-cord',
  'trim-lattice-band',
  'pole',
  'field',
];

try {
  const [sourceWidth, sourceHeight] = magick(source, '-format', '%w %h', 'info:')
    .split(' ')
    .map(Number);
  const atlas = JSON.parse(readFileSync(metadata, 'utf8'));
  const base = join(temporary, 'riders.png');
  magick(image, '-crop', '1536x1024+0+0', '+repage', base);
  const composite = ['-size', '1536x1744', 'canvas:none', base, '-geometry', '+0+0', '-composite'];
  for (const [index, piece] of pieces.entries()) {
    const col = index % 4,
      row = Math.floor(index / 4);
    const x = Math.floor((col * sourceWidth) / 4),
      y = Math.floor((row * sourceHeight) / 3);
    const w = Math.floor(((col + 1) * sourceWidth) / 4) - x;
    const h = Math.floor(((row + 1) * sourceHeight) / 3) - y;
    const cell = join(temporary, `cell-${index}.png`);
    magick(source, '-crop', `${w}x${h}+${x}+${y}`, '+repage', cell);
    const bounds = magick(
      cell,
      '-alpha',
      'extract',
      '-threshold',
      '5%',
      '-trim',
      '-format',
      '%wx%h%X%Y',
      'info:',
    );
    const match = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(bounds);
    if (!match) throw new Error(`No painted alpha for ${piece}: ${bounds}`);
    const [, bw, bh, bx, by] = match;
    const fragment = join(temporary, `fragment-${index}.png`);
    const emblem = piece.startsWith('emblem');
    magick(
      cell,
      '-crop',
      `${bw}x${bh}+${bx}+${by}`,
      '+repage',
      '-resize',
      emblem ? '70x76' : piece === 'pole' ? '48x300!' : '190x126!',
      fragment,
    );
    const [fw, fh] = magick(fragment, '-format', '%w %h', 'info:').split(' ').map(Number);
    const ax = (index % 6) * 256 + 2,
      ay = 1024 + Math.floor(index / 6) * 360 + 2;
    composite.push(fragment, '-geometry', `+${ax}+${ay}`, '-composite');
    const logicalX = emblem ? Math.round(140 - fw / 2) : piece === 'pole' ? 10 : 45;
    const logicalY = emblem ? Math.round(113 - fh / 2) : piece === 'pole' ? 324 - fh : 50;
    atlas.frames[`banner-${piece}`] = {
      frame: { x: ax, y: ay, w: fw, h: fh },
      rotated: false,
      trimmed: true,
      spriteSourceSize: { x: logicalX, y: logicalY, w: fw, h: fh },
      sourceSize: { w: 256, h: 360 },
    };
  }
  const output = join(temporary, 'packed.png');
  magick(...composite, output);
  writeFileSync(image, readFileSync(output));
  atlas.meta.size = { w: 1536, h: 1744 };
  writeFileSync(metadata, JSON.stringify(atlas, null, 2) + '\n');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
