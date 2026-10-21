import { expect, type Page } from '@playwright/test';

export async function openTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
}

/** A synthetic tap must span a sampled press and release, even on a slow render frame. */
export async function tapController(
  page: Page,
  index: number,
  key = 'testController',
): Promise<void> {
  await page.evaluate(
    ({ index, key }) => {
      (window as any)[key].buttons[index].pressed = true;
    },
    { index, key },
  );
  await expect
    .poll(() =>
      page.evaluate(
        (index) => ((window as any).__gloam.scene.controller.previousButtons & (1 << index)) !== 0,
        index,
      ),
    )
    .toBe(true);
  await page.evaluate(
    ({ index, key }) => {
      (window as any)[key].buttons[index].pressed = false;
    },
    { index, key },
  );
  await expect
    .poll(() =>
      page.evaluate(
        (index) => ((window as any).__gloam.scene.controller.previousButtons & (1 << index)) === 0,
        index,
      ),
    )
    .toBe(true);
}
