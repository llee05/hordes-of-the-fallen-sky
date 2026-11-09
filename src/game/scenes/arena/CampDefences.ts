import { campBoundary } from '../../state/campBarrier';
import { wagonDefence } from '../../state/campCombat';
import { hasDevelopment } from '../../state/clan';
import { isKhanActive } from '../../state/khan';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { CombatSystem } from './CombatSystem';

/**
 * The camp's own defences: sanctuary lightning, wagon volleys and the ancestral
 * ward. Each runs on its saved timer; `update` advances them in that order.
 */
export class CampDefences extends ArenaSystem {
  constructor(
    arena: ArenaContext,
    private readonly combat: CombatSystem,
  ) {
    super(arena);
  }

  update(dt: number): void {
    const clan = this.run.clan;
    this.timers.supportTimer -= dt;
    this.timers.wagonTimer -= dt;
    this.timers.wardTimer -= dt;
    if (clan.buildings.sanctuary && this.timers.supportTimer <= 0) {
      const anchor = isKhanActive(this.run) ? this.player : this.camp;
      const target =
        this.spatial.nearest(anchor.x, anchor.y, 520) ??
        this.spatial.nearest(this.camp.x, this.camp.y, 520);
      if (target) {
        const x = target.x;
        const y = target.y;
        this.audio.play('thunder', { x, y });
        const lightning = this.add.graphics().setDepth(9600);
        lightning
          .lineStyle(3, 0xd9f2f5)
          .beginPath()
          .moveTo(x + 25, y - 130)
          .lineTo(x - 14, y - 50)
          .lineTo(x + 14, y - 60)
          .lineTo(x, y)
          .strokePath();
        this.tweens.add({
          targets: lightning,
          alpha: 0,
          duration: 280,
          onComplete: () => lightning.destroy(),
        });
        this.spatial.forEachNearby(x, y, 70, (enemy) =>
          this.combat.damageEnemy(enemy, this.run.stats.damage * 3),
        );
      }
      this.timers.supportTimer =
        (hasDevelopment(this.run, 'sanctuary', 'wind-shamans') ? 1.8 : 3.5) *
        clan.campEffects.multipliers.sanctuaryInterval;
    }
    const wagonResearch = wagonDefence(this.run);
    if (wagonResearch.active && this.timers.wagonTimer <= 0) {
      const target = this.spatial.nearest(this.camp.x, this.camp.y, wagonResearch.range);
      if (target)
        this.combat.shootVolley(
          this.camp.x,
          this.camp.y,
          target,
          hasDevelopment(this.run, 'wagon', 'war-carts') ? 3 : 1,
          wagonResearch.damage,
          false,
          false,
          'wagon',
        );
      this.timers.wagonTimer = 0.9;
    }
    if (hasDevelopment(this.run, 'sanctuary', 'ancestral-ward') && this.timers.wardTimer <= 0) {
      this.spatial.forEachNearby(
        this.camp.x,
        this.camp.y,
        campBoundary(this.run).wardRadius,
        (enemy) => this.combat.damageEnemy(enemy, this.run.stats.damage * 1.5),
      );
      this.effects.burst(this.camp.x, this.camp.y, 0x8acfe2, 8);
      this.timers.wardTimer = 1.2;
    }
  }
}
