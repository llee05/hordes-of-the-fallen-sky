import type Phaser from 'phaser';
import { GAME } from '../../config';
import { AREA_ENCOUNTERS, type AreaThreatKind } from '../../data/areaEncounters';
import type { Enemy, Projectile } from '../../entities/actors';
import {
  advanceAreaEncounter,
  createAreaEncounter,
  syncAreaEncounter,
} from '../../state/areaEncounters';
import {
  addAreaThreat,
  advanceAreaThreats,
  createAreaThreats,
  type AreaThreat,
} from '../../state/areaThreats';
import type { WorldArchive } from '../../state/expeditionArchive';
import { currentLocation } from '../../state/journey';
import { isKhanActive } from '../../state/khan';
import { areaSurface, habitatPreference } from '../../systems/AreaHabitat';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { ClanDamage } from './ClanDamage';

/** Scene parts area combat uses that other systems own. */
export interface AreaCombatHost {
  takeDamage(amount: number): void;
}

/**
 * The current area's encounter pacing and its terrain and enemy threats: placing
 * terrain threats, resolving their hits on the Khan and camp, and drawing every
 * threat plus the high-contrast rings around hostile shots.
 */
export class AreaCombat extends ArenaSystem {
  /** Replaced on create, departure, arrival and load; read it live. */
  areaEncounter = createAreaEncounter();
  /** Replaced on area change, departure, arrival and load; read it live. */
  areaThreats = createAreaThreats();
  areaEffects!: Phaser.GameObjects.Graphics;

  constructor(
    arena: ArenaContext,
    private readonly host: AreaCombatHost,
    private readonly clanDamage: ClanDamage,
  ) {
    super(arena);
  }

  /** Starts a fresh area for the current run and builds the threat drawing surface. */
  create(): void {
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects = this.add.graphics().setDepth(5);
  }

  /** Clears threats and pacing when the clan departs or arrives. */
  reset(): void {
    this.areaThreats = createAreaThreats();
    this.areaEncounter = createAreaEncounter();
    syncAreaEncounter(this.areaEncounter, this.run);
    this.areaEffects.clear();
  }

  /** Follows the run into a new area, dropping the previous area's threats. */
  sync(): void {
    if (syncAreaEncounter(this.areaEncounter, this.run)) this.areaThreats = createAreaThreats();
  }

  capture(): Pick<WorldArchive, 'areaEncounter' | 'areaThreats'> {
    return { areaEncounter: this.areaEncounter, areaThreats: this.areaThreats };
  }

  restore(world: Pick<WorldArchive, 'areaEncounter' | 'areaThreats'>): void {
    this.areaEncounter = world.areaEncounter;
    this.areaThreats = world.areaThreats;
  }

  queueThreat(kind: AreaThreatKind, point: { x: number; y: number }, owner?: string): boolean {
    const nav = this.landscape.navigation;
    if (nav && !nav.isWalkable(point.x, point.y, 8, true)) return false;
    if (
      point.x < 24 ||
      point.y < 24 ||
      point.x > GAME.worldSize - 24 ||
      point.y > GAME.worldSize - 24
    )
      return false;
    return addAreaThreat(this.areaThreats, kind, point, 0, owner);
  }

  private terrainThreatPoints(): { x: number; y: number }[] {
    const area = AREA_ENCOUNTERS[currentLocation(this.run).id],
      anchor = isKhanActive(this.run) ? this.player : this.camp;
    const nav = this.landscape.navigation,
      candidates: { x: number; y: number; score: number }[] = [];
    for (let ring = 0; ring < GAME.areaCombat.searchRings; ring++)
      for (let i = 0; i < GAME.areaCombat.probes; i++) {
        const angle =
          (i * Math.PI * 2) / GAME.areaCombat.probes + this.areaEncounter.sequence * 0.7;
        const radius = (ring * GAME.areaCombat.searchRadius) / (GAME.areaCombat.searchRings - 1);
        const point = {
          x: anchor.x + Math.cos(angle) * radius,
          y: anchor.y + Math.sin(angle) * radius,
        };
        if (Math.hypot(point.x - this.camp.x, point.y - this.camp.y) < GAME.areaCombat.campSafety)
          continue;
        if (nav && !nav.isWalkable(point.x, point.y, 8, true)) continue;
        const surface = areaSurface(nav?.terrain, currentLocation(this.run).id, point.x, point.y);
        let score =
          area.pattern === 'shelter' ? surface.open : habitatPreference(surface, area.habitat);
        if (area.threat === 'rockfall' && area.pattern !== 'shelter') score = surface.shelter;
        if (area.threat === 'frost') score = Math.max(surface.shore, surface.snow);
        if (area.pattern === 'shelter' && surface.shelter > 0.25) continue;
        if (score < 0.25) continue;
        candidates.push({ ...point, score });
      }
    candidates.sort((a, b) => b.score - a.score);
    const points: { x: number; y: number }[] = [];
    for (const p of candidates)
      if (points.every((old) => Math.hypot(p.x - old.x, p.y - old.y) > 130)) {
        points.push({ x: p.x, y: p.y });
        if (points.length >= GAME.areaCombat.maxTerrainThreats) break;
      }
    return points;
  }

