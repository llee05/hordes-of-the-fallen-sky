import type { HudSnapshot } from '../game/types';

/** The gallop button's caption for the Khan's current Breath. */
export function gallopLabel(stamina: HudSnapshot['stamina'], khanActive: boolean): string {
  if (!khanActive) return 'CHOOSING A KHAN';
  if (stamina.sprinting) return 'GALLOPING';
  if (stamina.winded) return 'WINDED';
  return 'HOLD SPACE';
}

/** The attack readout: the held heavy charge, marked WINDED when Breath caps or refuses it. */
export function chargeReadout(charge: HudSnapshot['attackCharge']): string {
  if (!charge) return 'LMB LIGHT · RMB HEAVY';
  return `${charge.name.toUpperCase()} ${Math.round(charge.progress * 100)}%${charge.winded ? ' · WINDED' : ''}`;
}
