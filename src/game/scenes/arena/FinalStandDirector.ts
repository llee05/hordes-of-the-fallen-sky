import type Phaser from 'phaser';
import { GAME } from '../../config';
import type { Enemy } from '../../entities/actors';
import { supportingAreaEnemy } from '../../state/encounters';
import { advanceFinalStand, finalChapter, syncFinalStand } from '../../state/finalStand';
import { isKhanActive } from '../../state/khan';
import { FieldMarkers } from '../../systems/FieldMarkers';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { CombatSystem } from './CombatSystem';
import type { EnemyDirector } from './EnemyDirector';

/** Scene parts the final stand uses that other systems own. */
export interface FinalStandHost {
  /** The field marker's warning surface, shared so passage drawings reuse one texture. */
  readonly fieldWarnings: Phaser.GameObjects.Graphics;
}

/**
 * The final stand: placing the passage works and their markers, contesting them,
 * and the Skybreaker's warned barrage and supporting assaults.
 */
export class FinalStandDirector extends ArenaSystem {
  passageMarkers: FieldMarkers[] = [];

  constructor(
    arena: ArenaContext,
    private readonly host: FinalStandHost,
    private readonly combat: CombatSystem,
    private readonly enemyDirector: EnemyDirector,
  ) {
    super(arena);
  }

  reset(): void {
    this.passageMarkers = [];
  }

  update(dt: number): void {
    const state = syncFinalStand(this.run);
    if (!state) {
      this.passageMarkers.forEach((marker) => marker.update());
      return;
    }
    if (!this.passageMarkers.length)
      this.passageMarkers = [
        new FieldMarkers(this.arena.scene, this.host.fieldWarnings),
        new FieldMarkers(this.arena.scene, this.host.fieldWarnings),
      ];
    state.works.forEach((work, index) => {
      if (work.x === undefined || work.y === undefined) {
        const desired = {
          x: this.camp.x + (index ? 1 : -1) * GAME.finalStand.workOffset,
          y: this.camp.y + 180,
        };
        const point = this.landscape.navigation?.nearestWalkable(desired) ?? desired;
        work.x = point.x;
        work.y = point.y;
      }
      const unlocked = this.run.clan.stageTime >= GAME.finalStand.workUnlockAt[index]!;
      this.passageMarkers[index]!.update(
        {
          kind: 'refugees',
          x: work.x,
          y: work.y,
          status: work.done ? 'complete' : unlocked ? 'available' : 'abandoned',
        },
        dt,
      );
    });
    const contested = state.works.map((work) =>
      (this.enemies.getChildren() as Enemy[]).some(
        (e) => e.active && Math.hypot(e.x - work.x!, e.y - work.y!) < GAME.finalStand.contestRadius,
      ),
    );
    const event = advanceFinalStand(
      this.run,
      dt,
      !!this.enemyDirector.boss?.active,
      this.player,
      contested,
    );
    const boss = this.enemyDirector.boss;
    if (!boss?.active) return;
    const chapter = finalChapter(this.run);
    if (event === 'warning') {
      const angle = (state.approach * Math.PI) / 2;
      state.aim =
        chapter === 0 && isKhanActive(this.run)
          ? { x: this.player.x, y: this.player.y }
          : { x: this.camp.x + Math.cos(angle) * 80, y: this.camp.y + Math.sin(angle) * 80 };
      this.run.clan.message =
        chapter === 0
          ? 'The Skybreaker draws breath. Move away from the marked line.'
          : 'The Skybreaker turns toward another approach. Guard the warned side.';
      this.audio.play('encounter', boss);
    }
    if (event === 'release' && state.aim) {
      const direction = Math.atan2(state.aim.y - boss.y, state.aim.x - boss.x);
      const count = GAME.finalStand.barrageShots[chapter];
      for (let index = 0; index < count; index++) {
        const shot = this.combat.fireHostile(
          boss,
          direction + (index / (count - 1) - 0.5) * GAME.finalStand.barrageSpread,
        );
        if (shot) {
          shot.barrage = state.cycle;
          shot.damage *= GAME.finalStand.barrageDamage;
        }
      }
      boss.motion.attack();
      this.run.clan.message = 'The Skybreaker falters. Its exposed form takes 50% more damage.';
      if (chapter > 0)
        for (let i = 0; i < GAME.finalStand.assaultCount; i++)
          this.enemyDirector.spawn(
            supportingAreaEnemy(this.run, state.cycle + i, [i ? 'hollow-seer' : 'ghost-rider']),
            { angle: (state.approach * Math.PI) / 2 + (i ? 0.3 : -0.3), campOnly: true },
          );
    }
  }
}
