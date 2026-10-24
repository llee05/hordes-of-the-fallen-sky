import {
  riverChannels,
  riverSectionAt,
  type RiverDefinition,
  type RiverChannel,
} from '../assets/riverGeometry';

export interface WorldBridge {
  x: number;
  z: number;
  nx: number;
  nz: number;
  length: number;
  width: number;
  height: number;
}

/** Shared watercourse and bridge registration for geometry, dressing, and actor ground anchors. */
export class WorldRiver {
  readonly channels: readonly RiverChannel[];
  readonly bridges: readonly WorldBridge[];
  private readonly segments: { ax: number; az: number; bx: number; bz: number }[] = [];
  constructor(
    readonly definition: RiverDefinition,
    readonly center: number,
    readonly floor: number,
  ) {
    this.channels = riverChannels(definition);
    for (const channel of this.channels)
      for (let i = 0; i < channel.sections.length - 1; i += 8) {
        const a = channel.sections[i]!;
        const b = channel.sections[Math.min(channel.sections.length - 1, i + 8)]!;
        this.segments.push({
          ax: center + a.x,
          az: center + a.y,
          bx: center + b.x,
          bz: center + b.y,
        });
      }
    this.bridges = (definition.kind === 'frozen' ? [] : [0.32, 0.68]).map((t) => {
      const section = riverSectionAt(this.channels[0]!, this.channels[0]!.length * t);
      return {
        x: center + section.x,
        z: center + section.y,
        nx: section.nx,
        nz: section.ny,
        length: section.left + section.right + 30,
        width: 46,
        height: floor + 8,
      };
    });
  }
  distance(x: number, z: number): number {
    let best = Infinity;
    for (const segment of this.segments) {
      const dx = segment.bx - segment.ax;
      const dz = segment.bz - segment.az;
      const t = Math.max(
        0,
        Math.min(1, ((x - segment.ax) * dx + (z - segment.az) * dz) / (dx * dx + dz * dz || 1)),
      );
      best = Math.min(best, Math.hypot(x - segment.ax - dx * t, z - segment.az - dz * t));
    }
    return best;
  }
  bridgeHeight(x: number, z: number): number | undefined {
    for (const bridge of this.bridges) {
      const dx = x - bridge.x;
      const dz = z - bridge.z;
      if (
        Math.abs(dx * bridge.nx + dz * bridge.nz) <= bridge.length / 2 &&
        Math.abs(dx * bridge.nz - dz * bridge.nx) <= bridge.width / 2
      )
        return bridge.height;
    }
    return undefined;
  }
}
