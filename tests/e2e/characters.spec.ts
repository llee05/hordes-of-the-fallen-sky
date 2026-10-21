import { expect, test } from '@playwright/test';
import { startExpedition, openTitle } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.attackTimer = 999;
    scene.spawnTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
});

test('mounted gaits and bow release animate without changing collision geometry', async ({
  page,
}) => {
  await page.keyboard.down('d');
  const samples = [];
  for (let index = 0; index < 7; index++) {
    await page.waitForTimeout(80);
    samples.push(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        const player = scene.player;
        const crop = player.frame.data.spriteSourceSize;
        return {
          frame: player.frame.name,
          rider: scene.riders[0].frame.name,
          width: player.body.width,
          height: player.body.height,
          displayWidth: player.displayWidth,
          anchor: crop.y + crop.h,
          centerX: player.body.center.x - player.x,
          centerY: player.body.center.y - player.y,
        };
      }),
    );
  }
  await page.keyboard.up('d');
  expect(new Set(samples.map((sample) => sample.frame)).size).toBeGreaterThanOrEqual(3);
  expect(new Set(samples.map((sample) => sample.rider)).size).toBeGreaterThanOrEqual(2);
  for (const sample of samples) {
    expect(sample).toMatchObject({ width: 20, height: 20, displayWidth: 62, anchor: 324 });
    expect(Math.abs(sample.centerX)).toBeLessThan(0.1);
    expect(Math.abs(sample.centerY)).toBeLessThan(0.1);
  }
  await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return { frame: scene.player.frame.name, x: scene.player.x, y: scene.player.y };
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return { frame: scene.player.frame.name, x: scene.player.x, y: scene.player.y };
    }),
  ).toEqual(paused);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = 999;
    for (let attempt = 0; attempt < 10 && !scene.enemies.countActive(true); attempt++)
      scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.health = 100000;
    enemy.setPosition(scene.player.x + 140, scene.player.y);
    scene.spatial.rebuild(scene.enemies.getChildren());
    scene.fire();
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.frame.name))
    .toBe('player-attack-1');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.body.width))
    .toBe(20);
});

test('all creature clips advance and freeze with camp planning', async ({ page }) => {
  const initialBodies = await page.evaluate(async () => {
    const { ENEMIES, SKYBREAKER } = await import('/src/game/data/enemies.ts');
    const scene = (window as any).__gloam.scene;
    const definitions = [...ENEMIES.slice(0, 5), SKYBREAKER];
    for (const [index, definition] of definitions.entries()) {
      const before = scene.enemies.countActive(true);
      for (let attempt = 0; attempt < 10 && scene.enemies.countActive(true) === before; attempt++)
        scene.spawnEnemy({ ...definition, health: 100000, damage: 0 });
      const enemy = scene.boss;
      enemy.setPosition(
        scene.player.x + 600 + (index % 3) * 80,
        scene.player.y + Math.floor(index / 3) * 100,
      );
    }
    return scene.enemies
      .getChildren()
      .filter((enemy: any) => enemy.active)
      .map((enemy: any) => ({
        width: enemy.body.width,
        expected: enemy.definition.scale * 10,
      }));
  });
  for (const body of initialBodies) expect(body.width).toBeCloseTo(body.expected, 8);
  const frames = new Map<string, Set<string>>();
  for (let index = 0; index < 10; index++) {
    await page.waitForTimeout(90);
    const sample = await page.evaluate(() =>
      (window as any).__gloam.scene.enemies
        .getChildren()
        .filter((enemy: any) => enemy.active)
        .map((enemy: any) => [enemy.definition.texture, enemy.frame.name] as [string, string]),
    );
    for (const [kind, frame] of sample) {
      if (!frames.has(kind)) frames.set(kind, new Set());
      frames.get(kind)!.add(frame);
    }
  }
  expect(frames.size).toBe(6);
  for (const seen of frames.values()) expect(seen.size).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('b');
  const frozen = await page.evaluate(() =>
    (window as any).__gloam.scene.enemies
      .getChildren()
      .filter((enemy: any) => enemy.active)
      .map((enemy: any) => ({ frame: enemy.frame.name, x: enemy.x, y: enemy.y })),
  );
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() =>
      (window as any).__gloam.scene.enemies
        .getChildren()
        .filter((enemy: any) => enemy.active)
        .map((enemy: any) => ({ frame: enemy.frame.name, x: enemy.x, y: enemy.y })),
    ),
  ).toEqual(frozen);
});

test('defeat sprites stay bounded, pause, and preserve immediate body removal, XP, and reuse', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const initialKills = scene.run.kills;
    const initialXP = scene.gems
      .getChildren()
      .filter((gem: any) => gem.active)
      .reduce((sum: number, gem: any) => sum + gem.value, 0);
    for (let index = 0; index < 40; index++) {
      for (let attempt = 0; attempt < 10 && !scene.enemies.countActive(true); attempt++)
        scene.spawnEnemy();
      const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
      enemy.setPosition(scene.player.x + 400, scene.player.y);
      enemy.motion.attack();
      enemy.motion.hit();
      scene.damageEnemy(enemy, 100000);
    }
    scene.togglePause();
    const echo = scene.defeats.images.getChildren().find((image: any) => image.active);
    return {
      kills: scene.run.kills - initialKills,
      xp:
        scene.gems
          .getChildren()
          .filter((gem: any) => gem.active)
          .reduce((sum: number, gem: any) => sum + gem.value, 0) - initialXP,
      bodies: scene.enemies.getChildren().filter((enemy: any) => enemy.body.enable).length,
      echoes: scene.defeats.images.countActive(true),
      allocated: scene.defeats.images.getLength(),
      echo: { alpha: echo.alpha, y: echo.y, scale: echo.scaleY },
    };
  });
  expect(result).toMatchObject({ kills: 40, xp: 120, bodies: 0, echoes: 32, allocated: 32 });
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(() => {
      const echo = (window as any).__gloam.scene.defeats.images
        .getChildren()
        .find((image: any) => image.active);
      return { alpha: echo.alpha, y: echo.y, scale: echo.scaleY };
    }),
  ).toEqual(result.echo);
  await page.keyboard.press('Escape');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.defeats.images.countActive(true)))
    .toBe(0);
  const reused = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (let attempt = 0; attempt < 10 && !scene.enemies.countActive(true); attempt++)
      scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    return {
      hurt: enemy.motion.hurt,
      frame: enemy.frame.name,
      alpha: enemy.alpha,
      angle: enemy.angle,
      enabled: enemy.body.enable,
    };
  });
  expect(reused).toEqual({ hurt: false, frame: 'wolf-move-0', alpha: 1, angle: 0, enabled: true });
});
