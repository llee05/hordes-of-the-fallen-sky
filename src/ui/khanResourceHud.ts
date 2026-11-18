import type { HudSnapshot } from '../game/types';

/** The gallop button's caption for the Khan's current Breath. */
export function gallopLabel(stamina: HudSnapshot['stamina'], khanActive: boolean): string {
  if (!khanActive) return 'CHOOSING A KHAN';
  if (stamina.sprinting) return 'GALLOPING';
  if (stamina.winded) return 'WINDED';
  return 'READY';
}

/** The attack readout: the held heavy charge, marked WINDED when Breath caps or refuses it. */
export function chargeReadout(charge: HudSnapshot['attackCharge']): string {
  if (!charge) return 'LMB LIGHT · RMB HEAVY';
  return `${charge.name.toUpperCase()} ${Math.round(charge.progress * 100)}%${charge.winded ? ' · WINDED' : ''}`;
}

type AbilitySnapshot = HudSnapshot['abilities'][number];

/** The numeral beside an ability's key: its class-resource cost, or ALL when it takes everything. */
export function abilityCostLabel(ability: Pick<AbilitySnapshot, 'cost' | 'spendsAll'>): string {
  return ability.spendsAll ? 'ALL' : String(ability.cost);
}

/** The line under an ability's name: seconds left, the resource it still needs, or READY. */
export function abilityStatus(
  ability: Pick<AbilitySnapshot, 'remaining' | 'cost' | 'affordable'>,
): string {
  if (ability.remaining > 0) return `${ability.remaining.toFixed(1)}s`;
  return ability.affordable ? 'READY' : `NEEDS ${ability.cost}`;
}

/** The cost sentence added to an ability's tooltip. */
export function abilityCostTitle(
  ability: Pick<AbilitySnapshot, 'cost' | 'spendsAll'>,
  resourceName: string,
): string {
  return ability.spendsAll
    ? `Takes all ${resourceName} (at least ${ability.cost}).`
    : `Costs ${ability.cost} ${resourceName}.`;
}
