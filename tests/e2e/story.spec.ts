import { expect, test } from '@playwright/test';
import { buyNode, closeOverlayOrPause } from './helpers';
import { beginStory } from './storyHelpers';

test.describe.configure({ mode: 'parallel' });

test('story cannot grant twice, and banked knowledge points survive a camp conversation', async ({
  page,
}) => {
  // Two research purchases and both memory menus exhaust 30s on CI's software renderer.
  test.setTimeout(60000);
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
  await buyNode(page, 'power');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'upgrade');
  await buyNode(page, 'power');
  await closeOverlayOrPause(page);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Our story' }).click();
  await expect(page.locator('.story-memory')).toHaveCount(1);
  await closeOverlayOrPause(page);
  await page.evaluate(() => (window as any).__gloam.scene.finish('dead'));
  await page.getByRole('button', { name: 'Our remembered road' }).click();
  await closeOverlayOrPause(page);
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
  await closeOverlayOrPause(page);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records[0].status)).toBe(
    'skipped',
  );
  await closeOverlayOrPause(page);
  // A remnant scene must not offer work to companions whose survival is unknown.
  await closeOverlayOrPause(page);
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
  await closeOverlayOrPause(page);
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Our remembered road' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.game-panel')
      .evaluate((panel) => panel.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await closeOverlayOrPause(page);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'paused');
});
