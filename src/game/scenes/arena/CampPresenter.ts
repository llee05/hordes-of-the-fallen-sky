import Phaser from 'phaser';
import { CampBarrier } from '../../assets/CampBarrier';
import { ClanLife } from '../../assets/ClanLife';
import { ART_WIDTH, CAMP_VISUAL_SCALE, paintedImage } from '../../assets/painterlyArt';
import { GAME } from '../../config';
import { campShelters } from '../../state/campLife';
import type { ArenaContext } from './ArenaContext';

/** Seconds the packed gers fade over when the clan departs. */
const PACKING_SECONDS = 2.4;

/**
 * Draws the clan's camp or caravan: buildings, the barrier, people and herds,
 * banner sway, the label, and the gers fading out on departure. The camp
 * container itself is a shared world object; this class only fills and dresses it.
 * Built in `create`, so every restart starts with fresh drawings.
 */
export class CampPresenter {
  readonly campBarrier: CampBarrier;
  readonly clanLife: ClanLife;
  /** Copies of the camp's gers that fade alongside the departing caravan. */
  packedGers: { image: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  packingRemaining = 0;
  private readonly label: Phaser.GameObjects.Text;
  private population = -1;
  private herd = -1;

  constructor(private readonly arena: ArenaContext) {
    const { scene } = arena;
    const center = GAME.worldSize / 2;
    this.campBarrier = new CampBarrier(scene);
    this.refresh();
    this.clanLife = new ClanLife(scene);
    this.label = scene.add
      .text(center, center - 125 * CAMP_VISUAL_SCALE, 'YOUR CLAN', {
        fontFamily: 'Palatino Linotype, Book Antiqua, Georgia, serif',
        fontSize: '11px',
        color: '#43382c',
        backgroundColor: '#e8d9b9eb',
        stroke: '#43382c',
        strokeThickness: 0.4,
        padding: { x: 9, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(9500);
  }

  /** Redraws the camp's buildings and barrier from the current run. */
  refresh(): void {
    const { scene, run, camp } = this.arena;
    camp.removeAll(true);
    const migrating = run.clan.stage === 'migration';
    const add = (x: number, y: number, key: string, scale = 2.5): Phaser.GameObjects.Image => {
      const width = ((ART_WIDTH[key] ?? 60) * scale) / 2.5;
      camp.add(
        scene.add
          .image(x + 10, y + 6, 'shadow')
          .setDisplaySize(width * 1.05, width * 0.31)
          .setAlpha(0.7)
          .setDepth(y - 1),
      );
      const image = paintedImage(scene, x, y, key, width).setDepth(y).setName(key);
      image.setData('restScale', image.scaleX);
      camp.add(image);
      return image;
    };
    for (const shelter of campShelters(run))
      add(
        shelter.x,
        shelter.y,
        migrating ? 'cart' : 'ger',
        shelter.x === -64 || shelter.x === 65 ? 2.5 : 2,
      ).setData('household', true);
    add(10, -45, 'banner', 3.2);
    if (run.clan.buildings.archery) add(-130, -35, 'banner');
    if (run.clan.buildings.sanctuary) add(128, 58, 'pillar', 2.5);
    if (run.clan.buildings.wagon) {
      add(-95, 55, 'cart', 2);
      add(100, 0, 'cart', 2);
    }
    if (run.clan.buildings.felt)
      add(-190, -75, migrating ? 'cart' : 'ger', 1.7).setData('buildingId', 'felt');
    if (run.clan.buildings.provisions)
      add(178, -70, migrating ? 'cart' : 'ger', 1.7).setData('buildingId', 'provisions');
    if (run.clan.buildings.relay) {
      add(185, 75, 'cart', 1.7).setData('buildingId', 'relay');
      add(185, 45, 'banner', 2);
    }
    this.population = run.clan.population;
    this.herd = run.clan.herd;
    camp.sort('depth');
    this.campBarrier.refresh(run, camp);
  }

  /**
   * Moves the caravan along its route and animates the camp for one active step.
   * Riders, terrain and hazards update after this, in that order.
   */
  update(dt: number): void {
    const { run, camp } = this.arena;
    const clan = run.clan;
    const center = GAME.worldSize / 2;
    if (clan.population !== this.population || clan.herd !== this.herd) this.refresh();
    if (clan.stage === 'migration') camp.x = center + clan.migrationProgress * 1150;
    camp.setDepth(100 + camp.y);
    this.campBarrier.update(run, dt, camp);
    this.clanLife.update(run, dt, camp);
    this.packingRemaining = Math.max(0, this.packingRemaining - dt);
    for (const ger of this.packedGers) {
      ger.image
        .setPosition(camp.x + ger.x, camp.y + ger.y)
        .setAlpha(this.packingRemaining / PACKING_SECONDS)
        .setDepth(100 + camp.y + ger.y);
    }
    if (this.packingRemaining === 0 && this.packedGers.length) {
      for (const ger of this.packedGers) ger.image.destroy();
      this.packedGers = [];
    }
    for (const child of camp.list)
      if (child instanceof Phaser.GameObjects.Image && child.name === 'banner') {
        const rest = child.getData('restScale') as number;
        child
          .setScale(rest * (1 + Math.sin(run.elapsed * 2.3 + child.x) * 0.035), rest)
          .setAngle(Math.sin(run.elapsed * 1.7 + child.x) * 1.2);
      }
    this.placeLabel();
  }

  /** Copies the standing gers so they can fade out as the clan departs. */
  beginPacking(): void {
    const { scene, camp } = this.arena;
    for (const ger of camp.list) {
      if (!(ger instanceof Phaser.GameObjects.Image) || ger.name !== 'ger') continue;
      const x = ger.x * camp.scaleX;
      const y = ger.y * camp.scaleY;
      const image = scene.add
        .image(camp.x + x, camp.y + y, ger.texture.key, ger.frame.name)
        .setOrigin(ger.originX, ger.originY)
        .setScale(ger.scaleX * camp.scaleX, ger.scaleY * camp.scaleY)
        .setDepth(100 + camp.y + y);
      this.packedGers.push({ image, x, y });
    }
    this.packingRemaining = PACKING_SECONDS;
  }

  /** Clears departure drawings and resettles the people and herds at a new camp. */
  relocate(): void {
    this.clanLife.relocate();
    this.packingRemaining = 0;
    for (const ger of this.packedGers) ger.image.destroy();
    this.packedGers = [];
  }

  /** Places the camp at its saved position and redraws it after a load. */
  restore(point: { x: number; y: number }): void {
    const { run, camp } = this.arena;
    camp.setPosition(point.x, point.y);
    camp.setDepth(100 + point.y);
    this.placeLabel();
    this.refresh();
    this.campBarrier.relocate(run, camp);
  }

  private placeLabel(): void {
    const { run, camp } = this.arena;
    this.label
      .setPosition(camp.x, camp.y - 112 * CAMP_VISUAL_SCALE)
      .setText(run.clan.stage === 'migration' ? 'PROTECT THE CARAVAN  →' : 'YOUR CLAN');
  }
}
