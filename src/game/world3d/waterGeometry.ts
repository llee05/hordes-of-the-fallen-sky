import { riverPoint, sourcePoolRadius } from '../assets/riverGeometry';
import type { MountainHeightfield } from './MountainHeightfield';
import type { WorldRiver } from './WorldRiver';

/** Cross-channel strips register shallow margins and the carved bed, not a flat colored ribbon. */
export function waterGeometry(
  river: WorldRiver,
  terrain: MountainHeightfield,
): { positions: number[]; uv: number[]; depth: number[]; pool: number[] } {
  const positions: number[] = [],
    uv: number[] = [],
    depth: number[] = [],
    poolMask: number[] = [];
  const across = [0, 0.12, 0.36, 0.64, 0.88, 1];
  const height = river.floor - 1.5;
  for (const channel of river.channels)
    for (let i = 0; i < channel.sections.length - 1; i++) {
      const a = channel.sections[i]!,
        b = channel.sections[i + 1]!;
      for (let row = 0; row < across.length - 1; row++) {
        const low = across[row]!,
          high = across[row + 1]!;
        for (const [section, u] of [
          [a, low],
          [b, low],
          [b, high],
          [a, low],
          [b, high],
          [a, high],
        ] as const) {
          const p = riverPoint(section, u * 2 - 1),
            x = river.center + p.x,
            z = river.center + p.y;
          positions.push(x, height, z);
          uv.push(u, section.distance / 36);
          depth.push(
            Math.max(
              0,
              Math.min(12, height - terrain.height(x, z) * terrain.region.biome.heightScale),
            ),
          );
          poolMask.push(0);
        }
      }
    }
  const pool = river.definition.sourcePool;
  if (pool) {
    const rings = [0, 0.32, 0.68, 1];
    const segments = 40;
    const vertex = (radius: number, angle: number) => {
      const cosine = Math.cos(angle),
        sine = Math.sin(angle),
        shoreRadius = sourcePoolRadius(pool, angle),
        x = river.center + pool.x + cosine * shoreRadius * radius,
        z = river.center + pool.y + sine * shoreRadius * radius;
      positions.push(x, height, z);
      uv.push(0.5 + cosine * radius * 0.5, 0.5 + sine * radius * 0.5);
      depth.push(
        Math.max(0, Math.min(12, height - terrain.height(x, z) * terrain.region.biome.heightScale)),
      );
      poolMask.push(1);
    };
    for (let ring = 0; ring < rings.length - 1; ring++)
      for (let segment = 0; segment < segments; segment++) {
        const low = rings[ring]!,
          high = rings[ring + 1]!,
          first = (segment / segments) * Math.PI * 2,
          second = ((segment + 1) / segments) * Math.PI * 2;
        for (const [radius, angle] of [
          [low, first],
          [high, first],
          [high, second],
          [low, first],
          [high, second],
          [low, second],
        ] as const)
          vertex(radius, angle);
      }
  }
  return { positions, uv, depth, pool: poolMask };
}

/** A thin terrain-following collar gives an authored source pool a muddy, rocky shoreline. */
export function sourcePoolBankGeometry(
  river: WorldRiver,
  terrain: MountainHeightfield,
): { positions: number[]; uv: number[] } | undefined {
  const pool = river.definition.sourcePool;
  if (!pool) return undefined;
  const positions: number[] = [];
  const uv: number[] = [];
  const segments = 40;
  const vertex = (angle: number, outer: boolean) => {
    const shore = sourcePoolRadius(pool, angle);
    const radius = shore * (outer ? 1.14 + Math.sin(angle * 5 + 0.4) * 0.03 : 0.95);
    const x = river.center + pool.x + Math.cos(angle) * radius;
    const z = river.center + pool.y + Math.sin(angle) * radius;
    const y = terrain.height(x, z) * terrain.region.biome.heightScale + 1.25;
    positions.push(x, y, z);
    uv.push(x / 170, z / 170);
  };
  for (let segment = 0; segment < segments; segment++) {
    const first = (segment / segments) * Math.PI * 2;
    const second = ((segment + 1) / segments) * Math.PI * 2;
    vertex(first, false);
    vertex(first, true);
    vertex(second, true);
    vertex(first, false);
    vertex(second, true);
    vertex(second, false);
  }
  return { positions, uv };
}
