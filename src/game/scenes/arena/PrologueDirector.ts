import { karakorumWorldSite, type KarakorumSiteId } from '../../data/karakorum';
import type { PrologueCompletionRule } from '../../data/prologue';
import { advancePrologue, currentPrologueBeat } from '../../state/prologue';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';

export interface PrologueDirectorHost {
  campEstablished(): void;
  completed(): void;
}

/** Phase-2 prologue markers and the two implemented reach/hold stage segments. */
export class PrologueDirector extends ArenaSystem {
  private marker!: Phaser.GameObjects.Graphics;

  constructor(
    arena: ArenaContext,
    private readonly host: PrologueDirectorHost,
  ) {
    super(arena);
  }

  create(): void {
    this.marker = this.add.graphics().setName('prologue-marker').setDepth(6);
    this.refreshMarker();
  }

  private sitePoint(site: KarakorumSiteId): { x: number; y: number } {
    const authored = karakorumWorldSite(site);
    return this.landscape.navigation?.nearestWalkable(authored) ?? authored;
  }

  private distanceToSite = (
    site: Extract<PrologueCompletionRule, { site: unknown }>['site'],
  ): number => {
    const point = this.sitePoint(site);
    return Math.hypot(this.player.x - point.x, this.player.y - point.y);
  };

  markerPoint(): { x: number; y: number } | undefined {
    const rule = currentPrologueBeat(this.run)?.rule;
    return rule?.kind === 'reach-site' || rule?.kind === 'hold-site'
      ? this.sitePoint(rule.site)
      : undefined;
  }

  refreshMarker(): void {
    if (!this.marker) return;
    const point = this.markerPoint();
    const graphics = this.marker.clear();
    if (!point) return;
    const pulse =
      0.5 + 0.5 * Math.sin((this.run.elapsed * Math.PI * 2) / GAME.prologue.markerPulseSeconds);
    graphics
      .fillStyle(0xd7bd72, 0.08 + pulse * 0.08)
      .fillCircle(point.x, point.y, 42 + pulse * 8)
      .lineStyle(3, 0xe7d28e, 0.75 + pulse * 0.2)
      .strokeCircle(point.x, point.y, 50 + pulse * 4)
      .lineStyle(1, 0x315d64, 0.8)
      .strokeCircle(point.x, point.y, 59);
  }

  update(dt: number): void {
    if (!this.run.prologue || this.run.prologue.completed) {
      this.marker?.clear();
      return;
    }
    const events = advancePrologue(this.run, dt, this.distanceToSite);
    for (const event of events) {
      if (event.type === 'beat' && event.completedBeat === 'arrival-report')
        this.run.clan.message =
          "Gate captain: You're late, rider. The yard-master wants you. Then ride west with the patrol.";
      else if (event.type === 'camp-established') this.host.campEstablished();
      else if (event.type === 'complete') this.host.completed();
    }
    this.refreshMarker();
  }
}
import type Phaser from 'phaser';
import { GAME } from '../../config';
