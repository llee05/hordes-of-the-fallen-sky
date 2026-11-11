export type Pixels = Float32Array | Uint8Array;
/** `c` channels per texel (3 = RGB, 4 = RGBA), values 0..255. */
export interface Img {
  w: number;
  h: number;
  c: number;
  data: Pixels;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function image(w: number, h: number, c: number): Img & { data: Float32Array };
export function at(img: Img, x: number, y: number): number;
export function luma(img: Img, x: number, y: number): number;
export function smoothstep(a: number, b: number, v: number): number;
export function noise(x: number, y: number, seed: number): number;
export function toBytes(img: Img): Uint8Array;
export function crop(img: Img, rect: Rect): Img;
export function roll(img: Img, dx: number, dy: number): Img;
export function turn(img: Img): Img;
export function flipRows(img: Img): Img;
export function healAxis(img: Img, axis: 'x' | 'y', seed: number): Img;
export function heal(img: Img, seed: number, axes?: string): Img;
export function trim(img: Img): { img: Img; offset: [number, number] };
export function bleed<T extends Img>(img: T, passes?: number): T;
export function extrude(img: Img, n: number): Img;
export function isPowerOfTwo(n: number): boolean;
export function shelfPack(
  sizes: readonly { w: number; h: number }[],
  options: { width: number; gutter: number },
): { positions: { x: number; y: number }[]; height: number };
export function compose(
  pieces: readonly { img: Img; x: number; y: number }[],
  width: number,
  height: number,
  c?: number,
): Img;
export interface FrameMap {
  frames: Record<
    string,
    {
      frame: Rect;
      rotated: false;
      trimmed: false;
      spriteSourceSize: Rect;
      sourceSize: { w: number; h: number };
    }
  >;
  meta: Record<string, unknown>;
}
export function frameMap(
  frames: readonly [string, Rect][],
  meta: Record<string, unknown>,
): FrameMap;
