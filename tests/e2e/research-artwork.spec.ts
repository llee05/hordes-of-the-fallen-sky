import { expect, test } from '@playwright/test';
import { PATRONS } from '../../src/game/data/patrons';
import { openTitle, startExpedition } from './helpers';

test('research lazily fetches each patron painting and matching inspector art', async ({
  page,
}) => {
  test.setTimeout(90000);
  const loaded = new Set<string>();
  const failures: string[] = [];
  page.on('response', (response) => {
    if (!response.url().includes('/art/research/')) return;
    if (!response.ok()) failures.push(response.url());
    loaded.add(response.url().split('/').pop()!);
  });
  await openTitle(page);
  expect([...loaded]).toEqual([]);
  await startExpedition(page);
  await page.keyboard.press('t');
  await expect(page.locator('.progression-panel')).toBeVisible();
  const files = (id: string) => [
    `${id}.webp`,
    `${id}-detail.webp`,
    ...[0, 1, 2].map((index) => `${id}-vignette-${index}.webp`),
  ];
  await expect
    .poll(() => [...loaded].sort())
    .toEqual(['header.webp', ...files('borte-chino')].sort());
  await page.getByRole('button', { name: 'Patron overview', exact: true }).click();
  await expect(page.locator('.patron-overview-card')).toHaveCount(10);
  // Overview symbols must not eagerly request ten regional paintings.
  expect([...loaded].sort()).toEqual(['header.webp', ...files('borte-chino')].sort());
  for (const id of [...PATRONS.map((patron) => patron.id), 'general', 'hybrids']) {
    await page.locator(`.patron-navigation [data-tree-branch-select="${id}"]`).click();
    await expect(page.locator(`[data-tree-branch="${id}"]`)).toBeVisible();
    await expect(page.locator('.tree-main')).toHaveCSS(
      'background-image',
      new RegExp(`${id}\\.webp`),
    );
    await expect(page.locator('.node-portrait')).toHaveCSS(
      'background-image',
      new RegExp(`${id}-detail\\.webp`),
    );
    await expect.poll(() => files(id).every((name) => loaded.has(name))).toBe(true);
    await expect(page.locator('.tree-node-vignette').first()).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  }
  expect(loaded.size).toBe(51);
  expect(failures).toEqual([]);
});

test('painted research remains usable on a narrow screen with reduced motion and keyboard purchases', async ({
  page,
}) => {
  await page.setViewportSize({ width: 680, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.pendingUpgrades = 10;
    scene.developerTools.invincible = scene.developerTools.clanInvincible = true;
  });
  await page.keyboard.press('t');
  await page.getByRole('button', { name: 'Compact list', exact: true }).click();
  await expect(page.locator('.tree-graph')).toHaveAttribute('data-compact', 'true');
  const node = page.locator('[data-node="wolf-trail"]');
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.node-inspector h3')).toHaveText('The wolf’s trail');
  const purchase = page.locator('.tree-purchase');
  await purchase.scrollIntoViewIfNeeded();
  const bounds = (await purchase.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(680);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
  await purchase.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.node-rank-summary')).toHaveText('Rank 1 / 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(680);
  const animations = await page
    .locator('.progression-panel')
    .evaluate(
      (panel) =>
        panel
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length,
    );
  expect(animations).toBe(0);
});
