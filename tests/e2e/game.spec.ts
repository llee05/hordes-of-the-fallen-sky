import { expect, test } from '@playwright/test';
import { startExpedition, openTitle, tapController } from './helpers';

test('controller starts a run, moves, dashes, pauses, and navigates menus', async ({ page }) => {
  await page.addInitScript(() => {
    const state = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { testController: state });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [state] });
  });
  const press = (index: number): Promise<void> => tapController(page, index);
  await openTitle(page);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await press(0);
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await press(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  const initialX = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  await page.evaluate(() => {
    (window as any).testController.axes[0] = 1;
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    (window as any).testController.axes[0] = 0;
  });
  expect(await page.evaluate(() => (window as any).__gloam.scene.player.x)).toBeGreaterThan(
    initialX + 25,
  );
  await press(0);
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await press(8);
  await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
  await press(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  await press(9);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await press(13);
  await expect(
    page.getByRole('button', { name: 'Tradition tech tree', exact: true }),
  ).toBeFocused();
  await press(13);
  await expect(page.getByRole('button', { name: 'Start a new run' })).toBeFocused();
  await press(0);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
});

test('starts, moves, dashes, pauses, resumes, and resets a run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await expect(page.getByRole('heading', { name: 'Hordes of the Fallen Sky' })).toBeVisible();
  await expect(page).toHaveTitle('Hordes of the Fallen Sky · A people, not a place.');
  await page.screenshot({ path: 'test-results/desktop-ready.png', fullPage: true });
  await page.getByRole('button', { name: /NEW GAME/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  const before = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  await page.keyboard.down('d');
  try {
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x))
      .toBeGreaterThan(before + 30);
  } finally {
    await page.keyboard.up('d');
  }
  await page.keyboard.press('Space');
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const pausedTime = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(pausedTime);
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#timer')).toHaveText('00:00');
  await expect(page.locator('#blessing-count')).toHaveText('0');
  expect(errors).toEqual([]);
});

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
  await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 5000 });
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
  await expect(page.getByRole('heading', { name: 'Tradition tech tree' })).toBeVisible();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/desktop-upgrade.png', fullPage: true });
  await page.locator('[data-research="power"][data-rank="1"]').click();
  await expect(page.getByRole('heading', { name: 'Tradition tech tree' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#blessing-count')).toHaveText('1');
  await expect(page.locator('#level')).toHaveText('02');
});

test('death, victory, best time, and replay complete the run lifecycle', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 42;
    scene.run.health = 1;
    scene.spawnEnemy();
    scene.hurtPlayer(scene.enemies.getChildren().find((item: any) => item.active));
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('00:42');
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 900;
    scene.run.clan.stage = 'final';
    scene.run.clan.region = 3;
    scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('15:00');
  await page.reload();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('15:00');
});

test('mobile layout fits and touch movement works', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await openTitle(page);
  await startExpedition(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile-playing.png', fullPage: true });
  const startX = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  const box = (await page.locator('#game-canvas').boundingBox())!;
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 3;
  const y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 55, y }],
  });
  await page.waitForTimeout(500);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => (window as any).__gloam.scene.player.x)).toBeGreaterThan(
    startX + 15,
  );
  await page.getByRole('button', { name: 'Dash', exact: true }).click();
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await context.close();
});

test('camp planning spends resources, unlocks riders and builds the Burning Tempest', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const clan = (window as any).__gloam.scene.run.clan;
    clan.materials = 300;
    clan.spirit = 100;
  });
  await page.keyboard.press('b');
  await expect(page.getByRole('heading', { name: 'Build a people.' })).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.getByRole('button', { name: /Establish archery grounds/ }).click();
  await page.getByRole('button', { name: /Fire arrows/ }).click();
  await page.getByRole('button', { name: /Establish spirit sanctuary/ }).click();
  await page.getByRole('button', { name: /Wind shamans/ }).click();
  await expect(page.locator('#synergy')).toBeVisible();
  await expect(page.locator('#riders')).toHaveText('4');
  await expect(page.locator('#workers')).toHaveText('5 / 8');
  await expect(page.locator('#materials')).toHaveText('190');
  await page.screenshot({ path: 'test-results/camp-development.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('f');
  await expect(page.locator('#formation-name')).toHaveText('Encirclement');
  await page.screenshot({ path: 'test-results/steppe-playing.png', fullPage: true });
});

