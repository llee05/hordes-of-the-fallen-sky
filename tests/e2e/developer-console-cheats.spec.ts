import { GAME } from '../../src/game/config';
import { expect, test } from '@playwright/test';
import { command, checkpoint } from './developerConsole';

test.beforeEach(() => test.setTimeout(90000));
// No state is shared between tests, including saved commands.
test.describe.configure({ mode: 'parallel' });

test('using cheats marks a normal run, preserves records, carries between checkpoints, and resets on New Game', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').bestSeconds ?? 0,
  );
  await page.keyboard.press('Backquote');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'console');
  await expect(page.locator('.developer-panel')).toHaveCount(0);
  await command(page, 'clan-invincible on');
  expect(await page.evaluate(() => (window as any).__gloam.scene.developerRun)).toBe(true);
  await command(page, 'god on');
  expect(await page.evaluate(() => (window as any).__gloam.scene.developerRun)).toBe(true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 321;
    scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').bestSeconds ?? 0,
    ),
  ).toBe(saved);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#developer-run')).toContainText('INVINCIBLE');
  await page.keyboard.press('F10');
  await command(page, 'status');
  await expect(page.getByRole('log')).toContainText('Khan invincibility: ON');
  await expect(page.getByRole('log')).toContainText('Clan invincibility: ON');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        developer: scene.developerRun,
        invincible: scene.developerTools.invincible,
        clanInvincible: scene.developerTools.clanInvincible,
        history: scene.developerTools.history,
      };
    }),
  ).toEqual({
    developer: false,
    invincible: false,
    clanInvincible: false,
    history: ['clan-invincible on', 'god on', 'status'],
  });
});

test('clan invincibility prevents melee, projectile, hazard and starvation losses, independently of the Khan', async ({
  page,
}) => {
  await checkpoint(page);
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
});
