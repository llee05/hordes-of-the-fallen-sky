export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
export const mix = (a: number, b: number, amount: number): number => a + (b - a) * amount;
export function smoothstep(low: number, high: number, value: number): number {
  const t = clamp01((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

export function terrainSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function lattice(x: number, y: number, seed: number): number {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

/** Quintic interpolated value noise, continuous across negative coordinates and chunk edges. */
export function coherentNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const tx = fade(x - ix);
  const ty = fade(y - iy);
  return mix(
    mix(lattice(ix, iy, seed), lattice(ix + 1, iy, seed), tx),
    mix(lattice(ix, iy + 1, seed), lattice(ix + 1, iy + 1, seed), tx),
    ty,
  );
}

export function fractalNoise(x: number, y: number, seed: number, ridged = false): number {
  let total = 0;
  let amplitude = 1;
  let normalization = 0;
  for (let octave = 0; octave < 4; octave++) {
    let value = coherentNoise(x, y, seed + octave * 1013);
    if (ridged) value = (1 - Math.abs(value * 2 - 1)) ** 2;
    total += value * amplitude;
    normalization += amplitude;
    amplitude *= ridged ? 0.32 : 0.48;
    x *= 2;
    y *= 2;
  }
  return total / normalization;
}
