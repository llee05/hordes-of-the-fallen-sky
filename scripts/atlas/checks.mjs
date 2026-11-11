// Inspection reports and pass/warn/fail checks for terrain tiles and texture atlases, used by
// scripts/atlas/inspect.mjs and validate.mjs (docs/visual-workflow.md). Pure: no file access.
import {
  alphaCoverage,
  croppedSides,
  edgeFringe,
  frameSpacing,
  measure,
  mipSafeLevel,
  mipSeams,
  paintBounds,
  quarterContrast,
  seam,
  TILE_UNITS_PER_TEXEL,
  unitsPerTexel,
} from './analysis.mjs';
import { crop, isPowerOfTwo } from './image.mjs';

/** Default limits; each can be overridden per call. */
export const LIMITS = {
  /** Wrap-to-interior colour step: about 1 is seamless (docs/art-spec.md measured 0.82–1.06). */
  seamWarn: 1.25,
  seamFail: 1.6,
  /** The same score on the mip chain, down to 16 texels. */
  mipSeamWarn: 1.5,
  /** Allowed texel density difference from the expected units per texel. */
  densityTolerance: 0.05,
  /** L* spread between a tile's quarters above which its repeat reads from afar. */
  quarterSpreadWarn: 4,
  /** Empty texels required between atlas frames. */
  padding: 2,
  /** Mip levels that must stay free of neighbouring frames when the atlas is mipmapped. */
  mipLevels: 2,
  /** Share of a cutout's outline texels that may be near white. */
  lightOutlineWarn: 0.02,
  lightOutlineFail: 0.08,
  /** Share of transparent texels beside paint that may hold white or black colour. */
  transparentColourWarn: 0.25,
};

const check = (id, status, value, detail) => ({ id, status, value, detail });
const grade = (value, warn, fail) => (value > fail ? 'fail' : value > warn ? 'warn' : 'pass');

/** Frames for a regular grid of `cell`-texel cells, named `c<column>r<row>`. */
export function gridFrames(size, cell) {
  const frames = {};
  for (let row = 0; row * cell < size.h; row++)
    for (let column = 0; column * cell < size.w; column++)
      frames[`c${column}r${row}`] = {
        x: column * cell,
        y: row * cell,
        w: Math.min(cell, size.w - column * cell),
        h: Math.min(cell, size.h - row * cell),
      };
  return frames;
}

/** Dimensions, alpha coverage, colour statistics and, with frames, per-frame painted bounds. */
export function inspect(img, frames) {
  const report = {
    size: { w: img.w, h: img.h },
    powerOfTwo: isPowerOfTwo(img.w) && isPowerOfTwo(img.h),
    alpha: alphaCoverage(img),
    colour: measure([img]),
  };
  if (!frames) return { ...report, tile: { ...seam(img), ...quarterContrast(img) } };
  report.frames = Object.fromEntries(
    Object.entries(frames).map(([name, rect]) => {
      const piece = crop(img, rect);
      const bounds = paintBounds(img, rect);
      return [
        name,
        {
          rect,
          bounds,
          croppedSides: croppedSides(img, rect),
          alpha: alphaCoverage(piece),
          lightness: bounds ? measure([piece]).lightness : null,
          edge: edgeFringe(img, rect),
        },
      ];
    }),
  );
  return report;
}

/**
 * Checks for a repeating terrain tile. `worldSize` is the world units one repeat covers along x
 * (default from `expectedUnitsPerTexel`), `axes` the directions it wraps ('x' for bank bands).
 */