test('migration moves a vulnerable caravan, preserves the build and awards survivors at arrival', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await expect(page.locator('#migrate')).toBeDisabled();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = 45;
    scene.run.clan.buildings.archery = 1;
  });
  await expect(page.locator('#migrate')).toBeEnabled();
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: 'Where the grass still grows.' })).toBeVisible();
  const routeTime = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(routeTime);
  await page.screenshot({ path: 'test-results/route-choice.png', fullPage: true });
  await page.getByRole('button', { name: /Answer the blue banners/ }).click();
  await expect(page.locator('#stage-label')).toHaveText('THE GREAT FLIGHT');
  await expect(page.locator('#build')).toBeDisabled();
  await expect(page.locator('#population')).toHaveText('8');
  const initialCamp = await page.evaluate(() => (window as any).__gloam.scene.camp.x);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__gloam.scene.camp.x)).toBeGreaterThan(
    initialCamp,
  );
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((item: any) => item.active);
    enemy.setPosition(scene.camp.x, scene.camp.y);
    enemy.health = 1000;
    enemy.clanAttackTimer = 0;
  });
  await expect(page.locator('#integrity')).not.toHaveText('100%');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 60;
  });
  await expect(page.locator('#location')).toHaveText('SILENT RIVER');
  await expect(page.locator('#population')).toHaveText('16');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.buildings.archery)).toBe(
    1,
  );
  await expect(page.locator('#riders')).toHaveText('6');
  await expect(page.locator('#migrate')).toBeDisabled();
  await expect(page.locator('#build')).toBeEnabled();
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
  await expect(page.locator('#kills')).not.toHaveText('0', { timeout: 5000 });
});

test('three crossings lead to a final stand whose victory saves the clan with the boss still alive', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await startExpedition(page);
  for (let region = 1; region <= 3; region += 1) {
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 45;
    });
    await expect(page.locator('#migrate')).toBeEnabled();
    await page.locator('#migrate').click();
    await page.getByRole('button', { name: /Follow the river/ }).click();
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 100;
    });
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
      .toBe(region);
  }
  await expect(page.locator('#stage-label')).toHaveText('THE LAST STAND');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 20;
  });
  await expect(page.locator('#boss-bar')).toBeVisible();
  await page.screenshot({ path: 'test-results/sacred-mountain.png', fullPage: true });
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.finalBossDefeated)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});

test('painted atlases keep world-space collision sizes and sort miniatures by their ground position', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1')
      external.push(request.url());
  });
  await openTitle(page);
  await startExpedition(page);
  const art = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      mounted: scene.textures.exists('steppe-mounted-motion'),
      creatures: scene.textures.exists('steppe-creature-motion'),
      props: scene.textures.exists('steppe-props'),
      texture: scene.player.texture.key,
      frame: scene.player.frame.name,
      sourceWidth: scene.player.frame.width,
      canvasWidth: scene.player.frame.realWidth,
      canvasHeight: scene.player.frame.realHeight,
      displayWidth: scene.player.displayWidth,
      collisionWidth: scene.player.body.width,
      roundPixels: scene.cameras.main.roundPixels,
      imageRendering: getComputedStyle(document.querySelector('canvas')!).imageRendering,
    };
  });
  expect(art).toMatchObject({
    mounted: true,
    creatures: true,
    props: true,
    texture: 'steppe-mounted-motion',
    canvasWidth: 256,
    canvasHeight: 360,
    displayWidth: 62,
    collisionWidth: 20,
    roundPixels: false,
    imageRendering: 'auto',
  });
  expect(art.frame).toMatch(/^player-(move|attack)-\d$/);
  expect(art.sourceWidth).toBeGreaterThan(200);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.setPosition(scene.camp.x, scene.camp.y - 65);
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return scene.player.depth < scene.camp.depth;
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.setPosition(scene.camp.x, scene.camp.y + 65);
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return scene.player.depth > scene.camp.depth;
      }),
    )
    .toBe(true);
  expect(external).toEqual([]);
});

test('desktop menus keep the battlefield edge to edge and return settings and help to their parent menu', async ({
  page,
}) => {
  await openTitle(page);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#game-hud')).toBeHidden();
  const frame = (await page.locator('canvas').boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(frame.x).toBe(0);
  expect(frame.y).toBe(0);
  expect(Math.abs(frame.width - viewport.width)).toBeLessThan(2);
  expect(Math.abs(frame.height - viewport.height)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How to play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('help');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#timer')).toHaveText('00:00');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await startExpedition(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('paused');
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the clan chronicle pauses the expedition, supports keyboard tabs, and opens camp management', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'The journey' })).toBeFocused();
  const before = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return { run: JSON.stringify(scene.run), x: scene.player.x, y: scene.player.y };
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return { run: JSON.stringify(scene.run), x: scene.player.x, y: scene.player.y };
    }),
  ).toEqual(before);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Your clan' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Traditions', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('tab', { name: 'Your clan' }).click();
  await page.screenshot({ path: 'test-results/clan-chronicle.png' });
  await page.getByRole('button', { name: /Develop the camp/ }).click();
  await expect(page.getByRole('heading', { name: 'Build a people.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('j');
  await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog')).toBeHidden();
});
