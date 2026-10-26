import { expect, test } from '@playwright/test';
import { GAME } from '../../src/game/config';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNode,
  openTitle,
  startExpedition,
} from './helpers';

// Independent page fixtures let CI split this measured long-running file across shards.
test.describe.configure({ mode: 'parallel' });

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

test('eight camp branches expose every authored development', async ({ page }) => {
  await expect(page.locator('[data-camp-site]')).toHaveCount(1);
  let nodes = 0;
  for (const site of [
    'ger',
    'archery',
    'herd',
    'sanctuary',
    'wagon',
    'felt',
    'provisions',
    'relay',
  ]) {
    await selectCampBuilding(page, site);
    nodes += await page.locator('.camp-path-node').count();
  }
  expect(nodes).toBe(63);
});

test('shared felt crafts and multi-parent mastery fit narrow and desktop screens', async ({
  page,
}) => {
  await selectCampBuilding(page, 'felt');
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  const before = await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials);
  await buyNode(page, 'felt-base');
  const mastery = page.locator('[data-node="felt-master-feltmakers"]');
  await buyNode(page, 'felt-wool-sorting');
  await expect(mastery).toHaveAttribute('data-status', 'locked');
  await buyNode(page, 'felt-weatherproof-covers');
  await expect(mastery).toHaveAttribute('data-status', 'available');
  await buyNode(page, 'felt-master-feltmakers');
  await buyNode(page, 'felt-pack-frames');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials)).toBe(
    before - 144,
  );
  await page.screenshot({ path: 'test-results/camp-felt-crafts.png' });
  for (const width of [1280, 960, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page
        .locator('.camp-popup-body')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/mobile-camp-crafts.png' });
});

test('specialization descendants are excluded while shared household crafts stay available', async ({
  page,
}) => {
  await selectCampBuilding(page, 'ger');
  await buyNode(page, 'ger-hearthkeepers');
  await expect(page.locator('[data-node="ger-household-apprentices"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await expect(page.locator('[data-node="ger-hospitality-circle"]')).toHaveAttribute(
    'data-status',
    'available',
  );
  await buyNode(page, 'ger-felt-linings');
  await buyNode(page, 'ger-hospitality-circle');
  await expect(page.locator('[data-node="ger-felt-linings"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
});

test('provisioning and relay upgrades follow the caravan and grant their arrival rewards', async ({
  page,
}) => {
  test.setTimeout(60000);
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
    if (id.endsWith('-base')) await selectCampBuilding(page, id.split('-')[0]!);
    await buyNode(page, id);
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
  await closeOverlayOrPause(page);
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
  // A lossless crossing now grants safeResolve before the normal +12 arrival reward.
  expect(result.resolve).toBe(
    50 +
      GAME.crossings.safeResolve +
      12 +
      GAME.camp.provisions.shared.arrivalResolve +
      GAME.camp.relay.horses.arrivalResolve,
  );
  expect(result.herd).toBe(6);
  expect(result.world).toEqual(['provisions', 'relay']);
  await selectCampBuilding(page, 'provisions');
  await expect(page.locator('[data-node="provisions-shared-provisions"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
  await closeOverlayOrPause(page);
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
  await closeOverlayOrPause(page);
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
  await closeOverlayOrPause(page);
  // Construction is paused; the first active frame places the newly recruited riders.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__gloam.scene.riders.filter((rider: any) => rider.visible).length,
      ),
    )
    .toBe(7);
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
