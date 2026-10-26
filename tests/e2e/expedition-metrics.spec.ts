import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';
test('a real opening fight records active time and the chronicle exposes its milestones', async ({
  page,
}) => {
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await page.evaluate(async () => {
    const { ENEMIES } = await import('/src/game/data/enemies.ts');
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    scene.spawnEnemy(ENEMIES[0]);
    const enemy = scene.enemies.getFirstAlive();
    enemy.body.reset(scene.player.x + 100, scene.player.y);
    enemy.definition = { ...enemy.definition, speed: 0 };
    enemy.health = enemy.maxHealth = 10000;
    scene.attackTimer = 0;
  });
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.run.metrics.stages[0]?.marks.fight),
      { timeout: 25000 },
    )
    .toBeGreaterThan(0);
  const fight = await page.evaluate(
    () => (window as any).__gloam.scene.run.metrics.stages[0].marks.fight,
  );
  expect(fight).toBeLessThan(20);
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Your clan' }).click();
  await page.getByText('Expedition milestones', { exact: true }).click();
  await expect(page.locator('.expedition-metrics')).toContainText('First fight');
  await expect(page.locator('.expedition-metrics')).toContainText('First knowledge');
  await page.keyboard.press('F10');
  await page.locator('[data-developer-command-input]').fill('metrics');
  await page.locator('[data-developer-command-input]').press('Enter');
  await expect(page.getByRole('log')).toContainText('Golden Pasture');
});
