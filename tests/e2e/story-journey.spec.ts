import { expect, test } from '@playwright/test';
import { selectCampBuilding, buyNode, closeOverlayOrPause } from './helpers';
import { beginStory, choose, campTime, cross } from './storyHelpers';

test('complete the two acts, all eight choices, three crossings, and a survivor-based epilogue', async ({
  page,
}) => {
  // This intentionally covers the complete journey; shorter contracts live in story.spec.ts.
  test.setTimeout(240000);
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
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  await closeOverlayOrPause(page);
  await campTime(page, 45);
  await expect(page.getByRole('heading', { name: 'More mouths, more hands.' })).toBeVisible();
  await choose(page, 'pack-food');
  await cross(page, 'refuge', 1);
  await expect(page.getByRole('heading', { name: 'Voices across the ice.' })).toBeVisible();
  await expect(page.locator('.story-dialogue')).toContainText('came in under your banner');
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
  await expect(page.locator('[data-story-choice]')).toHaveCount(3);
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
  await expect(page.locator('.story-bonds li')).toHaveCount(4);
  await page.locator('.story-memory summary').first().click();
  await expect(page.locator('.story-memory').first()).toContainText('Share the work');
  await closeOverlayOrPause(page);
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'won');
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Read the epilogue' }).click();
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.story.records.length)).toBe(0);
  expect(errors).toEqual([]);
});
