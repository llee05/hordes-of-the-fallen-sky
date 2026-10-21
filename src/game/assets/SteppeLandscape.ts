import Phaser from 'phaser';
import { GAME } from '../config';
import { paintedImage } from './painterlyArt';

/** Decorative terrain is deliberately walkable; the simulation stays top-down. */
export class SteppeLandscape {
  private readonly regional: Phaser.GameObjects.Container;
  private readonly atmosphere: Phaser.GameObjects.Graphics;
  private readonly wind: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    const size = GAME.worldSize;
    scene.add.tileSprite(0, 0, size, size, 'ground').setOrigin(0).setTileScale(0.65).setDepth(-20);
    scene.add.rectangle(size / 2, size / 2, size, size, 0xe2c786, 0.13).setDepth(-19);
    const random = new Phaser.Math.RandomDataGenerator(['living-steppe-tapestry']);
    // Sparse painted brush marks add scale without competing with the horsemen.
    for (let i = 0; i < 1250; i += 1) {
      const x = random.between(30, size - 30);
      const y = random.between(30, size - 30);
      if (i % 23 === 0) {
        const width = random.between(28, 65);
        scene.add
          .image(x + 8, y + 2, 'shadow')
          .setDisplaySize(width, width * 0.33)
          .setAlpha(0.45)
          .setDepth(98 + y);
        paintedImage(scene, x, y, 'rock', width)
          .setAlpha(0.8)
          .setDepth(100 + y);
      } else {
        scene.add
          .image(x, y, i % 17 === 0 ? 'flower' : 'grass')
          .setScale(random.realInRange(0.5, 1.25))
          .setAlpha(random.realInRange(0.2, 0.55))
          .setDepth(-10);
      }
    }
    const center = size / 2;
    const tracks = scene.add.graphics().setDepth(-8);
    for (let line = 0; line < 2; line += 1) {
      const points = new Phaser.Curves.Spline([
        center - 1300,
        center + 135 + line * 12,
        center - 470,
        center + 215 + line * 12,
        center + 200,
        center + 140 + line * 12,
        center + 1200,
        center + 220 + line * 12,
      ]).getPoints(80);
      tracks.lineStyle(3, 0xc0a36e, 0.17).strokePoints(points, false);
    }
    this.regional = scene.add.container(0, 0).setDepth(-5);
    this.wind = scene.add.graphics().setDepth(8000);
    this.atmosphere = scene.add.graphics().setDepth(9000);
    this.setRegion(0);
  }

  setRegion(region: number): void {
    this.regional.removeAll(true);
    const center = GAME.worldSize / 2;
    const river = this.scene.add.graphics();
    const points = new Phaser.Curves.Spline([
      center - 1800,
      center - 310,
      center - 800,
      center - 390,
      center - 150,
      center - 275,
      center + 650,
      center - 360,
      center + 1800,
      center - 220,
    ]).getPoints(120);
    river.lineStyle(region === 1 ? 100 : 72, 0x9caa82, 0.55).strokePoints(points);
    river
      .lineStyle(region === 1 ? 79 : 53, region === 1 ? 0x91b2b2 : 0x668f89, 0.85)
      .strokePoints(points);
    river
      .lineStyle(region === 1 ? 52 : 30, region === 1 ? 0xc3d0bb : 0x87a79a, 0.6)
      .strokePoints(points);
    river.lineStyle(2, 0xe8e1b8, 0.5);
    for (let i = 7; i < points.length - 7; i += 8) {
      const p = points[i]!;
      river
        .beginPath()
        .moveTo(p.x - 17, p.y + 6)
        .lineTo(p.x + 13, p.y + 4)
        .strokePath();
    }
    this.regional.add(river);
    if (region >= 2) {
      for (const side of [-1, 1])
        for (let i = 0; i < 16; i += 1) {
          const x = center - 900 + i * 160;
          const y = center + side * (275 + (i % 3) * 28);
          this.regional.add(
            this.scene.add
              .image(x + 25, y + 15, 'shadow')
              .setDisplaySize(200, 65)
              .setAlpha(0.65),
          );
          this.regional.add(
            paintedImage(this.scene, x, y, 'rock', 135 + (i % 3) * 30).setTint(
              region === 3 ? 0xa8a7af : 0xd1c7a7,
            ),
          );
        }
    }
    if (region === 3) {
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
  }

  update(elapsed: number, region: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = camera.worldView;
    this.wind.clear().lineStyle(1, region === 1 ? 0xe5eee2 : 0xf6e4b3, region === 1 ? 0.2 : 0.11);
    // Broad, sparse curves suggest wind passing across the painted grass.
    for (let i = 0; i < 9; i += 1) {
      const x = view.x + ((i * 151 + elapsed * 22) % (view.width + 120)) - 60;
      const y = view.y + ((i * 89 + Math.sin(elapsed * 0.5 + i) * 18 + view.height) % view.height);
      const curve = new Phaser.Curves.Spline([x - 30, y + 4, x, y, x + 35, y + 3, x + 55, y - 1]);
      this.wind.strokePoints(curve.getPoints(8));
    }
    this.atmosphere.clear();
    if (region === 1)
      this.atmosphere.fillStyle(0xb2d4d8, 0.2).fillRect(view.x, view.y, view.width, view.height);
    if (region === 2)
      this.atmosphere.fillStyle(0x607b77, 0.08).fillRect(view.x, view.y, view.width, view.height);
    if (region === 3) {
      this.atmosphere.fillStyle(0x453b63, 0.2).fillRect(view.x, view.y, view.width, view.height);
      // The eclipse is atmospheric, not a physical object on the ground.
      this.atmosphere.fillStyle(0xb9694e, 0.14).fillCircle(view.right - 100, view.y + 105, 68);
      this.atmosphere.fillStyle(0x293b4b, 0.7).fillCircle(view.right - 89, view.y + 98, 59);
    }
    if (region === 1) {
      this.atmosphere.fillStyle(0xf1f0dc, 0.6);
      for (let i = 0; i < 45; i += 1) {
        const x = view.x + ((i * 97 + elapsed * 23) % view.width);
        const y = view.y + ((i * 73 + elapsed * 31) % view.height);
        this.atmosphere.fillEllipse(x, y, 2.5, 1.5);
      }
    }
  }
}
