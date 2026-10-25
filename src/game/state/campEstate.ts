import { BUILDINGS } from '../data/clan';
import {
  ENCAMPMENT_TIERS,
  INTERNAL_DEVELOPMENTS,
  type EstateImprovement,
} from '../data/campEstate';
import type { BuildingId, CampEstate, RunState } from '../types';
import { applyCampEffects, hasDevelopment } from './camp';

export function createCampEstate(): CampEstate {
  return { tier: 1, slots: ['ger', null, null, null, null, null], internals: {} };
}
export function encampment(run: RunState) {
  return ENCAMPMENT_TIERS[Math.max(0, Math.min(4, (run.clan.estate?.tier ?? 1) - 1))]!;
}
export function buildingLevel(run: RunState, id: BuildingId): number {
  if (!run.clan.buildings[id]) return 0;
  return Math.max(
    1,
    ...BUILDINGS.find((b) => b.id === id)!
      .paths.filter((p) => p.level && hasDevelopment(run, id, p.id))
      .map((p) => p.level!),
  );
}
/** Legacy camps retain every established facility, including any grandfathered overflow. */
export function campSlots(run: RunState): (BuildingId | null)[] {
  const slots = [...(run.clan.estate?.slots ?? createCampEstate().slots)];
  for (const building of BUILDINGS) {
    if (!run.clan.buildings[building.id] || slots.includes(building.id)) continue;
    const free = slots.indexOf(null);
    if (free < 0) slots.push(building.id);
    else slots[free] = building.id;
  }
  return slots;
}
export function estateAssignedWorkers(run: RunState): number {
  return (
    BUILDINGS.reduce(
      (sum, b) =>
        sum +
        (run.clan.buildings[b.id] ? b.workers : 0) +
        b.paths
          .filter((p) => hasDevelopment(run, b.id, p.id))
          .reduce((n, p) => n + (p.workers ?? 0), 0),
      0,
    ) +
    INTERNAL_DEVELOPMENTS.reduce(
      (sum, d) =>
        sum +
        d.ranks.slice(0, run.clan.estate?.internals[d.id] ?? 0).reduce((n, r) => n + r.workers, 0),
      0,
    )
  );
}
function prerequisites(
  run: RunState,
  requirements: EstateImprovement['requiresBuildings'],
): string | undefined {
  const missing = requirements?.find((r) => buildingLevel(run, r.building) < r.level);
  return missing
    ? `Requires ${BUILDINGS.find((b) => b.id === missing.building)!.title} level ${missing.level}`
    : undefined;
}
export function estateBuildingBlocker(
  run: RunState,
  id: BuildingId,
  path?: string,
  slot?: number,
): string | undefined {
  // Older snapshots predate plot and level gates. Preserve their already portable camp.
  if (!run.clan.estate) return undefined;
  const b = BUILDINGS.find((b) => b.id === id)!;
  const node = b.paths.find((p) => p.id === path);
  const tier = Math.max(node?.minTier ?? 1, b.minTier ?? 1);
  if (encampment(run).tier < tier)
    return `Requires ${ENCAMPMENT_TIERS[tier - 1]!.title} (camp tier ${tier})`;
  if (node?.minLevel && buildingLevel(run, id) < node.minLevel)
    return `Requires ${b.title} level ${node.minLevel}`;
  const missing = prerequisites(run, node?.requiresBuildings);
  if (missing) return missing;
  if (path === undefined) {
    const available = campSlots(run).slice(0, encampment(run).slots);
    if (
      slot !== undefined &&
      (!Number.isInteger(slot) || slot < 0 || slot >= available.length || available[slot] !== null)
    )
      return 'Choose an empty unlocked building slot';
    if (!available.includes(null))
      return 'No building slots available — improve the Clan Encampment';
  }
  const workers = path === undefined ? b.workers : (node?.workers ?? 0);
  if (workers > 0 && estateAssignedWorkers(run) + workers > run.clan.population)
    return 'More families needed';
  return undefined;
}
export function reserveBuildingSlot(run: RunState, id: BuildingId, slot?: number): void {
  if (!run.clan.estate) return;
  const estate = run.clan.estate;
  estate.slots = campSlots(run);
  // The building counter has not changed yet, so the selected plot is still empty.
  estate.slots[slot ?? estate.slots.slice(0, encampment(run).slots).indexOf(null)] = id;
}
export type EstatePurchaseKind = 'encampment' | 'internal';
export function estateImprovement(
  _run: RunState,
  kind: EstatePurchaseKind,
  id: string,
  rank: number,
) {
  return kind === 'encampment'
    ? ENCAMPMENT_TIERS.find((t) => t.id === id && t.tier === rank)
    : INTERNAL_DEVELOPMENTS.find((d) => d.id === id)?.ranks[rank - 1];
}
export function estateCost(run: RunState, node: EstateImprovement) {
  return {
    materials: Math.ceil(node.materials * run.patrons.guardian.cost),
    spirit: node.spirit,
    workers: node.workers,
  };
}
export function estateBlocker(
  run: RunState,
  kind: EstatePurchaseKind,
  id: string,
  rank: number,
): string | undefined {
  const node = estateImprovement(run, kind, id, rank);
  if (!node || !Number.isInteger(rank) || rank < 1) return 'Unknown improvement';
  const current =
    kind === 'encampment' ? encampment(run).tier : (run.clan.estate?.internals[id] ?? 0);
  if (rank <= current) return 'Already completed';
  if (rank !== current + 1) return `Requires level ${rank - 1}`;
  if (run.clan.stage === 'migration') return 'Unpack at the next pasture';
  if (encampment(run).tier < node.minTier) return `Requires camp tier ${node.minTier}`;
  const missing = prerequisites(run, node.requiresBuildings);
  if (missing) return missing;
  if (
    kind === 'internal' &&
    current === 0 &&
    Object.values(run.clan.estate?.internals ?? {}).filter((r) => r > 0).length >=
      encampment(run).internalSlots
  )
    return 'No internal development slots available';
  if (node.workers > 0 && estateAssignedWorkers(run) + node.workers > run.clan.population)
    return 'More families needed';
  const cost = estateCost(run, node);
  if (run.clan.materials < cost.materials || run.clan.spirit < cost.spirit)
    return 'Gather more resources';
  return undefined;
}
export function purchaseEstate(
  run: RunState,
  kind: EstatePurchaseKind,
  id: string,
  rank: number,
): boolean {
  if (run.phase !== 'building' || estateBlocker(run, kind, id, rank)) return false;
  const node = estateImprovement(run, kind, id, rank)!,
    cost = estateCost(run, node);
  const estate = (run.clan.estate ??= createCampEstate());
  run.clan.materials -= cost.materials;
  run.clan.spirit -= cost.spirit;
  if (kind === 'encampment') estate.tier = rank;
  else estate.internals[id] = rank;
  applyCampEffects(run.clan.campEffects, node.effects);
  run.clan.message = `${node.title} joins the travelling clan.`;
  return true;
}
