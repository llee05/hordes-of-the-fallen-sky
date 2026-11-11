// Inspect a texture or atlas: dimensions, alpha coverage, colour statistics, and per-frame painted
// bounds, alpha and edge colour. Development-only; prints JSON and changes no files.
// Usage:
//   npm run atlas:inspect -- <image.png> [--frames <atlas.json>] [--grid <cell pixels>]
// Without frames, the image is treated as a tile (seam score and quarter lightness included).
// `--grid 256` splits a source sheet into cells named c<column>r<row>. See docs/visual-workflow.md.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gridFrames, inspect } from './checks.mjs';
import { readFrames, readImage } from './io.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { frames: { type: 'string' }, grid: { type: 'string' } },
});
if (positionals.length !== 1)
  throw new Error('Usage: atlas:inspect -- <image.png> [--frames <atlas.json>] [--grid <cell>]');
const file = resolve(positionals[0]);
const img = await readImage(file);
const frames = values.frames
  ? readFrames(resolve(values.frames))
  : values.grid
    ? gridFrames(img, Number(values.grid))
    : undefined;
console.log(JSON.stringify({ file, ...inspect(img, frames) }, null, 2));
