import { expect, test } from '@playwright/test';
import { openTitle } from './helpers';

test('starting traditions preview exact tradeoffs, freeze time, and carry into an expedition and save', async ({
  page,
}) => {
  await openTitle(page);
  await page.getByRole('button', { name: 'Starting tradition: Shared hearth' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a starting tradition' })).toBeVisible();
  await expect(page.locator('[data-starting-tradition]')).toHaveCount(4);
  await page.locator('[data-starting-tradition="outriders"]').click();
  await expect(page.locator('[data-starting-tradition="outriders"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-starting-tradition="pathfinders"]').click();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(0);
  await page.setViewportSize({ width: 800, height: 600 });
  expect(
    await page.locator('.starting-traditions').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const run = await page.evaluate(() => (window as any).__gloam.scene.run);
  expect(run.startingTradition).toBe('pathfinders');
  expect(run.stats.speed).toBeCloseTo(203.3);
  expect(run.clan.materials).toBeLessThan(41);
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Slot 1' }).click();
  await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
  await page.reload();
  await page.getByRole('button', { name: /CONTINUE EXPEDITION/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.startingTradition)).toBe(
    'pathfinders',
  );
});

test('Back keeps the chosen arrangement ready for New Game without starting time or research', async ({
  page,
}) => {
  await openTitle(page);
  await page.getByRole('button', { name: 'Starting tradition: Shared hearth' }).click();
  await page.locator('[data-starting-tradition="hearthkeepers"]').click();
  await page.keyboard.press('F10');
  await page.locator('[data-developer-command-input]').fill('god on');
  await page.locator('[data-developer-command-input]').press('Enter');
  await expect(page.getByRole('log')).toContainText('Start an expedition');
  expect(await page.evaluate(() => (window as any).__gloam.scene.developerRun)).toBe(false);
  await page.keyboard.press('F10');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Starting tradition: Hearthkeepers' }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(0);
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
});
