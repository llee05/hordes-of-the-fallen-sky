import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

test.use({ trace: 'off' });

test('orthographic terrain and console run in the existing Electron shell at both desktop sizes', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-world3d-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const environment = {
    ...process.env,
    GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]!,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
      s.developerTools.invincible = s.developerTools.clanInvincible = true;
    });
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
      await page.keyboard.press('Backquote');
      const input = page.getByRole('textbox', { name: 'Command', exact: true });
      await expect(input).toBeFocused();
      await input.fill('camera-angle 48');
      await input.press('Enter');
      await page.keyboard.press('Backquote');
      await page.evaluate(() => {
        const s = (window as any).__gloam.scene;
        s.player.body.reset(2600, 2700);
        s.cameras.main.stopFollow().setZoom(0.8).centerOn(2600, 2600);
      });
      await expect
        .poll(
          () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.pendingChunks),
          { timeout: 30000 },
        )
        .toBe(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.querySelector('canvas[data-world-renderer="3d"]')!.clientWidth,
          ),
        )
        .toBe(size.width);
      await page.keyboard.press('F9');
      await expect(page.locator('[data-world-debug]')).toBeVisible();
      const label = await page.locator('[data-world-debug]').boundingBox();
      expect(label!.x).toBeGreaterThanOrEqual(0);
      expect(label!.x + label!.width).toBeLessThanOrEqual(size.width);
      await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.setDebug('off'));
      await page.screenshot({ path: `test-results/world3d/native-${size.width}.png` });
    }
    expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined');
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
