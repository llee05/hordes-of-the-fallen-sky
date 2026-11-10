import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions, ScenarioOptions } from '../../src/game/dev/gameControls';
import { openTitle } from './helpers';

// Fixed reference scenes compared with committed baselines. Run with
// `npm run test:reference`; the default e2e run ignores this file. See
// docs/developer-mode.md#reference-scenes for updating baselines.

test.setTimeout(90_000);

/** The camp sits at the world centre; this view shows it with the Khan just south. */
const NEAR_CAMP: CameraOptions = { x: 2600, y: 2650, zoom: 1 };

/** The eight real places, in `LOCATIONS` order. */
const PLACES = [
  'otgontenger',
  'bogd-khan-uul',
  'altai-tavan-bogd',
  'khan-tengri',
  'belukha',
  'altan-ovoo',
  'eej-khairkhan',
  'orkhon-valley',
] as const;

test.beforeEach(async ({ page }) => {
  // Seed the page's generator before any game code runs, so the title, character
  // creation and camp screens draw the same choices every time.
  await page.addInitScript(() => {
    let state = 0x5eed;
    Math.random = () => {
      let t = (state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // A focus change on the shared desktop must not open the pause menu mid-capture.
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await openTitle(page);
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => window.__gloam.hooks.captureScene({ timeout: 60_000 }));
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
}

async function battlefield(page: Page, scenario: ScenarioOptions, camera: CameraOptions) {
  await page.evaluate(
    async ({ scenario, camera }) => {
      await window.__gloam.hooks.loadScenario(scenario);
      window.__gloam.hooks.setCamera(camera);
    },
    { scenario, camera },
  );
  await settle(page);
}

for (const place of PLACES)
  test(`${place} near camp`, async ({ page }) => {
    await battlefield(page, { place }, NEAR_CAMP);
    expect(await page.evaluate(() => window.__gloam.hooks.getState().place.id)).toBe(place);
    await expect(page).toHaveScreenshot(`place-${place}.png`);
  });

test('Orkhon Valley plateau edge with a ramp', async ({ page }) => {
  // The falls-plateau north ramp nearest camp: camp-relative (250, -1275) in
  // data/orkhonValley.ts, plus the 2600 world centre. Orkhon terrain is still being
  // reworked, so this baseline is expected to change with it.
  await battlefield(page, { place: 'orkhon-valley' }, { x: 2850, y: 1325, zoom: 1 });
  await expect(page).toHaveScreenshot('orkhon-plateau-ramp.png');
});

test('seeded 200-enemy fight', async ({ page }) => {
  await battlefield(
    page,
    {
      place: 'otgontenger',
      seed: 7,
      elapsed: 900,
      enemies: 200,
      minRadius: 160,
      maxRadius: 760,
      settle: 0.5,
    },
    { x: 2600, y: 2700, zoom: 1 },
  );
  const state = await page.evaluate(() => window.__gloam.hooks.getState());
  expect(state.enemies.total).toBe(200);
  expect(state.frozen).toBe(true);
  await expect(page).toHaveScreenshot('fight-200.png');
});

test('title screen', async ({ page }) => {
  await page.evaluate(() => window.__gloam.hooks.freezeVisuals(true));
  await settle(page);
  await expect(page).toHaveScreenshot('screen-title.png');
});

test('character creation', async ({ page }) => {
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('button', { name: /Begin Journey/ })).toBeVisible();
  await page.evaluate(() => window.__gloam.hooks.freezeVisuals(true));
  await settle(page);
  await expect(page).toHaveScreenshot('screen-character.png');
});

test('saved expeditions', async ({ page }) => {
  await page.evaluate(() => window.__gloam.scene.openSaves());
  await expect(page.locator('.save-menu')).toBeVisible();
  await expect(page.locator('[data-save-slot]').first()).toBeVisible();
  await page.evaluate(() => window.__gloam.hooks.freezeVisuals(true));
  await settle(page);
  await expect(page).toHaveScreenshot('screen-saves.png');
});

test('camp and upgrades', async ({ page }) => {
  await battlefield(page, { place: 'otgontenger' }, NEAR_CAMP);
  await page.evaluate(() => window.__gloam.scene.openBuildings());
  await expect(page.locator('.nomadic-camp')).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot('screen-camp.png');
});
