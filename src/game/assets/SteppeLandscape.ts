import Phaser from 'phaser';
import { LOCATIONS, type MigrationLocation } from '../data/clan';
import { TerrainNavigation } from '../terrain/TerrainNavigation';
import { World3DRenderer } from '../world3d/World3DRenderer';
import { ComposedTerrain } from '../world3d/ComposedTerrain';
import { LANDSCAPES } from '../data/landscapes';
import { composedRegion } from '../data/worldRegions';

/** The angled world owns presentation; ArenaScene owns simulation and collisions. */
export class SteppeLandscape {
  world3d?: World3DRenderer;
  navigation?: TerrainNavigation;

  constructor(private readonly scene: Phaser.Scene) {
    this.setLocation(LOCATIONS[0]!);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.world3d?.destroy());
  }

  setLocation(location: MigrationLocation): void {
    const { id } = location;
    this.world3d?.destroy();
    this.world3d = undefined;
    this.navigation = undefined;
    const terrain = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
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
