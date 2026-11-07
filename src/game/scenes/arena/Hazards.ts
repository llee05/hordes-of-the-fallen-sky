import Phaser from 'phaser';
import { GAME } from '../../config';
import type { WorldArchive } from '../../state/expeditionArchive';
import { isKhanActive } from '../../state/khan';
import { seerDangerRadius } from '../../systems/enemyTactics';
import type { EnemyDefinition } from '../../types';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { ClanDamage } from './ClanDamage';

/** A delayed danger circle: a late-region eruption under the Khan, or a seer's mark. */
export interface Hazard {
  x: number;
  y: number;
  remaining: number;
  warning: Phaser.GameObjects.Graphics;
  radius?: number;
  damage?: number;
  source?: 'seer';
}

/** Scene parts hazards use that other systems own. */
export interface HazardsHost {
  takeDamage(amount: number): void;
}

/**
 * Delayed danger circles: late-region eruptions marked under the Khan and hollow
 * seers' marks. Each counts down, then strikes the Khan and camp inside its radius.
 */
export class Hazards extends ArenaSystem {
  /** The live hazard list; replaced on load and when a run starts. */
  hazards: Hazard[] = [];

  constructor(
    arena: ArenaContext,
    private readonly host: HazardsHost,
    private readonly clanDamage: ClanDamage,
  ) {
    super(arena);
  }

  reset(): void {
    this.hazards = [];
  }

  /** Marks a hollow seer's delayed danger circle at `target`. */
  addSeer(target: { x: number; y: number }, definition: EnemyDefinition): void {
    this.hazards.push({
      x: target.x,
      y: target.y,
      remaining: GAME.tactics.seerDangerWarning,
      warning: this.add.graphics().setDepth(5),
      radius: seerDangerRadius(definition),
      damage: GAME.tactics.seerDangerDamage,
      source: 'seer',
    });
  }

  /** Drops every hazard on arrival at a new camp and restarts the eruption delay. */
  clear(): void {
    for (const hazard of this.hazards) hazard.warning.destroy();
    this.hazards = [];
    this.timers.hazardTimer = GAME.hazards.initialDelay;
  }

  capture(): WorldArchive['hazards'] {
    return this.hazards.map(({ warning: _warning, ...hazard }) => hazard);
  }

  restore(saved: WorldArchive['hazards']): void {
    this.hazards = saved.map((h) => ({
      ...h,
      warning: this.add
        .graphics()
        .setDepth(5)
        .lineStyle(2, 0xd49b79, 0.8)
        .strokeCircle(h.x, h.y, h.radius ?? 90),
    }));
  }

  update(dt: number): void {
    const clan = this.run.clan;
    if (clan.region >= 2) this.timers.hazardTimer -= dt;
    if (clan.region >= 2 && this.timers.hazardTimer <= 0 && isKhanActive(this.run)) {
      const x = this.player.x;
      const y = this.player.y;
      const warning = this.add.graphics().setDepth(3);
      warning
        .fillStyle(0x98614d, 0.18)
        .fillCircle(x, y, 70)
        .lineStyle(2.2, 0x43382c, 0.88)
        .strokeCircle(x, y, 70);
      this.hazards.push({
        x,
        y,
        remaining: 2,
        warning,
      });
      this.timers.hazardTimer = clan.region === 3 ? 6 : 10;
    }
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]!;
      hazard.remaining -= dt;
      const radius = hazard.radius ?? 70;
      if (hazard.source === 'seer')
        hazard.warning
          .clear()
          .fillStyle(0x794e4c, 0.14)
          .fillCircle(hazard.x, hazard.y, radius)
          .lineStyle(2.2, 0x43382c, 0.88)
          .strokeCircle(hazard.x, hazard.y, radius);
      if (hazard.remaining > 0) continue;
      this.effects.burst(hazard.x, hazard.y, clan.region === 3 ? 0xbf6558 : 0x796d4d, 12);
      this.audio.play('thunder', hazard);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < radius)
        this.host.takeDamage(hazard.damage ?? 20);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.camp.x, this.camp.y) < radius + 25)
        this.clanDamage.damage(
          hazard.source === 'seer' ? 5 : 8,
          hazard.source === 'seer' ? 'seer' : 'eruption',
          undefined,
          hazard,
        );
      hazard.warning.destroy();
      this.hazards.splice(i, 1);
    }
  }
}
