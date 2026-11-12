import { describe, expect, it } from 'vitest';
import { ALTAN_OVOO, ALTAN_OVOO_FOOTPRINTS, ALTAN_OVOO_SITES } from '../../src/game/data/altanOvoo';
import { ORKHON_SPRITES } from '../../src/game/assets/orkhonValleyArt';
import { outlineField } from '../../src/game/world3d/ComposedTerrain';
import type { TerrainPoint } from '../../src/game/terrain/types';

const cone = ALTAN_OVOO.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const distanceToSegment = (point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
};

describe('Altan Ovoo authored layout', () => {
  it('uses the approved wide battlefield and keeps the camp inside southwest', () => {
    expect(ALTAN_OVOO.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 6400,
      minX: -3200,
      minY: -2000,
      camp: { x: -2050, y: 1050 },
    });
    expect(ALTAN_OVOO.world.camp.x).toBeLessThan(0);
    expect(ALTAN_OVOO.world.camp.y).toBeGreaterThan(0);
    expect(Math.abs(ALTAN_OVOO.world.camp.x)).toBeGreaterThan(ALTAN_OVOO.pathWidth * 2);
    expect(Math.abs(ALTAN_OVOO.world.camp.y)).toBeGreaterThan(ALTAN_OVOO.pathWidth * 2);
  });

  it('has exactly two terrain tiers and two broad walkable ramp cuts', () => {
    expect(ALTAN_OVOO.rise).toBe(240);
    expect(ALTAN_OVOO.plateaus).toHaveLength(1);
    expect(cone.id).toBe('cinder-cone');
    expect(cone.outline.length).toBeGreaterThanOrEqual(12);
    expect(cone.ramps).toHaveLength(2);
    for (const ramp of cone.ramps) {
      expect(outlineField(cone.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(cone.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(112);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
      expect(Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y)).toBeGreaterThan(400);
    }
  });

  it('keeps the live camp spawn clearing on lower steppe and free of landmarks', () => {
    const camp = ALTAN_OVOO.world.camp;
    expect(outlineField(cone.outline, camp.x, camp.y)).toBeLessThan(
      -ALTAN_OVOO.world.campClearRadius,
    );
    for (const landmark of ALTAN_OVOO_FOOTPRINTS)
      expect(Math.hypot(landmark.x - camp.x, landmark.y - camp.y), landmark.id).toBeGreaterThan(
        ALTAN_OVOO.world.campClearRadius + landmark.footprint,
      );
    expect(
      Math.hypot(ALTAN_OVOO.spring.centre.x - camp.x, ALTAN_OVOO.spring.centre.y - camp.y),
    ).toBeGreaterThan(ALTAN_OVOO.world.campClearRadius + ALTAN_OVOO.spring.radius);
  });

  it('connects every trail endpoint to a named place or another trail', () => {
    const named = Object.values(ALTAN_OVOO_SITES);
    const endpoints = ALTAN_OVOO.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints)
      expect(
        named.some((site) => samePoint(site, endpoint)) ||
          ALTAN_OVOO.paths.some((path) =>
            path.slice(1, -1).some((point) => samePoint(point, endpoint)),
          ),
        `${endpoint.x},${endpoint.y}`,
      ).toBe(true);

    const routeEnds = ALTAN_OVOO.paths.map((path) => [path[0], path.at(-1)]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.summit]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.summit, ALTAN_OVOO_SITES.spring]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.spring]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.horseMeadow]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.spring, ALTAN_OVOO_SITES.balbal]);
  });

  it('keeps trails inside the playable rectangle and clear of unrelated solid landmarks', () => {
    const minX = ALTAN_OVOO.world.minX,
      minY = ALTAN_OVOO.world.minY,
      maxX = minX + ALTAN_OVOO.world.width,
      maxY = minY + ALTAN_OVOO.world.height;
    for (const path of ALTAN_OVOO.paths)
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(minX);
        expect(point.x).toBeLessThanOrEqual(maxX);
        expect(point.y).toBeGreaterThanOrEqual(minY);
        expect(point.y).toBeLessThanOrEqual(maxY);
      }

    for (const landmark of ALTAN_OVOO_FOOTPRINTS) {
      if (landmark.role !== 'scenery') continue;
      const nearest = Math.min(
        ...ALTAN_OVOO.paths.flatMap((path) =>
          path.slice(1).map((point, index) => distanceToSegment(landmark, path[index]!, point)),
        ),
      );
      expect(nearest, landmark.id).toBeGreaterThan(landmark.footprint);
    }
  });

  it('authors the spring and stream without lava or a new wildlife system', () => {
    const { stream } = ALTAN_OVOO.spring;
    expect(stream.kind).toBe('stream');
    expect(stream.course.slice(0, 2)).toEqual([
      ALTAN_OVOO.spring.centre.x,
      ALTAN_OVOO.spring.centre.y,
    ]);
    expect(stream.course.at(-2)).toBeGreaterThan(ALTAN_OVOO.spring.centre.x);
    expect(stream.course.at(-1)).toBeGreaterThan(ALTAN_OVOO.spring.centre.y);
    expect(JSON.stringify(ALTAN_OVOO)).not.toMatch(/lava|swan|wolf|horse_sprite/i);
  });

  it('maps sites only to bundled existing scenery', () => {
    for (const landmark of ALTAN_OVOO.landmarks)
      expect(ORKHON_SPRITES, landmark.id).toHaveProperty(landmark.sprite);
    expect(ALTAN_OVOO.landmarks.some((landmark) => landmark.sprite === 'sacred_ovoo')).toBe(true);
    expect(ALTAN_OVOO.landmarks.filter((landmark) => landmark.role === 'balbal-site')).toHaveLength(
      3,
    );
    expect(
      ALTAN_OVOO.landmarks
        .filter((landmark) => landmark.role === 'balbal-site')
        .every((landmark) => landmark.sprite === 'standing_stone'),
    ).toBe(true);
  });
});
