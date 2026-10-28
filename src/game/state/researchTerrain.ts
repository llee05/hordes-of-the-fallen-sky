import { GAME } from '../config';
import type { RunState } from '../types';
import { ownsResearch, researchWaterRadius } from './researchRuntime';

/** Per-spawn field history. Reused pool slots cannot inherit control effects. */
export function researchEnemySlow(
  run: RunState,
  slot: number,
  spawn: number,
  distance: number,
  dt: number,
  boss = false,
  patch = false,
): number {
  const base = distance < researchWaterRadius(run) ? run.patrons.water.slow : 0;
  if (run.phase !== 'playing') return Math.max(0.2, 1 - base);
  const r = (run.researchRuntime ??= {}),
    key = `${slot}:${spawn}`,
    now = run.elapsed;
  const seen = (r.slowSeenAt ??= {}),
    since = (r.slowSince ??= {}),
    until = (r.slowUntil ??= {});
  for (const k of Object.keys(seen))
    if (seen[k]! < now - 12) {
      delete seen[k];
      delete since[k];
      delete until[k];
      delete r.rootUntil?.[k];
      delete r.rootCooldown?.[k];
    }
  const strength = Math.max(base, patch ? GAME.research.ridgeSlow : 0);
  if (strength > 0) {
    if (seen[key] === undefined || seen[key]! < now - dt - 0.001) since[key] = now - dt;
    seen[key] = now;
    until[key] = now + (ownsResearch(run, 'lu-floodplain') ? GAME.research.floodplainSeconds : 0);
  } else if ((until[key] ?? 0) <= now) {
    delete since[key];
    return 1;
  }
  const duration = Math.max(0, now - (since[key] ?? now));
  if (
    !boss &&
    ownsResearch(run, 'lu-frozen-bank') &&
    duration >= GAME.research.frozenBankAfter &&
    (r.rootCooldown?.[key] ?? -Infinity) <= now
  ) {
    (r.rootUntil ??= {})[key] = now + GAME.research.frozenBankRoot;
    (r.rootCooldown ??= {})[key] = now + GAME.research.frozenBankCooldown;
  }
  if (!boss && (r.rootUntil?.[key] ?? 0) > now) return 0;
  const ramp = ownsResearch(run, 'lu-deep-current')
    ? Math.min(1, duration / GAME.research.deepCurrentAfter) * GAME.research.deepCurrentSlow
    : 0;
  return Math.max(0.2, 1 - Math.max(strength, run.patrons.water.slow) - ramp);
}
export function researchEnemySlowed(
  run: RunState,
  slot: number,
  spawn: number,
  distance: number,
  point: { x: number; y: number },
): boolean {
  const r = run.researchRuntime;
  const key = `${slot}:${spawn}`;
  return (
    (run.patrons.water.slow > 0 && distance < researchWaterRadius(run)) ||
    (r?.slowUntil?.[key] ?? 0) > run.elapsed ||
    (r?.rootUntil?.[key] ?? 0) > run.elapsed ||
    (r?.staggerUntil?.[key] ?? 0) > run.elapsed ||
    (r?.ridgePatches ?? []).some(
      (p) =>
        p.until > run.elapsed &&
        Math.hypot(point.x - p.x, point.y - p.y) < GAME.research.ridgeRadius,
    ) ||
    run.combat.trails.some(
      (t) => Math.hypot(point.x - t.x, point.y - t.y) < GAME.mounted.trailRadius,
    )
  );
}
export function researchKnockback(run: RunState, slowed: boolean, boss: boolean): number {
  if (boss) return 0;
  return slowed && ownsResearch(run, 'lu-stone-and-stream') ? GAME.research.stoneStreamForce : 1;
}
/** One claim per water pulse, shared by every enemy hit by that pulse. */
export function claimWaterPush(run: RunState): { pull: number; damage: number } {
  if (run.phase !== 'playing') return { pull: 0, damage: 1 };
  const r = (run.researchRuntime ??= {});
  let pull = 0,
    damage = 1;
  if (ownsResearch(run, 'lu-undertow') && (r.undertowAt ?? -Infinity) <= run.elapsed) {
    r.undertowAt = run.elapsed + GAME.research.undertowCooldown;
    pull = GAME.research.undertowPull;
  }
  if (ownsResearch(run, 'lu-floodgate') && (r.floodgateAt ?? -Infinity) <= run.elapsed) {
    r.floodgateAt = run.elapsed + GAME.research.floodgateCooldown;
    damage = GAME.research.floodgateDamage;
  }
  return { pull, damage };
}
export function terrainWarningBonus(run: RunState): number {
  return ownsResearch(run, 'lu-geomancers-eye') ? GAME.research.geomancerWarning : 0;
}
export function terrainDodgeSpeed(run: RunState): number {
  if ((run.researchRuntime?.dodgeUntil ?? 0) <= run.elapsed) return 1;
  return ownsResearch(run, 'lu-warning-signs')
    ? GAME.research.warningSignsSpeed
    : GAME.research.geomancerSpeed;
}
/** Called once when an eruption resolves; seer attacks never grant these effects. */
export function resolveResearchEruption(
  run: RunState,
  x: number,
  y: number,
  radius: number,
  player: { x: number; y: number },
  galloping: boolean,
  entered: boolean,
  resolving = true,
): { immune: boolean; rock: boolean } {
  if (run.phase !== 'playing' || run.health <= 0 || run.khan.successionRemaining > 0)
    return { immune: false, rock: false };
  const r = (run.researchRuntime ??= {});
  const inside = Math.hypot(player.x - x, player.y - y) < radius;
  const immune = inside && galloping && ownsResearch(run, 'lu-eye-of-the-mountain');
  let rock = false;
  if (immune && (r.rockArcCooldown ?? -Infinity) <= run.elapsed) {
    r.rockArcCooldown = run.elapsed + GAME.research.rockArcCooldown;
    rock = true;
  }
  if (
    (!inside || immune) &&
    entered &&
    (ownsResearch(run, 'lu-geomancers-eye') || ownsResearch(run, 'lu-warning-signs')) &&
    (r.dodgeCooldown ?? -Infinity) <= run.elapsed
  ) {
    const signs = ownsResearch(run, 'lu-warning-signs');
    r.dodgeUntil =
      run.elapsed +
      (signs ? GAME.research.warningSignsSeconds : GAME.research.geomancerSpeedSeconds);
    r.dodgeCooldown = run.elapsed + GAME.research.warningSignsCooldown;
  }
  if (resolving && !inside && ownsResearch(run, 'lu-shifting-ridge')) {
    const patches = (r.ridgePatches ??= []);
    patches.push({ x: x + radius, y, until: run.elapsed + GAME.research.ridgeSeconds });
    if (patches.length > 16) patches.shift();
  }
  return { immune, rock };
}
export function inRidgePatch(run: RunState, x: number, y: number): boolean {
  const r = run.researchRuntime;
  if (!r?.ridgePatches) return false;
  r.ridgePatches = r.ridgePatches.filter((p) => p.until > run.elapsed);
  return r.ridgePatches.some((p) => Math.hypot(x - p.x, y - p.y) < GAME.research.ridgeRadius);
}
export function landWaterActive(run: RunState): boolean {
  return (
    ownsResearch(run, 'lu-land-in-motion') &&
    Math.floor(run.elapsed / GAME.research.landZoneEvery) % 2 === 0
  );
}
export function claimTerrainWave(run: RunState): { wave: boolean; stone: boolean } {
  if (run.phase !== 'playing' || run.health <= 0 || run.khan.successionRemaining > 0)
    return { wave: false, stone: false };
  const r = (run.researchRuntime ??= {});
  let wave = false,
    stone = false;
  if (
    ownsResearch(run, 'lu-river-that-remembers') &&
    run.elapsed >= (r.terrainPulseAt ?? GAME.research.riverWaveEvery)
  ) {
    r.terrainPulseAt = run.elapsed + GAME.research.riverWaveEvery;
    wave = true;
  }
  if (
    ownsResearch(run, 'lu-land-in-motion') &&
    !landWaterActive(run) &&
    run.elapsed >= (r.stoneTickAt ?? 0)
  ) {
    r.stoneTickAt = run.elapsed + GAME.research.landStoneEvery;
    stone = true;
  }
  return { wave, stone };
}
