import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test(
  'left-click light attacks defeat enemies and collected XP raises levels without interrupting combat',
  { tag: '@core' },
  async ({ page }) => {
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
    await page.waitForTimeout(500);
    await expect(page.locator('#kills')).toHaveText('0');
    const canvas = await page.locator('canvas').first().boundingBox();
    if (!canvas) throw new Error('Game canvas is unavailable');
    await page.mouse.move(canvas.x + canvas.width / 2 + 140, canvas.y + canvas.height / 2);
    await page.mouse.down({ button: 'left' });
    await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 15000 });
    await page.mouse.up({ button: 'left' });
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
    await expect(page.locator('#research')).toHaveCount(0);
    await expect(page.locator('#level')).toHaveText('02');
  },
);

test('right-click heavy attacks wind up and number keys trigger abilities while Q stays unbound', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const canvas = await page.locator('canvas').first().boundingBox();
  if (!canvas) throw new Error('Game canvas is unavailable');
  const volleys = await page.evaluate(() => (window as any).__gloam.scene.run.combat.volleys);
  await page.mouse.move(canvas.x + canvas.width / 2 + 180, canvas.y + canvas.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.combat.volleys)).toBe(volleys);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.combat.volleys))
    .toBeGreaterThan(volleys);
  await page.mouse.up({ button: 'right' });

  await expect(page.locator('#ability-q')).toContainText('READY');
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#ability-q')).toContainText('READY');
  await page.keyboard.press('Digit1');
  await expect(page.locator('#ability-q')).not.toContainText('READY');
});

test('Spirit Caller builds spiritual energy and exposes the authored drum and spirit kit', async ({
  page,
}) => {
  await openTitle(page);
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-class="spirit-caller"]').click();
  await expect(page.locator('#spirit-energy')).toContainText('SPIRITUAL ENERGY 0 / 12');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    window.__gloam.hooks.quietBattlefield({ timers: ['spawnTimer'], clearEnemies: true });
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.health = 100000;
    enemy.setPosition(scene.player.x + 100, scene.player.y);
    scene.spatial.rebuild(scene.enemies.getChildren());
  });
  const canvas = await page.locator('canvas').first().boundingBox();
  if (!canvas) throw new Error('Game canvas is unavailable');
  await page.mouse.move(canvas.x + canvas.width / 2 + 100, canvas.y + canvas.height / 2);
  await page.mouse.down({ button: 'left' });
  await expect(page.locator('#spirit-energy')).not.toContainText('ENERGY 0 / 12');
  await page.mouse.up({ button: 'left' });

  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(600);
  await page.mouse.up({ button: 'right' });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.enemies.getChildren().find((item: any) => item.active)
            ?.spiritSlow ?? 0,
      ),
    )
    .toBeGreaterThan(0);

  await page.keyboard.press('Digit1');
  await expect(page.locator('#spirit-energy')).toContainText('2 ACTIVE SPIRITS');
  await page.keyboard.press('Digit2');
  await page.keyboard.press('Digit3');
  await expect(page.locator('#ability-e')).not.toContainText('READY');
  await page.keyboard.press('Digit4');
  await expect(page.locator('#spirit-energy')).toContainText('6 ACTIVE SPIRITS');
});

test('Iron Pagoda abilities brace, stun and snare through the number keys and the HUD', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.character = { ...(scene.run.character ?? {}), classId: 'iron-pagoda' };
    window.__gloam.hooks.setTimers({ spawnTimer: 999 });
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.setPosition(scene.player.x + 90, scene.player.y);
    enemy.health = enemy.maxHealth = 100000;
  });
  const names = ['Iron Wall', 'Crushing Hooves', 'Chain Snare', 'Unbroken Fortress'];
  for (const [index, slot] of ['q', 'w', 'e', 'r'].entries())
    await expect(page.locator(`#ability-${slot}`)).toContainText(names[index]!);

  await page.keyboard.press('Digit1');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.timers.khanStatus.guard))
    .toBeGreaterThan(0);
  await page.keyboard.press('Digit2');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.enemies.getChildren().find((item: any) => item.active)
            .status.stun,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press('Digit3');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.enemies.getChildren().find((item: any) => item.active)
            .status.slow,
      ),
    )
    .toBeGreaterThan(0);
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
    window.__gloam.hooks.setTimers({ attackTimer: 0 });
  });
  await expect(page.locator('#kills')).not.toHaveText('0');
});
