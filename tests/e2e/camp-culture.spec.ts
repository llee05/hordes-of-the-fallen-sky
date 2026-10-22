import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    scene.run.clan.materials = scene.run.clan.spirit = 2000;
    scene.run.clan.population = 30;
  });
  await page.keyboard.press('b');
});

test('eight camp branches expose shared crafts and multi-parent mastery on narrow and desktop screens', async ({
  page,
}) => {
  await expect(page.locator('[data-tree-branch]')).toHaveCount(8);
  await expect(page.locator('.tree-node')).toHaveCount(45);
  await page.getByRole('button', { name: 'Craft', exact: true }).click();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  const before = await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials);
  await page.locator('[data-node="felt-base"]').click();
  const mastery = page.locator('[data-node="felt-master-feltmakers"]');
  await page.locator('[data-node="felt-wool-sorting"]').click();
  await expect(mastery).toHaveAttribute('data-status', 'locked');
  await page.locator('[data-node="felt-weatherproof-covers"]').click();
  await expect(mastery).toHaveAttribute('data-status', 'available');
  await mastery.click();
  await page.locator('[data-node="felt-pack-frames"]').click();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials)).toBe(
    before - 144,
  );
  await page.screenshot({ path: 'test-results/camp-felt-crafts.png' });
  for (const width of [1280, 960, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page
        .locator('.tree-scroll')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/mobile-camp-crafts.png' });
});

test('specialization descendants are excluded while shared household crafts stay available', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Survival', exact: true }).click();
  await page.locator('[data-node="ger-hearthkeepers"]').click();
  await expect(page.locator('[data-node="ger-household-apprentices"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await expect(page.locator('[data-node="ger-hospitality-circle"]')).toHaveAttribute(
    'data-status',
    'available',
  );
  await page.locator('[data-node="ger-felt-linings"]').click();
  await page.locator('[data-node="ger-hospitality-circle"]').click();
  await expect(page.locator('[data-node="ger-felt-linings"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
});

test('provisioning and relay upgrades follow the caravan and grant their arrival rewards', async ({
  page,
}) => {
  for (const id of [
    'provisions-base',
    'provisions-aaruul-drying',
    'provisions-borts-stores',
    'provisions-shared-provisions',
    'relay-base',
    'relay-pasture-scouts',
    'relay-supply-caches',
    'relay-horse-relays',
  ]) {
    await page.locator(`[data-node="${id}"]`).click();
  }
  const before = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.food = 100;
    scene.run.clan.herd = 3;
    scene.run.clan.integrity = 50;
    scene.run.health = 40;
    scene.run.clan.stageTime = 45;
    return scene.run.clan.materials;
  });
  await page.keyboard.press('Escape');
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 70;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(1);
  await page.keyboard.press('b');
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      food: scene.run.clan.food,
      materials: scene.run.clan.materials,
      health: scene.run.health,
      resolve: scene.run.clan.integrity,
      herd: scene.run.clan.herd,
      world: scene.camp.list
        .filter((image: any) => image.getData?.('buildingId'))
        .map((image: any) => image.getData('buildingId')),
    };
  });
  expect(result.food).toBeCloseTo(158, 0);
  expect(result.materials).toBeCloseTo(before + 10, 0);
  expect(result.health).toBe(75);
  expect(result.resolve).toBe(72);
  expect(result.herd).toBe(6);
  expect(result.world).toEqual(['provisions', 'relay']);
  await expect(page.locator('[data-node="provisions-shared-provisions"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/camp-provisioning-arrival.png' });
});

test('prepared resin strengthens the actual damage over time from fire arrows', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.construct('archery');
    scene.construct('archery', 'fire-arrows');
    scene.construct('archery', 'resin-preparation');
  });
  await page.keyboard.press('Escape');
  const health = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.health = enemy.maxHealth = 100;
    enemy.burning = 1;
    enemy.definition = { ...enemy.definition, speed: 0 };
    enemy.setPosition(scene.player.x + 120, scene.player.y);
    scene.updateEnemies(0.2);
    return enemy.health;
  });
  expect(health).toBeCloseTo(98.128);
});

test('bowyers, arban drills, wheelwrights, storm watch, and reserve horses alter actual combat', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (const [id, path] of [
      ['archery'],
      ['archery', 'veteran-riders'],
      ['archery', 'seasoned-bowyers'],
      ['archery', 'arban-drills'],
      ['wagon'],
      ['wagon', 'war-carts'],
      ['wagon', 'wheelwrights'],
      ['sanctuary'],
      ['sanctuary', 'wind-shamans'],
      ['sanctuary', 'storm-watch'],
      ['herd'],
      ['herd', 'remount-herds'],
      ['herd', 'relay-remounts'],
    ])
      scene.construct(id, path);
  });
  await page.keyboard.press('Escape');
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.health = enemy.maxHealth = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
    enemy.setPosition(scene.player.x + 460, scene.player.y);
    for (const projectile of scene.projectiles.getChildren()) projectile.disableBody(true, true);
    scene.spatial.rebuild(scene.enemies.getChildren());
    scene.fire();
    const commanderShot = scene.projectiles
      .getChildren()
      .some((shot: any) => shot.active && shot.x === scene.player.x && shot.y === scene.player.y);
    const interval = scene.attackTimer;
    const riderDamage = scene.projectiles
      .getChildren()
      .filter((shot: any) => shot.active)
      .map((shot: any) => shot.damage);
    scene.supportTimer = scene.wagonTimer = 0;
    scene.updateSupport(0.01);
    return {
      commanderShot,
      interval,
      riderDamage,
      support: scene.supportTimer,
      wagonDamage: scene.projectiles
        .getChildren()
        .filter((shot: any) => shot.active && shot.x === scene.camp.x && shot.y === scene.camp.y)
        .map((shot: any) => shot.damage),
      cooldown: scene.snapshot().dashCooldown,
    };
  });
  expect(result.commanderShot).toBe(true);
  expect(result.interval).toBeCloseTo(0.54);
  expect(result.riderDamage.some((damage: number) => Math.abs(damage - 17.28) < 0.001)).toBe(true);
  expect(result.support).toBeCloseTo(1.53);
  expect(result.wagonDamage).toEqual([30, 30, 30]);
  expect(result.cooldown).toBeCloseTo(2.7);
});
