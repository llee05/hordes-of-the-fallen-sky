// Assemble a texture atlas from separate PNG pieces: shelf-packed tallest first, each piece
// surrounded by `--padding` empty texels, its edge texels extruded `--extrude` texels into that
// padding (so bilinear and mip sampling at the frame edge reads the piece's own colour), plus a
// Phaser/TexturePacker hash JSON whose frames are the unextruded pieces. Development-only.
// Usage:
//   npm run atlas:assemble -- --out <dir/name> [--width 1024] [--padding 4] [--extrude 2]
//     [--trim] [--bleed] <piece.png>...
// --trim crops transparent margins; --bleed fills transparent texels with nearby paint colour.
// Frames are named after the piece files. See docs/visual-workflow.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { bleed, compose, extrude, frameMap, shelfPack, trim } from './image.mjs';
import { readImage, writeImage } from './io.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    width: { type: 'string', default: '1024' },
    padding: { type: 'string', default: '4' },
    extrude: { type: 'string', default: '2' },
    trim: { type: 'boolean' },
    bleed: { type: 'boolean' },
  },
});
if (!values.out || !positionals.length)
  throw new Error('Usage: atlas:assemble -- --out <dir/name> [options] <piece.png>...');
const width = Number(values.width);
const padding = Number(values.padding);
const grow = Number(values.extrude);
if (grow * 2 > padding)
  throw new Error(`--extrude ${grow} needs --padding of at least ${grow * 2} so frames stay apart`);

const pieces = [];
for (const file of positionals) {
  let img = await readImage(resolve(file));
  if (values.trim) img = trim(img).img;
  if (values.bleed) img = bleed({ ...img, data: Float32Array.from(img.data) });
  pieces.push({ name: basename(file, extname(file)), img });
}
// Pack the extruded pieces with the remaining gutter between them.
const grown = pieces.map((piece) => extrude(piece.img, grow));
const { positions, height } = shelfPack(grown, { width, gutter: padding - grow });
const out = resolve(values.out);
mkdirSync(dirname(out), { recursive: true });
await writeImage(
  compose(
    grown.map((img, i) => ({ img, ...positions[i] })),
    width,
    height,
  ),
  `${out}.png`,
);
const map = frameMap(
  pieces.map((piece, i) => [
    piece.name,
    { x: positions[i].x + grow, y: positions[i].y + grow, w: piece.img.w, h: piece.img.h },
  ]),
  {
    app: 'scripts/atlas/assemble.mjs',
    image: `${basename(out)}.png`,
    format: 'RGBA8888',
    size: { w: width, h: height },
    scale: '1',
    padding,
    extrude: grow,
  },
);
writeFileSync(`${out}.json`, `${JSON.stringify(map, null, 2)}\n`);
console.log(`Wrote ${out}.png (${width}x${height}) and ${out}.json with ${pieces.length} frames.`);
