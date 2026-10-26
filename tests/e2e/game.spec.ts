import { expect, test } from '@playwright/test';
import { closeOverlayOrPause, openTitle, startExpedition, tapController } from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test('controller starts a run, moves, dashes, pauses, and navigates menus', async ({ page }) => {
  await page.addInitScript(() => {
    const state = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { testController: state });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [state] });
  });
  const press = (index: number): Promise<void> => tapController(page, index);
  await openTitle(page);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await press(0);
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await press(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  const initialX = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  await page.evaluate(() => {
    (window as any).testController.axes[0] = 1;
  });
  try {
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x))
      .toBeGreaterThan(initialX + 25);
  } finally {
    await page.evaluate(() => {
      (window as any).testController.axes[0] = 0;
    });
  }
  await press(0);
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await press(8);
  await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
  await press(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  await press(9);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await press(13);
  await expect(page.getByRole('button', { name: 'Patron tech tree', exact: true })).toBeFocused();
  await press(13);
  await expect(page.getByRole('button', { name: 'Start a new run' })).toBeFocused();
  await press(0);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
});

test('starts, moves, dashes, pauses, resumes, and resets a run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await expect(page.getByRole('heading', { name: 'Hordes of the Fallen Sky' })).toBeVisible();
  await expect(page).toHaveTitle('Hordes of the Fallen Sky · A people, not a place.');
  await page.screenshot({ path: 'test-results/desktop-ready.png', fullPage: true });
  await page.getByRole('button', { name: /NEW GAME/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  const before = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  await page.keyboard.down('d');
  try {
    // Software-rendered CI needs more wall time to advance the same gameplay distance.
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x), { timeout: 15000 })
      .toBeGreaterThan(before + 30);
  } finally {
    await page.keyboard.up('d');
  }
  await page.keyboard.press('Space');
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const pausedTime = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(pausedTime);
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#timer')).toHaveText('00:00');
  await expect(page.locator('#blessing-count')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('clan defeat, victory, best time, and replay complete the run lifecycle', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 42;
    scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  // The defeat screen narrates the recorded journey instead of a fixed line.
  await expect(page.locator('.end-menu .panel-intro')).toContainText(
    'At the Golden Pasture, before the clan had ever broken camp, the clan’s resolve gave out',
  );
  await expect(page.locator('#best')).toHaveText('00:42');
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 900;
    scene.run.clan.stage = 'final';
    scene.run.clan.region = 3;
    scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('15:00');
  await page.reload();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('15:00');
});
