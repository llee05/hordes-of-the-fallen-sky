import { expect, test } from '@playwright/test';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNode,
  inspectNode,
  openTitle,
  startExpedition,
} from './helpers';

test('camp previews every development and enforces resources, workers, and exclusive choices', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const clan = (window as any).__gloam.scene.run.clan;
    clan.materials = 500;
    clan.spirit = 0;
    clan.population = 2;
  });
  await page.keyboard.press('b');
  await expect(page.locator('[data-camp-site]')).toHaveCount(1);
  await selectCampBuilding(page, 'archery');
  await inspectNode(page, 'archery-base');
  await expect(page.locator('.node-purchase-status')).toContainText('More families needed');
  await inspectNode(page, 'archery-fire-arrows');
  await expect(page.locator('.node-purchase-status')).toContainText(
    'Establish Archery grounds first',
  );
  await expect(page.locator('.node-price')).toContainText('36 materials');
  await selectCampBuilding(page, 'sanctuary');
  await inspectNode(page, 'sanctuary-base');
  await expect(page.locator('.node-price')).toContainText('12 Spirit');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => (window as any).__gloam.scene.construct('archery'));
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    const clan = (window as any).__gloam.scene.run.clan;
    clan.population = 8;
    clan.spirit = 100;
  });
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  expect(
    await page.locator('.camp-popup').evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await buyNode(page, 'archery-fire-arrows');
  await expect(page.locator('[data-node="archery-veteran-riders"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  const learned = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.construct('archery', 'fire-arrows');
    scene.construct('archery', 'veteran-riders');
  });
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
    learned,
  );
  await page.screenshot({ path: 'test-results/camp-upgrade-tree.png' });
});

test('additional choices and deeper camp tiers work without new layout or purchase code', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(async () => {
    const { BUILDINGS } = await import('/src/game/data/clan.ts');
    const building = BUILDINGS.find((entry: any) => entry.id === 'ger');
    building.paths = [
      ...building.paths,
      {
        id: 'herb-gardens',
        title: 'Herb gardens',
        description: 'Test extension of the camp.',
        exclusiveGroup: 'specialization',
        materials: 3,
        spirit: 0,
      },
      {
        id: 'field-medicine',
        title: 'Field medicine',
        description: 'Test deeper development.',
        requires: ['herb-gardens'],
        materials: 5,
        spirit: 0,
        apply: (run: any) => {
          run.stats.maxHealth += 10;
        },
      },
    ];
    (window as any).__gloam.scene.run.clan.materials = 100;
  });
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'ger');
  await expect(page.locator('[data-tree-branch="ger"] [data-node]')).toHaveCount(10);
  const materialsBefore = await page.evaluate(
    () => (window as any).__gloam.scene.run.clan.materials,
  );
  const deeper = page.locator('[data-node="ger-field-medicine"]');
  await expect(deeper).toHaveAttribute('data-status', 'locked');
  await inspectNode(page, 'ger-field-medicine');
  await expect(page.locator('.camp-popup-requirements')).toContainText('Herb gardens');
  await buyNode(page, 'ger-herb-gardens');
  await expect(page.locator('[data-node="ger-hearthkeepers"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await expect(deeper).toHaveAttribute('data-status', 'available');
  await buyNode(page, 'ger-field-medicine');
  await expect(deeper).toHaveAttribute('data-status', 'learned');
  expect(
    await page.evaluate(() => ({
      materials: (window as any).__gloam.scene.run.clan.materials,
      health: (window as any).__gloam.scene.run.stats.maxHealth,
    })),
  ).toEqual({ materials: materialsBefore - 8, health: 110 });
});

test('camp parchments fit small screens, search is recoverable, and purchased nodes remain inspectable', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.materials = 500;
  });
  await page.keyboard.press('b');
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await selectCampBuilding(page, 'wagon');
    const box = (await page.locator('.camp-popup').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  }
  await buyNode(page, 'wagon-base');
  await inspectNode(page, 'wagon-base');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await page.locator('[data-camp-dismiss]').click();
  await page.getByRole('searchbox', { name: 'Find in camp' }).fill('felt armor');
  await expect(page.locator('.camp-building-choice')).toHaveCount(1);
  await page.locator('.camp-building-choice[data-camp-site="wagon"]').click();
  await expect(page.locator('.camp-popup-heading')).toContainText('Wagon circle');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
});
