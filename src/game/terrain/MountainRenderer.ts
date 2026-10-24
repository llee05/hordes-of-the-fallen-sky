import Phaser from 'phaser';
import { GAME } from '../config';
import { MountainTerrain } from './MountainTerrain';
import { shadedColor, terrainSurface } from './terrainSurface';
import { terrainRelief, type CliffLayerGeometry } from './terrainRelief';
import { terrainDressing } from './terrainDressing';
import {
  TERRAIN_MATERIALS,
  type TerrainArt,
  type TerrainBounds,
  type TerrainChunk,
  type TerrainDebugMode,
} from './types';

interface RenderedChunk {
  container: Phaser.GameObjects.Container;
  relief: Phaser.GameObjects.GameObject[];
  dressing: Phaser.GameObjects.Image[];
  cliffGeometry?: CliffLayerGeometry;
  debug: Phaser.GameObjects.Graphics;
  data: TerrainChunk;
}

/** Initialize static geometry immediately; Phaser would otherwise defer projection until next frame. */
class TerrainMesh extends Phaser.GameObjects.Mesh {
  initializeGeometry(): void {
    this.preUpdate(0, 0);
    this.setActive(false);
  }
}

/** Painted ground and contour ledges share the heightfield; traversal stays in ground coordinates. */
export class MountainRenderer {
  readonly chunks = new Map<string, RenderedChunk>();
  debugMode: TerrainDebugMode = 'off';
  pendingChunks = 0;
  private readonly label: Phaser.GameObjects.Text;
  private readonly textureSizes: Record<string, { width: number; height: number }> = {};

  constructor(
    private readonly scene: Phaser.Scene,
    readonly terrain: MountainTerrain,
    private readonly art: TerrainArt,
  ) {
    for (const material of Object.values(art.materials))
      if (material.texture) {
        const source = scene.textures.get(material.texture).getSourceImage() as HTMLImageElement;
        this.textureSizes[material.texture] = { width: source.width, height: source.height };
      }
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f7edcf',
        backgroundColor: '#182c32ee',
        padding: { x: 10, y: 8 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5, 0)
      .setDepth(9500)
      .setVisible(false);
  }

  updateView(view: TerrainBounds): void {
    const wanted = this.terrain.visibleChunks(view);
    const keys = new Set(wanted.map(({ column, row }) => `${column},${row}`));
    for (const [key, chunk] of this.chunks)
      if (!keys.has(key)) {
        this.destroyChunk(chunk);
        this.chunks.delete(key);
      }
    const missing = wanted.filter(({ column, row }) => !this.chunks.has(`${column},${row}`));
    missing.sort(
      (a, b) =>
        Math.hypot(
          (a.column + 0.5) * this.terrain.chunkSize - view.x - view.width / 2,
          (a.row + 0.5) * this.terrain.chunkSize - view.y - view.height / 2,
        ) -
        Math.hypot(
          (b.column + 0.5) * this.terrain.chunkSize - view.x - view.width / 2,
          (b.row + 0.5) * this.terrain.chunkSize - view.y - view.height / 2,
        ),
    );
    for (const { column, row } of missing.slice(0, GAME.terrain.chunksPerFrame)) {
      const data = this.terrain.getChunk(column, row);
      this.chunks.set(`${column},${row}`, this.createChunk(data));
    }
    this.pendingChunks = Math.max(0, missing.length - GAME.terrain.chunksPerFrame);
    const camera = this.scene.cameras.main;
    this.label
      .setScale(1 / camera.zoom)
      .setPosition(camera.width / 2, camera.height / 2 + (150 - camera.height / 2) / camera.zoom)
      .setText(
        `F9 · ${this.debugMode.toUpperCase()} · ${this.terrain.region.biome.terraces.heights.length} elevation tiers\n${this.chunks.size} visible chunks · ${this.terrain.cachedChunks} cached · ${this.pendingChunks} pending`,
      );
  }

