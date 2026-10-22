import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
});

test('piercing arrows hit each pooled incarnation once and clear their history on reuse', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.setPosition(scene.player.x + 120, scene.player.y);
    enemy.health = enemy.maxHealth = 100;
    scene.run.patrons.bow.pierce = 1;
    scene.shootVolley(scene.player.x, scene.player.y, enemy, 1, 1);
    const bolt = scene.projectiles.getFirstAlive();
    scene.hitEnemy(bolt, enemy);
    scene.hitEnemy(bolt, enemy);
    const first = { health: enemy.health, active: bolt.active };
    enemy.spawnId += 1;
    enemy.health = 100;
    scene.hitEnemy(bolt, enemy);
    const second = { health: enemy.health, active: bolt.active };
    scene.run.patrons.bow.pierce = 0;
    scene.shootVolley(scene.player.x, scene.player.y, enemy, 1, 1);
    const reused = scene.projectiles.getFirstAlive();
    scene.hitEnemy(reused, enemy);
    return { first, second, reused: reused === bolt, final: enemy.health };
  });
  expect(result).toEqual({
    first: { health: 84, active: true },
    second: { health: 84, active: false },
    reused: true,
    final: 68,
  });
});

test('ancestor riders attack, animate, and freeze their poses and positions in the tech tree', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.patrons.ancestors.count = 3;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.health = enemy.maxHealth = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
    enemy.setPosition(scene.player.x + 230, scene.player.y);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.patronSupport.spirits.filter(
            (spirit: any) => spirit.image.visible,
          ).length,
      ),
    )
    .toBe(3);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.enemies.getChildren().find((enemy: any) => enemy.active)
            .health,
      ),
    )
    .toBeLessThan(10000);
  await page.keyboard.press('t');
  const snapshot = () =>
    page.evaluate(() =>
      (window as any).__gloam.scene.patronSupport.spirits.map((spirit: any) => ({
        x: spirit.image.x,
        y: spirit.image.y,
        frame: spirit.image.frame.name,
      })),
    );
  const before = await snapshot();
  await page.waitForTimeout(250);
  expect(await snapshot()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect.poll(async () => JSON.stringify(await snapshot())).not.toBe(JSON.stringify(before));
  await page.screenshot({ path: 'test-results/ancestor-riders.png' });
});

test('water fields slow enemies and extend eruption warnings while reducing eruption damage', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const run = scene.run;
    run.patrons.water.slow = 0.24;
    run.patrons.water.warning = 1;
    run.patrons.water.hazardDamage = 0.5;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.setPosition(scene.player.x + 120, scene.player.y);
    scene.updateEnemies(0.01);
    const speed = enemy.body.velocity.length();
    const expectedSpeed = enemy.definition.speed * 0.76;
    run.clan.region = 2;
    scene.player.setPosition(scene.camp.x, scene.camp.y + 30);
    scene.hazardTimer = 0;
    scene.updateHazards(0.05);
    const warning = scene.hazards[0].remaining;
    scene.hazards[0].remaining = 0;
    scene.invulnerable = 0;
    scene.updateHazards(0);
    return { speed, expectedSpeed, warning, health: run.health, resolve: run.clan.integrity };
  });
  expect(result.speed).toBeCloseTo(result.expectedSpeed);
  expect(result.warning).toBeCloseTo(2.95);
  expect(result.health).toBe(90);
  expect(result.resolve).toBeCloseTo(97.2);
});

test('the last ember prevents one defeat and gallop reports its modified cooldown', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.patrons.hearth.revives = 1;
    scene.run.health = 1;
    scene.takeDamage(1000);
    const revival = {
      phase: scene.run.phase,
      health: scene.run.health,
      charges: scene.run.patrons.hearth.revives,
    };
    scene.run.patrons.hunt.gallopCooldown = 0.75;
    scene.dash();
    const cooldown = scene.snapshot().dashCooldown;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
    return { revival, cooldown, phase: scene.run.phase };
  });
  expect(result).toEqual({
    revival: { phase: 'playing', health: 40, charges: 0 },
    cooldown: 2.25,
    phase: 'dead',
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
});
