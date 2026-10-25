import { expect, test } from '@playwright/test';
import {
  buyNode,
  closeOverlayOrPause,
  openTitle,
  selectCampBuilding,
  startExpedition,
  tapController,
} from './helpers';

test('the painted scene reflects real developments, freezes the world, and respects reduced motion', async ({
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
  await selectCampBuilding(page, 'archery');
  await expect(page.locator('.camp-popup')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  expect(
    await page.locator('.camp-model').evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBeGreaterThan(0);
  await buyNode(page, 'archery-base');
  await buyNode(page, 'archery-seasoned-bowyers');
  await expect(page.locator('[data-camp-site="archery"]')).toHaveAttribute(
    'data-established',
    'true',
  );
  await expect(page.locator('[data-camp-site="archery"] .camp-supply')).toHaveCount(1);
  const after = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await selectCampBuilding(page, 'archery');
  await page.locator('.camp-crafts summary').click();
  await page.locator('[data-node="archery-seasoned-bowyers"]').click();
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(after);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.locator('.camp-estate').evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('all facilities remain inspectable from the painting or search at supported viewport sizes', async ({
  page,
}) => {
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('b');
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
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
      await selectCampBuilding(page, site);
      await expect(page.locator(`[data-tree-branch="${site}"]`)).toBeVisible();
    }
    expect(
      await page.locator('.camp-estate').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
  }
  await page.locator('[data-camp-dismiss]').click();
  const search = page.getByRole('searchbox', { name: 'Find in camp' });
  await search.fill('ortoo');
  await expect(page.locator('.camp-building-choice')).toHaveCount(1);
  await search.fill('no-such-building');
  await expect(page.locator('.camp-popup').getByRole('status')).toContainText('No matching crafts');
  await search.fill('herd');
  await page.locator('[data-camp-site="herd"]').click();
  await expect(search).toHaveValue('');
  await expect(page.locator('.camp-popup-heading')).toContainText('Herding grounds');
});

test('controller confirms inspection and explicit purchase; Back dismisses the parchment first', async ({
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
  await tapController(page, 2);
  await expect(page.locator('[data-camp-encampment]')).toBeFocused();
  await tapController(page, 0);
  await expect(page.locator('.camp-popup')).toBeVisible();
  await tapController(page, 1);
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-camp-site="ger"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.camp-popup')).toBeVisible();
  await tapController(page, 1);
  await expect(page.locator('[data-camp-site="ger"]')).toBeFocused();
  await selectCampBuilding(page, 'herd', false);
  await page.keyboard.press('ArrowLeft');
  expect(
    await page.locator('.camp-popup').evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tree-purchase')).toBeFocused();
  await tapController(page, 0);
  await expect(page.locator('[data-camp-site="herd"]')).toHaveAttribute('data-established', 'true');
  await tapController(page, 1);
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await tapController(page, 1);
  await expect(page.getByRole('dialog')).toBeHidden();
});
