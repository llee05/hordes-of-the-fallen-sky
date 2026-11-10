import { GAME } from '../../config';
import type { Enemy } from '../../entities/actors';
import { supportingAreaEnemy } from '../../state/encounters';
import {
  advanceFieldObjective,
  fieldObjectiveDue,
  startFieldObjective,
} from '../../state/fieldObjectives';
import { isKhanActive } from '../../state/khan';
import { currentLocation } from '../../state/journey';
import { authoredFieldSite } from '../../systems/authoredSites';
import { FieldMarkers } from '../../systems/FieldMarkers';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { EnemyDirector } from './EnemyDirector';

/**
 * Field objectives: placing each new objective on walkable ground around camp,
 * raising a gathering's guards, escorting returning objectives, and the field
 * marker. Its marker owns the warning surface other markers and enemy warnings share.
 */
export class FieldObjectiveDirector extends ArenaSystem {
  fieldMarkers!: FieldMarkers;

  constructor(
    arena: ArenaContext,
    private readonly enemyDirector: EnemyDirector,
  ) {
    super(arena);
  }

  create(): void {
    this.fieldMarkers = new FieldMarkers(this.arena.scene);
  }

  /** Redraws the marker for a restored objective. */
  refreshMarkers(): void {
    this.fieldMarkers.update(this.run.field.objective);
  }

  update(dt: number): void {
    const run = this.run,
      nav = this.landscape.navigation;
    if (fieldObjectiveDue(run)) {
      // Authored levels host objectives beside landmarks such as ruins and shrines.
      const site = authoredFieldSite(currentLocation(run).id, run.field.issued);
      const near = site && (nav ? nav.nearestWalkable(site) : site);
      const placed =
        !!near &&
        Math.hypot(near.x - site.x, near.y - site.y) < 220 &&
        startFieldObjective(run, near);
      for (let i = 0; !placed && i < 12; i++) {
        const angle = run.field.issued * 1.7 + (i * Math.PI) / 6;
        const desired = {
          x: this.camp.x + Math.cos(angle) * GAME.field.radius,
          y: this.camp.y + Math.sin(angle) * GAME.field.radius,
        };
        const point = nav ? nav.nearestWalkable(desired) : desired;
        if (
          point &&
          Math.hypot(point.x - desired.x, point.y - desired.y) < 160 &&
          startFieldObjective(run, point)
        )
          break;
      }
    }
    const o = run.field.objective;
    if (o && o.status === 'available' && o.kind === 'gathering' && o.guards < GAME.field.guards) {
      const angle = (o.guards * Math.PI * 2) / GAME.field.guards;
      const desired = { x: o.x + Math.cos(angle) * 85, y: o.y + Math.sin(angle) * 85 };
      const point = nav ? nav.nearestWalkable(desired) : desired;
      if (
        point &&
        this.enemyDirector.spawn(supportingAreaEnemy(this.run, o.guards, ['wisp']), {
          point,
          objectiveId: o.id,
        })
      )
        o.guards++;
    }
    let threats = 0;
    if (o)
      for (const e of this.enemies.getChildren() as Enemy[])
        if (e.active && Math.hypot(e.x - o.x, e.y - o.y) < 180) threats++;
    advanceFieldObjective(run, dt, this.player, this.camp, threats);
    if (
      o?.status === 'returning' &&
      isKhanActive(run) &&
      Math.hypot(o.x - this.player.x, o.y - this.player.y) < GAME.field.escortLeash &&
      threats === 0
    ) {
      const to = nav?.waypoint(o, this.camp) ?? this.camp;
      const distance = Math.hypot(to.x - o.x, to.y - o.y);
      const step = Math.min(1, (GAME.field.escortSpeed * dt) / Math.max(1, distance));
      const desired = { x: o.x + (to.x - o.x) * step, y: o.y + (to.y - o.y) * step };
      Object.assign(o, nav?.slide(o, desired, 18) ?? desired);
    }
    this.fieldMarkers.update(o, dt);
  }
}
