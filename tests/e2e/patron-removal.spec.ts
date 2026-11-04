import { expect, test } from '@playwright/test';
import { openTitle, sceneFrames, startExpedition, tapController } from './helpers';

test('camp development is the only progression screen after keyboard, controller and menu actions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { testController: pad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('t');
  await tapController(page, 4);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#research, #research-points, #blessing-count')).toHaveCount(0);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    s.run.xp = s.run.nextLevelXp - 1;
    const gem = s.gems.get(s.player.x, s.player.y, 'gem');
    gem.enableBody(true, s.player.x, s.player.y, true, true);
    gem.value = 1;
    gem.attracted = true;
  });
  await expect(page.locator('#level')).toHaveText('02');
  expect(await page.evaluate(() => 'pendingUpgrades' in (window as any).__gloam.scene.run)).toBe(
    false,
  );
  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await sceneFrames(page);
    await page.screenshot({ path: `test-results/patron-removal-hud-${size.width}.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Patron tech tree/ })).toHaveCount(0);
    await page.screenshot({ path: `test-results/patron-removal-pause-${size.width}.png` });
    await page.getByRole('button', { name: 'How to play', exact: true }).click();
    await expect(page.locator('.help-panel')).not.toContainText(
      /knowledge point|Patron tech tree|LB/,
    );
    await page.screenshot({ path: `test-results/patron-removal-help-${size.width}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.keyboard.press('j');
    await expect(page.getByRole('tab')).toHaveCount(3);
    await expect(page.getByRole('tab', { name: 'Traditions', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/patron-removal-chronicle-${size.width}.png` });
    await page.keyboard.press('Escape');
  }
  await page.keyboard.press('b');
  await expect(page.locator('.camp-estate')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Combinations', exact: true })).toHaveCount(0);
  await expect(page.locator('.camp-map-cores button')).toHaveCount(5);
});
