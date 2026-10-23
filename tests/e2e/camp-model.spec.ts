import { expect, test } from '@playwright/test';
import { openTitle, startExpedition, tapController } from './helpers';

test('the animated miniature inspects without purchasing, reflects developments, and keeps the world frozen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.materials = 200;
  });
  await page.keyboard.press('b');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  const archery = page.locator('[data-camp-site="archery"]');
  await archery.click();
  await expect(archery).toBeFocused();
  await expect(archery).toHaveAttribute('aria-pressed', 'true');
  await expect(archery).toHaveAttribute('data-established', 'false');
  await expect(page.locator('[data-tree-branch="archery"]')).toBeVisible();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  expect(
    await page
      .locator('.camp-model')
      .evaluate((model) => model.getAnimations({ subtree: true }).length),
  ).toBeGreaterThan(0);
  await page.locator('[data-node="archery-base"]').click();
  await expect(archery).toHaveAttribute('data-established', 'true');
  await expect(page.locator('[data-node="archery-base"]')).toBeFocused();
  await page.locator('[data-node="archery-seasoned-bowyers"]').click();
  await expect(archery).toHaveAttribute('data-level', '1');
  await expect(archery.locator('.camp-supply')).toHaveCount(1);
  const after = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  // A learned action is inspectable but cannot be charged a second time.
  await page.locator('[data-node="archery-seasoned-bowyers"]').dispatchEvent('click');
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(after);
  await page.screenshot({ path: 'test-results/camp-model.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.camp-estate')
      .evaluate((model) => model.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(
    await page
      .locator('.camp-model')
      .evaluate((model) => model.getAnimations({ subtree: true }).length),
  ).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__gloam.scene.physics.world.isPaused)).toBe(
    false,
  );
});

test('every camp site can be selected at desktop, Steam Deck, and narrow sizes; search is recoverable', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('b');
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const site of [
      'ger',
      'archery',
      'herd',
      'sanctuary',
      'wagon',
      'felt',
      'provisions',
      'relay',
    ]) {
      await page.locator(`[data-camp-site="${site}"]`).click();
      await expect(page.locator(`[data-tree-branch="${site}"]`)).toBeVisible();
    }
    expect(
      await page
        .locator('.camp-estate')
        .evaluate((panel) => panel.scrollWidth <= panel.clientWidth + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/camp-model-narrow.png' });
  const search = page.getByRole('searchbox', { name: 'Find in camp' });
  await search.fill('ortoo');
  await expect(page.locator('[data-camp-site][data-match="true"]')).toHaveCount(1);
  await expect(page.locator('[data-tree-branch="relay"]')).toBeVisible();
  await search.fill('no-such-building');
  await expect(page.locator('.camp-inspector').getByRole('status')).toContainText(
    'No matching sites',
  );
  await expect(page.locator('.tree-node')).toHaveCount(0);
  await page.locator('[data-camp-site="herd"]').click();
  await expect(search).toHaveValue('');
  await expect(page.locator('[data-tree-branch="herd"]')).toBeVisible();
});

test('keyboard and controller select miniatures before confirming a purchase', async ({ page }) => {
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
  await tapController(page, 2);
  await expect(page.locator('[data-camp-site="ger"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-camp-site="archery"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tree-branch="archery"]')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-camp-site="herd"]')).toBeFocused();
  await tapController(page, 0);
  await expect(page.locator('[data-tree-branch="herd"]')).toBeVisible();
  await expect(page.locator('[data-camp-site="herd"]')).toHaveAttribute(
    'data-established',
    'false',
  );
  await page.locator('[data-node="herd-base"]').focus();
  await tapController(page, 0);
  await expect(page.locator('[data-camp-site="herd"]')).toHaveAttribute('data-established', 'true');
  await expect(page.locator('[data-node="herd-base"]')).toBeFocused();
  await tapController(page, 1);
  await expect(page.getByRole('dialog')).toBeHidden();
});
