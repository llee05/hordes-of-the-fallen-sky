import { GAME } from '../config';
import type { AreaThreatKind } from '../data/areaEncounters';
import type { RunPhase } from '../types';
export interface AreaThreat {
  id: number;
  kind: AreaThreatKind;
  x: number;
  y: number;
  age: number;
  warning: number;
  impacted: boolean;
  nextTick: number;
  owner?: string;
}
export interface AreaThreatState {
  nextId: number;
  threats: AreaThreat[];
}
export function createAreaThreats(): AreaThreatState {
  return { nextId: 1, threats: [] };
}
export function addAreaThreat(
  state: AreaThreatState,
  kind: AreaThreatKind,
  point: { x: number; y: number },
  warningBonus = 0,
  owner?: string,
): boolean {
  const c = GAME.areaCombat;
  if (!Number.isFinite(point.x + point.y) || state.threats.length >= c.maxThreats) return false;
  if (
    state.threats.filter((t) => (owner ? t.owner === owner : !t.owner)).length >=
    (owner ? c.maxOwnerThreats : c.maxTerrainThreats)
  )
    return false;
  const warning = GAME.areaCombat.threats[kind].warning + Math.max(0, warningBonus);
  state.threats.push({
    id: state.nextId++,
    kind,
    x: point.x,
    y: point.y,
    age: 0,
    warning,
    impacted: false,
    nextTick: warning + GAME.areaCombat.threats[kind].tickEvery,
    owner,
  });
  return true;
}
export function advanceAreaThreats(
  state: AreaThreatState,
  phase: RunPhase,
  dt: number,
  actions: {
    ownerActive: (key: string) => boolean;
    hit: (threat: AreaThreat, damage: number) => void;
  },
): void {
  if (phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  state.threats = state.threats.filter((t) => {
    // An unreleased spell belongs to one pooled incarnation; defeat/pinning cancels its warning.
    if (!t.impacted && t.owner && !actions.ownerActive(t.owner)) return false;
    t.age += dt;
    const spec = GAME.areaCombat.threats[t.kind];
    if (!t.impacted && t.age >= t.warning) {
      t.impacted = true;
      if (spec.damage > 0) actions.hit(t, spec.damage);
    }
    if (
      t.impacted &&
      spec.tickDamage > 0 &&
      t.age >= t.nextTick &&
      t.age <= t.warning + spec.duration
    ) {
      actions.hit(t, spec.tickDamage);
      t.nextTick = t.age + spec.tickEvery;
    }
    return t.age < t.warning + spec.duration;
  });
}
export function areaMovementMultiplier(
  state: AreaThreatState,
  point: { x: number; y: number },
): number {
  let slow = 0;
  for (const t of state.threats) {
    const s = GAME.areaCombat.threats[t.kind];
    if (t.impacted && Math.hypot(point.x - t.x, point.y - t.y) <= s.radius)
      slow = Math.max(slow, s.slow);
  }
  return Math.max(GAME.areaCombat.slowFloor, 1 - slow);
}
