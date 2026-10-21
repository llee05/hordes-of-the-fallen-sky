import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

// The blue sky and gold diamond of the clan banner, in a 256px pixel icon.
const size = 256;
const pixels = [
  '................',
  '.......aa.......',
  '...a...aa...a...',
  '....a......a....',
  '.......aa.......',
  '......a..a......',
  '.....a....a.....',
  '.aa.a..cc..a.aa.',
  '.aa.a..cc..a.aa.',
  '.....a....a.....',
  '......a..a......',
  '.......aa.......',
  '....a......a....',
  '...a...aa...a...',
  '.......aa.......',
  '................',
];
const raw = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const offset = y * (size * 4 + 1) + 1 + x * 4;
    const pixel = pixels[Math.floor(y / 16)][Math.floor(x / 16)];
    const color =
      pixel === 'a'
        ? [217, 187, 121, 255]
        : pixel === 'c'
          ? [136, 197, 214, 255]
          : [20, 39, 44, 255];
    color.forEach((value, index) => {
      raw[offset + index] = value;
    });
  }
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(png.length, 14);
icoHeader.writeUInt32LE(22, 18);
await mkdir('build', { recursive: true });
await writeFile('build/icon.png', png);
await writeFile('build/icon.ico', Buffer.concat([icoHeader, png]));
