import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { LOCATIONS } from '../../src/game/data/clan';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import scenerySource from '/art/steppe-scenery.json?raw';
import { GAME } from '../../src/game/config';
import { isLandscapeClearing, landscapeCover } from '../../src/game/assets/landscapeLayout';

const atlas = JSON.parse(scenerySource) as typeof import('../../public/art/steppe-scenery.json');

describe('location scenery content', () => {
  it('bundles the supplied terrain tiles for their matching locations', async () => {
    const tiles = Object.fromEntries(
      Object.entries(LANDSCAPES)
        .filter(([, landscape]) => landscape.groundTile)
        .map(([id, landscape]) => [id, landscape.groundTile]),
    );
    expect(tiles).toEqual({
      'altai-tavan-bogd': 'altai-tavan-bogd',
      'altan-ovoo': 'altan-ovoo',
      'bogd-khan-uul': 'bogd-khan-uul',
      'eej-khairkhan': 'eej-khairkhan',
      'khan-tengri': 'khan-tengri',
      'orkhon-valley': 'orkhon-valley',
      otgontenger: 'mount-otgontenger',
      belukha: 'mount-belukha',
    });
    for (const tile of Object.values(tiles)) {
      const png = await readFile(new URL(`../../public/art/${tile}.png`, import.meta.url));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1254, 1254]);
    }
  });

  it('reproduces bounded scenery while keeping the camp and complete caravan corridor clear', () => {
    for (const place of LOCATIONS) {
      const layout = landscapeCover(place.id);
      expect(layout).toEqual(landscapeCover(place.id));
      expect(layout.length).toBeGreaterThan(0);
      expect(layout.length).toBeLessThan(250);
      for (const prop of layout) {
        expect(isLandscapeClearing(prop.x, prop.y)).toBe(false);
        expect(Math.abs(prop.x) + prop.width / 2).toBeLessThan(GAME.worldSize / 2);
        expect(Math.abs(prop.y) + prop.width / 2).toBeLessThan(GAME.worldSize / 2);
        for (const landmark of LANDSCAPES[place.id].landmarks) {
          const overlaps =
            Math.abs(prop.x - landmark.x) < (prop.width + landmark.width) / 2 &&
            prop.y > landmark.y - landmark.width * 0.94 &&
            prop.y - prop.width * 0.94 < landmark.y;
          expect(overlaps).toBe(false);
        }
      }
    }
    for (let caravanX = 0; caravanX <= 1150; caravanX += 50)
      expect(isLandscapeClearing(caravanX, 0)).toBe(true);
  });

  it('covers every destination with a distinct composition and only bundled props', () => {
    expect(Object.keys(LANDSCAPES).sort()).toEqual(LOCATIONS.map((place) => place.id).sort());
    const compositions = new Set<string>();
    for (const place of LOCATIONS) {
      const landscape = LANDSCAPES[place.id];
      compositions.add(JSON.stringify(landscape.landmarks));
      expect(landscape.landmarks.length).toBeGreaterThan(0);
      for (const prop of [...landscape.landmarks, ...landscape.cover])
        expect(atlas.frames).toHaveProperty(prop.prop);
      expect(landscape.cover.reduce((sum, cover) => sum + cover.count, 0)).toBeLessThan(250);
      if (landscape.water) {
        expect(landscape.water.course.length % 2).toBe(0);
        expect(landscape.water.course.length).toBeGreaterThanOrEqual(8);
      }
    }
    expect(compositions.size).toBe(LOCATIONS.length);
  });

  it('keeps dry camps dry and distinguishes the mountain silhouettes', () => {
    for (const id of [
      'broken-pass',
      'bogd-khan-uul',
      'khan-tengri',
      'altan-ovoo',
      'eej-khairkhan',
    ] as const)
      expect(LANDSCAPES[id].water).toBeUndefined();
    expect(LANDSCAPES['altai-tavan-bogd'].landmarks.filter((item) => item.y < 0)).toHaveLength(5);
    expect(LANDSCAPES.otgontenger.landmarks[0]?.prop).toBe('snow-dome');
    expect(LANDSCAPES['khan-tengri'].landmarks[0]?.prop).toBe('pyramid');
    expect(LANDSCAPES.belukha.landmarks[0]?.prop).toBe('twin-summit');
    expect(LANDSCAPES['orkhon-valley'].water?.kind).toBe('braided');
  });

  it('keeps atlas frames in bounds with a shared ground anchor and no overlapping crops', () => {
    const frames = Object.values(atlas.frames);
    for (const entry of frames) {
      const { frame, sourceSize, spriteSourceSize } = entry;
      expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
      expect(sourceSize).toEqual({ w: 448, h: 420 });
      expect(spriteSourceSize.y + frame.h).toBe(378);
      expect(spriteSourceSize.x).toBeGreaterThanOrEqual(0);
      expect(spriteSourceSize.x + frame.w).toBeLessThanOrEqual(sourceSize.w);
      for (const other of frames) {
        if (other === entry) continue;
        const b = other.frame;
        expect(
          frame.x < b.x + b.w &&
            frame.x + frame.w > b.x &&
            frame.y < b.y + b.h &&
            frame.y + frame.h > b.y,
        ).toBe(false);
      }
    }
  });
});
