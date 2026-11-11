import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ART_SPEC, type ArtBand, type SizeBand } from '../../src/game/data/artSpec';
import {
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITE_SCALE,
  ORKHON_SPRITES,
  ORKHON_TILE_WORLD_SIZE,
  ORKHON_TILES,
  type OrkhonSprite,
} from '../../src/game/assets/orkhonValleyArt';
import { GAME } from '../../src/game/config';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { ORKHON_VALLEY } from '../../src/game/data/orkhonValley';
import { composedRegion } from '../../src/game/data/worldRegions';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { sceneDressing, type SceneDressing } from '../../src/game/world3d/sceneDressing';
import { WORLD_3D } from '../../src/game/world3d/worldProjection';

// painterlyArt only needs Phaser when it draws; its size table is plain data.
vi.mock('phaser', () => ({ default: {} }));
const { ART_WIDTH, CAMP_VISUAL_SCALE } = await import('../../src/game/assets/painterlyArt');

const source = (path: string) => readFileSync(resolve(path), 'utf8');
const inside = (value: number, [min, max]: SizeBand) => value >= min - 1e-9 && value <= max + 1e-9;

interface AtlasFrame {
  spriteSourceSize: { h: number };
  sourceSize: { w: number };
}
/** Painted height range, in world units, of every frame of `kind` drawn `width` units wide. */
function actorHeights(sheet: string, kind: string, width: number): [number, number] {
  const atlas = JSON.parse(source(`public/art/steppe-${sheet}-motion.json`)) as {
    frames: Record<string, AtlasFrame>;
  };
  const heights = Object.entries(atlas.frames)
    .filter(([name]) => name.startsWith(`${kind}-`))
    .map(([, frame]) => (frame.spriteSourceSize.h * width) / frame.sourceSize.w);
  expect(heights.length, kind).toBeGreaterThan(0);
  return [Math.min(...heights), Math.max(...heights)];
}

const SHEET: Record<string, string> = {
  wolf: 'mounted',
  ghost: 'mounted',
  shade: 'creature',
  earth: 'creature',
  seer: 'creature',
  skybreaker: 'creature',
};

/** Billboard height of a placed Orkhon sprite in world units. */
function billboardHeight(prop: SceneDressing): number {
  const metrics = ORKHON_SPRITES[prop.frame as OrkhonSprite];
  return (prop.width / metrics.width) * metrics.height;
}

