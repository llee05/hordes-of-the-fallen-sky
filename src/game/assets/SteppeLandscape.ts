import Phaser from 'phaser';
import { LOCATIONS, type MigrationLocation } from '../data/clan';
import { TerrainNavigation } from '../terrain/TerrainNavigation';
import { World3DRenderer } from '../world3d/World3DRenderer';
import { ComposedTerrain } from '../world3d/ComposedTerrain';
import { LANDSCAPES } from '../data/landscapes';
import { composedRegion } from '../data/worldRegions';
import type { RenderResolution } from '../world3d/renderScale';
import type { TerrainBounds, TerrainPoint } from '../terrain/types';

/** The angled world owns presentation; ArenaScene owns simulation and collisions. */
export class SteppeLandscape {
  world3d?: World3DRenderer;
  navigation?: TerrainNavigation;
  private resolution: RenderResolution = 'auto';

  get playBounds(): TerrainBounds {
    return this.navigation?.terrain.playBounds ?? { x: 0, y: 0, width: 0, height: 0 };
  }

  get campPosition(): TerrainPoint {
    return this.navigation?.terrain.campPosition ?? { x: 0, y: 0 };
  }

  constructor(private readonly scene: Phaser.Scene) {
    this.setLocation(LOCATIONS[0]!);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.world3d?.destroy());
  }

  setLocation(location: MigrationLocation): void {
    const { id } = location;
    this.world3d?.destroy();
    this.world3d = undefined;
    this.navigation = undefined;
    const query = new URLSearchParams(globalThis.location?.search ?? '');
    const generatedAuthoredLevel =
      import.meta.env.DEV &&
      ((id === 'altan-ovoo' && query.get('altanOvooLevel') === 'generated') ||
        (id === 'otgontenger' && query.get('otgontengerLevel') === 'generated') ||
        (id === 'eej-khairkhan' && query.get('eejKhairkhanLevel') === 'generated'));
    const terrain = new ComposedTerrain(
      composedRegion(id, generatedAuthoredLevel),
      generatedAuthoredLevel ? undefined : LANDSCAPES[id].water,
    );
    this.navigation = new TerrainNavigation(terrain);
    this.world3d = new World3DRenderer(this.scene, terrain, this.navigation);
    this.world3d.setResolution(this.resolution);
    this.scene.cameras.main.setAlpha(0);
  }

  /** The player's 3D resolution setting, kept across location changes. */
  setResolution(mode: RenderResolution): void {
    this.resolution = mode;
    this.world3d?.setResolution(mode);
  }

  cycleTerrainDebug(): void {
    this.world3d?.cycleDebug();
  }

  update(elapsed: number): void {
    this.world3d?.updateActiveTime(elapsed);
  }
}
