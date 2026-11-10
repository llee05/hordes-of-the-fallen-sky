import {
  riverChannels,
  riverSectionAt,
  type RiverDefinition,
  type RiverChannel,
  type RiverSection,
} from '../assets/riverGeometry';
import { coherentNoise, smoothstep, terrainSeed } from '../terrain/noise';

export interface WorldBridge {
  x: number;
  z: number;
  nx: number;
  nz: number;
  length: number;
  width: number;
  height: number;
}
export interface RiverSample {
  distance: number;
  shoreDistance: number;
  halfWidth: number;
}
interface Segment {
  a: RiverSection;
  b: RiverSection;
  dx: number;
  dz: number;
  lengthSquared: number;
}

const RIVER_BUCKET = 128;

function segmentDistance(s: Segment, x: number, z: number): number {
  const t = Math.max(
    0,
    Math.min(1, ((x - s.a.x) * s.dx + (z - s.a.y) * s.dz) / (s.lengthSquared || 1)),
  );
  return Math.hypot(x - s.a.x - s.dx * t, z - s.a.y - s.dz * t);
}

/** The rendered channel, riverbed, moisture, and bank vegetation share this exact sampled course. */
export class WorldRiver {
  readonly channels: readonly RiverChannel[];
  readonly bridges: readonly WorldBridge[];
  private readonly segments: Segment[] = [];
  /** Per-bucket segments that can be nearest to some point in the bucket, in original order. */
  private readonly buckets: Segment[][] = [];
  private readonly bucketColumns: number;
  private readonly samples = new Map<string, RiverSample>();
  constructor(
    readonly definition: RiverDefinition,
    readonly center: number,
    readonly floor: number,
    seed = terrainSeed(`river:${definition.course.join(',')}`),
  ) {
    this.channels = riverChannels(definition).map((channel, channelIndex) => {
      const points = channel.sections.map((section) => {
        // An authored gorge keeps its exact course so cliffs, bridges and falls stay registered.
        if (definition.gorge) return { x: section.x, y: section.y };
        const envelope = Math.sin((section.distance / channel.length) * Math.PI);
        const bend =
          (Math.sin(section.distance / 420 + (seed % 31)) * 45 +
            (coherentNoise(section.distance / 680, 0, seed + 811) - 0.5) * 110) *
          envelope;
        const x = section.x + section.nx * bend;
        let y = section.y + section.ny * bend;
        // Route around the protected settlement rather than excavating through its buildings.
        y -= Math.max(0, y + 530) * (1 - smoothstep(100, 850, Math.abs(x)));
        return { x, y };
      });
      let distance = 0;
      const sections = points.map((p, i): RiverSection => {
        const before = points[Math.max(0, i - 1)]!,
          after = points[Math.min(points.length - 1, i + 1)]!;
        const tangent = Math.hypot(after.x - before.x, after.y - before.y) || 1;
        if (i) distance += Math.hypot(p.x - before.x, p.y - before.y);
        const original = channel.sections[i]!;
        const breadth =
          (definition.kind === 'stream' ? 1.65 : 1.2) *
          (0.84 + coherentNoise(distance / 380, channelIndex, seed + 821) * 0.45);
        return {
          ...p,
          nx: -(after.y - before.y) / tangent,
          ny: (after.x - before.x) / tangent,
          left:
            original.left * breadth * (0.9 + coherentNoise(distance / 190, 0, seed + 823) * 0.22),
          right:
            original.right * breadth * (0.9 + coherentNoise(distance / 210, 1, seed + 827) * 0.22),
          distance,
        };
      });
      return { sections, length: distance };
    });
    for (const channel of this.channels)
      for (let i = 0; i < channel.sections.length - 1; i += 3) {
        const a = channel.sections[i]!,
          b = channel.sections[Math.min(channel.sections.length - 1, i + 3)]!;
        const dx = b.x - a.x,
          dz = b.y - a.y;
        this.segments.push({ a, b, dx, dz, lengthSquared: dx * dx + dz * dz });
      }
    // Exact acceleration: a segment can only be nearest to a point in a bucket if its lower
    // bound (centre distance minus the half diagonal) is within the best corner upper bound.
    this.bucketColumns = Math.ceil((center * 2) / RIVER_BUCKET);
    const half = (RIVER_BUCKET * Math.SQRT2) / 2;
    for (let row = 0; row < this.bucketColumns; row++)
      for (let column = 0; column < this.bucketColumns; column++) {
        const x0 = column * RIVER_BUCKET - center,
          z0 = row * RIVER_BUCKET - center;
        const lower = this.segments.map(
          (segment) =>
            segmentDistance(segment, x0 + RIVER_BUCKET / 2, z0 + RIVER_BUCKET / 2) - half,
        );
        // Distance to a segment is convex, so its worst case over the bucket is at a corner.
        const reach = Math.min(
          ...this.segments.map((segment) =>
            Math.max(
              segmentDistance(segment, x0, z0),
              segmentDistance(segment, x0 + RIVER_BUCKET, z0),
              segmentDistance(segment, x0, z0 + RIVER_BUCKET),
              segmentDistance(segment, x0 + RIVER_BUCKET, z0 + RIVER_BUCKET),
            ),
          ),
        );
        this.buckets.push(this.segments.filter((_, i) => lower[i]! <= reach + 1));
      }
    const authored = definition.gorge?.bridges.map((bridge) => ({
      x: center + bridge.x,
      z: center + bridge.y,
      nx: Math.cos(bridge.angle),
      nz: Math.sin(bridge.angle),
      length: bridge.length,
      width: bridge.width,
      height: floor + 8,
    }));
    this.bridges =
      authored ??
      (definition.kind === 'frozen' ? [] : [0.32, 0.68]).map((t) => {
        const section = riverSectionAt(this.channels[0]!, this.channels[0]!.length * t);
        return {
          x: center + section.x,
          z: center + section.y,
          nx: section.nx,
          nz: section.ny,
          length: section.left + section.right + 36,
          width: 46,
          height: floor + 8,
        };
      });
  }
  sample(x: number, z: number): RiverSample {
    const key = `${x},${z}`,
      cached = this.samples.get(key);
    if (cached) return cached;
    const px = x - this.center,
      pz = z - this.center;
    let best = Infinity,
      halfWidth = 1;
    const column = Math.floor((px + this.center) / RIVER_BUCKET),
      row = Math.floor((pz + this.center) / RIVER_BUCKET);
    const candidates =
      column >= 0 && row >= 0 && column < this.bucketColumns && row < this.bucketColumns
        ? this.buckets[row * this.bucketColumns + column]!
        : this.segments;
    for (const s of candidates) {
      const t = Math.max(
        0,
        Math.min(1, ((px - s.a.x) * s.dx + (pz - s.a.y) * s.dz) / (s.lengthSquared || 1)),
      );
      const dx = px - s.a.x - s.dx * t,
        dz = pz - s.a.y - s.dz * t;
      const squared = dx * dx + dz * dz;
      if (squared >= best) continue;
      best = squared;
      const left = s.a.left + (s.b.left - s.a.left) * t,
        right = s.a.right + (s.b.right - s.a.right) * t;
      halfWidth = dx * s.a.nx + dz * s.a.ny < 0 ? left : right;
    }
    const distance = Math.sqrt(best),
      value = { distance, halfWidth, shoreDistance: distance - halfWidth };
    this.samples.set(key, value);
    if (this.samples.size > 32768) this.samples.delete(this.samples.keys().next().value!);
    return value;
  }
  distance(x: number, z: number): number {
    return this.sample(x, z).distance;
  }
  bridgeHeight(x: number, z: number): number | undefined {
    for (const bridge of this.bridges) {
      const dx = x - bridge.x,
        dz = z - bridge.z;
      if (
        Math.abs(dx * bridge.nx + dz * bridge.nz) <= bridge.length / 2 &&
        Math.abs(dx * bridge.nz - dz * bridge.nx) <= bridge.width / 2
      )
        return bridge.height;
    }
    return undefined;
  }
}
