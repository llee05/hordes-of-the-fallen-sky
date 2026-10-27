import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';
test('combat visual preferences persist and keep projectile collision size and danger feedback intact', async ({
  page,
}) => {
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = (window as any).__gloam.scene;
        if (!s.enemies.getFirstAlive()) s.spawnEnemy();
        return !!s.enemies.getFirstAlive();
      }),
    )
    .toBe(true);
  const before = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    const enemy = s.enemies.getFirstAlive();
    enemy.setPosition(s.player.x + 330, s.player.y);
    enemy.elite = true;
    // Keep the real elite on screen and alive while the test inspects its marker.
    enemy.definition = { ...enemy.definition, speed: 0 };
    enemy.health = enemy.maxHealth = 10000;
    const shot = s.fireHostile(enemy, Math.PI);
    return { radius: shot.body.radius * shot.scaleX, damage: shot.damage };
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Projectile contrast', exact: true }).click();
  await page.getByRole('button', { name: 'Effect density', exact: true }).click();
  await page.getByRole('button', { name: 'Effect density', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Effect density', exact: true })).toHaveText(
    'minimal',
  );
  const after = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      shot = s.hostileShots.getFirstAlive();
    const count = s.children.list.length;
    s.burst(s.player.x, s.player.y, 0xffffff, 20);
    return {
      radius: shot.body.radius * shot.scaleX,
      damage: shot.damage,
      added: s.children.list.length - count,
      scale: shot.scaleX,
    };
  });
  expect(after.radius).toBeCloseTo(before.radius);
  expect(after.damage).toBe(before.damage);
  expect(after.added).toBe(0);
  expect(after.scale).toBe(1.45);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      shot = s.hostileShots.getFirstAlive();
    shot.enableBody(
      true,
      s.cameras.main.midPoint.x + s.scale.width / 2 + 400,
      s.player.y,
      true,
      true,
    );
    shot.setVelocity(-400, 0);
    shot.remaining = 4;
    shot.setData('terrain-previous', { x: shot.x, y: shot.y });
    s.callbacks.onHud(s.snapshot());
  });
  await expect(page.locator('.danger-edge').first()).toBeVisible();
  await expect(page.locator('.elite-marker').first()).toContainText('ELITE');
  await page.screenshot({ path: 'test-results/combat-readability.png' });
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.damageClan(30, 'seer');
    s.damageClan(0.1);
    s.publishPhase();
  });
  await expect(page.locator('#major-loss')).toContainText('seer struck the camp');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Projectile contrast', exact: true })).toHaveText(
    'High',
  );
  await expect(page.getByRole('button', { name: 'Effect density', exact: true })).toHaveText(
    'minimal',
  );
});
