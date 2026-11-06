import { expect, test } from '@playwright/test';
import {
  closeOverlayOrPause,
  expectFrozen,
  openTitle,
  startExpedition,
  tapController,
  selectCampBuilding,
  buyNode,
} from './helpers';

// Each test owns its browser context and game; CI shards may schedule them independently.
test.describe.configure({ mode: 'parallel' });

test(
  'controller starts a run, moves, dashes, pauses, and navigates menus',
  { tag: '@core' },
  async ({ page }) => {
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
    await expect(page.getByRole('dialog')).toBeHidden();
    const initialX = await page.evaluate(() => (window as any).__gloam.scene.player.x);
    await page.evaluate(() => {
      (window as any).testController.axes[0] = 1;
    });
    try {
      await expect
        .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x))
        .toBeGreaterThan(initialX + 25);
    } finally {
      await page.evaluate(() => {
        (window as any).testController.axes[0] = 0;
      });
    }
    await press(0);
    await expect(page.locator('#dash-label')).toContainText('RECHARGING');
    await press(8);
    await expect(page.getByRole('heading', { name: 'A people on the move.' })).toBeVisible();
    await press(1);
    await expect(page.getByRole('dialog')).toBeHidden();
    await press(9);
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    await press(13);
    await expect(page.getByRole('button', { name: 'Start a new run', exact: true })).toBeFocused();
    await press(0);
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  },
);

test(
  'starts, moves, dashes, pauses, resumes, and resets a run',
  { tag: '@core' },
  async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openTitle(page);
    await expect(page.getByRole('heading', { name: 'Hordes of the Fallen Sky' })).toBeVisible();
    await expect(page).toHaveTitle('Hordes of the Fallen Sky · A people, not a place.');
    await page.screenshot({ path: 'test-results/desktop-ready.png', fullPage: true });
    await page.getByRole('button', { name: /NEW GAME/ }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toBeHidden();
    const before = await page.evaluate(() => (window as any).__gloam.scene.player.x);
    await page.keyboard.down('d');
    try {
      // Software-rendered CI needs more wall time to advance the same gameplay distance.
      await expect
        .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x), { timeout: 15000 })
        .toBeGreaterThan(before + 30);
    } finally {
      await page.keyboard.up('d');
    }
    await page.keyboard.press('Space');
    await expect(page.locator('#dash-label')).toContainText('RECHARGING');
    await closeOverlayOrPause(page);
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    await expectFrozen(
      page,
      () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed),
      25,
    );
    await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await closeOverlayOrPause(page);
    await page.getByRole('button', { name: 'Start a new run' }).click();
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await expect(page.locator('#timer')).toHaveText('00:00');
    await expect(page.locator('#level')).toHaveText('01');
    expect(errors).toEqual([]);
  },
);

test(
  'clan defeat, victory, best time, and replay complete the run lifecycle',
  { tag: '@core' },
  async ({ page }) => {
    await openTitle(page);
    await startExpedition(page);
    await page.keyboard.press('b');
    await selectCampBuilding(page, 'archery');
    await buyNode(page, 'archery-base');
    await closeOverlayOrPause(page);
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      scene.run.elapsed = 42;
      scene.run.clan.integrity = 0;
    });
    await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
    await expect(page.locator('.end-menu .panel-intro')).toHaveText(
      'Clan lost · The Golden Pasture · Encampment',
    );
    await expect(page.locator('.end-stats')).toContainText('SURVIVORS');
    await expect(page.locator('.end-stats')).toContainText('SKYBREAKER');
    await expect(page.locator('#best')).toHaveText('00:42');
    await page.getByRole('button', { name: 'Clan chronicle', exact: true }).click();
    await page.getByRole('tab', { name: 'Your clan' }).click();
    await expect(page.locator('.clan-memories')).toContainText('Archery Range');
    await page.keyboard.press('b');
    await page.keyboard.press('m');
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'journal');
    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'dead');
    await page.getByRole('button', { name: 'Clan chronicle', exact: true }).click();
    await page.keyboard.press('j');
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'dead');
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
    await expect(page.locator('.end-menu .panel-intro')).toHaveText(
      'Refuge reached · The Heart of the Steppe · Final stand',
    );
    await expect(page.locator('#best')).toHaveText('15:00');
    await page.getByRole('button', { name: 'Clan chronicle', exact: true }).click();
    await page.getByRole('tab', { name: 'Your clan' }).click();
    await expect(page.locator('.khan-records')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'won');
    await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await expect(page.locator('#best')).toHaveText('15:00');
  },
);
