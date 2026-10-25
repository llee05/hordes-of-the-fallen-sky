import { expect, test } from '@playwright/test';
import { selectCampBuilding, closeOverlayOrPause, buyNode, startExpedition } from './helpers';

test('companions acknowledge camp work and the chronicle retains the real Khan succession', async ({
  page,
}) => {
  await page.goto('/?terrain=2d');
  await startExpedition(page);
  await page.locator('[data-story-choice="share-work"]').click();
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  await closeOverlayOrPause(page);
  await expect(page.locator('#companion-reaction')).toContainText('Boro:');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = 999;
    scene.run.elapsed = 42;
    scene.run.kills = 7;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
  });
  await expect(page.locator('#companion-reaction')).toContainText('The road still needs a Khan');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Your clan' }).click();
  await expect(page.getByRole('region', { name: 'Those who carried the banner' })).toContainText(
    'Khan 1',
  );
  await expect(page.locator('.khan-records')).toContainText('7 banished by the host');
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).__gloam.scene.run.legacy),
  );
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run.legacy))).toBe(
    before,
  );
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.khan.successionRemaining = 0.1;
  });
  await expect(page.locator('#khan-title')).toHaveText('THE KHAN · 2');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Our story' }).click();
  await expect(page.locator('.khan-records li')).toHaveCount(2);
  await expect(page.locator('.clan-memories')).toContainText('Khan 1 fell');
  await expect(page.locator('.clan-memories')).toContainText('Khan 2 took the banner');
  await page.locator('.clan-memory summary').first().click();
  await expect(page.locator('.clan-memory').first()).toContainText(
    'Good bows. Better if we never need them.',
  );
  await page.screenshot({ path: 'test-results/clan-lived-history.png' });
});
