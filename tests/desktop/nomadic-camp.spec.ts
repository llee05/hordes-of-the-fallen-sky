import { launchElectron, electronEnvironment } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test.use({ trace: 'off' });
test('painted camp persists through the native profile and app restart at both desktop sizes', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-nomadic-camp-'));
  const environment: Record<string, string> = { ...electronEnvironment() };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    launchElectron({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env: environment,
    });
  let app = await launch();
  const sizeWindow = async (width: number, height: number) => {
    await app.evaluate(
      ({ BrowserWindow }, size) => {
        const w = BrowserWindow.getAllWindows()[0]!;
        w.setResizable(false);
        w.setContentSize(size.width, size.height);
      },
      { width, height },
    );
    await expect
      .poll(() =>
        app
          .firstWindow()
          .then((p) => p.evaluate(() => ({ width: innerWidth, height: innerHeight }))),
      )
      .toEqual({ width, height });
  };
  try {
    let page = await app.firstWindow();
    await sizeWindow(1280, 800);
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.keyboard.press('b');
    await expect(page.locator('.camp-popup')).toHaveCount(0);
    await page.locator('[data-camp-slot="1"]').click();
    await page.locator('[data-camp-site="archery"]').click();
    await page.locator('.tree-purchase').click();
    await expect
      .poll(async () => {
        try {
          return JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8')).camp
            ?.buildings;
        } catch {
          return [];
        }
      })
      .toContain('archery');
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await sizeWindow(1280, 800);
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: 'Continue clan camp', exact: true }).click();
    await page.keyboard.press('b');
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await sizeWindow(size.width, size.height);
      await expect(page.locator('[data-camp-site="archery"]')).toHaveAttribute('data-level', '1');
      await page.locator('[data-camp-site="archery"]').click();
      await expect(page.locator('.camp-popup')).toContainText('Building level 1 / 4');
      await expect(page.locator('.tree-purchase')).toBeDisabled();
      const bounds = (await page.locator('.camp-popup').boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
      await page.screenshot({ path: `test-results/native-nomadic-camp-${size.width}.png` });
      await page.locator('[data-camp-dismiss]').click();
    }
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
