import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('desktop migration offers named destinations and frozen, responsive travel forecasts', async () => {
  test.setTimeout(110000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-destinations-'));
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.GLOAM_DEV_SERVER_URL;
  const app = await electron.launch({
    ...(process.env.GLOAM_TEST_EXECUTABLE
      ? {
          executablePath: process.env.GLOAM_TEST_EXECUTABLE,
          args: [`--user-data-dir=${directory}`],
        }
      : { args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`] }),
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.keyboard.press('b');
    await page.locator('[data-camp-site="archery"]').click();
    await page.locator('[data-node="archery-base"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#migrate')).toBeEnabled({ timeout: 75000 });
    await page.keyboard.press('m');
    await expect(page.locator('[data-destination]')).toHaveCount(9);
    const frozen = await page.locator('#timer').textContent();
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0]!.setContentSize(size.width, size.height),
        size,
      );
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(size.width);
      await page.locator('[data-destination="belukha"]').click();
      await expect(page.locator('#destination-detail')).toContainText('Mount Belukha (Üch-Sümer)');
      await expect(page.locator('#destination-detail')).toContainText('Approach time +20%');
      expect(
        await page
          .locator('.route-dialog')
          .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
      ).toBe(true);
      await page.locator('#destination-detail').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/native-destinations-${size.width}.png` });
    }
    await expect(page.locator('#timer')).toHaveText(frozen!);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('desktop loads offline, isolates Node, saves settings, toggles fullscreen, and quits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-desktop-'));
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    electron.launch({
      ...(process.env.GLOAM_TEST_EXECUTABLE
        ? {
            executablePath: process.env.GLOAM_TEST_EXECUTABLE,
            args: [`--user-data-dir=${directory}`],
          }
        : { args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`] }),
      env: environment,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.getByRole('heading', { name: 'Hordes of the Fallen Sky' })).toBeVisible();
    await expect(page.locator('.intro-story')).toHaveCount(0);
    await page.getByRole('button', { name: 'Replay introduction' }).click();
    await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
    await expect
      .poll(() =>
        page.locator('.intro-painting').evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(1536);
    await page.screenshot({ path: 'test-results/native-intro.png' });
    // Check every story painting through file://, including the two lore additions.
    for (const heading of [
      'A vow that broke the world.',
      'The unreturned ride.',
      'Keep the hearth alive.',
      'A road beneath the sky.',
    ]) {
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect
        .poll(() =>
          page.locator('.intro-painting').evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBe(1536);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hordes of the Fallen Sky' })).toBeVisible();
    await expect(page).toHaveTitle('Hordes of the Fallen Sky · A people, not a place.');
    expect(await app.evaluate(({ app: desktopApp }) => desktopApp.getName())).toBe(
      'Hordes of the Fallen Sky',
    );
    expect(page.url()).toMatch(/^file:/);
    expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined');
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
    expect(await page.evaluate(() => Boolean((window as any).desktop))).toBe(true);
    expect(
      await app.evaluate(({ BrowserWindow }) => {
        const preferences = BrowserWindow.getAllWindows()[0]!.webContents.getLastWebPreferences();
        return {
          sandbox: preferences.sandbox,
          contextIsolation: preferences.contextIsolation,
          nodeIntegration: preferences.nodeIntegration,
        };
      }),
    ).toEqual({ sandbox: true, contextIsolation: true, nodeIntegration: false });
    await page.screenshot({ path: 'test-results/native-desktop.png' });
    const arena = (await page.locator('#arena-wrap').boundingBox())!;
    const canvas = (await page.locator('canvas').boundingBox())!;
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    expect(arena.x).toBe(0);
    expect(arena.y).toBe(0);
    expect(Math.abs(arena.width - viewport.width)).toBeLessThan(2);
    expect(Math.abs(arena.height - viewport.height)).toBeLessThan(2);
    expect(Math.abs(arena.width - canvas.width)).toBeLessThan(2);
    expect(Math.abs(arena.height - canvas.height)).toBeLessThan(2);
    await expect(page.getByRole('button', { name: 'Quit game', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
    await page.screenshot({ path: 'test-results/native-story.png' });
    await page.getByRole('button', { name: /Share the work/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#khan-title')).toHaveText('THE KHAN');
    await expect(page.locator('#food-rate')).toContainText('Food net +0.');
    await expect(page.locator('#food-outlook')).toContainText('Stores empty in ~');
    // Exercise the production Web Audio path without a development scene hook.
    await page.evaluate(() => {
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          (window as any).nativeSoundContext = this;
        }
        createBufferSource(): AudioBufferSourceNode {
          const source = super.createBufferSource();
          const start = source.start.bind(source);
          source.start = (when = 0) => {
            (window as any).nativeSoundsPlayed = ((window as any).nativeSoundsPlayed ?? 0) + 1;
            start(when);
          };
          return source;
        }
      };
    });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Unmute sound', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).nativeSoundContext?.state))
      .toBe('running');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect(page.locator('#zoom-level')).toHaveText('90%');
    await page.getByRole('button', { name: 'Reset battlefield zoom to 100%' }).click();
    await expect(page.locator('#zoom-level')).toHaveText('100%');
    await expect(page.locator('#field-guide')).toContainText('Ride out, keep watch');
    await page.getByRole('button', { name: 'Hide guidance', exact: true }).click();
    await expect(page.locator('#field-guide')).toBeHidden();
    await page.keyboard.press('t');
    await expect(page.getByRole('heading', { name: 'Patron tech tree' })).toBeVisible();
    await expect(page.locator('[data-tree-branch]')).toHaveCount(8);
    await expect(page.locator('#game-hud')).toHaveAttribute('inert', '');
    await page.screenshot({ path: 'test-results/native-tech-tree.png' });
    await page.keyboard.press('Escape');
    await page.keyboard.press('b');
    await expect(page.getByRole('heading', { name: 'Build a people.' })).toBeVisible();
    await expect(page.locator('[data-camp-site]')).toHaveCount(8);
    await page.locator('[data-camp-site="herd"]').click();
    await expect(page.getByRole('region', { name: 'Camp economy' })).toContainText('Food net');
    await expect(page.locator('[data-node="herd-base"] .tree-node-forecast')).toContainText(
      'Food net',
    );
    await page.screenshot({ path: 'test-results/native-economy-camp.png' });
    await page.locator('[data-camp-site="archery"]').click();
    await page.locator('[data-node="archery-base"]').click();
    await page.locator('[data-camp-site="felt"]').click();
    await page.locator('[data-node="felt-base"]').click();
    await expect(page.locator('[data-node="felt-base"]')).toHaveAttribute('data-status', 'learned');
    await page.screenshot({ path: 'test-results/native-camp-tree.png' });
    await expect(page.locator('#riders')).toHaveText('4');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0]!.setContentSize(size.width, size.height),
        size,
      );
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(size.width);
      const resources = (await page.locator('.resource-hud').boundingBox())!;
      const bearing = (await page.locator('#clan-bearing').boundingBox())!;
      expect(resources.y + resources.height).toBeLessThanOrEqual(bearing.y);
      await expect(page.locator('.economy-hud')).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/native-economy-hud.png' });
    await app.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0]!.setContentSize(size.width, size.height),
      viewport,
    );
    await page.screenshot({ path: 'test-results/native-playing.png' });
    await page.keyboard.down('d');
    await page.waitForTimeout(250);
    await page.keyboard.up('d');
    await page.keyboard.press('Space');
    await expect(page.locator('#dash-label')).toContainText('RECHARGING');
    await expect
      .poll(() => page.evaluate(() => (window as any).nativeSoundsPlayed ?? 0))
      .toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    // CDP keyboard events do not reach Electron's native before-input-event hook.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen()),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.isFullScreen()),
      )
      .toBe(false);
    // Seed the native bridge fixture after renderer-owned setting writes.
    await page.evaluate(async () => {
      const desktop = (window as any).desktop;
      const profile = await desktop.loadProfile();
      await desktop.saveProfile({ ...profile, bestSeconds: 88 });
    });
    await app.close();
    expect(JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8'))).toEqual({
      version: 1,
      bestSeconds: 88,
      muted: true,
    });
    app = await launch();
    page = await app.firstWindow();
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await expect(page.locator('.intro-story')).toHaveCount(0);
    await expect(page.locator('#best')).toHaveText('01:28');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const closed = app.waitForEvent('close');
    await page.locator('#overlay').getByRole('button', { name: 'Quit game', exact: true }).click();
    await closed;
    expect(errors).toEqual([]);
  } finally {
    await app.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
