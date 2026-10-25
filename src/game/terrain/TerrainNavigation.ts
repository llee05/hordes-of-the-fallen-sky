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
export type NavigationProfile = 'ground' | 'pack' | 'heavy';

/** Small binary heap for shared reverse Dijkstra fields; no per-actor A* allocation. */
class Frontier {
  private items: { index: number; cost: number }[] = [];
  push(index: number, cost: number): void {
    const item = { index, cost };
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.cost <= cost) break;
      this.items[i] = this.items[parent]!;
      i = parent;
    }
    this.items[i] = item;
  }
  pop(): { index: number; cost: number } | undefined {
    const first = this.items[0],
      last = this.items.pop();
    if (!this.items.length || !last) return first;
    let i = 0;
    while (i * 2 + 1 < this.items.length) {
      let child = i * 2 + 1;
      if (child + 1 < this.items.length && this.items[child + 1]!.cost < this.items[child]!.cost)
        child++;
      if (this.items[child]!.cost >= last.cost) break;
      this.items[i] = this.items[child]!;
      i = child;
    }
    this.items[i] = last;
    return first;
  }
}

/** Coarse world navigation stays resident while visual chunks stream independently. */
export class TerrainNavigation {
  readonly columns: number;
  readonly rows: number;
  readonly blocked: Uint8Array;
  readonly reachable: Uint8Array;
  private readonly flows = new Map<string, Float64Array>();
  private readonly costs: Record<NavigationProfile, Float32Array>;

  constructor(readonly terrain: MountainTerrain) {
    this.columns = this.rows = Math.ceil(terrain.worldSize / terrain.cellSize);
    this.blocked = new Uint8Array(this.columns * this.rows);
    this.costs = Object.fromEntries(
      ['ground', 'pack', 'heavy'].map((id) => [id, new Float32Array(this.blocked.length)]),
    ) as Record<NavigationProfile, Float32Array>;
    for (let row = 0; row < this.rows; row++)
      for (let column = 0; column < this.columns; column++) {
        const cell = terrain.cell(column, row),
          index = this.index(column, row);
        this.blocked[index] = Number(cell.blocked);
        const water = terrain.waterDepth(cell.sample.x, cell.sample.y);
        for (const profile of ['ground', 'pack', 'heavy'] as const) {
          const weights = GAME.navigation[profile];
          this.costs[profile][index] =
            1 +
            Math.min(1, cell.sample.slope) * weights.slope +
            cell.sample.weights[4] * weights.snow +
            cell.sample.weights[2] * weights.stone +
            water * weights.water;
        }
      }
    const camp = this.index(
      Math.floor(terrain.worldSize / 2 / terrain.cellSize),
      Math.floor(terrain.worldSize / 2 / terrain.cellSize),
    );
    const field = this.buildFlow(camp, 'ground');
    this.reachable = Uint8Array.from(field, (distance) => Number(Number.isFinite(distance)));
  }

  get cachedFlows(): number {
    return this.flows.size;
  }

  private index(column: number, row: number): number {
    return row * this.columns + column;
  }
  private open(column: number, row: number): boolean {
    const size = this.terrain.cellSize;
    return (
      column >= 0 &&
      row >= 0 &&
      column < this.columns &&
      row < this.rows &&
      Math.min(size, this.terrain.worldSize - column * size) >= GAME.terrain.actorClearance * 2 &&
      Math.min(size, this.terrain.worldSize - row * size) >= GAME.terrain.actorClearance * 2 &&
      !this.blocked[this.index(column, row)]
    );
  }
  private center(index: number): TerrainPoint {
    const size = this.terrain.cellSize;
    return {
      x:
        ((index % this.columns) * size +
          Math.min(this.terrain.worldSize, ((index % this.columns) + 1) * size)) /
        2,
      y:
        (Math.floor(index / this.columns) * size +
          Math.min(this.terrain.worldSize, (Math.floor(index / this.columns) + 1) * size)) /
        2,
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

  /** Area-specific ground costs are resident with collision, independent of streamed scenery. */
  travelCost(point: TerrainPoint, profile: NavigationProfile = 'ground'): number {
    const x = Math.floor(point.x / this.terrain.cellSize),
      y = Math.floor(point.y / this.terrain.cellSize);
    return this.open(x, y) ? this.costs[profile][this.index(x, y)]! : Infinity;
  }

  private edgeCost(a: number, b: number, diagonal: boolean, profile: NavigationProfile): number {
    return (this.costs[profile][a]! + this.costs[profile][b]!) * 0.5 * (diagonal ? Math.SQRT2 : 1);
  }

  /** Terrain-weighted shared destination fields; actor-sized local sweeps prevent corner snagging. */
  waypoint(
    from: TerrainPoint,
    target: TerrainPoint,
    profile: NavigationProfile = 'ground',
  ): TerrainPoint {
    const safe = this.nearestWalkable(target);
    if (!safe) return from;
    if (Math.hypot(safe.x - from.x, safe.y - from.y) < 96 && this.lineClear(from, safe))
      return safe;
    const size = this.terrain.cellSize;
    const column = Math.floor(from.x / size),
      row = Math.floor(from.y / size);
    if (!this.open(column, row)) return this.nearestWalkable(from) ?? from;
    const destination = this.index(Math.floor(safe.x / size), Math.floor(safe.y / size));
    const key = `${profile}:${destination}`;
    let flow = this.flows.get(key);
    if (!flow) {
      flow = this.buildFlow(destination, profile);
      this.flows.set(key, flow);
      if (this.flows.size > GAME.terrain.flowCacheSize)
        this.flows.delete(this.flows.keys().next().value!);
    }
    const current = this.index(column, row);
    if (!Number.isFinite(flow[current])) return from;
    let next = current,
      best = Infinity;
    for (const [dx, dy] of NEIGHBORS) {
      if (
        !this.open(column + dx, row + dy) ||
        (dx && dy && (!this.open(column + dx, row) || !this.open(column, row + dy)))
      )
        continue;
      const index = this.index(column + dx, row + dy);
      const cost = flow[index]! + this.edgeCost(current, index, !!(dx && dy), profile);
      if (
        flow[index]! < flow[current]! &&
        cost < best &&
        this.lineClear(from, this.center(index))
      ) {
        next = index;
        best = cost;
      }
    }
    // Re-centre within this cell if a collision left the actor too close to a corner.
    return next === destination ? safe : this.center(next);
  }

  private buildFlow(destination: number, profile: NavigationProfile): Float64Array {
    const field = new Float64Array(this.blocked.length).fill(Infinity);
    const queue = new Frontier();
    queue.push(destination, 0);
    field[destination] = 0;
    let item;
    while ((item = queue.pop())) {
      const { index, cost } = item;
      if (cost > field[index]!) continue;
      const column = index % this.columns,
        row = Math.floor(index / this.columns);
      for (const [dx, dy] of NEIGHBORS) {
        const cx = column + dx,
          cy = row + dy;
        if (!this.open(cx, cy) || (dx && dy && (!this.open(cx, row) || !this.open(column, cy))))
          continue;
        const next = this.index(cx, cy);
        const candidate = cost + this.edgeCost(index, next, !!(dx && dy), profile);
        if (candidate >= field[next]!) continue;
        field[next] = candidate;
        queue.push(next, candidate);
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
