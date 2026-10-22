import { expect, test } from '@playwright/test';
import { openTitle } from './helpers';

test('the canvas follows its parent even while the game frame loop is asleep', async ({ page }) => {
  await openTitle(page);
  await page.evaluate(() => (window as any).__gloam.game.loop.sleep());
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const canvas = document.querySelector('canvas')!.getBoundingClientRect();
          const parent = document.querySelector('#arena-wrap')!.getBoundingClientRect();
          return Math.max(
            Math.abs(parent.width - canvas.width),
            Math.abs(parent.height - canvas.height),
          );
        }),
      )
      .toBeLessThan(2);
  }
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(0);
  await page.evaluate(() => (window as any).__gloam.game.loop.wake());
});
