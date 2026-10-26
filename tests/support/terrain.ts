import { expect, type Page } from '@playwright/test';

/** 3D regressions explicitly opt in when CI's software GPU defaults to flat terrain. */
export async function preferAngledTerrain(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  if ((await terrain.textContent()) === 'Flat 2D') await terrain.click();
  await expect(terrain).toHaveText('Angled 3D');
  await page.getByRole('button', { name: 'Back ESC', exact: true }).click();
}
