import { expect, type Page } from '@playwright/test';
import { startExpedition } from './helpers';

export async function beginStory(page: Page): Promise<void> {
  await page.goto('/?terrain=2d');
  await startExpedition(page);
  await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
}

export async function choose(page: Page, id: string): Promise<void> {
  await page.locator(`[data-story-choice="${id}"]`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
}

export async function campTime(page: Page, time: number): Promise<void> {
  await page.evaluate((time) => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = time;
    scene.invulnerable = 999;
  }, time);
}

export async function cross(page: Page, route: string, nextRegion: number): Promise<void> {
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: 'Where the grass still grows.' })).toBeVisible();
  await page.locator(`[data-route="${route}"]`).click();
  await campTime(page, 100);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(nextRegion);
}
