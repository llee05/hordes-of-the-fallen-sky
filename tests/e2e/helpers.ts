import { expect, type Page } from '@playwright/test';

/** Flat-coordinate simulation regressions use the compatibility renderer; world3d.spec covers the default scenes. */
export async function openTitle(page: Page): Promise<void> {
  await page.goto('/?terrain=2d');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
}

/** Start through the real New Game and prologue actions, leaving camp-scene preferences intact. */
export async function startExpedition(
  page: Page,
  options: { legacyCamp?: boolean } = {},
): Promise<void> {
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  // Existing simulation contracts include pre-estate camps; the estate suite uses fresh rules.
  if (options.legacyCamp !== false)
    await page.evaluate(() => {
      delete (window as any).__gloam.scene.run.clan.estate;
    });
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

/** Browse the authored branch, then inspect a node without spending anything. */
export async function inspectNode(page: Page, id: string): Promise<void> {
  if (await page.locator('.immersive-camp').count()) {
    const building = id.split('-')[0]!;
    await selectCampBuilding(page, building);
    const node = page.locator(`[data-node="${id}"]`);
    const craft = page.locator('.camp-crafts');
    if (await node.evaluate((el) => !!el.closest('details:not([open])')))
      await craft.locator('summary').click();
    await node.click();
    return;
  }
  if (!(await page.locator(`[data-node="${id}"]`).count()))
    await page.locator(`[data-tree-branch-select][data-nodes~="${id}"]`).click();
  await page.locator(`[data-node="${id}"]`).click();
}

/** All purchases use the explicit inspector button, including repeated ranks. */
export async function buyNode(page: Page, id: string): Promise<void> {
  await inspectNode(page, id);
  await page.locator('.tree-purchase').click();
}

/** Select through the painted scene, using search for an as-yet unbuilt facility. */
export async function selectCampBuilding(page: Page, id: string, unfold = true): Promise<void> {
  if (await page.locator('[data-camp-dismiss]').count())
    await page.locator('[data-camp-dismiss]').click();
  if (!(await page.locator(`[data-camp-site="${id}"]`).count()))
    await page.getByRole('searchbox', { name: 'Find in camp' }).fill(id);
  await page.locator(`[data-camp-site="${id}"]`).click();
  if (
    unfold &&
    (await page.locator('[data-camp-foldout]').getAttribute('aria-expanded')) === 'false'
  )
    await page.locator('[data-camp-foldout]').click();
}

/** Root camp management has its own exit; Escape first dismisses the anchored parchment. */
export async function closeOverlayOrPause(page: Page): Promise<void> {
  if (await page.locator('.immersive-camp').isVisible())
    await page.locator('[data-action="exit-camp"]').first().click();
  else await page.keyboard.press('Escape');
}
