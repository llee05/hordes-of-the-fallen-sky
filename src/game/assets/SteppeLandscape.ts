import Phaser from 'phaser';
import { GAME } from '../config';
import { paintedImage, sceneryImage } from './painterlyArt';
import { LOCATIONS, REGIONS, type MigrationLocation } from '../data/clan';
import { LANDSCAPES, type LandscapeDefinition } from '../data/landscapes';
import { landscapeCover, landscapeRandom, isLandscapeClearing } from './landscapeLayout';

/** Walkable painted scenery; only ArenaScene owns simulation and collision geometry. */
export class SteppeLandscape {
  private readonly regional: Phaser.GameObjects.Container;
  private readonly groundWash: Phaser.GameObjects.Rectangle;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private readonly wind: Phaser.GameObjects.Graphics;
  private readonly props: Phaser.GameObjects.Image[] = [];
  private passage: Phaser.GameObjects.Image[] = [];
  private definition: LandscapeDefinition = LANDSCAPES['golden-pasture'];

  constructor(private readonly scene: Phaser.Scene) {
    const size = GAME.worldSize;
    scene.add.tileSprite(0, 0, size, size, 'ground').setOrigin(0).setTileScale(0.65).setDepth(-20);
    this.groundWash = scene.add.rectangle(size / 2, size / 2, size, size, 0, 0).setDepth(-19);
    this.regional = scene.add.container(0, 0).setDepth(-10);
    this.wind = scene.add.graphics().setDepth(8000);
    this.atmosphere = scene.add.graphics().setDepth(9000);
    this.setRegion(0);
  }

  setRegion(region: number, location?: MigrationLocation): void {
    const id = location?.id ?? REGIONS[region]?.id ?? LOCATIONS[0]!.id;
    this.definition = LANDSCAPES[id];
    this.regional.removeAll(true);
    for (const prop of this.props) prop.destroy();
    this.props.length = 0;
    this.passage = [];
    this.regional.setName(`landscape-${id}`);
    const definition = this.definition;
    this.groundWash.setFillStyle(definition.ground, definition.wash);
    this.drawSurface(id);
    this.drawWater();
    const center = GAME.worldSize / 2;
    for (const item of landscapeCover(id)) {
      const x = center + item.x;
      const y = center + item.y;
      this.props.push(
        this.scene.add
          .image(x + 9, y + 4, 'shadow')
          .setDisplaySize(item.width * 0.7, item.width * 0.2)
          .setAlpha(0.45)
          .setDepth(99 + y),
        sceneryImage(this.scene, x, y, item.prop, item.width)
          .setFlipX(item.flip)
          .setDepth(100 + y),
      );
    }
    for (const item of definition.landmarks) {
      // Large landforms read as painted relief behind combat; smaller trees keep ground sorting.
      const x = center + item.x;
      const y = center + item.y;
      const tree = ['pine', 'larch', 'willow', 'reeds'].includes(item.prop);
      const shadow = this.scene.add
        .image(x + 15, y + 8, 'shadow')
        .setDisplaySize(item.width * 0.85, item.width * 0.19)
        .setAlpha(0.45);
      const image = sceneryImage(this.scene, x, y, item.prop, item.width);
      if (tree) {
        this.props.push(shadow.setDepth(99 + y), image.setDepth(100 + y));
      } else {
        this.regional.add([shadow, image]);
      }
    }
    if (id === 'heart-of-the-steppe') this.drawPassage();
    // Refresh immediately when jumping from a paused checkpoint; old weather must not linger.
    this.wind.clear();
    this.atmosphere.clear();
  }

  private drawSurface(id: MigrationLocation['id']): void {
    const definition = this.definition;
    const random = landscapeRandom(id);
    const size = GAME.worldSize;
    const center = size / 2;
    const marks = this.scene.add.graphics();
    this.regional.add(marks);
    for (let i = 0; i < 250; i += 1) {
      const x = random() * size;
      const y = random() * size;
      const width = 90 + random() * 240;
      marks
        .fillStyle(definition.patch, 0.055 + random() * 0.08)
        .fillEllipse(x, y, width, width * 0.34);
      if (definition.surface === 'sand') {
        const curve = new Phaser.Curves.Spline([x - width / 2, y + 10, x, y - 7, x + width / 2, y]);
        marks.lineStyle(2, 0xf5ddae, 0.25).strokePoints(curve.getPoints(12));
        marks.lineStyle(6, 0xb69a75, 0.08).strokePoints(curve.getPoints(12));
      } else if (definition.surface === 'scree' || definition.surface === 'basalt') {
        marks.lineStyle(1.5, definition.patch, 0.22);
        marks
          .beginPath()
          .moveTo(x, y)
          .lineTo(x + 10, y - 3)
          .lineTo(x + 19, y + 1)
          .strokePath();
      } else if (definition.surface === 'frost') {
        marks.fillStyle(0xf0eedc, 0.15).fillEllipse(x - 20, y - 3, width * 0.7, width * 0.15);
      }
    }
    for (let i = 0; i < definition.grassCount; i += 1) {
      const x = 30 + random() * (size - 60);
      const y = 30 + random() * (size - 60);
      const flower = definition.flowers && i % 13 === 0;
      this.regional.add(
        this.scene.add
          .image(x, y, flower ? 'flower' : 'grass')
          .setScale(0.5 + random() * 0.75)
          .setTint(definition.grass)
          .setAlpha(0.18 + random() * 0.25),
      );
    }
    // Parallel wagon ruts lead through the clear eastward travel corridor.
    for (const offset of [-7, 7]) {
      const points = new Phaser.Curves.Spline([
        center - 2000,
        center + 150 + offset,
        center - 600,
        center + 170 + offset,
        center + 500,
        center + 145 + offset,
        center + 2200,
        center + 185 + offset,
      ]).getPoints(80);
      marks.lineStyle(3, 0x8a795b, 0.12).strokePoints(points);
    }
    // Tiny ground stones give dry camps scale without adding occluding collision props.
    for (let i = 0; i < 150; i += 1) {
      const x = random() * size;
      const y = random() * size;
      if (isLandscapeClearing(x - center, y - center)) continue;
      marks.fillStyle(definition.patch, 0.23).fillEllipse(x, y, 3 + random() * 7, 2 + random() * 3);
    }
  }

