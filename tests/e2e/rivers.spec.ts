import { expect, test, type Page } from '@playwright/test';

async function jump(page: Page, checkpoint: string): Promise<void> {
  await page.keyboard.press('F8');
  await page.locator(`[data-developer-level="${checkpoint}"]`).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.hazardTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    const center = scene.camp.x;
    scene.cameras.main.stopFollow().centerOn(center, scene.camp.y - 260);
    scene.player.setPosition(center, scene.camp.y - 175);
  });
}

async function flow(page: Page): Promise<number[]> {
  return page.evaluate(() => [
    ...(window as any).__gloam.scene.landscape.river.currents.commandBuffer,
  ]);
}

test('river styles have finite, bounded decoration behind actors and replace their old water', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  for (const [checkpoint, kind, channels, name] of [
    ['chapter:golden-pasture', 'stream', 1, 'golden-pasture'],
    ['chapter:silent-river', 'frozen', 1, 'silent-river'],
    ['destination:2:orkhon-valley', 'braided', 2, 'orkhon-valley'],
    ['destination:2:altai-tavan-bogd', 'glacial', 1, 'altai-tavan-bogd'],
  ] as const) {
    await jump(page, checkpoint);
    expect(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        const river = scene.landscape.river;
        const previous = (window as any).previousRiverFlow;
        (window as any).previousRiverFlow = river.currents;
        return {
          name: river.container.name,
          channels: river.channels.length,
          bounded: river.marks.length < 80,
          finite: river.currents.commandBuffer.every(Number.isFinite),
          bodies: river.container.list.filter((item: any) => item.body).length,
          behind: river.container.parentContainer.depth < scene.player.depth,
          oldDestroyed: !previous || !previous.scene,
        };
      }),
    ).toEqual({
      name: `water-${kind}`,
      channels,
      bounded: true,
      finite: true,
      bodies: 0,
      behind: true,
      oldDestroyed: true,
    });
    await page.screenshot({ path: `test-results/rivers/${name}.png` });
  }
  expect(errors).toEqual([]);
});

test('current strokes follow active time, freeze in menus, and honor live reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  await jump(page, 'destination:2:orkhon-valley');
  const moving = await flow(page);
  await expect.poll(() => flow(page)).not.toEqual(moving);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const paused = await flow(page);
  await page.waitForTimeout(250);
  expect(await flow(page)).toEqual(paused);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.landscape.river.lastFrame))
    .toBe(0);
  const still = await flow(page);
  await page.waitForTimeout(250);
  expect(await flow(page)).toEqual(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => flow(page)).not.toEqual(still);
});

test('destination previews retain the same river branches and ice as the battlefield', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  await jump(page, 'chapter:golden-pasture');
  await page.keyboard.press('m');
  await expect(page.locator('#destination-detail [data-river-kind="frozen"]')).toBeVisible();
  await page.locator('[data-destination="orkhon-valley"]').click();
  await expect(
    page.locator('#destination-detail [data-river-kind="braided"] [data-river-channel]'),
  ).toHaveCount(2);
  expect(
    await page
      .locator('#destination-detail [data-river-channel]')
      .evaluateAll((paths) => paths.every((path) => !path.getAttribute('d')?.includes('NaN'))),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/rivers/destination-preview.png' });
});
