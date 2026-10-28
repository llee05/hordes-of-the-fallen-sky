import Phaser from 'phaser';
import { LOCATIONS, REGIONS, type MigrationLocation } from '../data/clan';
import { TerrainNavigation } from '../terrain/TerrainNavigation';
import { World3DRenderer } from '../world3d/World3DRenderer';
import { ComposedTerrain } from '../world3d/ComposedTerrain';
import { crossingLandscape } from '../data/crossingLandscapes';

/** The angled world owns presentation; ArenaScene owns simulation and collisions. */
export class SteppeLandscape {
  world3d?: World3DRenderer;
  navigation?: TerrainNavigation;

  constructor(private readonly scene: Phaser.Scene) {
    this.setRegion(0);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.world3d?.destroy());
  }

  setRegion(region: number, location?: MigrationLocation, route?: string): void {
    const id = location?.id ?? REGIONS[region]?.id ?? LOCATIONS[0]!.id;
    const composition = crossingLandscape(id, route);
    this.world3d?.destroy();
    this.world3d = undefined;
    this.navigation = undefined;
    const terrain = new ComposedTerrain(composition.terrain, composition.landscape.water);
    this.navigation = new TerrainNavigation(terrain);
    this.world3d = new World3DRenderer(this.scene, terrain, this.navigation);
    this.scene.cameras.main.setAlpha(0);
  }

  cycleTerrainDebug(): void {
    this.world3d?.cycleDebug();
  }

  update(elapsed: number): void {
    this.world3d?.updateActiveTime(elapsed);
  }
}