  private drawWater(): void {
    const water = this.definition.water;
    if (!water) return;
    const center = GAME.worldSize / 2;
    const river = this.scene.add.graphics().setName(`water-${water.kind}`);
    this.regional.add(river);
    const channels = water.kind === 'braided' ? 2 : 1;
    for (let channel = 0; channel < channels; channel += 1) {
      const course = water.course.map(
        (value, index) => center + value + (index % 2 ? channel * (80 + Math.sin(index) * 30) : 0),
      );
      const points = new Phaser.Curves.Spline(course).getPoints(160);
      const width = water.width * (channel ? 0.42 : 1);
      river.lineStyle(width + 32, water.bank, 0.42).strokePoints(points);
      river.lineStyle(width + 9, water.bank, 0.62).strokePoints(points);
      river.lineStyle(width, water.color, 0.88).strokePoints(points);
      river.lineStyle(width * 0.35, 0xc4d8c5, 0.23).strokePoints(points);
      for (let i = 3; i < points.length - 3; i += 5) {
        const p = points[i]!;
        if (water.kind === 'frozen') {
          river
            .fillStyle(0xe4e7d6, 0.64)
            .fillEllipse(p.x, p.y - width * 0.34, 48 + (i % 4) * 13, 13);
          river
            .lineStyle(1, 0x799da0, 0.45)
            .lineBetween(p.x - 10, p.y - width * 0.34, p.x + 10, p.y - width * 0.3);
        } else {
          river.lineStyle(1.5, 0xe4e4c8, 0.38).lineBetween(p.x - 13, p.y + 4, p.x + 14, p.y + 2);
        }
        if (i % 3 === 0)
          this.regional.add(
            sceneryImage(this.scene, p.x, p.y + width / 2 + 13, 'reeds', 32 + (i % 7) * 4).setAlpha(
              0.7,
            ),
          );
      }
    }
  }

  private drawPassage(): void {
    const center = GAME.worldSize / 2;
    for (let i = 0; i < 5; i += 1) {
      const rock = paintedImage(
        this.scene,
        center - 72 + i * 36,
        center - 190 + (i % 2) * 12,
        'rock',
        72,
      );
      this.passage.push(rock);
      this.regional.add(rock);
    }
    for (let i = 0; i < 7; i += 1)
      this.regional.add(
        paintedImage(
          this.scene,
          center - 210 + i * 70,
          center - 215 - Math.abs(i - 3) * 11,
          'pillar',
          i === 3 ? 100 : 55,
        ),
      );
  }

  update(
    elapsed: number,
    region: number,
    camera: Phaser.Cameras.Scene2D.Camera,
    passageProgress = 0,
  ): void {
    for (let i = 0; i < this.passage.length; i += 1) {
      const progress = Phaser.Math.Clamp(passageProgress, 0, 1);
      this.passage[i]!.setX(
        GAME.worldSize / 2 - 72 + i * 36 + (i < 2 ? -1 : 1) * progress * 110,
      ).setAlpha(1 - progress * 0.65);
    }
    const view = camera.worldView;
    const air = this.definition.air;
    this.wind.clear().lineStyle(1, air.particles === 'dust' ? 0xf0d4a1 : 0xf1ecd2, 0.12);
    for (let i = 0; i < 9; i += 1) {
      const x = view.x + ((i * 151 + elapsed * 22) % (view.width + 120)) - 60;
      const y = view.y + ((i * 89 + Math.sin(elapsed * 0.5 + i) * 18 + view.height) % view.height);
      const curve = new Phaser.Curves.Spline([x - 30, y + 4, x, y, x + 35, y + 3, x + 55, y - 1]);
      this.wind.strokePoints(curve.getPoints(8));
    }
    this.atmosphere
      .clear()
      .fillStyle(air.color, air.alpha)
      .fillRect(view.x, view.y, view.width, view.height);
    if (region === 1)
      this.atmosphere.fillStyle(0xb2d4d8, 0.035).fillRect(view.x, view.y, view.width, view.height);
    const snow = region === 1 || air.particles === 'snow';
    this.atmosphere.fillStyle(
      snow ? 0xf1f0dc : air.particles === 'dust' ? 0xe9d2a7 : 0xf0e3b8,
      snow ? 0.46 : 0.25,
    );
    for (let i = 0; i < (snow ? 36 : 18); i += 1) {
      const x = view.x + ((i * 97 + elapsed * (snow ? 23 : 15)) % view.width);
      const y = view.y + ((i * 73 + elapsed * (snow ? 31 : 5)) % view.height);
      if (air.particles === 'mist' && !snow)
        this.atmosphere.fillStyle(air.color, 0.025).fillEllipse(x, y, 160, 24);
      else this.atmosphere.fillEllipse(x, y, snow ? 2.5 : 2, 1.5);
    }
    if (region === 3) {
      this.atmosphere.fillStyle(0xb9694e, 0.14).fillCircle(view.right - 100, view.y + 105, 68);
      this.atmosphere.fillStyle(0x293b4b, 0.7).fillCircle(view.right - 89, view.y + 98, 59);
    }
  }
}
