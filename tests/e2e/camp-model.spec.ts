import { expect, test } from '@playwright/test';
import {
  buyNomadicLevel,
  closeOverlayOrPause,
  openTitle,
  selectCampBuilding,
  startExpedition,
  tapController,
} from './helpers';

// Tests use isolated browser contexts; parallel mode also balances CI shards.
test.describe.configure({ mode: 'parallel' });

test('the manuscript camp reflects real developments, freezes the world, and respects reduced motion', async ({
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
  await selectCampBuilding(page, 'archery-range');
  await expect(page.locator('.camp-popup')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  expect(
    await page.locator('.camp-model').evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await buyNomadicLevel(page, 'archery-range');
  await buyNomadicLevel(page, 'archery-range', 2);
  await expect(page.locator('[data-camp-site="archery-range"]')).toHaveAttribute(
    'data-established',
    'true',
  );
  await expect(page.locator('.camp-facility[data-camp-site="archery-range"]')).toContainText(
    'Level 2',
  );
  await expect(page.locator('.camp-facility[data-camp-site="archery-range"]')).toContainText(
    'Military',
  );
  const after = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await selectCampBuilding(page, 'archery-range');
  await page.locator('[data-disclosure-key="nomadic-levels"] summary').click();
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(after);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.locator('.camp-estate').evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
});

for (const size of [
  { width: 1280, height: 800 },
  { width: 960, height: 600 },
  { width: 390, height: 844 },
])
  test(`all facilities remain inspectable from the estate or search at supported viewport sizes at ${size.width}×${size.height}`, async ({
    page,
  }) => {
    test.setTimeout(process.env.CI ? 90000 : 60000);
    await openTitle(page);
    await startExpedition(page);
    await page.keyboard.press('b');
    await page.setViewportSize(size);
    await expect(page.locator('.camp-map-cores button')).toHaveCount(5);
    await expect(page.locator('[data-camp-slot]')).toHaveCount(5);
    if (size.width > 760) {
      const plaques = await page.locator('.camp-plaque').evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect(),
            badge = el.querySelector('.camp-plaque-badge')!.getBoundingClientRect();
          const x = Math.min(rect.x, badge.x),
            y = Math.min(rect.y, badge.y);
          return {
            name: el.textContent?.trim(),
            plaque: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            badge: { x: badge.x, y: badge.y, width: badge.width, height: badge.height },
            x,
            y,
            width: Math.max(rect.right, badge.right) - x,
            height: Math.max(rect.bottom, badge.bottom) - y,
          };
        }),
      );
      const mapDimensions = await page.locator('.camp-map-scroll').evaluate((el) => ({
        width: el.clientWidth,
        height: el.clientHeight,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
      }));
      expect(mapDimensions.scrollHeight).toBeLessThanOrEqual(mapDimensions.height);
      expect(mapDimensions.scrollWidth).toBeLessThanOrEqual(mapDimensions.width);
      for (const p of plaques) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width).toBeLessThanOrEqual(size.width);
        expect(p.y + p.height).toBeLessThanOrEqual(size.height);
      }
      for (let i = 0; i < plaques.length; i++)
        for (const q of plaques.slice(i + 1)) {
          const p = plaques[i]!;
          expect(
            p.x + p.width <= q.x ||
              q.x + q.width <= p.x ||
              p.y + p.height <= q.y ||
              q.y + q.height <= p.y,
            `Overlapping plaques: ${JSON.stringify(p)} / ${JSON.stringify(q)}`,
          ).toBe(true);
        }
    }
    await page.locator('[data-camp-encampment]').click();
    const details = (await page.locator('.camp-popup').boundingBox())!;
    expect(details.x + details.width).toBeLessThanOrEqual(size.width);
    expect(details.y + details.height).toBeLessThanOrEqual(size.height);
    await page.locator('[data-camp-dismiss]').click();
    for (const site of [
      'khans-ger',
      'horse-lines',
      'herding-grounds',
      'communal-hearth',
      'wagon-yard',
      'archery-range',
      'smiths-forge',
      'warriors-training-ground',
      'scouts-watchpost',
      'fletchers-workshop',
      'palisade-watchfires',
      'hunting-lodge',
      'artisans-ger',
      'trading-post',
      'healers-ger',
      'sacred-ovoo',
      'shamans-ger',
      'ancestral-standard',
      'storytellers-hearth',
    ]) {
      await selectCampBuilding(page, site);
      await expect(page.locator('[data-nomadic-purchase]')).toHaveAttribute(
        'data-nomadic-purchase',
        site,
      );
      await expect(page.locator('[data-nomadic-level]')).toHaveCount(3);
    }
    expect(
      await page.locator('.camp-estate').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await page.locator('[data-camp-dismiss]').click();
    const search = page.getByRole('searchbox', { name: 'Find in camp' });
    await search.fill('healer');
    await expect(page.locator('.camp-building-choice')).toHaveCount(1);
    await search.fill('no-such-building');
    await expect(page.locator('.camp-popup').getByRole('status')).toContainText(
      'No matching buildings',
    );
    await search.fill('hunting');
    await page.locator('[data-nomadic-site="hunting-lodge"]').click();
    await expect(search).toHaveValue('');
    await expect(page.locator('.camp-popup-heading')).toContainText('Hunting Lodge');
  });

test('controller confirms inspection and explicit purchase; Back dismisses the details first', async ({
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
  await expect(page.locator('[data-camp-site="horse-lines"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.camp-popup-heading')).toContainText('Horse Lines');
  await tapController(page, 1);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-camp-slot="0"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.camp-popup')).toBeVisible();
  await tapController(page, 1);
  await expect(page.locator('[data-camp-slot="0"]')).toBeFocused();
  await selectCampBuilding(page, 'archery-range', false);
  await page.keyboard.press('ArrowLeft');
  expect(
    await page.locator('.camp-popup').evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tree-purchase')).toBeFocused();
  await tapController(page, 0);
  await expect(page.locator('[data-camp-site="archery-range"]')).toHaveAttribute(
    'data-established',
    'true',
  );
  await tapController(page, 1);
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await tapController(page, 1);
  await expect(page.getByRole('dialog')).toBeHidden();
});
