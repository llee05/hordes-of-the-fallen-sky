import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { launchElectron, electronEnvironment } from '../support/electron';

test('research rally and banner controls remain usable in native desktop windows', async ({}, testInfo) => {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-research-runtime-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const environment = {
    ...electronEnvironment(),
    GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]!,
  };
  delete (environment as Record<string, string>).ELECTRON_RUN_AS_NODE;
  const app = await launchElectron({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.spawnTimer = s.attackTimer = 999;
      s.run.upgrades['su-great-kurultai'] = 1;
      s.run.upgrades['su-banner-formation'] = 1;
      s.run.clan.integrity = 50;
      s.callbacks.onHud(s.snapshot());
    });
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await app.evaluate(({ BrowserWindow }, size) => {
        const w = BrowserWindow.getAllWindows()[0]!;
        w.setResizable(false);
        w.setContentSize(size.width, size.height);
      }, size);
      await expect
        .poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
        .toEqual(size);
      await expect(page.locator('#rally-host')).toBeInViewport();
      await expect(page.locator('#formation')).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`native-research-${size.width}.png`) });
    }
    await page.keyboard.press('r');
    await expect(page.locator('#rally-host')).toBeDisabled();
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.run.clan.integrity),
    ).toBeGreaterThanOrEqual(60);
    await page.keyboard.press('f');
    await expect(page.locator('#formation-name')).toHaveText('Banner: Wedge');
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
