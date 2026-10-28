import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { launchElectron, electronEnvironment } from '../support/electron';

test.use({ trace: 'off' });

test('painted research loads from the offline desktop build and fits desktop and narrow windows', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-research-art-'));
  const app = await launchElectron({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env: electronEnvironment(),
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.keyboard.press('t');
    for (const size of [
      { width: 1280, height: 900 },
      { width: 800, height: 600 },
    ]) {
      await app.evaluate(({ BrowserWindow }, size) => {
        const window = BrowserWindow.getAllWindows()[0]!;
        window.setResizable(false);
        window.setContentSize(size.width, size.height);
      }, size);
      await expect
        .poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
        .toEqual(size);
      for (const id of ['borte-chino', 'etugen-eke', 'khukhedei-mergen']) {
        await page.locator(`[data-tree-branch-select="${id}"]`).click();
        await expect(page.locator(`[data-tree-branch="${id}"]`)).toBeVisible();
        // Decode the URLs actually used by CSS, including the build's shared masthead URL.
        const images = await page.evaluate(async () => {
          const selectors = ['.research-masthead', '.tree-main', '.node-portrait'];
          return Promise.all(
            selectors.map(async (selector) => {
              const css = getComputedStyle(document.querySelector(selector)!).backgroundImage;
              const url = css.match(/url\("?([^"\)]+)"?\)/)![1]!;
              const image = new Image();
              image.src = url;
              await image.decode();
              return image.naturalWidth > 0;
            }),
          );
        });
        expect(images).toEqual([true, true, true]);
        const purchase = (await page.locator('.tree-purchase').boundingBox())!;
        expect(purchase.x + purchase.width).toBeLessThanOrEqual(size.width);
        expect(purchase.y + purchase.height).toBeLessThanOrEqual(size.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
        if (process.env.BH_RESEARCH_PROOF_DIR)
          await page.screenshot({
            path: join(process.env.BH_RESEARCH_PROOF_DIR, `electron-${id}-${size.width}.png`),
          });
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
