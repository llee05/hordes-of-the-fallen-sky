import { damageClan, type ClanProtection } from '../../state/clan';
import type { ClanDamageCause } from '../../state/clanSafety';
import type { ArenaContext } from './ArenaContext';

/**
 * The one path for battlefield damage to the clan. Every site that hurts the camp
 * (barrier attacks, hostile shots reaching camp, area threats and hazards) goes
 * through `damage`, so later camp rules can react to where the blow landed.
 */
export class ClanDamage {
  constructor(private readonly arena: ArenaContext) {}

  /** The development "clan invincible" cheat; undefined in production builds. */
  get protection(): ClanProtection | undefined {
    return import.meta.env.DEV && this.arena.developerTools?.clanInvincible
      ? { invincible: true }
      : undefined;
  }

  /**
   * Damages the clan. `at` is the world point the blow landed; callers that know it
   * pass it, but no rule reads it yet.
   */
  damage(
    amount: number,
    cause: ClanDamageCause = 'attack',
    source?: string,
    _at?: { x: number; y: number },
  ): void {
    damageClan(this.arena.run, amount, this.protection, cause, source);
  }
}
