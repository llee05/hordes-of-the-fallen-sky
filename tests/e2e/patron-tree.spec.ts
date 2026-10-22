import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('all eight patrons expose foundations, complementary practices, and gated capstones', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 10;
  });
  await page.keyboard.press('t');
  for (const name of [
    'Börte Chino',
    'Etügen Eke',
    'Khükhedei Mergen',
    'Golomt',
    'Lus',
    'Ongod',
    'Sülde',
    'Guardian of Burkhan Khaldun',
  ]) {
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(1);
  }
  await expect(page.locator('[data-tree-branch]')).toHaveCount(8);
  await expect(page.locator('.tree-node[data-kind="foundation"]')).toHaveCount(8);
  await expect(page.locator('.tree-node[data-kind="capstone"]')).toHaveCount(8);
  await page.getByRole('button', { name: 'Construction', exact: true }).click();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  const base = page.locator('[data-node="caravan-foundations"]');
  await base.click();
  await expect(base).toContainText('1 / 2 ranks learned');
  await expect(page.locator('[data-node="watchfires"]')).toHaveAttribute('data-status', 'locked');
  await base.click();
  await expect(page.locator('[data-node="watchfires"]')).toHaveAttribute(
    'data-status',
    'available',
  );
  await page.locator('[data-node="watchfires"]').click();
  await expect(page.locator('[data-node="hold-the-passage"]')).toHaveAttribute(
    'data-status',
    'locked',
  );
  await page.locator('[data-node="stone-shelter"]').click();
  await page.locator('[data-node="hold-the-passage"]').click();
  await expect(page.locator('[data-node="hold-the-passage"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
  await page.screenshot({ path: 'test-results/patron-guardian-tree.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('b');
  await expect(page.locator('[data-node="archery-base"]')).toContainText('20 materials');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(5);
});

test('patrons can be mixed and purchased summon capstones create the actual travelling echoes', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 7;
  });
  await page.keyboard.press('t');
  await page.locator('[data-node="wolf-trail"]').click();
  await page.getByRole('button', { name: 'Summoning', exact: true }).click();
  await page.locator('[data-node="ancestral-companion"]').click();
  await page.locator('[data-node="ancestral-companion"]').click();
  await page.locator('[data-node="remembered-aim"]').click();
  await page.locator('[data-node="spirit-thread"]').click();
  await page.locator('[data-node="council-of-ancestors"]').click();
  await page.screenshot({ path: 'test-results/patron-ongod-tree.png' });
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.patronSupport.spirits.filter(
            (spirit: any) => spirit.image.visible,
          ).length,
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
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start a new run', exact: true }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.patrons.ancestors.count))
    .toBe(0);
});
