import { expect, test, type Page } from '@playwright/test';

async function jump(page: Page, checkpoint: string): Promise<void> {
  await page.keyboard.press('F8');
  await page.locator(`[data-developer-level="${checkpoint}"]`).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.hazardTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    const center = scene.camp.x;
    scene.cameras.main.stopFollow().centerOn(center, scene.camp.y - 260);
    scene.player.setPosition(center, scene.camp.y - 175);
  });
}

test('destination previews retain the same river branches and ice as the battlefield', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  await jump(page, 'chapter:golden-pasture');
  await page.keyboard.press('m');
  await expect(page.locator('#destination-detail [data-river-kind="frozen"]')).toBeVisible();
  await page.locator('[data-destination="orkhon-valley"]').click();
  await expect(
    page.locator('#destination-detail [data-river-kind="braided"] [data-river-channel]'),
  ).toHaveCount(2);
  expect(
    await page
      .locator('#destination-detail [data-river-channel]')
      .evaluateAll((paths) => paths.every((path) => !path.getAttribute('d')?.includes('NaN'))),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/rivers/destination-preview.png' });
});
