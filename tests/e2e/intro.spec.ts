import { expect, test } from '@playwright/test';
import { closeOverlayOrPause, tapController } from './helpers';

test('intro reads at the player’s pace with frozen simulation, back, completion, and a fresh expedition', async ({
  page,
}) => {
  // Five full-page paintings plus two expeditions exceed 30s on CI's software renderer.
  test.setTimeout(process.env.CI ? 90000 : 60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await expect(page.locator('.intro-story')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        phase: scene.run.phase,
        elapsed: scene.run.elapsed,
        paused: scene.physics.world.isPaused,
      };
    }),
  ).toEqual({ phase: 'ready', elapsed: 0, paused: true });
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await expect(page.locator('#intro-caption')).toContainText('Tengri, Eternal Heaven');
  await expect(page.locator('#intro-caption')).toContainText('Etügen, Mother Earth');
  await expect(page.locator('.intro-pages')).toHaveAttribute('aria-label', 'Chapter 1 of 5');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await expect(page.getByRole('button', { name: '← Back' })).toBeDisabled();
  await expect(page.locator('#game-hud')).toHaveAttribute('inert', '');
  await expect(page.locator('#menu-record')).toBeHidden();
  await expect
    .poll(() =>
      page.locator('.intro-painting').evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(1536);
  const before = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.startRun(); // Cannot bypass the intro's paused phase.
    return {
      elapsed: scene.run.elapsed,
      food: scene.run.clan.food,
      x: scene.player.x,
      frame: scene.player.frame.name,
    };
  });
  await page.keyboard.press('b');
  await page.keyboard.press('m');
  await page.keyboard.press('j');
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        elapsed: scene.run.elapsed,
        food: scene.run.clan.food,
        x: scene.player.x,
        frame: scene.player.frame.name,
      };
    }),
  ).toEqual(before);
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/intro-steppe.png' });
  // Focus stays inside the story. Disabled Back is omitted from Tab navigation.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Skip intro/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
  await expect(page.locator('#intro-caption')).toContainText('the Last Court');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: 'test-results/intro-iron-vow.png' });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'The unreturned ride.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/intro-fallen-sky.png' });
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Keep the hearth alive.' })).toBeVisible();
  await expect(page.locator('#intro-caption')).toContainText('Eight of us remained');
  await page.screenshot({ path: 'test-results/intro-hearth.png' });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A road beneath the sky.' })).toBeVisible();
  await expect(page.locator('#intro-caption')).toContainText('Guard the wagons');
  await expect(page.locator('.intro-pages')).toHaveAttribute('aria-label', 'Chapter 5 of 5');
  await expect(page.getByRole('button', { name: /Raise the blue banner/ })).toBeFocused();
  await page.screenshot({ path: 'test-results/intro-caravan.png' });
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(0);
  await page.getByRole('button', { name: /Share the work/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  // The pause autosave (f780c79) takes primary focus; keyboard focus must stay visible.
  const continueExpedition = page.getByRole('button', { name: /CONTINUE EXPEDITION/ });
  await expect(continueExpedition).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(continueExpedition).toBeFocused();
  await expect(continueExpedition).toHaveCSS('outline-style', 'solid');
  await expect(continueExpedition).toHaveCSS('outline-width', '2px');
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toHaveCount(0);
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const chapter of [0, 1, 2, 3, 4]) {
  test(`skip chapter ${chapter + 1} into gameplay with camp scenes off`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
    for (let i = 0; i < chapter; i++) await page.keyboard.press('ArrowRight');
    if (chapter === 1) await closeOverlayOrPause(page);
    else if (chapter === 2) await page.keyboard.press('p');
    else await page.getByRole('button', { name: /Skip intro/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return {
          phase: scene.run.phase,
          paused: scene.physics.world.isPaused,
          dash: scene.dashTimer,
        };
      }),
    ).toEqual({ phase: 'playing', paused: false, dash: 0 });
    await closeOverlayOrPause(page);
    await page.getByRole('button', { name: 'Start a new run' }).click();
    await expect(page.getByRole('button', { name: 'Camp scenes: Off' })).toBeVisible();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  });
}

test('replaying the introduction completes or skips back to the frozen title at every chapter', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay introduction' }).click();
  for (let chapter = 1; chapter < 5; chapter++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  for (let chapter = 0; chapter < 5; chapter++) {
    await page.getByRole('button', { name: 'Replay introduction' }).click();
    for (let i = 0; i < chapter; i++) await page.keyboard.press('ArrowRight');
    await closeOverlayOrPause(page);
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
    expect(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return {
          phase: scene.run.phase,
          elapsed: scene.run.elapsed,
          paused: scene.physics.world.isPaused,
          records: scene.run.story.records,
        };
      }),
    ).toEqual({ phase: 'ready', elapsed: 0, paused: true, records: [] });
  }
});

test('held keyboard confirmation completes the prologue without galloping or opening a menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  for (let chapter = 1; chapter < 5; chapter++) await page.keyboard.press('ArrowRight');
  await page.keyboard.down('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.waitForTimeout(300);
  await page.keyboard.up('Enter');
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return { phase: scene.run.phase, dash: scene.dashTimer };
    }),
  ).toEqual({ phase: 'playing', dash: 0 });
});