  cycleDebug(): void {
    const modes: TerrainDebugMode[] = ['off', 'elevation', 'slope', 'cliffs', 'collision'];
    this.setDebug(modes[(modes.indexOf(this.debugMode) + 1) % modes.length]!);
  }

  setDebug(mode: TerrainDebugMode): void {
    this.debugMode = mode;
    this.label.setVisible(mode !== 'off');
    for (const chunk of this.chunks.values()) this.drawDebug(chunk);
  }

  private createChunk(data: TerrainChunk): RenderedChunk {
    const container = this.scene.add
      .container(data.x + data.width / 2, data.y + data.height / 2)
      .setDepth(-18)
      .setName(`terrain-chunk-${data.column}-${data.row}`);
    if (this.scene.game.renderer.type === Phaser.WEBGL) {
      for (const geometry of terrainSurface(this.terrain, data, this.art, this.textureSizes)) {
        const mesh = this.scene.add
          .existing(new TerrainMesh(this.scene, 0, 0, geometry.texture))
          .setSize(data.width, data.height)
          .setName(`terrain-material-${geometry.material}`);
        mesh.setOrtho(data.width, data.height);
        mesh.hideCCW = false;
        mesh.addVertices(
          geometry.vertices,
          geometry.uvs,
          geometry.indices,
          false,
          undefined,
          geometry.colors,
          geometry.alphas,
        );
        // New chunks render in this frame, before Phaser's next mesh update.
        mesh.initializeGeometry();
        container.add(mesh);
      }
    } else {
      // Phaser Canvas has no Mesh renderer; retain playable flat material placeholders.
      const placeholder = this.scene.add.graphics();
      for (const cell of data.cells) {
        const material =
          TERRAIN_MATERIALS[cell.sample.weights.indexOf(Math.max(...cell.sample.weights))]!;
        placeholder
          .fillStyle(shadedColor(this.art.materials[material].color, cell.sample.shade))
          .fillRect(cell.x - container.x, cell.y - container.y, cell.width, cell.height);
      }
      container.add(placeholder);
    }
    const reliefArt: TerrainArt =
      this.scene.game.renderer.type === Phaser.WEBGL
        ? this.art
        : {
            ...this.art,
            materials: { ...this.art.materials, stone: { color: this.art.materials.stone.color } },
          };
    const geometry = terrainRelief(this.terrain, data, reliefArt, this.textureSizes);
    const relief = this.drawCliffs(data, geometry);
    const dressing: Phaser.GameObjects.Image[] = [];
    for (const prop of terrainDressing(this.terrain, data)) {
      const definition = this.art.dressing?.[prop.kind];
      if (!definition) continue;
      const width = definition.width * prop.scale;
      const image = this.scene.add
        .image(prop.x, prop.y, definition.texture, definition.frame)
        .setOrigin(0.5, 0.9)
        .setTint(definition.tint)
        .setDepth(100 + prop.y)
        .setName(`terrain-dressing-${prop.kind}`);
      image.setScale(width / image.width);
      dressing.push(
        this.scene.add
          .image(prop.x + 5, prop.y + 3, 'shadow')
          .setDisplaySize(width * 0.7, width * 0.2)
          .setAlpha(0.35)
          .setDepth(99 + prop.y),
        image,
      );
    }
    const debug = this.scene.add
      .graphics({ x: container.x, y: container.y })
      .setDepth(-17)
      .setName('terrain-debug');
    const chunk = {
      container,
      relief,
      dressing,
      cliffGeometry: geometry.find((layer) => layer.part === 'face'),
      debug,
      data,
    };
    this.drawDebug(chunk);
    return chunk;
  }

