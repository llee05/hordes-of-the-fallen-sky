import { GAME } from '../config';

export interface WorldView {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function cameraZoomLimits(width: number, height: number): { min: number; max: number } {
  const min = Math.max(GAME.camera.minZoom, width / GAME.worldSize, height / GAME.worldSize);
  return { min, max: Math.max(GAME.camera.maxZoom, min) };
}

export function clampCameraZoom(zoom: number, width: number, height: number): number {
  const { min, max } = cameraZoomLimits(width, height);
  return Math.max(
    min,
    Math.min(max, Number.isFinite(zoom) ? Math.round(zoom * 100) / 100 : GAME.camera.defaultZoom),
  );
}

/** Keep arrivals beyond the visible world, including when the camp is off-centre or near a map edge. */
export function enemySpawnPosition(
  view: WorldView,
  anchor: { x: number; y: number },
  angle: number,
): { x: number; y: number } {
  const margin = GAME.camera.spawnMargin;
  let fallback = { x: anchor.x, y: anchor.y };
  let farthest = -1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const direction = angle + (attempt * Math.PI) / 4;
    const dx = Math.cos(direction);
    const dy = Math.sin(direction);
    const acrossX =
      Math.abs(dx) < 0.0001
        ? Infinity
        : (dx > 0 ? view.x + view.width + margin - anchor.x : anchor.x - view.x + margin) /
          Math.abs(dx);
    const acrossY =
      Math.abs(dy) < 0.0001
        ? Infinity
        : (dy > 0 ? view.y + view.height + margin - anchor.y : anchor.y - view.y + margin) /
          Math.abs(dy);
    const spread = Math.min(
      (view.width / 2 + margin) / Math.max(0.0001, Math.abs(dx)),
      (view.height / 2 + margin) / Math.max(0.0001, Math.abs(dy)),
    );
    const distance = Math.max(spread, Math.min(acrossX, acrossY));
    const point = {
      x: Math.max(24, Math.min(GAME.worldSize - 24, anchor.x + dx * distance)),
      y: Math.max(24, Math.min(GAME.worldSize - 24, anchor.y + dy * distance)),
    };
    if (
      point.x < view.x - margin / 2 ||
      point.x > view.x + view.width + margin / 2 ||
      point.y < view.y - margin / 2 ||
      point.y > view.y + view.height + margin / 2
    )
      return point;
    const fromCenter =
      (point.x - view.x - view.width / 2) ** 2 + (point.y - view.y - view.height / 2) ** 2;
    if (fromCenter > farthest) {
      fallback = point;
      farthest = fromCenter;
    }
  }
  // A viewport covering the entire world has no off-screen ground; use its farthest edge.
  return fallback;
}
