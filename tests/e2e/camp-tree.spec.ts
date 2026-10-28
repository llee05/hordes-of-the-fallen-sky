import { expect, test } from '@playwright/test';
import {
  openTitle,
  startExpedition,
  selectCampBuilding,
  buyNomadicLevel,
  closeOverlayOrPause,
} from './helpers';

test('camp construction previews real resources, worker reservation and headquarters prerequisites', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.materials = 500;
    s.run.clan.spirit = 0;
    s.run.clan.population = 1;
  });
  await page.keyboard.press('b');
  await expect(page.locator('.camp-map-cores button')).toHaveCount(5);
  await expect(page.locator('[data-camp-slot]')).toHaveCount(5);
  await selectCampBuilding(page, 'sacred-ovoo');
  await expect(page.locator('.node-price')).toContainText('8 Spirit');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await selectCampBuilding(page, 'archery-range');
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await expect(page.locator('.node-price')).toContainText('24 materials');
  await expect(page.locator('.camp-gains')).toContainText('Shared attack damage');
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await buyNomadicLevel(page, 'archery-range');
  await expect(page.locator('.node-purchase-status')).toContainText("Khan's Ger level 2");
  await selectCampBuilding(page, 'smiths-forge');
  await expect(page.locator('.node-purchase-status')).toContainText('More families needed');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.population = 8;
  });
  await page.keyboard.press('b');
  await buyNomadicLevel(page, 'archery-range', 3);
  await expect(page.locator('[data-camp-site="archery-range"]')).toHaveAttribute('data-level', '3');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  const completed = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.evaluate(() => (window as any).__gloam.scene.improveNomadicCamp('archery-range'));
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
    completed,
  );
});

test('authored building effects and cost changes flow through the inspector and real purchase', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(async () => {
    const { NOMADIC_BUILDINGS } = await import(
      // @ts-expect-error -- Vite browser module, not a Node import.
      '/src/game/data/nomadicCamp.ts'
    );
    const level = NOMADIC_BUILDINGS.find((b: any) => b.id === 'archery-range').levels[0];
    level.cost.materials = 19;
    level.effects.player.damage = 3;
  });
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'archery-range');
  await expect(page.locator('.node-price')).toContainText('19 materials');
  const before = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return { damage: r.stats.damage, materials: r.clan.materials };
  });
  await page.locator('.tree-purchase').click();
  expect(
    await page.evaluate(() => {
      const r = (window as any).__gloam.scene.run;
      return { damage: r.stats.damage, materials: r.clan.materials };
    }),
  ).toEqual({ damage: before.damage + 3, materials: before.materials - 19 });
  await expect(page.locator('[data-nomadic-level]')).toHaveCount(3);
});

test('parchments remain bounded and search recoverable at desktop and compact sizes', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('b');
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await selectCampBuilding(page, 'wagon-yard');
    const box = (await page.locator('.camp-popup').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    await page.locator('[data-disclosure-key="nomadic-levels"] summary').click();
    await expect(page.locator('[data-nomadic-level="3"]')).toContainText('Advanced');
    await page.locator('[data-camp-dismiss]').click();
  }
  await page.getByRole('searchbox', { name: 'Find in camp' }).fill('rare trade');
  await expect(page.locator('.camp-building-choice')).toHaveCount(1);
  await page.locator('[data-nomadic-site="trading-post"]').click();
  await expect(page.locator('.camp-popup-heading')).toContainText('Trading Post');
  await expect(page.locator('.camp-popup')).toContainText('Planned · trade rates');
});
