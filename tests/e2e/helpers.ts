import type { Page } from '@playwright/test';

export async function openTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Skip intro/ }).click();
}
