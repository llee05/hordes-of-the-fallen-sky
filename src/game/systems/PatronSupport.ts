import Phaser from 'phaser';
import { claimEchoVolley, nearestCompanion } from '../state/researchCompanions';
import { claimGhostArrow } from '../state/researchHybrids';
import { claimWardEntries } from '../state/researchGuardian';
import { remembranceEchoDamage } from '../state/researchEchoes';
import { claimWaterPush, researchKnockback, researchEnemySlowed } from '../state/researchTerrain';
import { paintedImage } from '../assets/painterlyArt';
import { CharacterMotion } from '../animation/CharacterMotion';
import { renderCharacter } from '../animation/CharacterVisuals';
import { GAME } from '../config';
import type { Enemy } from '../entities/actors';
import type { RunState } from '../types';
import type { SpatialHash } from './SpatialHash';
import { isKhanActive } from '../state/khan';
import { campBoundary } from '../state/campBarrier';
import type { SupportArchive } from '../state/expeditionArchive';
import {
  echoPrefers,
  eternalHearthActive,
  packInstinctBonus,
  researchEchoRelease,
  updateEchoGuard,
  researchWaterRadius,
} from '../state/researchRuntime';
import { PatronSupportClock } from '../state/patronSupportClock';

interface GroundPosition {
  x: number;
  y: number;
}

/** Scene-owned support effects; every timer, pose, and position uses active seconds. */
export class PatronSupport {
  private readonly fields: Phaser.GameObjects.Graphics;
  private readonly spirits: {
    image: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
    motion: CharacterMotion;
  }[];
  private readonly clock = new PatronSupportClock();

  constructor(scene: Phaser.Scene, position: GroundPosition) {
    this.fields = scene.add.graphics().setDepth(3);
    this.spirits = Array.from({ length: GAME.patrons.ancestors.maximum }, (_, index) => ({
      image: paintedImage(scene, position.x, position.y, 'rider')
        .setVisible(false)
        .setAlpha(0.62)
        .setTint(0x9be2d7),
      shadow: scene.add
        .image(position.x, position.y, 'shadow')
        .setDisplaySize(46, 16)
        .setAlpha(0.3)
        .setVisible(false),
      motion: new CharacterMotion('rider', index * 0.23),
    }));
  }

  companionPositions(): { kind: 'echo'; index: number; x: number; y: number }[] {
    return this.spirits.flatMap((spirit, index) =>
      spirit.image.visible
        ? [{ kind: 'echo' as const, index, x: spirit.image.x, y: spirit.image.y }]
        : [],
    );
  }
  relocate(position: GroundPosition): void {
    this.fields.clear();
    for (const spirit of this.spirits) {
      spirit.image.setPosition(position.x, position.y);
      spirit.shadow.setPosition(position.x, position.y);
    }
  }

  capture(): SupportArchive {
    return {
      ...this.clock.capture(),
      spirits: this.spirits.map(({ image, motion }) => ({
        x: image.x,
        y: image.y,
        active: image.visible,
        motion: motion.capture(),
      })),
    };
  }

  restore(state: SupportArchive): void {
    this.clock.restore(state);
    this.spirits.forEach((spirit, index) => {
      const saved = state.spirits[index];
      if (!saved) return;
      spirit.image.setPosition(saved.x, saved.y).setVisible(saved.active);
      spirit.shadow.setPosition(saved.x + 7, saved.y + 4).setVisible(saved.active);
      spirit.motion.restore(saved.motion);
    });
  }

