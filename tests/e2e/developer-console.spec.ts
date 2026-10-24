import { expect, test, type Page } from '@playwright/test';
import { GAME } from '../../src/game/config';

test.beforeEach(() => test.setTimeout(60000));

async function command(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

async function checkpoint(page: Page): Promise<void> {
  await page.goto('/?terrain=2d');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="chapter:broken-pass"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = scene.hazardTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
}

test('console pauses gameplay, accepts real keyboard input, and protects the Khan from every damage path', async ({
  page,
}) => {
  test.setTimeout(60000);
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

test('console history, validation, focus, and narrow layouts work without changing title or intro state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.keyboard.press('F10');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await expect(input).toBeFocused();
  await expect(page.getByRole('button', { name: 'Khan invincibility: Off' })).toBeDisabled();
  await command(page, 'god on');
  await expect(page.getByRole('log')).toContainText('Start an expedition');
  await command(page, 'help');
  await expect(page.getByRole('log')).toContainText('Alias: god');
  await command(page, '<img src=x onerror=alert(1)>');
  await expect(page.getByRole('log')).toContainText('Unknown command: <img');
  await expect(page.getByRole('log').locator('img')).toHaveCount(0);
  await input.fill('draft');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('<img src=x onerror=alert(1)>');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('draft');
  expect(
    await page
      .locator('.developer-overlay')
      .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/developer-console-mobile.png' });
  await command(page, 'clear');
  await expect(page.getByRole('log')).toBeEmpty();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('clear');
  await page.keyboard.press('F10');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('F10');
  await command(page, 'god on');
  await expect(page.getByRole('log')).toContainText('Start an expedition');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('F10');
  await command(page, 'status');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
});

test('using cheats marks a normal run, preserves records, carries between checkpoints, and resets on New Game', async ({
  page,
}) => {
  await page.goto('/?terrain=2d');
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

test('Up recalls saved commands after reload and checkpoints, while Down restores the draft', async ({
  page,
}) => {
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await page.keyboard.press('Backquote');
  await command(page, 'status');
  await command(page, 'help');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').developerCommandHistory,
      ),
    )
    .toEqual(['status', 'help']);
  await page.reload();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.keyboard.press('Backquote');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('status');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('unfinished');
  await page.keyboard.press('Backquote');
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Backquote');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('status');
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
