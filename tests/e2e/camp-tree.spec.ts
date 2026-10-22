import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

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
  await expect(page.locator('[data-tree-branch]')).toHaveCount(5);
  await expect(page.locator('[data-node="archery-base"]')).toContainText('More families needed');
  await expect(page.locator('[data-node="archery-fire-arrows"]')).toContainText(
    'Establish Archery grounds first',
  );
  await expect(page.locator('[data-node="archery-fire-arrows"]')).toContainText('36 materials');
  await expect(page.locator('[data-node="sanctuary-base"]')).toContainText('12 Spirit');
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
  await page.locator('[data-node="archery-base"]').click();
  await expect(page.locator('[data-node="archery-base"]')).toBeFocused();
  await page.locator('[data-node="archery-fire-arrows"]').click();
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
  await expect(page.locator('[data-tree-branch="ger"] [data-node]')).toHaveCount(5);
  const deeper = page.locator('[data-node="ger-field-medicine"]');
  await expect(deeper).toHaveAttribute('data-status', 'locked');
  await expect(deeper).toContainText('Requires: Herb gardens');
  await page.locator('[data-node="ger-herb-gardens"]').click();
  await expect(page.locator('[data-node="ger-hearthkeepers"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await expect(deeper).toHaveAttribute('data-status', 'available');
  await deeper.click();
  await expect(deeper).toHaveAttribute('data-status', 'learned');
  expect(
    await page.evaluate(() => ({
      materials: (window as any).__gloam.scene.run.clan.materials,
      health: (window as any).__gloam.scene.run.stats.maxHealth,
    })),
  ).toEqual({ materials: 92, health: 110 });
});

test('camp trees fit small screens, filter content, and retain scroll and focus on purchase', async ({
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
    const panel = (await page.locator('.progression-panel').boundingBox())!;
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
  const wagon = page.locator('[data-node="wagon-base"]');
  await wagon.scrollIntoViewIfNeeded();
  const scroll = await page.locator('.tree-scroll').evaluate((element) => element.scrollTop);
  await wagon.click();
  await expect(wagon).toBeFocused();
  expect(await page.locator('.tree-scroll').evaluate((element) => element.scrollTop)).toBeCloseTo(
    scroll,
    0,
  );
  await page.screenshot({ path: 'test-results/mobile-camp-tree.png' });
  await page.getByRole('button', { name: 'Warfare', exact: true }).click();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Find a branch' }).fill('felt armor');
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
