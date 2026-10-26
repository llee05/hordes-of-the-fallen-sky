import { expect, test } from '@playwright/test';
import { buyNode, closeOverlayOrPause, openTitle, startExpedition } from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test('automatic attacks defeat enemies and collected XP banks research without interrupting combat', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  // Put a real pooled enemy in firing range, rather than waiting for it to cross the world.
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.setPosition(scene.player.x + 100, scene.player.y);
    enemy.health = 1;
  });
  await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 15000 });
  // Place a shard at the player to exercise actual pickup and level-up integration.
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.xp = scene.run.nextLevelXp - 1;
    const gem = scene.gems.get(scene.player.x, scene.player.y, 'gem');
    gem.enableBody(true, scene.player.x, scene.player.y, true, true);
    gem.value = 1;
    gem.attracted = false;
  });
  await expect(page.locator('#level')).toHaveText('02');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#research-points')).toHaveText('1');
  await page.keyboard.press('t');
  await expect(page.getByRole('heading', { name: 'Patron tech tree' })).toBeVisible();
  await expect(page.locator('[data-tree-branch-select]')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/desktop-upgrade.png', fullPage: true });
  await buyNode(page, 'power');
  await expect(page.getByRole('heading', { name: 'Patron tech tree' })).toBeVisible();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#blessing-count')).toHaveText('1');
  await expect(page.locator('#level')).toHaveText('02');
});

test('guard riders fire at camp threats while the commander scouts away', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.setPosition(scene.camp.x + 850, scene.camp.y);
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.setPosition(scene.camp.x + 150, scene.camp.y);
    enemy.health = 1;
    scene.attackTimer = 0;
  });
  await expect(page.locator('#kills')).not.toHaveText('0');
});
