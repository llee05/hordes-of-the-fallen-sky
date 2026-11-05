import type Phaser from 'phaser';
import { GAME } from '../../config';
import { CROSSING_ENCOUNTERS } from '../../data/crossings';
import type { Enemy } from '../../entities/actors';
import { advanceCrossingEncounter } from '../../state/crossingEncounters';
import { supportingAreaEnemy } from '../../state/encounters';
import { isKhanActive } from '../../state/khan';
import { FieldMarkers } from '../../systems/FieldMarkers';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { EnemyDirector } from './EnemyDirector';

/**
 * Crossing encounters during migration: placing the refugee escort, spawning each
 * route's guards, escorting refugees to the caravan, and the crossing marker.
 */
export class CrossingDirector extends ArenaSystem {
  crossingMarkers!: FieldMarkers;

  constructor(
    arena: ArenaContext,
    private readonly enemyDirector: EnemyDirector,
  ) {
    super(arena);
  }

  /**
   * Crossing and passage markers share the field warning surface so their
   * drawings reuse one GraphicsBridge canvas texture.
   */
  create(warnings: Phaser.GameObjects.Graphics): void {
    this.crossingMarkers = new FieldMarkers(this.arena.scene, warnings);
  }

  /** Redraws the marker for a restored escort that is still on its way. */
  refreshMarkers(): void {
    const crossing = this.run.crossing;
    if (crossing?.escort && !crossing.escort.lost && !crossing.escort.joined)
      this.crossingMarkers.update({
        ...crossing.escort,
        kind: 'refugees',
        status: 'returning',
      });
  }

  update(dt: number): void {
    const c = this.run.crossing,
      nav = this.landscape.navigation;
    if (this.run.clan.stage !== 'migration' || !c) {
      this.crossingMarkers.update();
      return;
    }
    let threats = 0;
    if (c.escort)
      for (const e of this.enemies.getChildren() as Enemy[])
        if (e.active && Math.hypot(e.x - c.escort.x, e.y - c.escort.y) < 160) threats++;
    if (advanceCrossingEncounter(this.run, dt, this.player, this.camp, threats))
      this.audio.play('encounter');
    if (c.phase === 'warning' && c.route === 'refuge' && !c.escort) {
      const desired = { x: this.camp.x + 380, y: this.camp.y + 200 };
      const point = nav?.nearestWalkable(desired) ?? desired;
      c.escort = { x: point.x, y: point.y, progress: 0, exposure: 0, joined: false, lost: false };
    }
    const definition = CROSSING_ENCOUNTERS[c.route];
    c.spawnDelay = Math.max(0, c.spawnDelay - dt);
    if (c.phase === 'assault' && c.spawned < definition.guards && c.spawnDelay <= 0) {
      const id =
        c.route === 'ridge'
          ? c.spawned % 2
            ? 'hollow-seer'
            : 'brute'
          : c.spawned % 2
            ? 'ghost-rider'
            : 'bat';
      const enemy = supportingAreaEnemy(this.run, c.spawned, [id]);
      const angle =
        c.route === 'river'
          ? c.spawned % 2
            ? Math.PI / 2
            : -Math.PI / 2
          : c.route === 'ridge'
            ? 0
            : Math.PI;
      if (this.enemyDirector.spawn(enemy, { angle, crossingId: c.key, campOnly: true })) {
        c.spawned++;
        c.spawnDelay = GAME.crossings.spawnInterval;
      } else c.spawnDelay = GAME.spawning.retryInterval;
    }
    const e = c.escort;
    if (
      e &&
      !e.joined &&
      !e.lost &&
      isKhanActive(this.run) &&
      threats === 0 &&
      Math.hypot(e.x - this.player.x, e.y - this.player.y) < GAME.field.escortLeash
    ) {
      const to = nav?.waypoint(e, this.camp) ?? this.camp,
        distance = Math.max(1, Math.hypot(to.x - e.x, to.y - e.y));
      const step = Math.min(1, (GAME.field.escortSpeed * dt) / distance),
        desired = { x: e.x + (to.x - e.x) * step, y: e.y + (to.y - e.y) * step };
      Object.assign(e, nav?.slide(e, desired, 18) ?? desired);
    }
    this.crossingMarkers.update(
      e && !e.joined && !e.lost
        ? { kind: 'refugees', status: 'returning', x: e.x, y: e.y }
        : undefined,
      dt,
    );
  }
}
