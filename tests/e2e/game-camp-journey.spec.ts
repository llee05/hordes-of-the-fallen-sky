import { expect, test } from '@playwright/test';
import {
  buyNode,
  closeOverlayOrPause,
  openTitle,
  selectCampBuilding,
  startExpedition,
} from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test('camp planning spends resources, unlocks riders and builds the Burning Tempest', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const clan = (window as any).__gloam.scene.run.clan;
    clan.materials = 300;
    clan.spirit = 100;
  });
  await page.keyboard.press('b');
  await expect(page.getByRole('heading', { name: 'Build a people.' })).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  await buyNode(page, 'archery-fire-arrows');
  await selectCampBuilding(page, 'sanctuary');
  await buyNode(page, 'sanctuary-base');
  await buyNode(page, 'sanctuary-wind-shamans');
  await expect(page.locator('#synergy')).toBeVisible();
  await expect(page.locator('#riders')).toHaveText('4');
  await expect(page.locator('#workers')).toHaveText('5 / 8');
  await expect(page.locator('#materials')).toHaveText('190');
  await page.screenshot({ path: 'test-results/camp-development.png', fullPage: true });
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('f');
  await expect(page.locator('#formation-name')).toHaveText('Encirclement');
  await page.screenshot({ path: 'test-results/steppe-playing.png', fullPage: true });
});

test('migration moves a vulnerable caravan, preserves the build and awards survivors at arrival', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await expect(page.locator('#migrate')).toBeDisabled();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = 45;
    scene.run.clan.buildings.archery = 1;
  });
  await expect(page.locator('#migrate')).toBeEnabled();
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: 'Where the grass still grows.' })).toBeVisible();
  const routeTime = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(routeTime);
  await page.screenshot({ path: 'test-results/route-choice.png', fullPage: true });
  await page.getByRole('button', { name: /Answer the blue banners/ }).click();
  await expect(page.locator('#stage-label')).toHaveText('THE GREAT FLIGHT');
  await expect(page.locator('#build')).toBeDisabled();
  await expect(page.locator('#population')).toHaveText('8');
  const initialCamp = await page.evaluate(() => (window as any).__gloam.scene.camp.x);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__gloam.scene.camp.x)).toBeGreaterThan(
    initialCamp,
  );
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.setPosition(scene.camp.x, scene.camp.y);
    enemy.health = 1000;
    enemy.clanAttackTimer = 0;
  });
  await expect(page.locator('#integrity')).not.toHaveText('100%');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 60;
  });
  await expect(page.locator('#location')).toHaveText('SILENT RIVER');
  await expect(page.locator('#population')).toHaveText('16');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.buildings.archery)).toBe(
    1,
  );
  await expect(page.locator('#riders')).toHaveText('6');
  await expect(page.locator('#migrate')).toBeDisabled();
  await expect(page.locator('#build')).toBeEnabled();
});

test('three crossings lead to a final stand whose victory saves the clan with the boss still alive', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await startExpedition(page);
  for (let region = 1; region <= 3; region += 1) {
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 45;
    });
    await expect(page.locator('#migrate')).toBeEnabled();
    await page.locator('#migrate').click();
    await page.getByRole('button', { name: /Follow the river/ }).click();
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 100;
    });
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
      .toBe(region);
  }
  await expect(page.locator('#stage-label')).toHaveText('THE LAST STAND');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 20;
  });
  await expect(page.locator('#boss-bar')).toBeVisible();
  await page.screenshot({ path: 'test-results/sacred-mountain.png', fullPage: true });
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.finalBossDefeated)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
