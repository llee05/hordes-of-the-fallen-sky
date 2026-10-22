import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('guidance follows riding, camp purchases, knowledge, formations, and the first crossing', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const guide = page.getByRole('complementary', { name: 'Expedition guidance' });
  await expect(guide).toContainText('Ride out, keep watch');
  await page.keyboard.down('d');
  await expect(guide).toContainText('Your camp is your strength');
  await page.keyboard.up('d');
  await guide.getByRole('button', { name: /Develop camp/ }).click();
  const frozen = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.locator('[data-node="archery-base"]').click();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(frozen);
  await page.keyboard.press('Escape');
  await expect(guide).toContainText('Gather what the fallen leave');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const gem = scene.gems.get(scene.player.x, scene.player.y, 'gem');
    gem.enableBody(true, scene.player.x, scene.player.y, true, true);
    gem.value = scene.run.nextLevelXp;
    gem.attracted = false;
  });
  await expect(guide).toContainText('Put knowledge to work');
  await guide.getByRole('button', { name: /Patron tree/ }).click();
  await page.locator('[data-node="power"]').click();
  await page.keyboard.press('Escape');
  await expect(guide).toContainText('Give the riders a purpose');
  await guide.getByRole('button', { name: /Change formation/ }).click();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 45;
  });
  await expect(guide).toContainText('Choose when to leave');
  await guide.getByRole('button', { name: /Inspect routes/ }).click();
  await page.locator('[data-route="river"]').click();
  await expect(guide).toContainText('Bring everyone across');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 100;
  });
  await expect(guide).toBeHidden();
});

test('tips can be hidden and restored while danger warnings remain visible', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.getByRole('button', { name: 'Hide guidance', exact: true }).click();
  await expect(page.locator('#field-guide')).toBeHidden();
  await page.evaluate(() => {
    const run = (window as any).__gloam.scene.run;
    run.clan.food = 0;
    run.clan.stage = 'migration';
    run.clan.routeId = 'river';
  });
  await expect(page.locator('#clan-warning')).toContainText('Starvation');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.getByRole('button', { name: 'Show guidance' }).click();
  await expect(page.getByRole('button', { name: 'Hide guidance' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('#field-guide')).toBeVisible();
  await page.screenshot({ path: 'test-results/first-crossing-guidance.png' });
});