  update(
    run: RunState,
    dt: number,
    player: GroundPosition,
    camp: GroundPosition,
    spatial: SpatialHash<Enemy>,
    actions: {
      damage: (enemy: Enemy, amount: number) => void;
      volley: (
        x: number,
        y: number,
        target: Enemy,
        multiplier: number,
        index: number,
        ghost?: boolean,
      ) => boolean;
    },
  ): void {
    const step = this.clock.update(run, dt);
    if (!step) return;
    const effects = run.patrons;
    const waterRadius = researchWaterRadius(run);
    const boundary = campBoundary(run);
    const khanActive = isKhanActive(run);
    const anchor = khanActive ? player : camp;
    this.fields.clear();
    if (effects.water.slow > 0) {
      this.fields.lineStyle(1.5, 0x86beb1, 0.22).fillStyle(0x70a99c, 0.025);
      for (const position of khanActive ? [player, camp] : [camp])
        this.fields
          .fillCircle(position.x, position.y, waterRadius)
          .strokeCircle(position.x, position.y, waterRadius);
    }
    if (eternalHearthActive(run) && khanActive)
      this.fields
        .lineStyle(2, 0xe6bd7b, 0.5)
        .fillStyle(0xe6bd7b, 0.06)
        .fillCircle(player.x, player.y, GAME.research.eternalHearthRadius)
        .strokeCircle(player.x, player.y, GAME.research.eternalHearthRadius);
    if (effects.guardian.wardDamage > 0)
      this.fields.lineStyle(1, 0xd8bc7e, 0.3).strokeCircle(camp.x, camp.y, boundary.wardRadius);

    const count = step.ancestorCount;
    let echoNearCamp = false;
    for (const [index, spirit] of this.spirits.entries()) {
      const active = index < count;
      if (active && !spirit.image.visible) {
        spirit.image.setPosition(anchor.x, anchor.y);
        spirit.motion.reset('rider', index * 0.23);
      }
      spirit.image.setVisible(active);
      spirit.shadow.setVisible(active);
      if (!active) continue;
      const packMove = packInstinctBonus(run, nearestCompanion(run, 'echo', index)).moveSpeed;
      const angle = run.elapsed * 0.45 * packMove + (index * Math.PI * 2) / count;
      const x = Phaser.Math.Linear(
        spirit.image.x,
        anchor.x + Math.cos(angle) * 80,
        Math.min(1, dt * 5 * packMove),
      );
      const y = Phaser.Math.Linear(
        spirit.image.y,
        anchor.y + Math.sin(angle) * 60,
        Math.min(1, dt * 5 * packMove),
      );
      const dx = x - spirit.image.x;
      const speed = Math.hypot(dx, y - spirit.image.y) / dt;
      spirit.image.setPosition(x, y).setDepth(100 + y);
      if (Math.abs(dx) > 0.1) spirit.image.setFlipX(dx < 0);
      spirit.shadow.setPosition(x + 7, y + 4).setDepth(99 + y);
      if (Math.hypot(x - camp.x, y - camp.y) <= GAME.research.quietRadius) echoNearCamp = true;
      const preferred = spatial.nearest(x, y, GAME.patrons.ancestors.range, (e) =>
        echoPrefers(run, e.tacticalSlot, e.spawnId),
      );
      const target = preferred ?? spatial.nearest(x, y, GAME.patrons.ancestors.range);
      if (
        target &&
        claimEchoVolley(run, index, () =>
          actions.volley(
            x,
            y,
            target,
            effects.ancestors.damage * remembranceEchoDamage(run),
            index,
          ),
        )
      ) {
        const twin = researchEchoRelease(run, index);
        if (claimGhostArrow(run, index))
          actions.volley(
            x,
            y,
            target,
            effects.ancestors.damage * GAME.research.ghostArrowDamage,
            index,
            true,
          );
        spirit.motion.attack();
        if (twin)
          actions.volley(
            x,
            y,
            target,
            effects.ancestors.damage * GAME.research.twinDamage * remembranceEchoDamage(run),
            index,
          );
      }
      spirit.motion.advance(dt, speed, false);
      renderCharacter(spirit.image, spirit.motion);
    }

    updateEchoGuard(run, echoNearCamp);
    if (step.pulseWater) {
      const push = claimWaterPush(run);
      spatial.forEachNearby(player.x, player.y, waterRadius, (enemy) => {
        actions.damage(
          enemy,
          run.stats.damage * effects.water.pulseDamage * (effects.water.slow > 0 ? push.damage : 1),
        );
        if (!enemy.active) return;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        const nx = distance > 0 ? dx / distance : 1;
        const ny = distance > 0 ? dy / distance : 0;
        const force = researchKnockback(
          run,
          researchEnemySlowed(
            run,
            enemy.tacticalSlot,
            enemy.spawnId,
            Math.min(distance, Math.hypot(enemy.x - camp.x, enemy.y - camp.y)),
            enemy,
          ),
          enemy.definition.behavior === 'boss',
        );
        if (force === 0) return;
        const displacement =
          (GAME.patrons.water.push - (distance > waterRadius * 0.5 ? push.pull : 0)) * force;
        enemy.setPosition(
          Phaser.Math.Clamp(enemy.x + nx * displacement, 24, GAME.worldSize - 24),
          Phaser.Math.Clamp(enemy.y + ny * displacement, 24, GAME.worldSize - 24),
        );
      });
    }
    if (effects.guardian.wardDamage > 0) {
      const nearby: Enemy[] = [];
      spatial.forEachNearby(camp.x, camp.y, boundary.wardRadius, (enemy) => nearby.push(enemy));
      const entries = claimWardEntries(
        run,
        nearby.map((enemy) => `${enemy.tacticalSlot}:${enemy.spawnId}`),
      );
      for (const enemy of nearby)
        if (entries.includes(`${enemy.tacticalSlot}:${enemy.spawnId}`))
          actions.damage(enemy, run.stats.damage * effects.guardian.wardDamage);
    }
    if (step.ward) {
      spatial.forEachNearby(camp.x, camp.y, boundary.wardRadius, (enemy) =>
        actions.damage(enemy, run.stats.damage * effects.guardian.wardDamage),
      );
    }
  }
}
