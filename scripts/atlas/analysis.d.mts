import type { Img, Rect } from './image.mjs';

export const TILE_UNITS_PER_TEXEL: number;
export function lab(r: number, g: number, b: number): [number, number, number];
export function percentile(sorted: readonly number[], p: number): number;
export interface ColourStats {
  texels: number;
  lightness: number[];
  chroma: number[];
  hue: number;
  median: string;
  feather: number;
  framesTouchingEdge: string;
}
export function measure(sources: readonly Img[], trimmed?: boolean): ColourStats;
export function seam(img: Img, axes?: string): { edgeRepeatsFirst: boolean; seam: number };
export function downsample(img: Img): Img;
export function mipSeams(
  img: Img,
  minSize?: number,
  axes?: string,
): { size: [number, number]; seam: number }[];
export function quarterContrast(
  img: Img,
  axes?: string,
): { quarterLightness: number[]; spread: number };
export function alphaCoverage(img: Img): { transparent: number; partial: number; opaque: number };
export function paintBounds(
  img: Img,
  rect?: Rect,
): (Rect & { touches: ('left' | 'top' | 'right' | 'bottom')[] }) | null;
export function rectGap(a: Rect, b: Rect): number;
export function frameSpacing(
  frames: Record<string, Rect>,
  size: { w: number; h: number },
): {
  minGap: number | null;
  minEdge: number;
  touching: [string, string, number][];
  nearest: Record<string, { name: string | null; gap: number }>;
};
export function mipSafeLevel(
  frames: Record<string, Rect>,
  size: { w: number; h: number },
  maxLevel?: number,
): number;
export function edgeFringe(
  img: Img,
  rect?: Rect,
): { outline: number; lightOutline: number; transparentWhite: number; transparentBlack: number };
export function unitsPerTexel(worldSize: number, pixels: number): number;
export function croppedSides(img: Img, rect: Rect, share?: number): string[];