export function validateTile(img, options = {}) {
  const limits = { ...LIMITS, ...options.limits };
  const axes = options.axes ?? 'xy';
  const expected = options.expectedUnitsPerTexel ?? TILE_UNITS_PER_TEXEL;
  const worldSize = options.worldSize ?? expected * img.w;
  const checks = [];
  // Only the wrapping axes need to halve evenly down the mip chain.
  const pot =
    (!axes.includes('x') || isPowerOfTwo(img.w)) && (!axes.includes('y') || isPowerOfTwo(img.h));
  checks.push(
    check(
      'mip-power-of-two',
      pot ? 'pass' : 'warn',
      [img.w, img.h],
      pot ? `mip chain halves evenly along ${axes}` : 'mip levels round and stop wrapping cleanly',
    ),
  );
  const alpha = alphaCoverage(img);
  checks.push(
    check(
      'opaque',
      alpha.opaque === 1 ? 'pass' : 'warn',
      alpha,
      'ground tiles should hold no transparency',
    ),
  );
  const wrap = seam(img, axes);
  checks.push(
    check(
      'seam',
      grade(wrap.seam, limits.seamWarn, limits.seamFail),
      wrap.seam,
      `wrap step / interior step on ${axes} (1 is seamless)`,
    ),
  );
  const levels = mipSeams(img, 16, axes);
  const worst = levels.reduce((a, b) => (b.seam > a.seam ? b : a), levels[0]);
  checks.push(
    check(
      'mip-seams',
      worst && worst.seam > limits.mipSeamWarn ? 'warn' : 'pass',
      levels,
      worst ? `worst ${worst.seam} at ${worst.size.join('x')}` : 'too small for a mip chain',
    ),
  );
  const density = unitsPerTexel(worldSize, img.w);
  const off = Math.abs(density / expected - 1);
  checks.push(
    check(
      'texel-density',
      off <= limits.densityTolerance ? 'pass' : 'fail',
      Math.round(density * 1000) / 1000,
      `units per texel; expected ${Math.round(expected * 1000) / 1000} (docs/art-spec.md)`,
    ),
  );
  const quarters = quarterContrast(img, axes);
  checks.push(
    check(
      'repeat-contrast',
      quarters.spread > limits.quarterSpreadWarn ? 'warn' : 'pass',
      quarters,
      `L* spread between tile ${axes === 'x' ? 'halves' : 'quarters'}; a lighter or darker part marks the repeat`,
    ),
  );
  return checks;
}

/** Checks for a packed atlas with frame rectangles `frames` ({ name: { x, y, w, h } }). */
export function validateAtlas(img, frames, options = {}) {
  const limits = { ...LIMITS, ...options.limits };
  const size = { w: img.w, h: img.h };
  const checks = [];
  const pot = isPowerOfTwo(img.w) && isPowerOfTwo(img.h);
  checks.push(check('mip-power-of-two', pot ? 'pass' : 'warn', [img.w, img.h], ''));
  const outside = Object.entries(frames).filter(
    ([, r]) => r.x < 0 || r.y < 0 || r.x + r.w > img.w || r.y + r.h > img.h,
  );
  checks.push(
    check(
      'frames-in-bounds',
      outside.length ? 'fail' : 'pass',
      outside.map(([name]) => name),
      'frames inside the atlas image',
    ),
  );
  if (outside.length) return checks;
  const spacing = frameSpacing(frames, size);
  checks.push(
    check(
      'frames-touching',
      spacing.touching.length ? 'fail' : 'pass',
      spacing.touching,
      'frame pairs that touch (gap 0) or overlap (negative)',
    ),
  );
  const gap = spacing.minGap ?? Infinity;
  checks.push(
    check(
      'frame-padding',
      gap >= limits.padding ? 'pass' : spacing.touching.length ? 'fail' : 'warn',
      { minGap: spacing.minGap, minEdge: spacing.minEdge },
      `at least ${limits.padding} empty texels between frames`,
    ),
  );
  const level = mipSafeLevel(frames, size);
  checks.push(
    check(
      'mip-bleed',
      level >= limits.mipLevels ? 'pass' : options.mipmaps === false ? 'pass' : 'warn',
      level,
      `deepest mip level that samples no neighbouring frame${options.mipmaps === false ? ' (atlas is not mipmapped)' : ''}`,
    ),
  );
  const atEdge = [];
  const light = [];
  const unbled = [];
  let worstLight = 0;
  for (const [name, rect] of Object.entries(frames)) {
    const cropped = croppedSides(img, rect);
    if (cropped.length) atEdge.push([name, cropped]);
    const edge = edgeFringe(img, rect);
    worstLight = Math.max(worstLight, edge.lightOutline);
    if (edge.lightOutline > limits.lightOutlineWarn) light.push([name, edge.lightOutline]);
    const dark = Math.max(edge.transparentWhite, edge.transparentBlack);
    if (dark > limits.transparentColourWarn)
      unbled.push([name, { white: edge.transparentWhite, black: edge.transparentBlack }]);
  }
  checks.push(
    check(
      'cropped-edge',
      atEdge.length ? 'warn' : 'pass',
      atEdge,
      'frame sides cut straight through opaque paint (a visible crop line unless the renderer hides it)',
    ),
  );
  checks.push(
    check(
      'white-fringe',
      grade(worstLight, limits.lightOutlineWarn, limits.lightOutlineFail),
      light,
      'share of outline texels that are near white',
    ),
  );
  checks.push(
    check(
      'transparent-colour',
      unbled.length ? 'warn' : 'pass',
      unbled,
      'transparent texels beside paint holding white or black (straight-alpha filtering pulls them in)',
    ),
  );
  return checks;
}

/** The worst status in a list of checks. */
export const worstStatus = (checks) =>
  checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'pass';
