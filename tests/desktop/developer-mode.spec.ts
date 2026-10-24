import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

test('desktop developer selector fits native windows and launches clean test expeditions', async () => {
  test.skip(!!process.env.GLOAM_TEST_EXECUTABLE, 'Packaged builds do not expose developer mode.');
  const directory = await mkdtemp(join(tmpdir(), 'gloam-developer-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  let application: ElectronApplication | undefined;
  try {
    await server.listen();
    const environment = { ...process.env, GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]! };
    delete environment.ELECTRON_RUN_AS_NODE;
    const app = await electron.launch({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env: environment,
    });
    application = app;
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
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
      expect(
        await page
          .locator('.developer-panel')
          .evaluate(
            (panel) =>
              panel.scrollWidth <= panel.clientWidth &&
              panel.getBoundingClientRect().bottom <= innerHeight,
          ),
      ).toBe(true);
      await page
        .locator('[data-developer-level="destination:3:orkhon-valley"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/native-developer-${size.width}.png` });
      await expect(page.getByRole('button', { name: 'Back ESC / F8' })).toBeVisible();
    }
    await page.locator('[data-developer-level="destination:3:orkhon-valley"]').click();
    await expect(page.locator('#location')).toHaveText('ORKHON VALLEY');
    await expect(page.locator('#developer-run')).toBeVisible();
    await page.keyboard.press('F10');
    const input = page.getByRole('textbox', { name: 'Command', exact: true });
    await expect(input).toBeFocused();
    await page.keyboard.type('god on');
    await expect(input).toHaveValue('god on');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Khan invincibility: On' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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
      await input.scrollIntoViewIfNeeded();
      const bounds = (await input.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width);
      const footer = (await page.locator('.panel-footer').boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThan(footer.y);
      await page.screenshot({ path: `test-results/native-developer-console-${size.width}.png` });
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#developer-run')).toContainText('INVINCIBLE');
    expect(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        scene.invulnerable = 0;
        const before = scene.run.health;
        scene.takeDamage(100000);
        return scene.run.health === before;
      }),
    ).toBe(true);
    await page.keyboard.press('F8');
    const frozen = await page.locator('#timer').textContent();
    await page.waitForTimeout(200);
    await expect(page.locator('#timer')).toHaveText(frozen!);
    await page.locator('[data-developer-level="chapter:heart-of-the-steppe"]').click();
    await expect(page.locator('#stage-label')).toHaveText('THE LAST STAND');
    await page.evaluate(() => {
      (window as any).__gloam.scene.run.clan.stageTime = 180;
    });
    await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
    await expect(page.locator('#best')).toHaveText('— — : — —');
    expect(errors).toEqual([]);
  } finally {
    await application?.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
