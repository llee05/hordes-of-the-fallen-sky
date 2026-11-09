import { expect, test } from '@playwright/test';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNode,
  expectFrozen,
  startExpedition,
} from './helpers';

test('the chronicle retains camp work and the real Khan succession', async ({ page }) => {
  await page.goto('/');
  await startExpedition(page);
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    window.__gloam.hooks.quietBattlefield({ timers: ['spawnTimer'], clearEnemies: false });
    scene.run.elapsed = 42;
    scene.run.kills = 7;
    window.__gloam.hooks.setTimers({ invulnerable: 0 });
    scene.takeDamage(1000);
  });
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Your clan' }).click();
  await expect(page.getByRole('region', { name: 'Those who carried the banner' })).toContainText(
    'Khan 1',
  );
  await expect(page.locator('.khan-records')).toContainText('7 banished by the host');
  await expectFrozen(
    page,
    () => page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run.legacy)),
    13,
  );
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.khan.successionRemaining = 0.1;
  });
  await expect(page.locator('#khan-title')).toHaveText('THE KHAN · 2');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Your clan' }).click();
  await expect(page.locator('.khan-records li')).toHaveCount(2);
  await expect(page.locator('.clan-memories')).toContainText('Khan 1 fell');
  await expect(page.locator('.clan-memories')).toContainText('Khan 2 took the banner');
  await page.locator('.clan-memory summary').first().click();
  await expect(page.locator('.clan-memory').first()).toContainText(
    'Mount Otgontenger · The clan established this household to level 1.',
  );
  await expect(page.locator('.clan-memory blockquote')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/clan-lived-history.png' });
});
