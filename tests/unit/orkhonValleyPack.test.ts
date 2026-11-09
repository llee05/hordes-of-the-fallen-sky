import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';

describe('Orkhon Valley manuscript texture pack', () => {
  const artDir = resolve('public/art/orkhon-valley');
  const expectedFiles = [
    'meadow.png',
    'worn-grass.png',
    'packed-earth.png',
    'gravel.png',
    'riverbed.png',
    'river-water.png',
    'basalt-cliff.png',
    'basalt-stone.png',
    'orkhon-scenery.png',
    'orkhon-scenery.json',
  ];

  it('bundles all used ground, cliff, water, and scenery assets locally', () => {
    for (const file of expectedFiles) {
      expect(existsSync(resolve(artDir, file)), `${file} must exist`).toBe(true);
    }
  });

  it('provides valid TexturePacker frame metadata for all scenery props', () => {
    const raw = readFileSync(resolve(artDir, 'orkhon-scenery.json'), 'utf8');
    const atlas = JSON.parse(raw);
    expect(atlas.meta.image).toBe('orkhon-scenery.png');
    expect(atlas.meta.size.w).toBe(2048);
    expect(atlas.meta.size.h).toBe(1024);

    const frameNames = Object.keys(atlas.frames);
    expect(frameNames.length).toBeGreaterThanOrEqual(30);

    for (const [name, data] of Object.entries<any>(atlas.frames)) {
      expect(data.frame.w, `${name} width`).toBeGreaterThan(0);
      expect(data.frame.h, `${name} height`).toBeGreaterThan(0);
      expect(data.frame.x + data.frame.w).toBeLessThanOrEqual(2048);
      expect(data.frame.y + data.frame.h).toBeLessThanOrEqual(1024);
    }
  });

  it('maps every scenery dressing prop in Orkhon Valley to a registered atlas frame', () => {
    const raw = readFileSync(resolve(artDir, 'orkhon-scenery.json'), 'utf8');
    const atlas = JSON.parse(raw);
    const validFrames = new Set(Object.keys(atlas.frames));

    const terrain = new ComposedTerrain(
      composedRegion('orkhon-valley'),
      LANDSCAPES['orkhon-valley'].water,
    );
    const props = sceneDressing(terrain, { x: 512, y: 512, width: 3072, height: 3072 });
    expect(props.length).toBeGreaterThan(50);

    for (const prop of props) {
      expect(prop.texture).toBe('orkhon-scenery');
      expect(validFrames.has(prop.frame), `frame '${prop.frame}' must exist in atlas`).toBe(true);
    }
  });
});
