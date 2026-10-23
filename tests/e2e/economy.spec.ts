import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('camp economy previews update only after buying and remain frozen while inspecting', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    Object.assign(scene.run.clan, { pasture: 25, food: 20, materials: 100 });
    scene.openBuildings();
  });
  await page.locator('[data-camp-site="herd"]').click();
  const economy = page.getByRole('region', { name: 'Camp economy' });
  await expect(economy).toContainText('Food net -0.04/s');
  const purchase = page.locator('[data-node="herd-base"]');
  await expect(purchase.locator('.tree-node-forecast')).toContainText('Food net -0.04/s → +0.13/s');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.locator('[data-camp-site="ger"]').click();
  await expect(page.locator('[data-node="ger-hearthkeepers"] .tree-node-forecast')).toContainText(
    'Food net -0.04/s → -0.19/s',
  );
  await page.locator('[data-camp-site="herd"]').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await purchase.click();
  await expect(economy).toContainText('Food net +0.13/s');
  await expect(purchase.locator('.tree-node-forecast')).toHaveCount(0);
  await expect(page.locator('[data-node="herd-winter-stores"] .tree-node-forecast')).toContainText(
    '+45 food now',
  );
  await page.locator('[data-node="herd-winter-stores"]').click();
  await expect(economy).toContainText('Food net +0.23/s');
  await expect(page.getByLabel('Camp resources')).toContainText('65');
  await page.screenshot({ path: 'test-results/economy-camp.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#food-rate')).toContainText('Food net +0.');
  await expect(page.locator('#food-outlook')).toContainText('Stores empty in ~');
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
  await expect(river).toContainText('Food needed en route ~13.9');
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
  await expect(page.locator('#food-rate')).toHaveText('Food net -0.20/s');
  await expect(page.locator('#food-outlook')).toHaveClass('danger');
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.clan.food),
  ).toBeLessThanOrEqual(1);
  await page.keyboard.press('Escape');
  const outlook = await page.locator('#food-outlook').textContent();
  await page.waitForTimeout(200);
  await expect(page.locator('#food-outlook')).toHaveText(outlook!);
});

test('food forecasts remain readable beside guidance and objectives at supported sizes', async ({
  page,
}) => {
  test.setTimeout(60000);
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
    await page.locator('[data-camp-site="herd"]').click();
    const preview = page.locator('[data-node="herd-base"] .tree-node-forecast');
    await expect(preview).toBeVisible();
    expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
  }
  await page.screenshot({ path: 'test-results/economy-narrow.png' });
});
