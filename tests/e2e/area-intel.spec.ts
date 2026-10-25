import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('destination threat previews are readable, freeze gameplay and keep the current area’s identity', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    s.run.clan.stageTime = 45;
  });
  await expect(page.locator('#migrate')).toBeEnabled();
  await page.locator('#migrate').click();
  const frozen = await page.locator('#timer').textContent();
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('[data-destination="belukha"]').click();
    const intel = page.locator('[data-area-intel="belukha"]');
    await expect(intel).toContainText('Frostwood prowler');
    await expect(intel).toContainText('Meltwater caller');
    await expect(intel).toContainText('Shared unreturned');
    await expect(intel.locator('.enemy-portrait > svg')).toHaveCount(2);
    await intel.scrollIntoViewIfNeeded();
    expect(
      await page.locator('.route-dialog').evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    const bounds = await intel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
    await page.screenshot({ path: `test-results/area-intel-${size.width}.png` });
  }
  await expect(page.locator('#timer')).toHaveText(frozen!);
  expect(
    await page.evaluate(
      () => (window as any).__gloam.scene.run.clan.locationId ?? 'golden-pasture',
    ),
  ).toBe('golden-pasture');
  await page.keyboard.press('Escape');
  await page.locator('#journal').click();
  await expect(page.locator('[data-area-intel="golden-pasture"]')).toContainText('Thistle prowler');
  await expect(page.locator('[data-area-intel="belukha"]')).toHaveCount(0);
});
