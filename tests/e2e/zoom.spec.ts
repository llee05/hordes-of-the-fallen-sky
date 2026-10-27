import { expect, test } from '@playwright/test';
import {
  closeOverlayOrPause,
  openTitle,
  sceneFrames,
  startExpedition,
  tapController,
} from './helpers';

// Keep the full input/layout checks within budget on software-rendered Chromium.
test.beforeEach(() => test.setTimeout(process.env.CI ? 90000 : 60000));

test('buttons, keyboard, and wheel zoom the battlefield with bounds and a reset, keeping HUD and bodies stable', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const hud = (await page.locator('.resource-hud').boundingBox())!;
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('#zoom-level')).toHaveText('110%');
  await page.keyboard.press('=');
  await expect(page.locator('#zoom-level')).toHaveText('120%');
  await page.keyboard.press('-');
  await expect(page.locator('#zoom-level')).toHaveText('110%');
  await page.keyboard.press('0');
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, 1000);
  await expect(page.locator('#zoom-level')).toHaveText('60%');
  await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.cameras.main.worldView.width))
    .toBeCloseTo(1440 / 0.6);
  const zoomed = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      body: scene.player.body.width,
      sprite: scene.player.displayWidth,
      zoom: scene.cameras.main.zoom,
      worldWidth: scene.cameras.main.worldView.width,
    };
  });
  expect(zoomed).toMatchObject({ body: 20, sprite: 62, zoom: 0.6 });
  expect(zoomed.worldWidth).toBeCloseTo(1440 / 0.6);
  expect((await page.locator('.resource-hud').boundingBox())!.width).toBe(hud.width);
  await page.screenshot({ path: 'test-results/battlefield-zoom-out.png' });
  await page.mouse.wheel(0, -2000);
  await expect(page.locator('#zoom-level')).toHaveText('160%');
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset battlefield zoom to 100%' }).click();
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  // One native event must not be processed again when Phaser replays its key queue.
  await page.keyboard.down('=');
  await expect(page.locator('#zoom-level')).toHaveText('110%');
  await page.waitForTimeout(150);
  await page.keyboard.up('=');
  await expect(page.locator('#zoom-level')).toHaveText('110%');
});

test('menus ignore zoom input and search remains editable; the chosen view survives a new expedition', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('-');
  await expect(page.locator('#zoom-level')).toHaveText('90%');
  await page.keyboard.press('b');
  const state = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.keyboard.press('=');
  await page.keyboard.press('0');
  await page.locator('[data-tree-search]').fill('ger+0-');
  await expect(page.locator('[data-tree-search]')).toHaveValue('ger+0-');
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, -500);
  expect(await page.evaluate(() => (window as any).__gloam.scene.cameras.main.zoom)).toBe(0.9);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(state);
  await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: '+' });
    Object.assign(window, { ignoredZoomEvent: event });
    (window as any).__gloam.scene.input.keyboard.emit('keydown-PLUS', event);
  });
  await closeOverlayOrPause(page);
  // Phaser may replay the same event after a menu closes; it must remain ignored.
  await page.evaluate(() => {
    (window as any).__gloam.scene.input.keyboard.emit(
      'keydown-PLUS',
      (window as any).ignoredZoomEvent,
    );
  });
  await expect(page.locator('#zoom-level')).toHaveText('90%');
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await startExpedition(page);
  await expect(page.locator('#zoom-level')).toHaveText('90%');
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const zoom = (await page.getByRole('group', { name: 'Battlefield zoom' }).boundingBox())!;
    expect(zoom.x).toBeGreaterThanOrEqual(0);
    expect(zoom.x + zoom.width).toBeLessThanOrEqual(viewport.width);
    for (const id of ['dash', 'research', 'build', 'field-guide']) {
      const control = (await page.locator(`#${id}`).boundingBox())!;
      expect(
        zoom.x < control.x + control.width &&
          zoom.x + zoom.width > control.x &&
          zoom.y < control.y + control.height &&
          zoom.y + zoom.height > control.y,
        `${id} overlaps zoom`,
      ).toBe(false);
    }
  }
});

test('controller triggers and reset work once per press, including during succession, while spawns stay outside a wide view', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { testController: pad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  await openTitle(page);
  await startExpedition(page);
  await tapController(page, 7);
  await expect(page.locator('#zoom-level')).toHaveText('110%');
  await tapController(page, 6);
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
  });
  await page.keyboard.press('-');
  await expect(page.locator('#zoom-level')).toHaveText('90%');
  await tapController(page, 11);
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  await page.evaluate(() => {
    (window as any).__gloam.scene.changeZoom(-20);
  });
  await expect(page.locator('#zoom-level')).toHaveText('60%');
  await sceneFrames(page);
  const spawning = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    for (let i = 0; i < 15; i++) scene.spawnEnemy();
    const view = scene.cameras.main.worldView;
    return scene.enemies
      .getChildren()
      .filter((enemy: any) => enemy.active)
      .map((enemy: any) =>
        scene.landscape.world3d
          ? !scene.landscape.world3d.nearView(enemy)
          : enemy.x < view.x || enemy.x > view.right || enemy.y < view.y || enemy.y > view.bottom,
      );
  });
  expect(spawning.length).toBeGreaterThan(0);
  expect(spawning.every(Boolean)).toBe(true);
});
