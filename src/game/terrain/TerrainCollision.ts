import Phaser from 'phaser';
import type { TerrainNavigation } from './TerrainNavigation';

/** Scene-owned Arcade boundaries. They stay loaded for offscreen enemies and survive chunk eviction. */
export class TerrainCollision {
  readonly walls: Phaser.Physics.Arcade.StaticGroup;
  private readonly colliders: Phaser.Physics.Arcade.Collider[];

  constructor(
    private readonly scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    enemies: Phaser.Physics.Arcade.Group,
  ) {
    this.walls = scene.physics.add.staticGroup();
    this.colliders = [
      scene.physics.add.collider(player, this.walls),
      scene.physics.add.collider(enemies, this.walls),
    ];
  }

  setTerrain(navigation?: TerrainNavigation): void {
    this.walls.clear(true, true);
    for (const bounds of navigation?.collisionBounds() ?? []) {
      const wall = this.scene.add
        .zone(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
          bounds.width,
          bounds.height,
        )
        .setName('terrain-boundary');
      this.scene.physics.add.existing(wall, true);
      this.walls.add(wall);
    }
  }

  destroy(): void {
    for (const collider of this.colliders) if (collider.world) collider.destroy();
    // Phaser's update-list shutdown may have destroyed the group before scene callbacks.
    if (this.walls.scene) {
      this.walls.clear(true, true);
      this.walls.destroy();
    }
  }
}