describe('art spec companion', () => {
  it('matches the camera the angled world uses', () => {
    expect(ART_SPEC.camera.elevation).toBe(WORLD_3D.angle);
    expect(ART_SPEC.camera.yaw).toBe(WORLD_3D.yaw);
    expect(ART_SPEC.camera.screenPixelsPerUnit).toBe(WORLD_3D.worldScale);
    expect(ART_SPEC.camera.debugElevation).toEqual([WORLD_3D.minAngle, WORLD_3D.maxAngle]);
  });

  it('is the source of the Orkhon Valley scale constants', () => {
    expect(ORKHON_PROP_SCALE).toBe(ART_SPEC.orkhon.propScale);
    expect(ORKHON_LANDMARK_SCALE).toBe(ART_SPEC.orkhon.landmarkScale);
    expect(ORKHON_SPRITE_SCALE).toBe(ART_SPEC.orkhon.spriteScale);
    expect(ORKHON_TILE_WORLD_SIZE).toBe(ART_SPEC.orkhon.tileWorldSize);
    expect(ORKHON_VALLEY.rise).toBe(ART_SPEC.orkhon.plateauRise);
    for (const sprite of Object.keys(ART_SPEC.orkhon.landmarkScale))
      expect(Object.hasOwn(ORKHON_SPRITES, sprite), sprite).toBe(true);
    // Dressing reads its size spread from the spec rather than inline numbers.
    const dressing = source('src/game/world3d/orkhonDressing.ts');
    for (const range of ['groveTree', 'rimTree', 'footRock'])
      expect(dressing).toContain(`JITTER.${range}`);
  });

  it('records the pack tile size the level samples', () => {
    for (const tile of Object.values(ORKHON_TILES)) {
      const png = readFileSync(resolve(`public/art/orkhon-valley/${tile}.png`));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], tile).toEqual([
        ART_SPEC.orkhon.tilePixels,
        ART_SPEC.orkhon.tilePixels,
      ]);
    }
  });

  it('measures the Khan, riders and camp life from their painted frames', () => {
    expect(ART_WIDTH.player).toBe(ART_SPEC.reference.khanWidth);
    const [low, high] = actorHeights('mounted', 'player', ART_WIDTH.player!);
    expect(low).toBeCloseTo(ART_SPEC.reference.khanHeight[0], 1);
    expect(high).toBeCloseTo(ART_SPEC.reference.khanHeight[1], 1);
    expect(inside(ART_SPEC.reference.riderHeight, ART_SPEC.reference.khanHeight)).toBe(true);
    expect(inside(low, ART_SPEC.bands.khan) && inside(high, ART_SPEC.bands.khan)).toBe(true);
    for (const height of actorHeights('mounted', 'rider', ART_WIDTH.rider!))
      expect(inside(height, ART_SPEC.bands.clanRiders), `rider ${height}`).toBe(true);
    for (const kind of ['worker', 'packhorse'])
      for (const height of actorHeights('clan', kind, ART_WIDTH[kind]! * CAMP_VISUAL_SCALE))
        expect(inside(height, ART_SPEC.bands.campLife), `${kind} ${height}`).toBe(true);
  });

  it('keeps every enemy definition inside the enemy band', () => {
    for (const enemy of ALL_ENEMIES) {
      const width = ART_WIDTH[enemy.texture]! * (enemy.scale / 2);
      for (const height of actorHeights(SHEET[enemy.texture]!, enemy.texture, width))
        expect(inside(height, ART_SPEC.bands.enemies), `${enemy.id} ${height}`).toBe(true);
    }
  });

  it('matches the light and contact shadows the renderer draws', () => {
    const renderer = source('src/game/world3d/World3DRenderer.ts');
    const { light } = ART_SPEC;
    const hex = (value: number) => `0x${value.toString(16).padStart(6, '0')}`;
    expect(renderer).toContain(`new THREE.DirectionalLight(${hex(light.sunColor)}, 1.5)`);
    const [sx, sy, sz] = light.sunOffset;
    expect(renderer).toContain(`this.sun.position.set(x - ${-sx}, ${sy + 350}, z + ${sz})`);
    expect(renderer).toContain('this.sun.target.position.set(x, 350, z)');
    expect(renderer).toContain(`this.sun.shadow.intensity = ${light.shadowIntensity}`);
    const { width, depth, alpha, offset } = light.propShadow;
    expect(renderer).toContain(`.image(prop.x + ${offset[0]}, prop.z + ${offset[1]}, 'shadow')`);
    expect(renderer).toContain(`.setDisplaySize(prop.width * ${width}, prop.width * ${depth})`);
    expect(renderer).toContain(`.setAlpha(${alpha})`);
    const art = source('src/game/assets/painterlyArt.ts');
    expect(art).toContain(`'#${light.contactShadowColor.toString(16)}55'`);
  });

  it('defines a manuscript style contract superseding legacy ground chroma', () => {
    const { manuscript, palette } = ART_SPEC;
    expect(manuscript.groundChromaMax).toBeLessThan(palette.ground.chroma[1]);
    expect(manuscript.groundChromaMedianTarget[0]).toBeGreaterThanOrEqual(20);
    expect(manuscript.groundChromaMedianTarget[1]).toBeLessThanOrEqual(30);
    const valleyMid =
      (manuscript.groundLightnessValley[0] + manuscript.groundLightnessValley[1]) / 2;
    const plateauMid =
      (manuscript.groundLightnessPlateau[0] + manuscript.groundLightnessPlateau[1]) / 2;
    expect(valleyMid - plateauMid).toBeGreaterThanOrEqual(manuscript.minElevationLightnessDrop);
    for (const [name, color] of Object.entries(manuscript.swatches)) {
      expect(Number.isInteger(color), name).toBe(true);
      expect(color, name).toBeGreaterThanOrEqual(0);
      expect(color, name).toBeLessThanOrEqual(0xffffff);
    }
    expect(manuscript.swatches.inkContour).toBe(0x2b221a);
    expect(manuscript.inkLineWidth[0]).toBeGreaterThan(0);
    expect(manuscript.inkLineWidth[1]).toBeGreaterThanOrEqual(manuscript.inkLineWidth[0]);
    expect(manuscript.hatchingSpacing[0]).toBeGreaterThan(0);
    expect(manuscript.hatchingSpacing[1]).toBeGreaterThanOrEqual(manuscript.hatchingSpacing[0]);
  });
});