  private drawCliffs(
    data: TerrainChunk,
    geometryLayers: readonly CliffLayerGeometry[],
  ): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    for (const geometry of geometryLayers) {
      const depth = { shadow: -17.9, ao: -17.85, face: -17.8, rim: -17.7 }[geometry.part];
      const x = data.x + data.width / 2;
      const y = data.y + data.height / 2;
      if (this.scene.game.renderer.type === Phaser.WEBGL) {
        const mesh = this.scene.add
          .existing(new TerrainMesh(this.scene, x, y, geometry.texture))
          .setSize(data.width, data.height)
          .setDepth(depth)
          .setName(`terrain-cliff-${geometry.part}`);
        mesh.setOrtho(data.width, data.height);
        mesh.hideCCW = false;
        mesh.addVertices(
          geometry.vertices,
          geometry.uvs,
          geometry.indices,
          false,
          undefined,
          geometry.colors,
          geometry.alphas,
        );
        mesh.initializeGeometry();
        objects.push(mesh);
      } else {
        const graphic = this.scene.add.graphics({ x, y }).setDepth(depth);
        for (let i = 0; i < geometry.indices.length; i += 3) {
          const indices = geometry.indices.slice(i, i + 3);
          const alpha = indices.reduce((sum, index) => sum + geometry.alphas[index]!, 0) / 3;
          const [a, b, c] = indices.map((index) => ({
            x: geometry.vertices[index * 2]!,
            y: -geometry.vertices[index * 2 + 1]!,
          }));
          graphic
            .fillStyle(geometry.colors[indices[0]!]!, alpha)
            .fillTriangle(a!.x, a!.y, b!.x, b!.y, c!.x, c!.y);
        }
        objects.push(graphic.setName(`terrain-cliff-${geometry.part}`));
      }
    }
    return objects;
  }

  private drawDebug(chunk: RenderedChunk): void {
    const { debug, data, container } = chunk;
    debug.clear();
    if (this.debugMode === 'off') return;
    if (this.debugMode === 'cliffs') {
      const geometry = chunk.cliffGeometry;
      if (geometry)
        for (let i = 0; i < geometry.indices.length; i += 3) {
          const vertices = geometry.indices.slice(i, i + 3);
          if (Math.max(...vertices.map((index) => geometry.alphas[index]!)) < 0.3) continue;
          const [a, b, c] = vertices.map((index) => ({
            x: geometry.vertices[index * 2]!,
            y: -geometry.vertices[index * 2 + 1]!,
          }));
          debug.fillStyle(0xe67cd4, 0.8).fillTriangle(a!.x, a!.y, b!.x, b!.y, c!.x, c!.y);
        }
      return;
    }
    for (const cell of data.cells) {
      let color: number;
      if (this.debugMode === 'elevation') {
        color = Phaser.Display.Color.HSVToRGB(
          (1 - cell.sample.level / (this.terrain.region.biome.terraces.heights.length - 1)) * 0.65,
          0.75,
          0.85,
        ).color;
      } else if (this.debugMode === 'slope') {
        color = Phaser.Display.Color.HSVToRGB(
          (1 - Math.min(1, cell.sample.slope / this.terrain.region.biome.cliffSlope)) * 0.33,
          0.85,
          0.85,
        ).color;
      } else color = cell.blocked ? 0xd15c48 : 0x5aa8a0;
      debug
        .fillStyle(color, 0.75)
        .fillRect(cell.x - container.x, cell.y - container.y, cell.width, cell.height);
    }
    debug
      .lineStyle(1, 0xf5e8bd, 0.7)
      .strokeRect(-data.width / 2, -data.height / 2, data.width, data.height);
  }

  destroy(): void {
    for (const chunk of this.chunks.values()) this.destroyChunk(chunk);
    this.chunks.clear();
    this.label.destroy();
  }

  private destroyChunk(chunk: RenderedChunk): void {
    chunk.container.destroy(true);
    for (const object of chunk.relief) object.destroy();
    for (const image of chunk.dressing) image.destroy();
    chunk.debug.destroy();
  }
}
