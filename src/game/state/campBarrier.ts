import { GAME } from '../config';
import { BUILDINGS } from '../data/clan';
import type { RunState } from '../types';
import { CAMP_SITES, campShelters } from './campLife';

/** One world-space boundary for the visible hurdles, attackers, projectiles, and camp wards. */
export function campBoundary(run: RunState): {
  radius: number;
  attackRange: number;
  wardRadius: number;
} {
  const sites = campShelters(run);
  for (const building of BUILDINGS)
    if (building.id !== 'ger' && run.clan.buildings[building.id])
      sites.push(CAMP_SITES[building.id]);
  const { attackReach, groundClearance, padding } = GAME.camp.barrier;
  const extent = Math.max(
    ...sites.map(
      (site) => (Math.hypot(site.x, site.y) + groundClearance) * GAME.camp.visualScale + padding,
    ),
  );
  const radius = Math.ceil(Math.max(GAME.camp.enemyAttack.range - attackReach, extent) / 4) * 4;
  const attackRange = radius + attackReach;
  return {
    radius,
    attackRange,
    wardRadius: Math.max(GAME.patrons.guardian.wardRadius, attackRange + 5),
  };
}

export function barrierContact(
  camp: { x: number; y: number },
  source: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  const angle = Math.atan2(source.y - camp.y, source.x - camp.x);
  return { x: camp.x + Math.cos(angle) * radius, y: camp.y + Math.sin(angle) * radius };
}
