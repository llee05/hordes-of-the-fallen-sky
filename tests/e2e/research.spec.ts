import { expect, test } from '@playwright/test';
import { openTitle, startExpedition, tapController } from './helpers';

test('banked research pauses only on opening the tree, spends exact ranks, and keeps unspent points', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 3;
  });
  await page.keyboard.press('t');
  await expect(page.getByRole('heading', { name: 'Patron tech tree' })).toBeVisible();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(8);
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  const first = page.locator('[data-node="power"]');
  await expect(page.locator('[data-node="haste"]')).toHaveAttribute('aria-disabled', 'true');
  await first.click();
  await expect(first).toBeFocused();
  await expect(first).toContainText('1 / 2 ranks learned');
  await expect(first).toHaveAccessibleName(/foundation 1 \/ 2 ranks learned/);
  await expect(page.locator('[data-node="haste"]')).toHaveAttribute('data-status', 'locked');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.research('power', 1); // A replayed action cannot buy another rank.
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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#research-points')).toHaveText('2');
  await page.getByRole('button', { name: /Open patron tech tree/ }).click();
  await expect(page.locator('[data-node="power"]')).toContainText('1 / 2 ranks learned');
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as any).__gloam.scene.research('power', 2));
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.upgrades.power)).toBe(1);
});

test('the tree is browsable without points, filters and searches safely, and returns to its paused parent', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Patron tech tree', exact: true }).click();
  await expect(page.locator('.tree-node[data-status="available"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hunting', exact: true }).click();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  const search = page.getByRole('searchbox', { name: 'Find a branch' });
  await search.pressSequentially('borte chino');
  await expect(search).toBeFocused();
  await expect(page.locator('[data-tree-branch]')).toHaveCount(1);
  await search.fill('no such technology');
  await expect(page.getByRole('status').filter({ hasText: 'No branches match' })).toBeVisible();
  await search.fill('');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Traditions', exact: true }).click();
  await page.getByRole('button', { name: /Open tech tree/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: 'Traditions', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('tree panels fit desktop, Steam Deck, and narrow screens and preserve scroll after research', async ({
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
      await page
        .locator('.tree-scroll')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
  }
  const vitality = page.locator('[data-node="vitality"]');
  await vitality.scrollIntoViewIfNeeded();
  const scroll = await page.locator('.tree-scroll').evaluate((element) => element.scrollTop);
  await vitality.click();
  await expect(vitality).toBeFocused();
  expect(await page.locator('.tree-scroll').evaluate((element) => element.scrollTop)).toBeCloseTo(
    scroll,
    0,
  );
  await page.screenshot({ path: 'test-results/mobile-tech-tree.png' });
});

test('controller opens the tree, learns a chosen rank once, and returns without spending other points', async ({
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
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = true;
  });
  await expect(page.locator('[data-node="wolf-trail"]')).toContainText('1 / 2 ranks learned');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.pendingUpgrades)).toBe(1);
  await page.evaluate(() => {
    (window as any).testController.buttons[0].pressed = false;
  });
  await tapController(page, 1);
  await expect(page.getByRole('dialog')).toBeHidden();
  await tapController(page, 4);
  await expect(page.getByRole('heading', { name: 'Patron tech tree' })).toBeVisible();
});
