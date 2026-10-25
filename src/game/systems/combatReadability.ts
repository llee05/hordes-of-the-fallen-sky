export interface ScreenPoint {
  x: number;
  y: number;
}
export interface ScreenDanger extends ScreenPoint {
  id: string;
  label: string;
  eta: number;
}
export interface EdgeWarning extends ScreenDanger {
  angle: number;
}
export interface EliteMarker extends ScreenPoint {
  id: string;
  label: string;
  health: number;
}
/** Predict actual approach, ignoring shots moving away or passing safely to one side. */
export function incomingTime(
  source: ScreenPoint,
  velocity: ScreenPoint,
  target: ScreenPoint,
  radius: number,
  horizon = 4,
): number | undefined {
  const speedSq = velocity.x ** 2 + velocity.y ** 2;
  if (speedSq < 1) return;
  const dx = target.x - source.x,
    dy = target.y - source.y;
  const t = (dx * velocity.x + dy * velocity.y) / speedSq;
  if (t < 0 || t > horizon || Math.hypot(dx - velocity.x * t, dy - velocity.y * t) > radius) return;
  return t;
}
/** Group each compass sector and bound the HUD so dense volleys cannot flood it. */
export function edgeWarnings(
  candidates: readonly ScreenDanger[],
  width: number,
  height: number,
): EdgeWarning[] {
  if (width <= 0 || height <= 0) return [];
  const groups = new Map<number, ScreenDanger>();
  for (const danger of candidates) {
    if (!Number.isFinite(danger.x + danger.y + danger.eta) || danger.eta < 0) continue;
    if (danger.x >= 0 && danger.x <= width && danger.y >= 0 && danger.y <= height) continue;
    const angle = Math.atan2(danger.y - height / 2, danger.x - width / 2);
    const sector = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
    if (!groups.has(sector) || groups.get(sector)!.eta > danger.eta) groups.set(sector, danger);
  }
  return [...groups.values()]
    .sort((a, b) => a.eta - b.eta)
    .slice(0, 4)
    .map((danger) => {
      const dx = danger.x - width / 2,
        dy = danger.y - height / 2;
      const k = Math.min(
        (width / 2 - Math.min(90, width / 4)) / Math.max(0.001, Math.abs(dx)),
        (height / 2 - Math.min(100, height / 4)) / Math.max(0.001, Math.abs(dy)),
      );
      return {
        ...danger,
        x: (width / 2 + dx * k) / width,
        y: (height / 2 + dy * k) / height,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });
}
