import type { HudSnapshot } from '../game/types';

/** The gallop button's caption for the Khan's current Breath. */
export function gallopLabel(stamina: HudSnapshot['stamina'], khanActive: boolean): string {
  if (!khanActive) return 'CHOOSING A KHAN';
  if (stamina.sprinting) return 'GALLOPING';
  if (stamina.winded) return 'WINDED';
  return 'HOLD SPACE';
}
