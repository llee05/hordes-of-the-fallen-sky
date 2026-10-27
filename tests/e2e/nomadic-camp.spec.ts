import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.developerTools.invincible = scene.developerTools.clanInvincible = true;
    scene.spawnTimer = scene.attackTimer = 999;
    Object.assign(scene.run.clan, { materials: 2000, spirit: 500, population: 30 });
  });
  await page.keyboard.press('b');
});

test('the estate opens building details and assigns construction to the selected plot atomically', async ({
  page,
}) => {
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await expect(page.locator('.camp-encampment')).toBeVisible();
  await expect(page.locator('.camp-map-internals button')).toHaveCount(6);
  await expect(page.locator('.camp-map-facilities > button')).toHaveCount(6);
  await expect(page.locator('[data-camp-slot][data-unlocked="true"]')).toHaveCount(1);
  await expect(page.locator('[data-camp-slot][data-unlocked="false"]')).toHaveCount(4);
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.locator('[data-tree-search]').fill('archery');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-camp-dismiss]')).toBeFocused();
  await page.locator('[data-tree-recipes]').click();
  await expect(page.locator('[data-synergy]')).toHaveCount(5);
  await page.locator('.camp-map-facilities [data-camp-site="ger"]').click();
  await expect(page.locator('.camp-popup-heading h3')).toHaveText('Family gers');
  await expect(page.locator('[data-synergy]')).toHaveCount(0);
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-slot="1"]').click();
  await page.locator('[data-camp-site="archery"]').click();
  await expect(page.locator('.camp-popup h3').first()).toHaveText('Archery grounds');
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.locator('.tree-purchase').click();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.estate.slots[1])).toBe(
    'archery',
  );
  await expect(page.locator('.camp-popup')).toContainText('Building level 1 / 4');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await expect(page.locator('.immersive-camp')).toBeVisible();
  await expect(page.locator('[data-camp-site="archery"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('central tiers, internal ranks and a real felt specialisation share the camp without extra panels', async ({
  page,
}) => {
  test.setTimeout(process.env.CI ? 90000 : 60000);
  await page.setViewportSize({ width: 960, height: 600 });
  await page.locator('[data-camp-encampment]').click();
  await page.locator('.tree-purchase').click(); // Established Encampment.
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-site="ger"]').click();
  await page.locator('.tree-purchase').click(); // Family gers level 2.
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-encampment]').click();
  await page.locator('.tree-purchase').click(); // Prosperous Ordo.
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-site="ger"]').click();
  await page.locator('.tree-purchase').click(); // Family gers level 3.
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-encampment]').click();
  await page.locator('.tree-purchase').click();
  await page.locator('.tree-purchase').click();
  await expect(page.locator('.camp-encampment')).toContainText('Imperial Ordo');
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-internal="clan-council"]').click();
  await page.locator('.tree-purchase').click();
  await page.locator('.tree-purchase').click();
  expect(
    await page.evaluate(
      () => (window as any).__gloam.scene.run.clan.campEffects.multipliers.consumption,
    ),
  ).toBeCloseTo(0.95 * 0.95);
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-slot="1"]').click();
  await page.locator('[data-camp-site="felt"]').click();
  await page.locator('.tree-purchase').click();
  await page.locator('.tree-purchase').click();
  await page.locator('.tree-purchase').click();
  await page.locator('[data-camp-foldout]').click();
  await page.locator('[data-node="felt-fine-felt"]').click();
  await page.locator('.tree-purchase').click();
  await expect(page.locator('[data-camp-site="felt"]')).toHaveAttribute('data-level', '4');
  await expect(page.locator('[data-node="felt-reinforced-felt"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  const materials = await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials);
  await page.evaluate(() => (window as any).__gloam.scene.construct('felt', 'fine-felt'));
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.materials)).toBe(
    materials,
  );
  await page.screenshot({ path: 'test-results/nomadic-camp-foldout.png' });
});

test('the estate and its details fit desktop, Steam Deck and narrow windows without advancing the world', async ({
  page,
}) => {
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('[data-camp-encampment]').click();
    const popup = (await page.locator('.camp-popup').boundingBox())!;
    expect(popup.x).toBeGreaterThanOrEqual(0);
    expect(popup.y).toBeGreaterThanOrEqual(0);
    expect(popup.x + popup.width).toBeLessThanOrEqual(size.width);
    expect(popup.y + popup.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({ path: `test-results/nomadic-camp-${size.width}.png` });
    await page.locator('[data-camp-foldout]').click();
    const expanded = (await page.locator('.camp-popup-foldout').boundingBox())!;
    const purchase = (await page.locator('.tree-purchase').boundingBox())!;
    expect(expanded.y + expanded.height).toBeLessThanOrEqual(size.height);
    expect(purchase.y + purchase.height).toBeLessThanOrEqual(size.height);
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
});

test('saved camp organisation and stores survive reload without replaying welcome or food gifts', async ({
  page,
}) => {
  await page.locator('[data-camp-encampment]').click();
  await page.locator('.tree-purchase').click();
  await page.locator('[data-camp-dismiss]').click();
  await page.locator('[data-camp-slot="1"]').click();
  await page.locator('[data-camp-site="herd"]').click();
  await page.locator('.tree-purchase').click();
  await page.locator('[data-camp-foldout]').click();
  await page.locator('.camp-crafts summary').click();
  await page.locator('[data-node="herd-winter-stores"]').click();
  await page.locator('.tree-purchase').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('gloam-profile')!).camp.paths.herd?.includes(
          'winter-stores',
        ),
      ),
    )
    .toBe(true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile')!).camp);
  await page.reload();
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await page.getByRole('button', { name: 'Continue clan camp', exact: true }).click();
  await page.keyboard.press('b');
  const restored = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return {
      tier: r.clan.estate.tier,
      slots: r.clan.estate.slots,
      herd: r.clan.herd,
      food: r.clan.food,
      population: r.clan.population,
      paths: r.clan.paths.herd,
    };
  });
  expect(restored.tier).toBe(2);
  expect(restored.slots[1]).toBe('herd');
  expect(restored.paths).toContain('winter-stores');
  expect(restored.population).toBe(saved.supplies.population);
  expect(restored.herd).toBe(saved.supplies.herd);
  expect(restored.food).toBeCloseTo(saved.supplies.food, 0);
  await expect(page.locator('.camp-encampment')).toContainText('Established Encampment');
});
