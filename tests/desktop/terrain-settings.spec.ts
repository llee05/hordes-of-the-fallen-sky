import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launchElectron } from '../support/electron';

test('terrain settings fit the desktop window and persist in the native profile', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-terrain-settings-'));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    launchElectron({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(960, 600),
    );
    // A tiling compositor may ignore native window sizing; keep the renderer check exact.
    await page.setViewportSize({ width: 960, height: 600 });
    expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([960, 600]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
    await expect(terrain).toBeVisible();
    if ((await terrain.textContent()) === 'Flat 2D') await terrain.click();
    await expect(terrain).toHaveText('Angled 3D');
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
    await terrain.click();
    await expect(terrain).toHaveText('Flat 2D');
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect
      .poll(
        async () =>
          JSON.parse(
            await readFile(join(directory, 'saves/profile.json'), 'utf8').catch(() => '{}'),
          ).visualSettings?.terrainRenderer,
      )
      .toBe('2d');
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Terrain', exact: true })).toHaveText('Flat 2D');
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  } finally {
    await app.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
