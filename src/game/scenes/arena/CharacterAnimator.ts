import { GAME } from '../../config';
import { DefeatSprites, renderCharacter } from '../../animation/CharacterVisuals';
import type { Enemy } from '../../entities/actors';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { CombatSystem } from './CombatSystem';
import type { KhanController } from './KhanController';
import type { RiderHost } from './RiderHost';

/** Active-time character poses, enemy hit/burning tints and bounded defeat copies. */
export class CharacterAnimator extends ArenaSystem {
  defeats!: DefeatSprites;

  constructor(
    arena: ArenaContext,
    private readonly khan: KhanController,
    private readonly riderHost: RiderHost,
    private readonly combat: CombatSystem,
  ) {
    super(arena);
  }

  create(): void {
    this.defeats = new DefeatSprites(this.arena.scene);
  }

  update(dt: number): void {
    this.khan.animate(dt, this.combat.isWindingUp());
    this.riderHost.animate(dt, false);
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      enemy.motion.advance(dt, enemy.body!.velocity.length(), enemy.preparingAttack);
      renderCharacter(enemy, enemy.motion);
      enemy.setTint(
        enemy.motion.hurt
          ? 0xffd3b2
          : enemy.burning > 0
            ? 0xffad67
            : enemy.status.stun > 0
              ? GAME.status.tint.stun
              : enemy.status.slow > 0
                ? GAME.status.tint.slow
                : enemy.status.shred > 0
                  ? GAME.status.tint.shred
                  : enemy.definition.id === 'frost-mare'
                    ? 0xb1efff
                    : (enemy.definition.tint ?? 0xffffff),
      );
    }
    this.defeats.update(dt);
  }
}
