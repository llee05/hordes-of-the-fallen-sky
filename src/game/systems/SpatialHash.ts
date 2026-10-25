export interface SpatialItem {
  x: number;
  y: number;
  active: boolean;
}

/** Rebuilt once per frame; avoids scanning the whole horde for every bolt. */
export class SpatialHash<T extends SpatialItem> {
  private readonly cells = new Map<string, T[]>();
  constructor(private readonly cellSize = 96) {}

  rebuild(items: readonly T[]): void {
    this.cells.clear();
    for (const item of items) {
      if (!item.active) continue;
      const key = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.y / this.cellSize));
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(item);
      else this.cells.set(key, [item]);
    }
  }

  nearest(
    x: number,
    y: number,
    radius: number,
    accept: (item: T) => boolean = () => true,
  ): T | undefined {
    let nearest: T | undefined;
    let best = radius * radius;
    this.forEachNearby(x, y, radius, (item) => {
      const distance = (item.x - x) ** 2 + (item.y - y) ** 2;
      if (item.active && distance <= best && accept(item)) {
        nearest = item;
        best = distance;
      }
    });
    return nearest;
  }

  forEachNearby(x: number, y: number, radius: number, visit: (item: T) => void): void {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const radiusSquared = radius * radius;
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        for (const item of this.cells.get(this.key(cx, cy)) ?? []) {
          if (item.active && (item.x - x) ** 2 + (item.y - y) ** 2 <= radiusSquared) visit(item);
        }
      }
    }
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }
}
