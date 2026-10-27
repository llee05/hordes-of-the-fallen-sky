import { expect, test } from '@playwright/test';
import { openTitle, startExpedition, selectCampBuilding, buyNomadicLevel } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.developerTools.invincible = s.developerTools.clanInvincible = true;
    s.spawnTimer = s.attackTimer = 999;
    Object.assign(s.run.clan, { materials: 2000, spirit: 500, population: 30 });
  });
  await page.keyboard.press('b');
});

test('five permanent cores and five optional locations assign purchases atomically', async ({
  page,
}) => {
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await expect(page.locator('.camp-map-cores button')).toHaveCount(5);
  await expect(page.locator('[data-camp-slot]')).toHaveCount(5);
  await page.locator('[data-camp-slot="3"]').click();
  await expect(page.locator('.camp-building-choice')).toHaveCount(14);
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.locator('[data-nomadic-site="archery-range"]').click();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.locator('.tree-purchase').click();
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.clan.nomadicCamp.slots[3]),
  ).toEqual({ id: 'archery-range', level: 1 });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-camp-site="archery-range"]')).toBeFocused();
  await page.locator('[data-camp-slot="0"]').click();
  await expect(page.locator('.camp-building-choice')).toHaveCount(13);
  await expect(
    page.locator('.camp-building-choice[data-nomadic-site="archery-range"]'),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('headquarters unlock three visible ranks and core buildings never consume optional slots', async ({
  page,
}) => {
  await buyNomadicLevel(page, 'khans-ger', 3);
  for (const id of ['horse-lines', 'herding-grounds', 'communal-hearth', 'wagon-yard'])
    await buyNomadicLevel(page, id, 3);
  await expect(page.locator('[data-camp-slot]')).toHaveCount(5);
  await expect(page.locator('.camp-map-cores [data-visual-level="3"]')).toHaveCount(5);
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => (window as any).__gloam.scene.improveNomadicCamp('khans-ger'));
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.screenshot({ path: 'test-results/nomadic-core-levels.png' });
});

test('only five distinct optional workplaces can be owned while the full map stays inspectable', async ({
  page,
}) => {
  for (const id of [
    'archery-range',
    'smiths-forge',
    'scouts-watchpost',
    'healers-ger',
    'trading-post',
  ])
    await buyNomadicLevel(page, id);
  await expect(page.locator('[data-camp-slot]')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.clan.nomadicCamp.slots.length),
  ).toBe(5);
  await selectCampBuilding(page, 'hunting-lodge');
  await expect(page.locator('.node-purchase-status')).toContainText('All five optional slots');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => (window as any).__gloam.scene.improveNomadicCamp('hunting-lodge'));
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
});

test('camp ownership and all ranks survive reload without replaying gifts or effects', async ({
  page,
}) => {
  await buyNomadicLevel(page, 'healers-ger', 3);
  await buyNomadicLevel(page, 'trading-post', 2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('gloam-profile')!).camp.nomadicCamp.slots.some(
          (slot: any) => slot?.id === 'healers-ger' && slot.level === 3,
        ),
      ),
    )
    .toBe(true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile')!).camp);
  const effects = await page.evaluate(() => (window as any).__gloam.scene.run.clan.campEffects);
  const health = await page.evaluate(() => (window as any).__gloam.scene.run.stats.maxHealth);
  await page.reload();
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await expect(page.getByRole('button', { name: 'Continue clan camp', exact: true })).toBeVisible();
  // Freeze through the normal public action before a gameplay frame can gather materials.
  await page.evaluate(() => {
    (document.querySelector('[data-action="continue-camp"]') as HTMLButtonElement).click();
    (window as any).__gloam.scene.openBuildings();
  });
  const restored = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return {
      camp: r.clan.nomadicCamp,
      materials: r.clan.materials,
      food: r.clan.food,
      population: r.clan.population,
      effects: r.clan.campEffects,
      health: r.stats.maxHealth,
    };
  });
  expect(restored.camp).toEqual(saved.nomadicCamp);
  expect(restored.materials).toBe(saved.supplies.materials);
  expect(restored.food).toBeCloseTo(saved.supplies.food, 0);
  expect(restored.population).toBe(saved.supplies.population);
  expect(restored.effects).toEqual(effects);
  expect(restored.health).toBe(health);
});
