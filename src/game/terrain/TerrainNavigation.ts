import { GAME } from '../config';
import { MountainTerrain } from './MountainTerrain';
import type { TerrainBounds, TerrainPoint } from './types';

const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
] as const;
const UNREACHABLE = 0xffffffff;

/** Coarse world navigation stays resident while visual chunks stream independently. */
export class TerrainNavigation {
  readonly columns: number;
  readonly rows: number;
  readonly blocked: Uint8Array;
  readonly reachable: Uint8Array;
  private readonly flows = new Map<number, Uint32Array>();

  constructor(readonly terrain: MountainTerrain) {
    this.columns = this.rows = Math.ceil(terrain.worldSize / terrain.cellSize);
    this.blocked = new Uint8Array(this.columns * this.rows);
    for (let row = 0; row < this.rows; row++)
      for (let column = 0; column < this.columns; column++) {
        this.blocked[this.index(column, row)] = Number(terrain.isCliff(column, row));
      }
    const camp = this.index(
      Math.floor(terrain.worldSize / 2 / terrain.cellSize),
      Math.floor(terrain.worldSize / 2 / terrain.cellSize),
    );
    const field = this.buildFlow(camp);
    this.reachable = Uint8Array.from(field, (distance) => Number(distance !== UNREACHABLE));
  }

  get cachedFlows(): number {
    return this.flows.size;
  }

  private index(column: number, row: number): number {
    return row * this.columns + column;
  }
  private open(column: number, row: number): boolean {
    return (
      column >= 0 &&
      row >= 0 &&
      column < this.columns &&
      row < this.rows &&
      !this.blocked[this.index(column, row)]
    );
  }
  private center(index: number): TerrainPoint {
    const size = this.terrain.cellSize;
    return {
      x: Math.min(this.terrain.worldSize - size / 2, ((index % this.columns) + 0.5) * size),
      y: Math.min(
        this.terrain.worldSize - size / 2,
        (Math.floor(index / this.columns) + 0.5) * size,
      ),
    };
  }