describe('Orkhon Valley scenery inside the art spec bands', () => {
  let all: SceneDressing[];
  beforeAll(() => {
    const terrain = new ComposedTerrain(
      composedRegion('orkhon-valley'),
      LANDSCAPES['orkhon-valley'].water,
    );
    all = sceneDressing(terrain, { x: 0, y: 0, width: GAME.worldSize, height: GAME.worldSize });
  });

  const PROP_BANDS: Record<string, ArtBand> = {
    larch: 'trees',
    scrub: 'shrubs',
    reeds: 'shrubs',
    boulders: 'rocks',
  };

  it('places every tree, shrub, reed and rock inside its band', () => {
    const seen = new Map<string, Set<OrkhonSprite>>();
    for (const prop of all) {
      if (prop.kind === 'landmark') continue;
      const band = PROP_BANDS[prop.kind];
      expect(band, prop.kind).toBeDefined();
      const height = billboardHeight(prop);
      expect(inside(height, ART_SPEC.bands[band!]), `${prop.frame} ${height}`).toBe(true);
      seen.set(prop.kind, (seen.get(prop.kind) ?? new Set()).add(prop.frame as OrkhonSprite));
    }
    expect([...seen.keys()].sort()).toEqual(Object.keys(PROP_BANDS).sort());
    // The bands also hold at the extremes of each size spread, not only at today's placements.
    const { propScale, jitter, spriteScale } = ART_SPEC.orkhon;
    const extremes: Record<string, readonly number[]> = {
      larch: [propScale.tree * jitter.rimTree[0], propScale.tree * jitter.rimTree[1]],
      scrub: [propScale.scrub],
      reeds: [propScale.reed],
      boulders: [propScale.scree * jitter.footRock[0], propScale.scree * jitter.footRock[1]],
    };
    expect(jitter.groveTree[0]).toBeGreaterThanOrEqual(jitter.rimTree[0]);
    expect(jitter.groveTree[1]).toBeLessThanOrEqual(jitter.rimTree[1]);
    for (const [kind, sprites] of seen)
      for (const sprite of sprites)
        for (const factor of extremes[kind]!) {
          const height = ORKHON_SPRITES[sprite].height * spriteScale * factor;
          expect(inside(height, ART_SPEC.bands[PROP_BANDS[kind]!]), `${sprite} ${height}`).toBe(
            true,
          );
        }
  });

  it('draws every landmark inside the band the spec assigns it', () => {
    const bands = ART_SPEC.orkhon.landmarkBands as Record<string, ArtBand>;
    for (const landmark of ORKHON_VALLEY.landmarks) {
      const band = bands[landmark.sprite];
      expect(band, landmark.id).toBeDefined();
      const prop = all.find(
        (p) =>
          p.kind === 'landmark' &&
          p.frame === landmark.sprite &&
          p.x === GAME.worldSize / 2 + landmark.x,
      )!;
      const height = billboardHeight(prop);
      expect(inside(height, ART_SPEC.bands[band!]), `${landmark.id} ${height}`).toBe(true);
    }
  });

  it('keeps the plateau rise in proportion to the Khan', () => {
    const { plateauRise } = ART_SPEC.orkhon;
    const onScreen = plateauRise * Math.cos((ART_SPEC.camera.elevation * Math.PI) / 180);
    expect(plateauRise / ART_SPEC.reference.riderHeight).toBeCloseTo(3.8, 1);
    expect(onScreen / ART_SPEC.reference.riderHeight).toBeCloseTo(2.5, 1);
  });
});
