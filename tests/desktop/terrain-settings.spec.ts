import { expect, test } from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launchElectron, electronEnvironment } from '../support/electron';

test('legacy flat preferences load angled terrain and settings persist in the native profile', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-terrain-settings-'));
  const env: Record<string, string> = { ...electronEnvironment() };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    launchElectron({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env,
    });
  await mkdir(join(directory, 'saves'), { recursive: true });
  await writeFile(
    join(directory, 'saves/profile.json'),
    JSON.stringify({
      version: 1,
      bestSeconds: 55,
      muted: true,
      visualSettings: {
        terrainRenderer: '2d',
        projectileContrast: 'high',
        effectDensity: 'reduced',
      },
    }),
  );
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
    await expect(page.getByRole('button', { name: 'Terrain', exact: true })).toHaveCount(0);
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
    const contrast = page.getByRole('button', { name: 'Projectile contrast', exact: true });
    await expect(contrast).toHaveText('High');
    await contrast.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect
      .poll(
        async () =>
          JSON.parse(
            await readFile(join(directory, 'saves/profile.json'), 'utf8').catch(() => '{}'),
          ).visualSettings?.projectileContrast,
      )
      .toBe('standard');
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Projectile contrast', exact: true })).toHaveText(
      'Standard',
    );
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  } finally {
    await app.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
