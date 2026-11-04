import { expect, test, type Page } from '@playwright/test';
import { GAME } from '../../src/game/config';
import { checkpoint, command } from './developerConsole';
import { expectFrozen } from './helpers';

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
  expect(
    await expectFrozen(
      page,
      () =>
        page.evaluate(() => ({
          run: JSON.stringify((window as any).__gloam.scene.run),
          x: (window as any).__gloam.scene.player.x,
        })),
      10,
    ),
  ).toEqual(frozen);
  await page.keyboard.press('Escape');
  await expect(page.locator('#developer-run')).toContainText('INVINCIBLE');
  expect(errors).toEqual([]);
});

// The base camp heals the Khan and restores clan resolve every second. Turning that off keeps
// the health and integrity checks exact, so any damage that gets through still fails them.
async function stopPassiveRecovery(page: Page): Promise<void> {
  await page.evaluate(() => {
    const run = (window as any).__gloam.scene.run;
    run.clan.campEffects.bonuses.commanderRecovery = 0;
    run.clan.campEffects.bonuses.resolveRecovery = 0;
    run.clan.campEffects.bonuses.commanderRecovery = 0;
  });
}

test('console invincibility protects the Khan from every damage path and restores damage when disabled', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await checkpoint(page);
  await stopPassiveRecovery(page);
  await page.keyboard.press('F10');
  await command(page, 'invincible on');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  const health = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.body.reset(scene.camp.x + 450, scene.camp.y);
    scene.invulnerable = 0;
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
        succession: scene.run.khan.successionRemaining,
        body: scene.player.body.enable,
        alpha: scene.player.alpha,
      };
    }),
  ).toEqual({ health, succession: 0, body: true, alpha: 1 });
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

test('clan invincibility prevents melee, projectile, hazard and starvation losses, independently of the Khan', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await checkpoint(page);
  await stopPassiveRecovery(page);
  await page.keyboard.press('Backquote');
  await command(page, 'clan-invincible on');
  await expect(page.getByRole('button', { name: 'Clan invincibility: On' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Khan invincibility: Off' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.keyboard.press('Backquote');
  await expect(page.getByRole('dialog')).toBeHidden();
  const before = await page.evaluate((interval) => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.integrity = 47;
    scene.run.clan.food = 0;
    scene.run.clan.pasture = 0;
    scene.run.clan.stageTime = interval - 0.01;
    scene.player.body.reset(scene.camp.x, scene.camp.y);
    scene.invulnerable = 0;
    const before = {
      population: scene.run.clan.population,
      herd: scene.run.clan.herd,
      integrity: 47,
      lost: scene.run.story.peopleLost,
      health: scene.run.health,
    };
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.body.reset(scene.camp.x + 10, scene.camp.y);
    enemy.clanAttackTimer = 0;
    scene.updateEnemies(0.01);
    enemy.disableBody(true, true);
    scene.fireHostile({ x: scene.camp.x + 10, y: scene.camp.y, definition: { damage: 100000 } }, 0);
    scene.updateProjectiles(0.01);
    scene.hazards.push({
      x: scene.camp.x,
      y: scene.camp.y,
      remaining: 0.01,
      warning: scene.add.graphics(),
    });
    return before;
  }, GAME.clan.starvationInterval);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.stageTime))
    .toBeGreaterThan(GAME.clan.starvationInterval + 0.05);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.hazards.length))
    .toBe(0);
  expect(
    await page.evaluate(() => {
      const run = (window as any).__gloam.scene.run;
      return {
        population: run.clan.population,
        herd: run.clan.herd,
        integrity: run.clan.integrity,
        lost: run.story.peopleLost,
      };
    }),
  ).toEqual({
    population: before.population,
    herd: before.herd,
    integrity: before.integrity,
    lost: before.lost,
  });
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.health)).toBeLessThan(
    before.health,
  );
  await expect(page.locator('#integrity')).toContainText('INVINCIBLE');
  await page.keyboard.press('Backquote');
  await command(page, 'clan-invincible off');
  await page.keyboard.press('Backquote');
  await page.evaluate((interval) => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = interval * 2 - 0.01;
  }, GAME.clan.starvationInterval);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.population))
    .toBeLessThan(before.population);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.integrity)).toBeLessThan(
    before.integrity,
  );
  expect(errors).toEqual([]);
});
