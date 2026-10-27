import { expect, type Page } from '@playwright/test';

/** Observe actual scene renders, including in menus, rather than sleeping through a slow frame. */
export async function sceneFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const scene = (window as any).__gloam.scene;
        const rendered = () => {
          if (--count === 0) {
            scene.events.off('render', rendered);
            resolve();
          }
        };
        scene.events.on('render', rendered);
      }),
    count,
  );
}

export async function openTitle(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
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
  // Native menu keys are consumed on the next scene frame, before the DOM is rebuilt.
  await expect(page.locator('.immersive-camp, .progression-panel')).toBeVisible();
  if (await page.locator('.immersive-camp').count()) {
    const building = id.split('-')[0]!;
    const node = page.locator(`[data-node="${id}"]`);
    // Keep the current parchment: reopening it resets the foldout after every purchase.
    if (!(await node.count())) await selectCampBuilding(page, building);
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
  const purchase = page.locator('.tree-purchase');
  const choice = await purchase.getAttribute('data-choice');
  await purchase.click();
  if (choice) {
    await expect(purchase).toContainText('Confirm choice:');
    await purchase.click();
  }
}

/** Select through the painted scene, using search for an as-yet unbuilt facility. */
export async function selectCampBuilding(page: Page, id: string, unfold = true): Promise<void> {
  await expect(page.locator('.immersive-camp')).toBeVisible();
  if (await page.locator('[data-camp-dismiss]').count())
    await page.locator('[data-camp-dismiss]').click();
  if (!(await page.locator(`[data-camp-site="${id}"]`).count())) {
    const search = page.getByRole('searchbox', { name: 'Find in camp' });
    await expect(search).toBeVisible();
    await expect(search).toBeEditable();
    await search.fill(id);
  }
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
