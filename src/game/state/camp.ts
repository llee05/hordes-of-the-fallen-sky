import type { BuildingId, CampEffectDefinition, CampEffects, RunState } from '../types';

export function hasDevelopment(run: RunState, id: BuildingId, path: string): boolean {
  return run.clan.paths[id]?.includes(path) ?? false;
}

/** Applied once per successful purchase, never inferred from presentation or building levels. */
export function createCampEffects(): CampEffects {
  return {
    multipliers: {
      foodProduction: 1,
      materialProduction: 1,
      consumption: 1,
      pastureUse: 1,
      mobility: 1,
      clanProtection: 1,
      riderDamage: 1,
      hostInterval: 1,
      burnDamage: 1,
      gallopCooldown: 1,
      sanctuaryInterval: 1,
      wagonDamage: 1,
    },
    bonuses: {
      range: 0,
      resolveRecovery: 0,
      commanderRecovery: 0,
      arrivalFood: 0,
      arrivalMaterials: 0,
      arrivalHerd: 0,
      arrivalResolve: 0,
      arrivalHealth: 0,
      refugePeople: 0,
    },
  };
}

export function applyCampEffects(target: CampEffects, effects?: CampEffectDefinition): void {
  for (const key of Object.keys(effects?.multipliers ?? {}) as (keyof CampEffects['multipliers'])[])
    target.multipliers[key] *= effects!.multipliers![key]!;
  for (const key of Object.keys(effects?.bonuses ?? {}) as (keyof CampEffects['bonuses'])[])
    target.bonuses[key] += effects!.bonuses![key]!;
}
