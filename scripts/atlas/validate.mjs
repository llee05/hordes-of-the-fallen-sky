// Validate terrain tiles and texture atlases against docs/art-spec.md and the renderer's sampling:
// tile seams (also down the mip chain), power-of-two mip readiness, texel density, repeat
// contrast; atlas frame padding, touching frames, mip bleed between frames, paint at frame edges,
// white fringes and unbled transparent texels. Development-only; changes no files.
// Usage:
//   npm run atlas:validate -- <tile.png> [--axes x] [--world-size <units per repeat>]
//   npm run atlas:validate -- <atlas.png> --frames <atlas.json> [--no-mipmaps] [--padding <px>]
//   npm run atlas:orkhon            # every Orkhon Valley tile and atlas the renderer loads
// Add --json for the full report. Exits 1 when any check fails. See docs/visual-workflow.md.
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { validateAtlas, validateTile, worstStatus } from './checks.mjs';
import { readFrames, readImage } from './io.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const orkhon = join(root, 'public/art/orkhon-valley');

/** Every Orkhon texture with the way World3DRenderer and the Orkhon overlay sample it. */
const ORKHON = [
  ...[
    'valley_calm',
    'valley_straw',
    'valley_olive',
    'plateau_moss',
    'trail_dirt',
    'scree_gravel',
  ].map((name) => ({ file: join(orkhon, `ground/${name}.png`) })),
  ...['river_channel', 'river_rapids'].map((name) => ({ file: join(orkhon, `water/${name}.png`) })),
  // Bank bands repeat along the shore only.
  ...['bank_far', 'bank_near'].map((name) => ({
    file: join(orkhon, `water/${name}.png`),
    axes: 'x',
  })),
  // The overlay mipmaps the kit atlas; the cliff walls sample the same image without mipmaps.
  { file: join(orkhon, 'orkhon-terrain-kit.png'), frames: join(orkhon, 'orkhon-terrain-kit.json') },
  {
    file: join(orkhon, 'orkhon-valley-sprites.png'),
    frames: join(orkhon, 'orkhon-valley-sprites.json'),
    mipmaps: false,
  },
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    frames: { type: 'string' },
    axes: { type: 'string' },
    'world-size': { type: 'string' },
    padding: { type: 'string' },
    'no-mipmaps': { type: 'boolean' },
    orkhon: { type: 'boolean' },
    json: { type: 'boolean' },
  },
});
const targets = values.orkhon
  ? ORKHON
  : positionals.map((file) => ({
      file: resolve(file),
      frames: values.frames && resolve(values.frames),
      axes: values.axes,
      worldSize: values['world-size'] && Number(values['world-size']),
      mipmaps: !values['no-mipmaps'],
    }));
if (!targets.length)
  throw new Error('Usage: atlas:validate -- <image.png> [--frames <atlas.json>] | --orkhon');

const limits = values.padding ? { padding: Number(values.padding) } : {};
const reports = [];
for (const target of targets) {
  const img = await readImage(target.file);
  const checks = target.frames
    ? validateAtlas(img, readFrames(target.frames), { mipmaps: target.mipmaps, limits })
    : validateTile(img, { axes: target.axes, worldSize: target.worldSize, limits });
  reports.push({ file: relative(root, target.file), status: worstStatus(checks), checks });
}
if (values.json) console.log(JSON.stringify(reports, null, 2));
else
  for (const report of reports) {
    console.log(`${report.status.toUpperCase().padEnd(4)} ${report.file}`);
    for (const c of report.checks)
      if (c.status !== 'pass' || process.env.ATLAS_VERBOSE)
        console.log(`  ${c.status.padEnd(4)} ${c.id}: ${JSON.stringify(c.value)} ${c.detail}`);
  }
if (reports.some((report) => report.status === 'fail')) process.exitCode = 1;
