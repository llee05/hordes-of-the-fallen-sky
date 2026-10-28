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
  await page.locator('[data-developer-level="chapter:broken-pass"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = scene.hazardTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
}
