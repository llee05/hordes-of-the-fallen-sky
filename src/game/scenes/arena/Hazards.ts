import Phaser from 'phaser';
import { GAME } from '../../config';
import type { WorldArchive } from '../../state/expeditionArchive';
import { seerDangerRadius } from '../../systems/enemyTactics';
import type { EnemyDefinition } from '../../types';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { ClanDamage } from './ClanDamage';

/** A hollow seer's delayed danger circle. */
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
 * Hollow seers' delayed danger circles. Each counts down, then strikes the Khan
 * and camp inside its radius.
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

  /** Drops every hazard on arrival at a new camp. */
  clear(): void {
    for (const hazard of this.hazards) hazard.warning.destroy();
    this.hazards = [];
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
    for (let i = this.hazards.length - 1; i >= 0; i -= 1) {
      const hazard = this.hazards[i]!;
      hazard.remaining -= dt;
      const radius = hazard.radius ?? 70;
      hazard.warning
        .clear()
        .fillStyle(0x976aa9, 0.13)
        .fillCircle(hazard.x, hazard.y, radius)
        .lineStyle(2, 0xcba0c6, 0.8)
        .strokeCircle(hazard.x, hazard.y, radius);
      if (hazard.remaining > 0) continue;
      this.effects.burst(hazard.x, hazard.y, 0x796d4d, 12);
      this.audio.play('thunder', hazard);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.player.x, this.player.y) < radius)
        this.host.takeDamage(hazard.damage ?? 20);
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, this.camp.x, this.camp.y) < radius + 25)
        this.clanDamage.damage(5, 'seer', undefined, hazard);
      hazard.warning.destroy();
      this.hazards.splice(i, 1);
    }
  }
}
