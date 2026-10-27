import { expect, test } from '@playwright/test';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNomadicLevel,
  openTitle,
  startExpedition,
} from './helpers';

test('provisions and exact purchase previews stay frozen while inspecting the painted camp', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    Object.assign(s.run.clan, { pasture: 25, food: 20, materials: 100 });
    s.openBuildings();
  });
  await page.locator('[data-camp-economy]').click();
  await expect(page.getByRole('region', { name: 'Camp economy' })).toContainText(
    'Food net +0.17/s',
  );
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await selectCampBuilding(page, 'hunting-lodge');
  await expect(page.locator('.camp-gains')).toContainText('Food net');
  await selectCampBuilding(page, 'healers-ger');
  await expect(page.locator('.camp-gains')).toContainText('Maximum Khan health');
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await buyNomadicLevel(page, 'hunting-lodge');
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-economy]').click();
  await expect(page.getByRole('region', { name: 'Camp economy' })).toContainText(
    'Food net +0.20/s',
  );
  await selectCampBuilding(page, 'artisans-ger');
  await expect(page.locator('.camp-gains')).toContainText('Food net');
  await buyNomadicLevel(page, 'artisans-ger');
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-economy]').click();
  await expect(page.getByRole('region', { name: 'Camp economy' })).toContainText(
    'Food net +0.21/s',
  );
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.food)).toBe(20);
  await page.screenshot({ path: 'test-results/economy-camp.png' });
  await closeOverlayOrPause(page);
  await expect(page.locator('#food-rate')).toContainText('Food net +0.');
});

test('route estimates separate travel food from arrival gifts and risky routes remain available', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    Object.assign(scene.run.clan, { stageTime: 45, food: 1, population: 8 });
    scene.openRoutes();
  });
  const river = page.locator('[data-route="river"]');
  await expect(river).toContainText('Food needed en route ~12.2');
  await expect(river).toContainText('Food after arrival ~35.0');
  await expect(river).toContainText('Food runs out before arrival');
  await expect(river).toBeEnabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.setViewportSize({ width: 960, height: 600 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.screenshot({ path: 'test-results/economy-routes.png' });
  await river.click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#food-rate')).toHaveText('Food net -0.19/s');
  await expect(page.locator('#food-outlook')).toHaveClass('danger');
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.clan.food),
  ).toBeLessThanOrEqual(1);
  await closeOverlayOrPause(page);
  const outlook = await page.locator('#food-outlook').textContent();
  await page.waitForTimeout(200);
  await expect(page.locator('#food-outlook')).toHaveText(outlook!);
});

test('food forecasts remain readable beside guidance and objectives at supported sizes', async ({
  page,
}) => {
  test.setTimeout(process.env.CI ? 90000 : 60000);
  await openTitle(page);
  await startExpedition(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const forecast = page.locator('.economy-hud');
    await expect(forecast).toBeVisible();
    expect(await forecast.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    const overlaps = await page.evaluate(() => {
      const resource = document.querySelector('.resource-hud')!.getBoundingClientRect();
      return ['field-guide', 'clan-bearing', 'objective', 'timer', 'pause'].filter((id) => {
        const box = document.getElementById(id)!.getBoundingClientRect();
        return (
          resource.x < box.right &&
          resource.right > box.x &&
          resource.y < box.bottom &&
          resource.bottom > box.y
        );
      });
    });
    expect(overlaps, `resources overlap at ${viewport.width}`).toEqual([]);
    await page.keyboard.press('b');
    await selectCampBuilding(page, 'hunting-lodge');
    const preview = page.locator('.camp-gains');
    await expect(preview).toBeVisible();
    expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await closeOverlayOrPause(page);
  }
  await page.screenshot({ path: 'test-results/economy-narrow.png' });
});
