import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';
test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
  });
});
test('successor preferences respect menus and take effect only after the existing countdown', async ({
  page,
}) => {
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.invulnerable = 0;
    s.takeDamage(1000);
  });
  await expect(page.locator('#successor-choice')).toBeVisible();
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 800, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    const box = await page.locator('#successor-choice').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const choice = document.querySelector('#successor-choice')!.getBoundingClientRect();
          return ['#research', '.vitals-hud', '.objective-hud', '#field-guide'].every((id) => {
            const element = document.querySelector<HTMLElement>(id)!;
            if (element.hidden) return true;
            const r = element.getBoundingClientRect();
            return !(
              choice.x < r.right &&
              choice.right > r.x &&
              choice.y < r.bottom &&
              choice.bottom > r.y
            );
          });
        }),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('#pause').click();
  await page.keyboard.press('1');
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.khan.candidate),
  ).toBeUndefined();
  await page.keyboard.press('Escape');
  await page.locator('[data-successor="hearthguard"]').click();
  await expect(page.locator('[data-successor="hearthguard"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const waiting = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    const health = s.run.health;
    s.run.khan.successionRemaining = 0.05;
    return health;
  });
  expect(waiting).toBe(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.khan.generation))
    .toBe(2);
  await expect(page.locator('#successor-choice')).toBeHidden();
  const returned = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.invulnerable = 0;
    s.takeDamage(10);
    return {
      health: s.run.health,
      trait: s.run.khan.trait,
      record: s.run.legacy.khans.at(-1).trait,
      revives: s.run.patrons.hearth.revives,
    };
  });
  expect(returned).toEqual({
    health: 90.8,
    trait: 'hearthguard',
    record: 'hearthguard',
    revives: 0,
  });
});
test('camp threats show a screen direction and losses distinguish attacks from hunger', async ({
  page,
}) => {
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnEnemy();
    const e = s.enemies.getFirstAlive();
    e.setPosition(s.camp.x + 118, s.camp.y);
    e.definition = { ...e.definition, speed: 0 };
    s.damageClan(35);
    s.callbacks.onHud(s.snapshot());
  });
  await expect(page.locator('#camp-pressure')).toContainText('at the barricade');
  await expect(page.locator('#clan-losses')).toContainText('Enemy attacks');
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    s.run.clan.food = 0;
    s.run.clan.pasture = 0;
    s.run.clan.stageTime = 11.99;
    s.update(0, 50);
  });
  await expect(page.locator('#clan-losses')).toContainText('Starvation');
  const losses = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return {
      combat: r.safety.combatLosses,
      hunger: r.safety.starvationLosses,
      total: r.story.peopleLost,
    };
  });
  expect(losses.combat).toBeGreaterThan(0);
  expect(losses.hunger).toBeGreaterThan(0);
  expect(losses.combat + losses.hunger).toBe(losses.total);
});
