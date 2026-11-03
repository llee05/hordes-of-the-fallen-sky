import { SKYBREAKER } from '../../data/enemies';
import type { DeveloperConsoleSnapshot } from '../../dev/commands';
import type { Enemy, Projectile } from '../../entities/actors';
import { campBoundary } from '../../state/campBarrier';
import { isKhanActive } from '../../state/khan';
import { gallopCooldown } from '../../state/patrons';
import { cameraZoomLimits } from '../../systems/CameraView';
import {
  edgeWarnings,
  incomingTime,
  type EliteMarker,
  type ScreenDanger,
} from '../../systems/combatReadability';
import type { HudSnapshot } from '../../types';
import { projectGround } from '../../world3d/worldProjection';
import type { ArenaContext } from './ArenaContext';

/** Screen arrows for the eight bearing sectors, clockwise from east (screen y points down). */
export const BEARING_ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'] as const;

/** The nearest of eight 45° sectors for an offset, indexing `BEARING_ARROWS`. */
export function bearingSector(dx: number, dy: number): number {
  return (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
}

/** The screen arrow pointing along an offset. */
export function bearingArrow(dx: number, dy: number): string {
  return BEARING_ARROWS[bearingSector(dx, dy)]!;
}

/** Scene-owned values the HUD shows alongside the shared world. */
export interface HudSession {
  introSlide: number;
  best: number;
  developerRun: boolean;
  developerConsole?: DeveloperConsoleSnapshot;
  saves: NonNullable<HudSnapshot['saves']>;
  boss?: Enemy;
}

/** Builds the HUD snapshot from the live world. It reads state only and changes nothing. */
export class HudPresenter {
  constructor(private readonly arena: ArenaContext) {}

  snapshot(session: HudSession): HudSnapshot {
    const { run, camp, player, landscape } = this.arena;
    const camera = this.arena.scene.cameras.main;
    const dx = camp.x - player.x;
    const dy = camp.y - player.y;
    const direction = bearingArrow(dx, dy);
    const objective = run.field.objective;
    const offset = objective
      ? projectGround(
          objective.x - player.x,
          objective.y - player.y,
          0,
          landscape.world3d?.angle ?? 90,
          landscape.world3d?.yaw ?? 0,
        )
      : undefined;
    const fieldBearing = offset
      ? `${bearingArrow(offset.x, offset.y)} ${Math.round(Math.hypot(objective!.x - player.x, objective!.y - player.y))} paces`
      : undefined;
    const zoomLimits = cameraZoomLimits(camera.width, camera.height);
    return {
      combatReadability: this.combatReadability(session.boss),
      saves: session.saves,
      campPressure: this.campPressure(),
      fieldBearing,
      developerRun: session.developerRun,
      developerConsole: session.developerConsole,
      zoom: camera.zoom,
      minZoom: zoomLimits.min,
      maxZoom: zoomLimits.max,
      run,
      introSlide: session.introSlide,
      dashReady: Math.max(0, 1 - this.arena.timers.dashTimer / gallopCooldown(run)),
      dashCooldown: gallopCooldown(run),
      best: session.best,
      bossHealth: session.boss?.active ? session.boss.health / SKYBREAKER.health : undefined,
      clanBearing: `${direction} CLAN · ${Math.round(Math.hypot(dx, dy))} PACES`,
    };
  }

  private screenPoint(point: { x: number; y: number }): { x: number; y: number } {
    const { landscape } = this.arena;
    if (landscape.world3d) return landscape.world3d.screenPoint(point);
    const camera = this.arena.scene.cameras.main;
    return {
      x: camera.width / 2 + (point.x - camera.midPoint.x) * camera.zoom,
      y: camera.height / 2 + (point.y - camera.midPoint.y) * camera.zoom,
    };
  }

  private combatReadability(
    boss: Enemy | undefined,
  ): NonNullable<HudSnapshot['combatReadability']> {
    const { run, player, camp } = this.arena;
    const width = this.arena.scene.scale.width,
      height = this.arena.scene.scale.height;
    const threats: ScreenDanger[] = [],
      elites: EliteMarker[] = [];
    const campRadius = campBoundary(run).radius;
    for (const [index, shot] of (this.arena.hostileShots.getChildren() as Projectile[]).entries()) {
      if (!shot.active) continue;
      const p = this.screenPoint(shot),
        body = shot.body!;
      const playerHit = isKhanActive(run)
        ? incomingTime(shot, body.velocity, player, 35)
        : undefined;
      const campHit = incomingTime(shot, body.velocity, camp, campRadius);
      const eta = Math.min(playerHit ?? Infinity, campHit ?? Infinity);
      if (eta <= Math.min(4, shot.remaining))
        threats.push({
          id: `shot-${index}`,
          label:
            playerHit !== undefined && playerHit <= (campHit ?? Infinity)
              ? 'Incoming projectile'
              : 'Camp under fire',
          ...p,
          eta,
        });
    }
    for (const enemy of this.arena.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      const p = this.screenPoint(enemy),
        key = `${enemy.tacticalSlot}:${enemy.spawnId}`;
      if (
        (enemy.elite || enemy.definition.tacticalRole === 'bulwark') &&
        enemy !== boss &&
        p.x > 30 &&
        p.x < width - 30 &&
        p.y > 70 &&
        p.y < height - 60
      )
        elites.push({
          id: key,
          x: p.x / width,
          y: Math.max(
            0.06,
            (p.y - enemy.displayHeight * enemy.originY * this.arena.cameraZoom - 8) / height,
          ),
          label: enemy.elite ? 'ELITE' : 'ARMOURED',
          health: enemy.health / enemy.maxHealth,
        });
      if (enemy.tactics.phase === 'windup')
        threats.push({ id: key, label: 'Charging enemy', ...p, eta: enemy.tactics.remaining });
      else if (enemy === boss && run.finalStand?.phase === 'warning')
        threats.push({
          id: key,
          label: 'Skybreaker barrage',
          ...p,
          eta: run.finalStand.remaining,
        });
      else if (
        enemy.definition.behavior === 'ranged' &&
        enemy.attackTimer > 0 &&
        enemy.attackTimer < 0.8 &&
        Math.min(
          Math.hypot(enemy.x - player.x, enemy.y - player.y),
          Math.hypot(enemy.x - camp.x, enemy.y - camp.y),
        ) < 650
      )
        threats.push({ id: key, label: 'Ranged attack', ...p, eta: enemy.attackTimer });
    }
    return { warnings: edgeWarnings(threats, width, height), elites: elites.slice(0, 6) };
  }

  private campPressure(): string {
    const { run, camp, landscape } = this.arena;
    const sectors = new Array<number>(8).fill(0);
    let incoming = 0,
      attacking = 0;
    const boundary = campBoundary(run);
    for (const e of this.arena.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      const dx = e.x - camp.x,
        dy = e.y - camp.y,
        distance = Math.hypot(dx, dy);
      if (distance > 650) continue;
      incoming++;
      if (distance <= boundary.attackRange + 2) attacking++;
      const screen = projectGround(
        dx,
        dy,
        0,
        landscape.world3d?.angle ?? 90,
        landscape.world3d?.yaw ?? 0,
      );
      sectors[bearingSector(screen.x, screen.y)]! += e.definition.damage / Math.max(80, distance);
    }
    if (!incoming) return 'Camp approaches clear';
    const strongest = sectors.indexOf(Math.max(...sectors));
    return `${BEARING_ARROWS[strongest]} Camp: ${incoming} approaching${attacking ? ` · ${attacking} at the barricade` : ''}`;
  }
}
