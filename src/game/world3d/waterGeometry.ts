import { riverPoint } from '../assets/riverGeometry';
import type { MountainHeightfield } from './MountainHeightfield';
import type { WorldRiver } from './WorldRiver';

/** Cross-channel strips register shallow margins and the carved bed, not a flat colored ribbon. */
export function waterGeometry(
  river: WorldRiver,
  terrain: MountainHeightfield,
): { positions: number[]; uv: number[]; depth: number[] } {
  const positions: number[] = [],
    uv: number[] = [],
    depth: number[] = [];
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
        }
      }
    }
  return { positions, uv, depth };
}
