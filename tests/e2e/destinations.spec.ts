import { expect, test } from '@playwright/test';
import { openTitle, startExpedition, tapController } from './helpers';

test.describe.configure({ mode: 'parallel' });

const places = [
  ['otgontenger', 'Mount Otgontenger', 'OTGONTENGER'],
  ['bogd-khan-uul', 'Bogd Khan Uul', 'BOGD KHAN UUL'],
  ['altai-tavan-bogd', 'Altai Tavan Bogd', 'ALTAI TAVAN BOGD'],
  ['khan-tengri', 'Khan Tengri Peak', 'KHAN TENGRI'],
  ['belukha', 'Mount Belukha (Üch-Sümer)', 'BELUKHA · ÜCH-SÜMER'],
  ['altan-ovoo', 'Altan Ovoo', 'ALTAN OVOO'],
  ['eej-khairkhan', 'Eej Khairkhan', 'EEJ KHAIRKHAN'],
  ['orkhon-valley', 'Orkhon Valley', 'ORKHON VALLEY'],
] as const;

test('arrives at Altai Tavan Bogd and records its real destination', async ({ page }) => {
  test.setTimeout(process.env.CI ? 90000 : 60000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = 45;
    scene.run.xp = 2;
    (window as any).departureGround = scene.landscape.world3d;
    scene.openRoutes();
  });
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.locator('[data-destination="altai-tavan-bogd"]').click();
  await expect(
    page.getByRole('region', { name: 'Selected destination', exact: true }),
  ).toContainText('Altai Tavan Bogd');
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.locator('[data-route="river"]').click();
  await expect(page.locator('#objective')).toContainText('Altai Tavan Bogd');
  // The departure camp keeps its terrain until crossing completion.
  expect(
    await page.evaluate(
      () => (window as any).__gloam.scene.landscape.world3d.terrain.region.scene.id,
    ),
  ).toBe('golden-pasture');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.legacy.crossings)).toEqual([]);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 200;
  });
  await expect(page.locator('#location')).toHaveText('ALTAI TAVAN BOGD');
  // Remove only the arrival overlay so the terrain reference shows the actual painted scene.
  await page.evaluate(() => (window as any).__gloam.scene.cameras.main.flashEffect.reset());
  await page.screenshot({ path: 'test-results/altai-tavan-bogd-arrival.png' });
  expect(
    await page.evaluate(
      () => (window as any).__gloam.scene.landscape.world3d.terrain.region.scene.id,
    ),
  ).toBe('altai-tavan-bogd');
  expect(
    await page.evaluate(() => {
      const previous = (window as any).departureGround;
      return {
        chunks: previous.chunks.size,
        connected: previous.renderer.domElement.isConnected,
      };
    }),
  ).toEqual({ chunks: 0, connected: false });
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.legacy.crossings[0].locationId),
  ).toBe('altai-tavan-bogd');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.xp)).toBe(2);
  await page.keyboard.press('j');
  await expect(page.locator('.journal-chapter')).toContainText('Altai Tavan Bogd');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = 45;
    scene.openRoutes();
  });
  await expect(page.locator('[data-destination="altai-tavan-bogd"]')).toHaveCount(0);
});

test('destination inspection preserves focus and paused state across responsive layouts', async ({
  page,
}) => {
  test.setTimeout(120000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 45;
  });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await test.step(`${viewport.width}×${viewport.height}`, async () => {
      // Reopen at each width so Escape dismissal is checked for every layout.
      await page.evaluate(() => (window as any).__gloam.scene.openRoutes());
      await expect(page.getByRole('dialog')).toBeVisible();
      const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
      await page.setViewportSize(viewport);
      for (const [id, name] of places) {
        const button = page.locator(`[data-destination="${id}"]`);
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(button).toBeFocused();
        await expect(page.locator('#destination-detail')).toContainText(name);
      }
      expect(
        await page
          .locator('.route-dialog')
          .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
      ).toBe(true);
      expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
        before,
      );
      await page.screenshot({ path: `test-results/destinations-${viewport.width}.png` });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    });
  }
});

test('keyboard and controller select a destination before confirming the journey', async ({
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
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 45;
  });
  await tapController(page, 3);
  await expect(page.locator('[data-destination="silent-river"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-destination="otgontenger"]')).toBeFocused();
  await tapController(page, 0);
  await expect(page.locator('[data-destination="otgontenger"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('[data-route="ridge"]').focus();
  await tapController(page, 0);
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.destinationId)).toBe(
    'otgontenger',
  );
});

test(
  'two named camps still lead to the fictional final refuge and clan-survival victory',
  { tag: '@core' },
  async ({ page }) => {
    test.setTimeout(process.env.CI ? 90000 : 60000);
    await openTitle(page);
    await startExpedition(page);
    for (const destination of ['orkhon-valley', 'altai-tavan-bogd', 'heart-of-the-steppe']) {
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        scene.run.clan.food = 500;
        scene.run.clan.stageTime = 45;
        scene.openRoutes();
      });
      if (destination === 'heart-of-the-steppe')
        await expect(page.locator('[data-destination]')).toHaveCount(1);
      await page.locator(`[data-destination="${destination}"]`).click();
      await page.locator('[data-route="river"]').click();
      await page.evaluate(() => {
        (window as any).__gloam.scene.run.clan.stageTime = 200;
      });
      await expect
        .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.locationId))
        .toBe(destination);
    }
    await expect(page.locator('#location')).toHaveText('SACRED MOUNTAIN');
    await expect(page.locator('#stage-label')).toHaveText('THE LAST STAND');
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 20;
    });
    await expect(page.locator('#boss-bar')).toBeVisible();
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 180;
    });
    await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.run.clan.finalBossDefeated),
    ).toBe(false);
  },
);
