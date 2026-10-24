import { expect, test } from '@playwright/test';
import { buyNode, inspectNode, openTitle, startExpedition } from './helpers';

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
  await expect(page.locator('[data-camp-site]')).toHaveCount(8);
  await page.locator('[data-camp-site="archery"]').click();
  await inspectNode(page, 'archery-base');
  await expect(page.locator('.node-purchase-status')).toContainText('More families needed');
  await inspectNode(page, 'archery-fire-arrows');
  await expect(page.locator('.node-purchase-status')).toContainText(
    'Establish Archery grounds first',
  );
  await expect(page.locator('.node-price')).toContainText('36 materials');
  await page.locator('[data-camp-site="sanctuary"]').click();
  await inspectNode(page, 'sanctuary-base');
  await expect(page.locator('.node-price')).toContainText('12 Spirit');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => (window as any).__gloam.scene.construct('archery'));
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const clan = (window as any).__gloam.scene.run.clan;
    clan.population = 8;
    clan.spirit = 100;
  });
  await page.keyboard.press('b');
  await page.locator('[data-camp-site="archery"]').click();
  await buyNode(page, 'archery-base');
  await expect(page.locator('[data-node="archery-base"]')).toBeFocused();
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
  await expect(page.locator('[data-tree-branch="ger"] [data-node]')).toHaveCount(8);
  const materialsBefore = await page.evaluate(
    () => (window as any).__gloam.scene.run.clan.materials,
  );
  const deeper = page.locator('[data-node="ger-field-medicine"]');
  await expect(deeper).toHaveAttribute('data-status', 'locked');
  await deeper.click();
  await expect(page.locator('.node-prerequisites')).toContainText('Herb gardens');
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

test('camp models fit small screens, find crafts, and retain scroll and focus on purchase', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.materials = 500;
  });
  await page.keyboard.press('b');
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const panel = (await page.locator('.camp-estate').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(
      await page
        .locator('.tree-scroll')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    expect(
      await page.locator('.tree-branch-heading').evaluateAll((headings) =>
        headings.every((heading) => {
          const art = heading.querySelector('.camp-illustration')!.getBoundingClientRect();
          const title = heading.querySelector('h3')!.getBoundingClientRect();
          return art.right <= title.left;
        }),
      ),
    ).toBe(true);
  }
  await page.locator('[data-camp-site="wagon"]').click();
  const wagon = page.locator('[data-node="wagon-base"]');
  await wagon.scrollIntoViewIfNeeded();
  const scroll = await page.locator('.tree-scroll').evaluate((element) => element.scrollTop);
  await buyNode(page, 'wagon-base');
  await expect(wagon).toBeFocused();
  expect(await page.locator('.tree-scroll').evaluate((element) => element.scrollTop)).toBeCloseTo(
    scroll,
    0,
  );
  await page.screenshot({ path: 'test-results/mobile-camp-tree.png' });
  await page.getByRole('searchbox', { name: 'Find in camp' }).fill('felt armor');
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await expect(page.locator('[data-tree-branch="wagon"]')).toBeVisible();
  await expect(page.locator('[data-camp-site][data-match="true"]')).toHaveCount(1);
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
