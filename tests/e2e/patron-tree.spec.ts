import { expect, test } from '@playwright/test';
import { closeOverlayOrPause, buyNode, inspectNode, openTitle, startExpedition } from './helpers';

test('eight patron traditions offer focused routes and exclude only the chosen capstone alternatives', async ({
  page,
}) => {
  // Software-rendered CI spends the budget on rank previews and menu/scene transitions;
  // traces show advancing actions rather than a stalled selector. Keep this budget local.
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 10;
  });
  await page.keyboard.press('t');
  await page.getByRole('button', { name: 'Patron overview' }).click();
  await expect(page.locator('.patron-overview-card')).toHaveCount(8);
  await inspectNode(page, 'caravan-foundations');
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await expect(page.locator('.tree-node[data-kind="capstone"]')).toHaveCount(2);
  await buyNode(page, 'caravan-foundations');
  await expect(page.locator('.node-rank-summary')).toHaveText('Rank 1 / 2');
  await expect(page.locator('[data-node="watchfires"]')).toHaveAttribute(
    'data-status',
    'available',
  );
  await buyNode(page, 'caravan-foundations');
  await buyNode(page, 'stone-shelter');
  await inspectNode(page, 'hold-the-passage');
  await expect(page.locator('.choice-comparison')).toContainText('A fortress on the road');
  await expect(page.locator('.node-preview')).toContainText('Clan damage reduction');
  await page.locator('.tree-purchase').click();
  await expect(page.locator('[data-node="hold-the-passage"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
  await expect(page.locator('[data-node="rolling-fortress"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await expect(page.locator('[data-node="watchfires"]')).toHaveAttribute(
    'data-status',
    'available',
  );
  await page.screenshot({ path: 'test-results/patron-guardian-tree.png' });
  await closeOverlayOrPause(page);
  await page.keyboard.press('b');
  await inspectNode(page, 'archery-base');
  await expect(page.locator('.node-price')).toContainText('20 materials');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(5);
});

test('mixing patrons and focused summon capstones creates the actual travelling echoes', async ({
  page,
}) => {
  // Software-rendered CI spends the budget on rank previews and menu/scene transitions;
  // traces show advancing actions rather than a stalled selector. Keep this budget local.
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 7;
  });
  await page.keyboard.press('t');
  for (const id of [
    'wolf-trail',
    'ancestral-companion',
    'ancestral-companion',
    'remembered-aim',
    'council-of-ancestors',
  ])
    await buyNode(page, id);
  await page.screenshot({ path: 'test-results/patron-ongod-tree.png' });
  await closeOverlayOrPause(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.patronSupport.spirits.filter((s: any) => s.image.visible)
            .length,
      ),
    )
    .toBe(3);
  expect(
    await page.evaluate(() => ({
      points: (window as any).__gloam.scene.run.pendingUpgrades,
      hunting: (window as any).__gloam.scene.run.patrons.hunt.movingDamage,
      echoes: (window as any).__gloam.scene.run.patrons.ancestors.count,
    })),
  ).toEqual({ points: 1, hunting: 1.15, echoes: 3 });
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Start a new run', exact: true }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.patrons.ancestors.count))
    .toBe(0);
});
