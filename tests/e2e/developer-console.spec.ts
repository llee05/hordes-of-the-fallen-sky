import { expect, test } from '@playwright/test';
import { command, checkpoint } from './developerConsole';

test.beforeEach(() => test.setTimeout(90000));
// No state is shared between tests, including saved commands.
test.describe.configure({ mode: 'parallel' });

test('console pauses gameplay and accepts real keyboard input', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await checkpoint(page);
  await page.keyboard.down('Backquote');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await expect(input).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'console');
  await expect(page.locator('.developer-panel')).toHaveCount(0);
  await expect(page.locator('#game-hud')).toBeVisible();
  await page.keyboard.down('Backquote');
  await page.keyboard.up('Backquote');
  await expect(input).toHaveValue('');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'console');
  const frozen = await page.evaluate(() => ({
    run: JSON.stringify((window as any).__gloam.scene.run),
    x: (window as any).__gloam.scene.player.x,
  }));
  await page.keyboard.type('wasd +- 0');
  await expect(input).toHaveValue('wasd +- 0');
  await input.fill('');
  await page.keyboard.type('status');
  await input.press('Enter');
  await expect(page.getByRole('log')).toContainText('Khan invincibility: OFF');
  await page.keyboard.type('invincible on');
  await expect(input).toHaveValue('invincible on');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Khan invincibility: On' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => ({
      run: JSON.stringify((window as any).__gloam.scene.run),
      x: (window as any).__gloam.scene.player.x,
    })),
  ).toEqual(frozen);
  await page.keyboard.press('Escape');
  await expect(page.locator('#developer-run')).toContainText('INVINCIBLE');
  expect(errors).toEqual([]);
});

test('console invincibility protects the Khan from every damage path and restores damage when disabled', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await checkpoint(page);
  await page.keyboard.press('F10');
  await command(page, 'invincible on');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  const health = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.body.reset(scene.camp.x + 450, scene.camp.y);
    scene.invulnerable = 0;
    scene.run.patrons.hearth.revives = 1;
    scene.takeDamage(100000);
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    scene.hurtPlayer(enemy);
    enemy.disableBody(true, true);
    scene.fireHostile({ x: scene.player.x, y: scene.player.y, definition: { damage: 100000 } }, 0);
    const shot = scene.hostileShots.getChildren().find((item: any) => item.active);
    shot.setVelocity(0, 0);
    shot.remaining = 10;
    shot.damage = 100000;
    (window as any).consoleTestShot = shot;
    const warning = scene.add.graphics();
    scene.hazards.push({ x: scene.player.x, y: scene.player.y, remaining: 0.01, warning });
    return scene.run.health;
  });
  await expect.poll(() => page.evaluate(() => (window as any).consoleTestShot.active)).toBe(false);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.hazards.length))
    .toBe(0);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        health: scene.run.health,
        revives: scene.run.patrons.hearth.revives,
        succession: scene.run.khan.successionRemaining,
        body: scene.player.body.enable,
        alpha: scene.player.alpha,
      };
    }),
  ).toEqual({ health, revives: 1, succession: 0, body: true, alpha: 1 });
  // Clan attacks retain their normal effect while only the Khan is protected.
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      scene.run.clan.integrity = 100;
      const shot = scene.hostileShots.get(scene.camp.x, scene.camp.y, 'gem');
      shot.enableBody(true, scene.camp.x, scene.camp.y, true, true);
      shot.remaining = 10;
      shot.damage = 10;
      scene.updateProjectiles(0.01);
      return scene.run.clan.integrity;
    }),
  ).toBeLessThan(100);
  await page.keyboard.press('F10');
  await command(page, 'invincible off');
  await expect(page.getByRole('button', { name: 'Khan invincibility: Off' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.keyboard.press('F10');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.invulnerable = 0;
    scene.fireHostile({ x: scene.player.x, y: scene.player.y, definition: { damage: 10 } }, 0);
    scene.hostileShots
      .getChildren()
      .find((shot: any) => shot.active)
      .setVelocity(0, 0);
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.health))
    .toBe(health - 10);
  expect(await page.evaluate(() => (window as any).__gloam.scene.player.body.enable)).toBe(true);
  await page.keyboard.press('F10');
  await command(page, 'heal');
  await expect(page.getByRole('log')).toContainText(`Khan health restored to ${health}`);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.health)).toBe(health);
  expect(errors).toEqual([]);
});
