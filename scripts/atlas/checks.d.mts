import type { Img, Rect } from './image.mjs';

export type Status = 'pass' | 'warn' | 'fail';
export interface Check {
  id: string;
  status: Status;
  value: unknown;
  detail: string;
}
export const LIMITS: {
  seamWarn: number;
  seamFail: number;
  mipSeamWarn: number;
  densityTolerance: number;
  quarterSpreadWarn: number;
  padding: number;
  mipLevels: number;
  lightOutlineWarn: number;
  lightOutlineFail: number;
  transparentColourWarn: number;
};
export function gridFrames(size: { w: number; h: number }, cell: number): Record<string, Rect>;
export function inspect(img: Img, frames?: Record<string, Rect>): Record<string, unknown>;
export function validateTile(
  img: Img,
  options?: {
    axes?: string;
    worldSize?: number;
    expectedUnitsPerTexel?: number;
    limits?: Partial<typeof LIMITS>;
  },
): Check[];
export function validateAtlas(
  img: Img,
  frames: Record<string, Rect>,
  options?: { mipmaps?: boolean; limits?: Partial<typeof LIMITS> },
): Check[];
export function worstStatus(checks: readonly Check[]): Status;
