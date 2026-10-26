import { expect, test } from '@playwright/test';
import { tapController } from './helpers';
import { beginStory, campTime } from './storyHelpers';

test('controller chooses, skips, reads memories, and returns to the paused expedition', async ({
  page,
}) => {
  // Story setup plus sampled controller edges can exceed 30s on a busy software renderer.
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { storyPad: pad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  const press = (index: number): Promise<void> => tapController(page, index, 'storyPad');
  await beginStory(page);
  await press(12);
  await press(12);
  await expect(page.locator('[data-story-choice="share-work"]')).toBeFocused();
  await press(0);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  expect(await page.evaluate(() => (window as any).__gloam.scene.dashTimer)).toBe(0);
  await campTime(page, 45);
  await expect(page.getByRole('heading', { name: 'More mouths, more hands.' })).toBeVisible();
  await press(1);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await press(9);
  await press(13);
  await expect(page.getByRole('button', { name: 'Patron tech tree', exact: true })).toBeFocused();
  // f780c79 added save actions to Pause; follow focus to the target instead of counting presses.
  const memories = page.getByRole('button', { name: 'Our remembered road', exact: true });
  const buttons = await page.locator('.pause-menu button').count();
  for (let step = 0; step < buttons; step++) {
    if (await memories.evaluate((button) => button === document.activeElement)) break;
    await press(13);
  }
  await expect(memories).toBeFocused();
  await press(0);
  await expect(page.getByRole('heading', { name: 'Our remembered road.' })).toBeVisible();
  await press(12);
  await press(0);
  await expect(page.locator('details[open]')).toHaveCount(1);
  await press(1);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'paused');
});
