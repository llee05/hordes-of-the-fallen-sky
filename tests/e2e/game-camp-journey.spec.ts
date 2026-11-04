import { expect, test } from '@playwright/test';
import {
  buyNomadicLevel,
  closeOverlayOrPause,
  expectFrozen,
  openTitle,
  selectCampBuilding,
  startExpedition,
} from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test(
  'camp planning spends resources, unlocks riders and builds the Burning Tempest',
  { tag: '@core' },
  async ({ page }) => {
    test.setTimeout(process.env.CI ? 90000 : 60000);
    await openTitle(page);
    await startExpedition(page);
    await page.evaluate(() => {
      const clan = (window as any).__gloam.scene.run.clan;
      clan.materials = 300;
      clan.spirit = 100;
    });
    await page.keyboard.press('b');
    await expect(page.getByRole('heading', { name: "The Khan's camp" })).toBeVisible();
    await expectFrozen(
      page,
      () => page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run)),
      13,
    );
    await selectCampBuilding(page, 'archery');
    await buyNomadicLevel(page, 'archery-range');
    await buyNomadicLevel(page, 'fletchers-workshop', 3);
    await buyNomadicLevel(page, 'shamans-ger');
    await expect(page.locator('#synergy')).toBeVisible();
    await expect(page.locator('#riders')).toHaveText('4');
    await expect(page.locator('#workers')).toHaveText('3 / 8');
    await expect(page.locator('#materials')).toHaveText('8');
    await page.screenshot({ path: 'test-results/camp-development.png', fullPage: true });
    await closeOverlayOrPause(page);
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('f');
    await expect(page.locator('#formation-name')).toHaveText('Encirclement');
    await page.screenshot({ path: 'test-results/steppe-playing.png', fullPage: true });
  },
);

test(
  'migration moves a vulnerable caravan, preserves the build and awards survivors at arrival',
  { tag: '@core' },
  async ({ page }) => {
    test.setTimeout(process.env.CI ? 90000 : 60000);
    await openTitle(page);
    await startExpedition(page);
    await expect(page.locator('#migrate')).toBeDisabled();
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      scene.run.clan.stageTime = 45;
      scene.openBuildings();
      scene.improveNomadicCamp('archery-range');
      scene.closeCamp();
    });
    await expect(page.locator('#migrate')).toBeEnabled();
    await page.keyboard.press('m');
    await expect(page.getByRole('heading', { name: 'Where the grass still grows.' })).toBeVisible();
    await expectFrozen(
      page,
      () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed),
      13,
    );
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
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.run.clan.buildings.archery),
    ).toBe(1);
    await expect(page.locator('#riders')).toHaveText('6');
    await expect(page.locator('#migrate')).toBeDisabled();
    await expect(page.locator('#build')).toBeEnabled();
  },
);
