import { expect, type Page } from '@playwright/test';

export async function command(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill(text);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

export async function checkpoint(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="place:altai-tavan-bogd"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    window.__gloam.hooks.quietBattlefield();
  });
}