test('controller starts, advances, skips, replays, and never leaks a held confirm into gameplay', async ({
  page,
}) => {
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
  const navigateTo = async (name: string | RegExp): Promise<void> => {
    const target = page.getByRole('button', { name });
    const buttons = await page.locator('.title-menu button').count();
    for (let step = 0; step < buttons; step++) {
      if (await target.evaluate((button) => button === document.activeElement)) break;
      await press(13);
    }
    await expect(target).toBeFocused();
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await press(0);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await press(0);
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
  await press(1);
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__gloam.scene.dashTimer)).toBe(0);
  await press(9);
  await page.getByRole('button', { name: 'Start a new run' }).click();
  // Pause autosaves (f780c79) make Continue expedition the title's primary focus.
  const continueExpedition = page.getByRole('button', { name: /CONTINUE EXPEDITION/ });
  await expect(continueExpedition).toBeFocused();
  await navigateTo('Replay introduction');
  await press(0);
  for (let chapter = 1; chapter < 5; chapter++) await press(0);
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = true;
  });
  await expect(continueExpedition).toBeFocused();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('ready');
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = false;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.controller.previousButtons & 1))
    .toBe(0);
  await navigateTo(/NEW GAME/);
  await press(0);
  for (let chapter = 1; chapter < 5; chapter++) await press(0);
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = true;
  });
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return { phase: scene.run.phase, dash: scene.dashTimer };
    }),
  ).toEqual({ phase: 'playing', dash: 0 });
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = false;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.controller.previousButtons & 1))
    .toBe(0);
  await press(0);
  await expect(page.locator('#dash-label')).toContainText('RECHARGING');
});

test('story works at Steam Deck size and disables painting motion on a live preference change', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay introduction' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page.locator('.intro-story')).toHaveAttribute('data-scene', 'steppe');
  await expect(page.locator('.intro-story')).toHaveAttribute('data-camera', 'pan-east');
  await expect
    .poll(() => page.locator('.intro-stage').evaluate((stage) => stage.getAnimations().length))
    .toBe(1);
  await expect
    .poll(() =>
      page
        .locator('.intro-stage')
        .evaluate((stage) => stage.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page
        .locator('.intro-story')
        .evaluate((story) => story.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  const expectedScenes = [
    ['steppe', 'pan-east'],
    ['iron-vow', 'rise-throne'],
    ['fallen-sky', 'surge-west'],
    ['hearth', 'pull-hearth'],
    ['caravan', 'pan-pass'],
  ] as const;
  for (let chapter = 1; chapter <= 5; chapter++) {
    const [sceneId, cameraId] = expectedScenes[chapter - 1]!;
    await expect(page.locator('.intro-story')).toHaveAttribute('data-scene', sceneId);
    await expect(page.locator('.intro-story')).toHaveAttribute('data-camera', cameraId);
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const selector of ['.intro-skip', '.intro-next', '.intro-caption', '.intro-pages']) {
        const box = (await page.locator(selector).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
    if (chapter < 5) await page.keyboard.press('ArrowRight');
  }
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
});


test('intro effects stay registered to each painting throughout camera motion and cropping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?terrain=2d');
  await page.getByRole('button', { name: 'Replay introduction' }).click();
  for (let chapter = 0; chapter < 5; chapter++) {
    await expect.poll(() => page.locator('.intro-painting').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1536);
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1920, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const positions = [];
      for (const time of [0, 12000, 24000]) {
        const geometry = await page.locator('.intro-stage').evaluate((stage, time) => {
          for (const animation of stage.getAnimations({ subtree: true })) {
            animation.pause();
            animation.currentTime = time;
          }
          const painting = stage.querySelector('.intro-painting')!;
          const image = painting.getBoundingClientRect();
          const atmosphere = stage.querySelector('.intro-atmosphere')!.getBoundingClientRect();
          const cloth = stage.querySelector<SVGSVGElement>('.intro-cloth-overlay');
          const point = cloth ? new DOMPoint(768, 512).matrixTransform(cloth.getScreenCTM()!) : null;
          const mote = stage.querySelector('.intro-mote')!.getBoundingClientRect();
          return {
            image: { x: image.x, y: image.y, width: image.width, height: image.height },
            atmosphere: { x: atmosphere.x, y: atmosphere.y, width: atmosphere.width, height: atmosphere.height },
            clothCenter: point ? { x: point.x, y: point.y } : null,
            moteX: (mote.x - image.x) / image.width,
            paintedSurfaces: [...stage.querySelectorAll('*')].filter((element) =>
              element instanceof HTMLImageElement || getComputedStyle(element).backgroundImage.includes('url('),
            ).length,
          };
        }, time);
        expect(geometry.paintedSurfaces).toBe(1);
        expect(geometry.image.width / geometry.image.height).toBeCloseTo(1.5, 5);
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          expect(geometry.atmosphere[key]).toBeCloseTo(geometry.image[key], 3);
        }
        if (geometry.clothCenter) {
          expect(geometry.clothCenter.x).toBeCloseTo(geometry.image.x + geometry.image.width / 2, 3);
          expect(geometry.clothCenter.y).toBeCloseTo(geometry.image.y + geometry.image.height / 2, 3);
        }
        positions.push(geometry);
      }
      expect(positions[0]!.image).not.toEqual(positions[2]!.image);
      expect(Math.abs(positions[0]!.moteX - positions[2]!.moteX)).toBeGreaterThan(0.001);
    }
    await page.screenshot({ path: `test-results/intro-registered-${chapter}.png` });
    if (chapter < 4) await page.keyboard.press('ArrowRight');
  }
});