  isWalkable(x: number, y: number, radius = 0, connected = false): boolean {
    const size = this.terrain.cellSize;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < radius ||
      y < radius ||
      x >= this.terrain.worldSize - radius ||
      y >= this.terrain.worldSize - radius
    )
      return false;
    if (connected && !this.reachable[this.index(Math.floor(x / size), Math.floor(y / size))])
      return false;
    for (let row = Math.floor((y - radius) / size); row <= Math.floor((y + radius) / size); row++) {
      for (
        let column = Math.floor((x - radius) / size);
        column <= Math.floor((x + radius) / size);
        column++
      ) {
        if (this.open(column, row)) continue;
        const nearX = Math.max(column * size, Math.min((column + 1) * size, x));
        const nearY = Math.max(row * size, Math.min((row + 1) * size, y));
        if (Math.hypot(x - nearX, y - nearY) <= radius) return false;
      }
    }
    return true;
  }

  nearestWalkable(
    point: TerrainPoint,
    radius: number = GAME.terrain.actorClearance,
  ): TerrainPoint | undefined {
    if (this.isWalkable(point.x, point.y, radius, true)) return { ...point };
    let best: TerrainPoint | undefined;
    let distance = Infinity;
    const size = this.terrain.cellSize;
    const cx = Math.max(0, Math.min(this.columns - 1, Math.floor(point.x / size)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(point.y / size)));
    for (let ring = 0; ring < Math.max(this.columns, this.rows); ring++) {
      for (let row = Math.max(0, cy - ring); row <= Math.min(this.rows - 1, cy + ring); row++) {
        for (
          let column = Math.max(0, cx - ring);
          column <= Math.min(this.columns - 1, cx + ring);
          column++
        ) {
          if (ring && Math.abs(column - cx) !== ring && Math.abs(row - cy) !== ring) continue;
          const candidate = this.center(this.index(column, row));
          const squared = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
          if (squared < distance && this.isWalkable(candidate.x, candidate.y, radius, true)) {
            best = candidate;
            distance = squared;
          }
        }
      }
      if (best && distance < ((ring - 1) * size) ** 2) break;
    }
    return best;
  }

  lineClear(
    from: TerrainPoint,
    to: TerrainPoint,
    radius: number = GAME.terrain.actorClearance,
  ): boolean {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (this.terrain.cellSize / 3)),
    );
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      if (!this.isWalkable(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius))
        return false;
    }
    return true;
  }

  /** Shared destination flow fields avoid hundreds of per-enemy A* searches. No diagonal corner cutting. */
  waypoint(from: TerrainPoint, target: TerrainPoint): TerrainPoint {
    const safe = this.nearestWalkable(target);
    if (!safe) return from;
    if (Math.hypot(safe.x - from.x, safe.y - from.y) < 192 && this.lineClear(from, safe))
      return safe;
    const size = this.terrain.cellSize;
    const column = Math.floor(from.x / size);
    const row = Math.floor(from.y / size);
    if (!this.open(column, row)) return this.nearestWalkable(from) ?? from;
    const destination = this.index(Math.floor(safe.x / size), Math.floor(safe.y / size));
    let flow = this.flows.get(destination);
    if (!flow) {
      flow = this.buildFlow(destination);
      this.flows.set(destination, flow);
      if (this.flows.size > GAME.terrain.flowCacheSize)
        this.flows.delete(this.flows.keys().next().value!);
    }
    let next = this.index(column, row);
    let distance = flow[next]!;
    for (const [dx, dy] of NEIGHBORS) {
      if (
        !this.open(column + dx, row + dy) ||
        (dx && dy && (!this.open(column + dx, row) || !this.open(column, row + dy)))
      )
        continue;
      const index = this.index(column + dx, row + dy);
      if (flow[index]! < distance) {
        next = index;
        distance = flow[index]!;
      }
    }
    return next === destination ? safe : this.center(next);
  }

  private buildFlow(destination: number): Uint32Array {
    const field = new Uint32Array(this.blocked.length).fill(UNREACHABLE);
    const queue = new Uint32Array(this.blocked.length);
    let start = 0;
    let end = 1;
    queue[0] = destination;
    field[destination] = 0;
    while (start < end) {
      const index = queue[start++]!;
      const column = index % this.columns;
      const row = Math.floor(index / this.columns);
      for (const [dx, dy] of NEIGHBORS) {
        const cx = column + dx;
        const cy = row + dy;
        if (!this.open(cx, cy) || (dx && dy && (!this.open(cx, row) || !this.open(column, cy))))
          continue;
        const next = this.index(cx, cy);
        if (field[next] !== UNREACHABLE) continue;
        field[next] = field[index]! + 1;
        queue[end++] = next;
      }
    }
    return field;
  }

  /** Collision rectangles exactly cover steep cells, merging equal runs across rows. */
  collisionBounds(): readonly TerrainBounds[] {
    const rectangles: TerrainBounds[] = [];
    let previous = new Map<string, TerrainBounds>();
    const size = this.terrain.cellSize;
    for (let row = 0; row < this.rows; row++) {
      const current = new Map<string, TerrainBounds>();
      for (let column = 0; column < this.columns;) {
        if (!this.blocked[this.index(column, row)]) {
          column++;
          continue;
        }
        const start = column;
        while (column < this.columns && this.blocked[this.index(column, row)]) column++;
        const key = `${start}:${column}`;
        const height = Math.min(size, this.terrain.worldSize - row * size);
        const existing = previous.get(key);
        const rectangle = existing ?? {
          x: start * size,
          y: row * size,
          width: Math.min(this.terrain.worldSize, column * size) - start * size,
          height: 0,
        };
        rectangle.height += height;
        if (!existing) rectangles.push(rectangle);
        current.set(key, rectangle);
      }
      previous = current;
    }
    return rectangles;
  }

  /** Non-physical follower movement also sweeps rather than teleporting across cliff cells. */
  slide(from: TerrainPoint, desired: TerrainPoint, radius = 18): TerrainPoint {
    let point = this.isWalkable(from.x, from.y, radius)
      ? { ...from }
      : (this.nearestWalkable(from, radius) ?? { ...from });
    const dx = desired.x - point.x;
    const dy = desired.y - point.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (this.terrain.cellSize / 3)));
    for (let step = 0; step < steps; step++) {
      if (this.isWalkable(point.x + dx / steps, point.y, radius)) point.x += dx / steps;
      if (this.isWalkable(point.x, point.y + dy / steps, radius)) point.y += dy / steps;
    }
    return point;
  }
}