  update(dt: number): void {
    if (syncAreaEncounter(this.areaEncounter, this.run)) {
      this.areaThreats = createAreaThreats();
    }
    const area = AREA_ENCOUNTERS[currentLocation(this.run).id];
    const event = advanceAreaEncounter(this.areaEncounter, this.run, dt);
    if (event === 'lesson' && this.run.clan.stage !== 'migration')
      this.run.clan.message = `${area.title}. ${area.rule} ${area.counter}`;
    if (event === 'terrain' && area.threat) {
      let placed = 0;
      for (const point of this.terrainThreatPoints())
        if (this.queueThreat(area.threat, point)) placed++;
      if (placed) {
        this.run.clan.message = `${area.warning} ${area.counter}`;
        this.audio.play('encounter');
      }
    }
    advanceAreaThreats(this.areaThreats, this.run.phase, dt, {
      ownerActive: (key) => {
        const [slot, id] = key.split(':').map(Number),
          enemy = this.enemies.getChildren()[slot!] as Enemy | undefined;
        return !!enemy?.active && enemy.spawnId === id && enemy.pinned <= 0;
      },
      hit: (threat, damage) => {
        const radius = GAME.areaCombat.threats[threat.kind].radius;
        if (
          isKhanActive(this.run) &&
          Math.hypot(threat.x - this.player.x, threat.y - this.player.y) < radius
        )
          this.host.takeDamage(damage);
        if (Math.hypot(threat.x - this.camp.x, threat.y - this.camp.y) < radius + 25)
          this.clanDamage.damage(damage * GAME.areaCombat.campDamage, 'area', undefined, threat);
        this.audio.play('spell', threat);
      },
    });
    const graphics = this.areaEffects.clear();
    for (const threat of this.areaThreats.threats) this.drawAreaThreat(graphics, threat);
    if (this.visualSettings.projectileContrast === 'high')
      for (const shot of this.hostileShots.getChildren() as Projectile[])
        if (shot.active)
          graphics
            .lineStyle(3, 0x352a25, 0.95)
            .strokeCircle(shot.x, shot.y, 8.5)
            .lineStyle(1.5, 0xffefba, 1)
            .strokeCircle(shot.x, shot.y, 8.5);
  }

  private drawAreaThreat(graphics: Phaser.GameObjects.Graphics, threat: AreaThreat): void {
    const spec = GAME.areaCombat.threats[threat.kind];
    graphics
      .fillStyle(spec.color, threat.impacted ? 0.1 : 0.055)
      .fillCircle(threat.x, threat.y, spec.radius);
    graphics
      .lineStyle(
        threat.impacted ? 1 : 2,
        threat.impacted ? spec.color : 0xd49b79,
        threat.impacted ? 0.4 : 0.8,
      )
      .strokeCircle(threat.x, threat.y, spec.radius);
    if (!threat.impacted)
      graphics
        .lineStyle(1, spec.color, 0.7)
        .strokeCircle(threat.x, threat.y, spec.radius * Math.min(1, threat.age / threat.warning));
    if (threat.kind === 'crosswind' || threat.kind === 'rift')
      graphics
        .lineStyle(2, spec.color, 0.5)
        .lineBetween(
          threat.x - spec.radius * 0.6,
          threat.y - spec.radius * 0.6,
          threat.x + spec.radius * 0.6,
          threat.y + spec.radius * 0.6,
        );
  }
}
