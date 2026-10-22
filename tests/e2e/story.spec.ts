import { expect, test, type Page } from '@playwright/test';
import { startExpedition, tapController } from './helpers';

async function beginStory(page: Page): Promise<void> {
  await page.goto('/');
  await startExpedition(page);
  await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
}

async function choose(page: Page, id: string): Promise<void> {
  await page.locator(`[data-story-choice="${id}"]`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
}

async function campTime(page: Page, time: number): Promise<void> {
  await page.evaluate((time) => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stageTime = time;
    scene.invulnerable = 999;
  }, time);
}

async function cross(page: Page, route: string, nextRegion: number): Promise<void> {
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: 'Where the grass still grows.' })).toBeVisible();
  await page.locator(`[data-route="${route}"]`).click();
  await campTime(page, 100);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(nextRegion);
}

test('complete the two acts, all eight choices, three crossings, and a survivor-based epilogue', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await beginStory(page);
  const initial = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      elapsed: scene.run.elapsed,
      food: scene.run.clan.food,
      frame: scene.player.frame.name,
    };
  });
  await page.keyboard.press('b');
  await page.keyboard.press('m');
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        elapsed: scene.run.elapsed,
        food: scene.run.clan.food,
        frame: scene.player.frame.name,
      };
    }),
  ).toEqual(initial);
  await page.screenshot({ path: 'test-results/story-first-fire.png' });
  await choose(page, 'share-work');
  // Actual construction and specialization remain available throughout the campaign.
  await page.keyboard.press('b');
  await page.locator('[data-node="archery-base"]').click();
  await page.keyboard.press('Escape');
  await campTime(page, 45);
  await expect(page.getByRole('heading', { name: 'More mouths, more hands.' })).toBeVisible();
  await choose(page, 'pack-food');
  await cross(page, 'refuge', 1);
  await expect(page.getByRole('heading', { name: 'Voices across the ice.' })).toBeVisible();
  await expect(page.locator('.story-dialogue')).toContainText('families we brought through');
  await choose(page, 'keep-names');
  await campTime(page, 45);
  await cross(page, 'river', 2);
  await expect(page.getByRole('heading', { name: 'A promise chosen.' })).toBeVisible();
  await expect(page.locator('.story-panel .eyebrow')).toContainText('ACT II');
  await choose(page, 'promise-remember');
  await campTime(page, 15);
  await expect(page.getByRole('heading', { name: 'When the earth moves.' })).toBeVisible();
  await choose(page, 'mend-wheels');
  await campTime(page, 45);
  await expect(page.getByRole('heading', { name: 'The court’s empty promise.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/story-confession.png' });
  await choose(page, 'trust-erden');
  await cross(page, 'ridge', 3);
  await expect(page.getByRole('heading', { name: 'The narrow opening.' })).toBeVisible();
  await expect(page.locator('.story-dialogue')).toContainText('households have the tally');
  await choose(page, 'hold-watch');
  await expect(page.locator('#act-heading')).toContainText('ACT II');
  await campTime(page, 90);
  await expect(page.getByRole('heading', { name: 'Hold the road.' })).toBeVisible();
  await choose(page, 'carry-song');
  await campTime(page, 180);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'epilogue');
  const survivors = await page.evaluate(() => (window as any).__gloam.scene.run.clan.population);
  await expect(page.locator('.epilogue-copy')).toContainText(`${survivors} people`);
  await expect(page.locator('.epilogue-copy')).toContainText('Skybreaker still walks');
  await expect(page.locator('.epilogue-copy')).toContainText('families answer for themselves');
  await page.screenshot({ path: 'test-results/story-epilogue.png' });
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records.length)).toBe(8);
  await page.getByRole('button', { name: /See journey results/ }).click();
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  await page.getByRole('button', { name: 'Our remembered road' }).click();
  await expect(page.locator('.story-memory')).toHaveCount(8);
  await page.locator('.story-memory summary').first().click();
  await expect(page.locator('.story-memory').first()).toContainText('Share the work');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'won');
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Read the epilogue' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('story cannot grant twice, and banked knowledge points survive a camp conversation', async ({
  page,
}) => {
  await beginStory(page);
  const outcome = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const before = scene.run.clan.materials;
    scene.run.pendingUpgrades = 2;
    document.querySelector<HTMLButtonElement>('[data-story-choice="share-work"]')!.click();
    scene.chooseStory('share-work');
    return {
      difference: scene.run.clan.materials - before,
      phase: scene.run.phase,
      pending: scene.run.pendingUpgrades,
      records: scene.run.story.records.length,
    };
  });
  expect(outcome).toEqual({ difference: 6, phase: 'playing', pending: 2, records: 1 });
  await page.keyboard.press('t');
  await page.locator('[data-research="power"][data-rank="1"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'upgrade');
  await page.locator('[data-research="power"][data-rank="2"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Our story' }).click();
  await expect(page.locator('.story-memory')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as any).__gloam.scene.finish('dead'));
  await page.getByRole('button', { name: 'Our remembered road' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'dead');
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
});

test('camp panels fit desktop and narrow previews, skip neutrally, and freeze all story phases', async ({
  page,
}) => {
  await beginStory(page);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const box = (await page.locator('.story-panel').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.getByRole('button', { name: /Continue without choosing/ })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records[0].status)).toBe(
    'skipped',
  );
  await page.keyboard.press('Escape');
  // A remnant scene must not offer work to companions whose survival is unknown.
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const run = (window as any).__gloam.scene.run;
    run.clan.population = 1;
    run.story.peopleLost = 7;
    run.clan.stageTime = 45;
  });
  await expect(page.getByRole('heading', { name: 'More mouths, more hands.' })).toBeVisible();
  await expect(page.locator('.story-body')).toContainText('1 survivor remains');
  await expect(page.locator('.story-body')).not.toContainText(/Saran|Nara|Erden|Boro/);
  await page.screenshot({ path: 'test-results/story-remnant.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Our remembered road' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.game-panel')
      .evaluate((panel) => panel.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'paused');
});

test('controller chooses, skips, reads memories, and returns to the paused expedition', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { storyPad: pad });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  const press = (index: number): Promise<void> => tapController(page, index, 'storyPad');
  await beginStory(page);
  await press(12);
  await press(12);
  await expect(page.locator('[data-story-choice="share-work"]')).toBeFocused();
  await press(0);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  expect(await page.evaluate(() => (window as any).__gloam.scene.dashTimer)).toBe(0);
  await campTime(page, 45);
  await expect(page.getByRole('heading', { name: 'More mouths, more hands.' })).toBeVisible();
  await press(1);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await press(9);
  await press(13);
  await expect(
    page.getByRole('button', { name: 'Tradition tech tree', exact: true }),
  ).toBeFocused();
  await press(13);
  await press(13);
  await press(0);
  await expect(page.getByRole('heading', { name: 'Our remembered road.' })).toBeVisible();
  await press(12);
  await press(0);
  await expect(page.locator('details[open]')).toHaveCount(1);
  await press(1);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'paused');
});
