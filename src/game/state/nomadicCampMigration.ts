import { createNomadicCamp, type CoreCampBuildingId } from '../../shared/nomadicCamp.js';
import { BUILDINGS } from '../data/clan';
import { ENCAMPMENT_TIERS, INTERNAL_DEVELOPMENTS } from '../data/campEstate';
import { nomadicBuilding } from '../data/nomadicCamp';
import type { RunState } from '../types';
import { createCampEffects, applyCampEffects } from './camp';
import { estateCost } from './campEstate';
import { buildingCost } from './clan';
import {
  applyNomadicBuildingEffects,
  NOMADIC_LEGACY_BUILDINGS,
  syncNomadicBuildings,
} from './nomadicCamp';

/** Old levels survive; removed craft branches, tiers and internal ranks are refunded once. */
export function migrateLegacyNomadicCamp(run: RunState): { materials: number; spirit: number } {
  const refund = { materials: 0, spirit: 0 };
  if (run.clan.nomadicCamp) return refund;
  const camp = createNomadicCamp();
  const retired = createCampEffects();
  for (const [id, legacy] of Object.entries(NOMADIC_LEGACY_BUILDINGS)) {
    const level = run.clan.buildings[legacy]
      ? Math.max(
          1,
          ...BUILDINGS.find((b) => b.id === legacy)!
            .paths.filter(
              (p) =>
                p.level &&
                p.level <= 3 &&
                !p.exclusiveGroup &&
                run.clan.paths[legacy]?.includes(p.id),
            )
            .map((p) => p.level!),
        )
      : 0;
    if (id in camp.core) camp.core[id as CoreCampBuildingId] = Math.max(1, level);
    else if (level)
      camp.slots[camp.slots.indexOf(null)] = {
        id: id as NonNullable<(typeof camp.slots)[number]>['id'],
        level,
      };
  }
  for (const definition of BUILDINGS) {
    if (!run.clan.buildings[definition.id]) continue;
    applyCampEffects(retired, definition.effects);
    for (const path of definition.paths) {
      if (!run.clan.paths[definition.id]?.includes(path.id)) continue;
      applyCampEffects(retired, path.effects);
      if (path.level && path.level <= 3 && !path.exclusiveGroup) continue;
      const cost = buildingCost(run, definition.id, path.id);
      refund.materials += cost.materials;
      refund.spirit += cost.spirit;
    }
  }
  for (const tier of ENCAMPMENT_TIERS.slice(1, run.clan.estate?.tier ?? 1)) {
    applyCampEffects(retired, tier.effects);
    const cost = estateCost(run, tier);
    refund.materials += cost.materials;
    refund.spirit += cost.spirit;
  }
  for (const internal of INTERNAL_DEVELOPMENTS)
    for (const rank of internal.ranks.slice(0, run.clan.estate?.internals[internal.id] ?? 0)) {
      applyCampEffects(retired, rank.effects);
      const cost = estateCost(run, rank);
      refund.materials += cost.materials;
      refund.spirit += cost.spirit;
    }
  // The only legacy craft that directly scales player stats; other ongoing camp effects are rebuilt below.
  if (run.clan.paths.herd?.includes('remount-herds')) run.stats.speed /= 1.12;
  // Keep every non-building contribution (including lasting story choices) rather than resetting them.
  for (const key of Object.keys(retired.multipliers) as (keyof typeof retired.multipliers)[])
    run.clan.campEffects.multipliers[key] /= retired.multipliers[key];
  for (const key of Object.keys(retired.bonuses) as (keyof typeof retired.bonuses)[])
    run.clan.campEffects.bonuses[key] -= retired.bonuses[key];
  run.clan.nomadicCamp = camp;
  for (const id of Object.keys(camp.core) as CoreCampBuildingId[])
    for (const level of nomadicBuilding(id).levels.slice(0, camp.core[id]))
      applyNomadicBuildingEffects(run, level.effects);
  for (const slot of camp.slots)
    if (slot)
      for (const level of nomadicBuilding(slot.id).levels.slice(0, slot.level))
        applyNomadicBuildingEffects(run, level.effects);
  syncNomadicBuildings(run);
  refund.materials = Math.max(0, Math.min(refund.materials, 1e9 - run.clan.materials));
  refund.spirit = Math.max(0, Math.min(refund.spirit, 1e9 - run.clan.spirit));
  run.clan.materials += refund.materials;
  run.clan.spirit += refund.spirit;
  run.clan.message = `The portable camp is reorganised. Removed developments return ${refund.materials} materials and ${refund.spirit} Spirit.`;
  return refund;
}
