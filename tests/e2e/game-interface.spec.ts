import { expect, test } from '@playwright/test';
import { closeOverlayOrPause, openTitle, startExpedition } from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

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
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(page.locator('#zoom-level')).toHaveText('80%');
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
  try {
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x))
      .toBeGreaterThan(startX + 15);
    const joystick = await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      const graphic = scene.joystick;
      const origin = scene.dragOrigin;
      const point = scene.cameras.main.matrix.transformPoint(
        graphic.x + origin.x * graphic.scaleX,
        graphic.y + origin.y * graphic.scaleY,
      );
      return { x: point.x, y: point.y, expectedX: origin.x, expectedY: origin.y };
    });
    expect(joystick.x).toBeCloseTo(joystick.expectedX, 1);
    expect(joystick.y).toBeCloseTo(joystick.expectedY, 1);
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await page.getByRole('button', { name: 'Dash', exact: true }).click();
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
  await context.close();
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
  const frame = (await page.locator('#game-canvas > canvas:first-child').boundingBox())!;
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
  await closeOverlayOrPause(page);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('#timer')).toHaveText('00:00');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await closeOverlayOrPause(page);
  await startExpedition(page);
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await closeOverlayOrPause(page);
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
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('j');
  await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
  await page.keyboard.press('j');
  await expect(page.getByRole('dialog')).toBeHidden();
});
