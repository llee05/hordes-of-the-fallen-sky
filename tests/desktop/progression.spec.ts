import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { buyNode, inspectNode } from '../e2e/helpers';

test.use({ trace: 'off' });

test('connected progression maps, camp comparisons, and recipe links fit native desktop windows', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-progression-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const environment = { ...process.env, GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]! };
  delete environment.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      scene.spawnTimer = scene.attackTimer = 999;
      scene.developerTools.invincible = scene.developerTools.clanInvincible = true;
      scene.run.pendingUpgrades = 12;
      Object.assign(scene.run.clan, { materials: 1000, spirit: 100 });
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
      await page.keyboard.press('t');
      await inspectNode(page, 'power');
      const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
      await inspectNode(page, 'sky-volley');
      expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
        before,
      );
      await expect(page.locator('.node-route')).toContainText('5 knowledge points');
      const purchase = (await page.locator('.tree-purchase').boundingBox())!;
      expect(purchase.y + purchase.height).toBeLessThan(size.height);
      expect(purchase.x + purchase.width).toBeLessThan(size.width);
      await page.screenshot({ path: `test-results/native-patron-map-${size.width}.png` });
      await page.getByRole('button', { name: 'Combinations', exact: true }).click();
      await page
        .locator('[data-synergy="burning-tempest"] [data-target-node="archery-fire-arrows"]')
        .click();
      await expect(page.locator('.choice-comparison')).toContainText('Veteran riders');
      await expect(page.locator('.camp-estate')).toHaveAttribute('data-expanded', 'true');
      const campPurchase = (await page.locator('.tree-purchase').boundingBox())!;
      expect(campPurchase.y + campPurchase.height).toBeLessThan(size.height);
      expect(campPurchase.x + campPurchase.width).toBeLessThan(size.width);
      expect(
        await page.locator('.camp-estate').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.screenshot({ path: `test-results/native-camp-map-${size.width}.png` });
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-synergy]')).toHaveCount(5);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    await page.keyboard.press('b');
    await buyNode(page, 'archery-base');
    await buyNode(page, 'archery-fire-arrows');
    await expect(page.locator('[data-camp-craft="fire-arrows"]')).toHaveCount(1);
    await expect(page.locator('[data-node="archery-arban-drills"]')).toHaveAttribute(
      'data-status',
      'excluded',
    );
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
