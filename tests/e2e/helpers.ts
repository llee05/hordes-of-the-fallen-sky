import { expect, type Page } from '@playwright/test';

/** Flat-coordinate simulation regressions use the compatibility renderer; world3d.spec covers the default scenes. */
export async function openTitle(page: Page): Promise<void> {
  await page.goto('/?terrain=2d');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
}

/** Start through the real New Game and prologue actions, leaving camp-scene preferences intact. */
export async function startExpedition(page: Page): Promise<void> {
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
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
