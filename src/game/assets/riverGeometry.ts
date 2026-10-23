import type { LandscapeDefinition } from '../data/landscapes';

export type RiverDefinition = NonNullable<LandscapeDefinition['water']>;
export interface RiverPoint {
  x: number;
  y: number;
}
export interface RiverSection extends RiverPoint {
  nx: number;
  ny: number;
  left: number;
  right: number;
  distance: number;
}
export interface RiverChannel {
  sections: readonly RiverSection[];
  length: number;
}

function interpolate(a: number, b: number, c: number, d: number, t: number): number {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

/** Camp-relative, irregular shorelines shared by the battlefield and manuscript previews. */
export function riverChannels(water: RiverDefinition): readonly RiverChannel[] {
  const points: RiverPoint[] = [];
  const count = water.course.length / 2;
  for (let segment = 0; segment < count - 1; segment++) {
    const coordinate = (index: number, axis: number) =>
      water.course[Math.max(0, Math.min(count - 1, index)) * 2 + axis]!;
    const steps = Math.max(
      4,
      Math.ceil(
        Math.hypot(
          coordinate(segment + 1, 0) - coordinate(segment, 0),
          coordinate(segment + 1, 1) - coordinate(segment, 1),
        ) / 22,
      ),
    );
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      points.push({
        x: interpolate(
          coordinate(segment - 1, 0),
          coordinate(segment, 0),
          coordinate(segment + 1, 0),
          coordinate(segment + 2, 0),
          t,
        ),
        y: interpolate(
          coordinate(segment - 1, 1),
          coordinate(segment, 1),
          coordinate(segment + 1, 1),
          coordinate(segment + 2, 1),
          t,
        ),
      });
    }
  }
  points.push({ x: water.course.at(-2)!, y: water.course.at(-1)! });
  const courses = [points];
  if (water.kind === 'braided') {
    courses.push(
      points.map((point, index) => {
        const t = index / (points.length - 1);
        const split = Math.sin(t * Math.PI * 3) ** 2;
        return { x: point.x, y: point.y - split * water.width * (1.2 + Math.sin(t * 8) * 0.2) };
      }),
    );
  }
  return courses.map((course, channel) => {
    let distance = 0;
    const sections = course.map((point, index): RiverSection => {
      const previous = course[Math.max(0, index - 1)]!;
      const next = course[Math.min(course.length - 1, index + 1)]!;
      const tangent = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
      if (index) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      const width = (water.width * (channel ? 0.44 : 1)) / 2;
      return {
        ...point,
        nx: -(next.y - previous.y) / tangent,
        ny: (next.x - previous.x) / tangent,
        left:
          width *
          (0.94 + Math.sin(distance * 0.009 + 0.5) * 0.12 + Math.sin(distance * 0.027) * 0.055),
        right:
          width *
          (0.96 + Math.sin(distance * 0.011 + 2) * 0.13 + Math.sin(distance * 0.023 + 1) * 0.055),
        distance,
      };
    });
    return { sections, length: distance };
  });
}

export function riverPoint(section: RiverSection, side: number, padding = 0): RiverPoint {
  const offset = side * ((side < 0 ? section.left : section.right) + padding);
  return { x: section.x + section.nx * offset, y: section.y + section.ny * offset };
}

/** Sample by travelled distance, keeping the current speed steady through bends. */
export function riverSectionAt(channel: RiverChannel, distance: number): RiverSection {
  const target = Math.max(0, Math.min(channel.length, distance));
  let low = 0;
  let high = channel.sections.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (channel.sections[middle]!.distance < target) low = middle;
    else high = middle;
  }
  const a = channel.sections[low]!;
  const b = channel.sections[high]!;
  const t = (target - a.distance) / (b.distance - a.distance || 1);
  const blend = (first: number, second: number) => first + (second - first) * t;
  const nx = blend(a.nx, b.nx);
  const ny = blend(a.ny, b.ny);
  const length = Math.hypot(nx, ny) || 1;
  return {
    x: blend(a.x, b.x),
    y: blend(a.y, b.y),
    nx: nx / length,
    ny: ny / length,
    left: blend(a.left, b.left),
    right: blend(a.right, b.right),
    distance: target,
  };
}

export function riverOutline(
  sections: readonly RiverSection[],
  scale = 1,
  padding = 0,
  offset = 0,
): RiverPoint[] {
  return [
    ...sections.map((section) => riverPoint(section, -scale + offset, padding)),
    ...[...sections].reverse().map((section) => riverPoint(section, scale + offset, padding)),
  ];
}

/** Includes a dry margin so trees and rock bases cannot appear to float in the channel. */
export function isRiverWater(
  channels: readonly RiverChannel[],
  x: number,
  y: number,
  margin = 0,
): boolean {
  return channels.some((channel) =>
    channel.sections.some((section, index) => {
      if (!index) return false;
      const previous = channel.sections[index - 1]!;
      const dx = section.x - previous.x;
      const dy = section.y - previous.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = Math.max(
        0,
        Math.min(1, ((x - previous.x) * dx + (y - previous.y) * dy) / (lengthSquared || 1)),
      );
      const distance = Math.hypot(x - previous.x - dx * t, y - previous.y - dy * t);
      return (
        distance < Math.max(previous.left, previous.right, section.left, section.right) + margin
      );
    }),
  );
}
