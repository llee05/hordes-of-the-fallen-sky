import { expect, test } from '@playwright/test';
import { LANDSCAPES } from '../../src/game/data/landscapes';

test('destination previews retain the landscape description', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:eej-khairkhan"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#location')).toHaveText('EEJ KHAIRKHAN');
  await page.keyboard.press('m');
  await page.locator('[data-destination="orkhon-valley"]').click();
  await expect(page.locator('#destination-detail [data-landscape="orkhon-valley"]')).toBeVisible();
  await expect(page.locator('#destination-detail')).toContainText(
    LANDSCAPES['orkhon-valley'].description,
  );
  await page.screenshot({ path: 'test-results/landscapes/destination-previews.png' });
});
