// Read and write images for the atlas tools with the `sharp` dev dependency. Development-only.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { toBytes } from './image.mjs';

/** Decode an image file to 8-bit RGBA { w, h, c: 4, data }. */
export async function readImage(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, c: 4, data };
}

/** Encode an image (RGB or RGBA, any numeric data) as a PNG. */
export async function writeImage(img, file) {
  await sharp(Buffer.from(toBytes(img)), { raw: { width: img.w, height: img.h, channels: img.c } })
    .png({ compressionLevel: 9 })
    .toFile(file);
}

/** Frame rectangles { name: { x, y, w, h } } from a Phaser/TexturePacker hash or array JSON. */
export function readFrames(jsonFile) {
  const { frames } = JSON.parse(readFileSync(jsonFile, 'utf8'));
  const entries = Array.isArray(frames)
    ? frames.map((frame) => [frame.filename, frame.frame])
    : Object.entries(frames).map(([name, frame]) => [name, frame.frame]);
  return Object.fromEntries(entries.map(([name, { x, y, w, h }]) => [name, { x, y, w, h }]));
}
