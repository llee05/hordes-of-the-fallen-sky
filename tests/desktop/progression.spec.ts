import { launchElectron, electronEnvironment } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { buyNode, inspectNode, closeOverlayOrPause } from '../e2e/helpers';

test.use({ trace: 'off' });

test('connected progression maps, camp comparisons, and recipe links fit native desktop windows', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-progression-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const environment: Record<string, string> = {
    ...electronEnvironment(),
    GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]!,
  };
  delete environment.ELECTRON_RUN_AS_NODE;
  const app = await launchElectron({
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
      await app.evaluate(({ BrowserWindow }, size) => {
        const window = BrowserWindow.getAllWindows()[0]!;
        // Fixed-size test windows avoid tiling window managers overriding content bounds.
        window.setResizable(false);
        window.setContentSize(size.width, size.height);
      }, size);
      await expect
        .poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
        .toEqual(size);
      await page.keyboard.press('t');
      await expect(page.locator('[data-tree-branch-select]')).toHaveCount(10);
      await inspectNode(page, 'gen-mapmaker');
      await expect(page.locator('.node-purchase-status')).toContainText('discovery pool');
      await expect(page.locator('.tree-purchase')).toBeDisabled();
      const compact = page.getByRole('button', { name: 'Compact list', exact: true });
      if ((await compact.getAttribute('aria-pressed')) === 'false') await compact.click();
      await expect(page.locator('.tree-graph')).toHaveAttribute('data-compact', 'true');
      await inspectNode(page, 'power');
      const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
      await inspectNode(page, 'sky-volley');
      expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
        before,
      );
      await expect(page.locator('.node-route')).toContainText('5 knowledge points');
      const title = (await page.locator('.node-inspector h3').boundingBox())!;
      const purchase = (await page.locator('.tree-purchase').boundingBox())!;
      expect(title.y).toBeGreaterThan(0);
      expect(title.y + title.height).toBeLessThan(purchase.y);
      expect(purchase.y + purchase.height).toBeLessThan(size.height);
      expect(purchase.x + purchase.width).toBeLessThan(size.width);
      await page.screenshot({ path: `test-results/native-patron-map-${size.width}.png` });
      await page.getByRole('button', { name: 'Combinations', exact: true }).click();
      await page
        .locator('[data-synergy="burning-tempest"] [data-target-node="archery-fire-arrows"]')
        .click();
      await expect(page.locator('.camp-popup-foldout')).toContainText('Veteran riders');
      await expect(page.locator('.camp-popup')).toBeVisible();
      const campPurchase = (await page.locator('.tree-purchase').boundingBox())!;
      expect(campPurchase.y + campPurchase.height).toBeLessThan(size.height);
      expect(campPurchase.x + campPurchase.width).toBeLessThan(size.width);
      expect(
        await page.locator('.camp-estate').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.screenshot({ path: `test-results/native-camp-map-${size.width}.png` });
      await closeOverlayOrPause(page);
      await expect(page.locator('[data-synergy]')).toHaveCount(5);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
    await page.keyboard.press('b');
    await buyNode(page, 'archery-base');
    // This fresh camp has not yet earned its fourth-tier military specialisation.
    await inspectNode(page, 'archery-fire-arrows');
    await expect(page.locator('.tree-purchase')).toBeDisabled();
    await expect(page.locator('[data-node="archery-arban-drills"]')).toHaveAttribute(
      'data-status',
      'locked',
    );
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
