import { expect, test } from '@playwright/test';

test('terrain toggles immediately while paused and persists across reloads', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  // The visible hardware test and headless software test start with different defaults.
  if ((await terrain.textContent()) === 'Flat 2D') await terrain.click();
  await expect(terrain).toHaveText('Angled 3D');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back ESC', exact: true }).click();
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  for (const label of ['Flat 2D', 'Angled 3D', 'Flat 2D']) {
    await terrain.click();
    await expect(terrain).toHaveText(label);
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(
      label === 'Angled 3D' ? 1 : 0,
    );
    expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
      frozen,
    );
    expect(await page.evaluate(() => (window as any).__gloam.scene.cameras.main.alpha)).toBe(
      label === 'Angled 3D' ? 0 : 1,
    );
  }
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(terrain).toHaveText('Flat 2D');
  await terrain.click();
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(terrain).toHaveText('Angled 3D');
  expect(errors).toEqual([]);
});

test('software WebGL starts flat with a dismissible notice and honors an explicit choice', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    // Inject only the reported driver string; render with the actual test GPU.
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.getParameter;
      context.prototype.getParameter = function (parameter: number) {
        if (parameter === 37446) return 'ANGLE (Vulkan SwiftShader Device)';
        return original.call(this, parameter);
      };
    }
  });
  await page.goto('/');
  const notice = page.getByRole('status').filter({ hasText: 'Software graphics detected' });
  await expect(notice).toBeVisible();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismiss terrain notice' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  await expect(terrain).toHaveText('Flat 2D');
  await terrain.click();
  await expect(terrain).toHaveText('Angled 3D');
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await expect(notice).toHaveCount(0);
});
