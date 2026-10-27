import { expect, test } from '@playwright/test';
import {
  closeOverlayOrPause,
  buyNode,
  inspectNode,
  openTitle,
  startExpedition,
  tapController,
} from './helpers';

test('inspection never spends points; explicit purchases use exact ranks and current-build previews', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 3;
  });
  await page.keyboard.press('t');
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await expect(page.locator('[data-tree-branch-select]')).toHaveCount(8);
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await inspectNode(page, 'power');
  await expect(page.locator('.node-preview')).toContainText('Shared attack damage');
  await expect(page.locator('.node-preview')).toContainText('20');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await buyNode(page, 'power');
  await expect(page.locator('.node-rank-summary')).toHaveText('Rank 1 / 2');
  await expect(page.locator('[data-node="haste"]')).toHaveAttribute('data-status', 'available');
  await expect(page.locator('.tree-purchase')).toBeFocused();
  await expect(page.locator('.node-preview')).toContainText('25');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.research('power', 1);
    scene.research('power', 8);
    scene.research('missing', 1);
  });
  expect(
    await page.evaluate(() => ({
      points: (window as any).__gloam.scene.run.pendingUpgrades,
      damage: (window as any).__gloam.scene.run.stats.damage,
    })),
  ).toEqual({ points: 2, damage: 20 });
  await page.screenshot({ path: 'test-results/tradition-tech-tree.png' });
  await closeOverlayOrPause(page);
  await expect(page.locator('#research-points')).toHaveText('2');
  await page.getByRole('button', { name: /Open patron tech tree/ }).click();
  await expect(page.locator('.node-rank-summary')).toHaveText('Rank 1 / 2');
  await closeOverlayOrPause(page);
  await page.evaluate(() => (window as any).__gloam.scene.research('power', 2));
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.upgrades.power)).toBe(1);
});

test('overview, accent-insensitive search and graph navigation work without points and preserve paused parents', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Patron tech tree', exact: true }).click();
  await expect(page.locator('.tree-node[data-status="available"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Patron overview' }).click();
  await expect(page.locator('.patron-overview-card')).toHaveCount(8);
  await page.locator('[data-tree-branch-select="borte-chino"]').first().click();
  await inspectNode(page, 'wolf-trail');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-node="culling-bite"]')).toBeFocused();
  await expect(page.locator('.node-route')).toContainText('2 knowledge points');
  const search = page.getByRole('searchbox', { name: 'Find a branch' });
  await search.pressSequentially('borte chino');
  await expect(search).toBeFocused();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await search.fill('no such technology');
  await expect(page.getByRole('status').filter({ hasText: 'No branches match' })).toBeVisible();
  await search.fill('');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  await closeOverlayOrPause(page);
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Traditions', exact: true }).click();
  await page.getByRole('button', { name: /Open tech tree/ }).click();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('tab', { name: 'Traditions', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('panels fit desktop, Steam Deck and narrow screens and preserve graph scroll after research', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 2;
  });
  await page.keyboard.press('t');
  for (const viewport of [
    { width: 1440, height: 1000 },
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
      await page.locator('.tree-main').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
  }
  await inspectNode(page, 'vitality');
  const before = await page.locator('.tree-graph-viewport').evaluate((e) => e.scrollLeft);
  await page.locator('.tree-purchase').click();
  expect(await page.locator('.tree-graph-viewport').evaluate((e) => e.scrollLeft)).toBe(before);
  await page.screenshot({ path: 'test-results/mobile-tech-tree.png' });
});

test('controller confirms inspection, then purchases explicitly and retains unspent points', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = {
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    Object.assign(window, { testController: state });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [state] });
  });
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 2;
  });
  await tapController(page, 4);
  await expect(page.locator('[data-node="wolf-trail"]')).toBeFocused();
  await tapController(page, 0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(2);
  await page.locator('.tree-purchase').focus();
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = true;
  });
  await expect(page.locator('.node-rank-summary')).toHaveText('Rank 1 / 2');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(1);
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = false;
  });
  await tapController(page, 1);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('combination links cross camp and patron trees without resuming simulation, and Back restores the source', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('t');
  await page.getByRole('button', { name: 'Combinations', exact: true }).click();
  await expect(page.locator('[data-synergy]')).toHaveCount(5);
  await expect(page.locator('[data-synergy="burning-tempest"]')).toContainText('Remaining route:');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run.clan));
  await page
    .locator('[data-synergy="burning-tempest"] [data-target-node="fletchers-workshop"]')
    .click();
  await expect(page.locator('.camp-popup-heading h3')).toHaveText("Fletcher's Workshop");
  await expect(page.locator('.node-price')).toContainText('24 materials');
  await expect(page.locator('[data-nomadic-level]')).toHaveCount(3);
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run.clan))).toBe(
    before,
  );
  await closeOverlayOrPause(page);
  await expect(page.locator('[data-synergy]')).toHaveCount(5);
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
});
