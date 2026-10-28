import { expect, test } from '@playwright/test';
import { GAME } from '../../src/game/config';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNomadicLevel,
  openTitle,
  startExpedition,
} from './helpers';
test.describe.configure({ mode: 'parallel' });
test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    s.developerTools.invincible = s.developerTools.clanInvincible = true;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    Object.assign(s.run.clan, { materials: 4000, spirit: 2000, population: 30 });
  });
  await page.keyboard.press('b');
});

test('all nineteen buildings expose three authored levels and no retired internal-development tree', async ({
  page,
}) => {
  test.setTimeout(60000);
  let levels = 0;
  for (const id of [
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
    await selectCampBuilding(page, id);
    levels += await page.locator('[data-nomadic-level]').count();
  }
  expect(levels).toBe(57);
  await expect(page.locator('[data-camp-internal]')).toHaveCount(0);
});

test('advanced art and reserved workers remain readable and bounded across desktop and compact windows', async ({
  page,
}) => {
  await buyNomadicLevel(page, 'artisans-ger', 3);
  await expect(page.locator('[data-camp-site="artisans-ger"]')).toHaveAttribute('data-level', '3');
  await expect(
    page.locator('[data-camp-site="artisans-ger"] [data-visual-level="3"] .nomadic-ornament'),
  ).toHaveCount(2);
  expect(
    await page.evaluate(
      () => (window as any).__gloam.scene.run.clan.campEffects.multipliers.materialProduction,
    ),
  ).toBeGreaterThan(1.5);
  for (const width of [1280, 960, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.locator('.camp-popup-body').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/nomadic-advanced-artisan.png' });
});

test('healer recovery respects paused gameplay and never advances a fallen Khan succession timer', async ({
  page,
}) => {
  await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    r.health = 40;
  });
  const maximum = await page.evaluate(() => (window as any).__gloam.scene.run.stats.maxHealth);
  await buyNomadicLevel(page, 'healers-ger', 3);
  const paused = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return { health: r.health, maximum: r.stats.maxHealth };
  });
  expect(paused).toEqual({ health: 40, maximum: maximum + 15 });
  await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    r.health = 0;
    r.khan.successionRemaining = 7;
    r.patrons.hearth.revives = 0;
  });
  await buyNomadicLevel(page, 'communal-hearth', 3);
  expect(
    await page.evaluate(() => {
      const r = (window as any).__gloam.scene.run;
      return [r.health, r.khan.successionRemaining, r.patrons.hearth.revives];
    }),
  ).toEqual([0, 7, 0]);
});

test('hunting and trading arrival benefits travel with the camp and pay only at crossing completion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await buyNomadicLevel(page, 'hunting-lodge', 2);
  await buyNomadicLevel(page, 'trading-post', 2);
  await buyNomadicLevel(page, 'wagon-yard', 3);
  const before = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    Object.assign(s.run.clan, { food: 100, herd: 3, integrity: 50, stageTime: 45 });
    s.run.health = 40;
    return {
      materials: s.run.clan.materials,
      camp: structuredClone(s.run.clan.nomadicCamp),
      bonus: structuredClone(s.run.clan.campEffects.bonuses),
    };
  });
  await closeOverlayOrPause(page);
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 70;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(1);
  await page.keyboard.press('b');
  const arrived = await page.evaluate(() => {
    const r = (window as any).__gloam.scene.run;
    return {
      food: r.clan.food,
      materials: r.clan.materials,
      herd: r.clan.herd,
      resolve: r.clan.integrity,
      health: r.health,
      camp: r.clan.nomadicCamp,
    };
  });
  expect(arrived.food).toBeCloseTo(135 + before.bonus.arrivalFood, 0);
  expect(arrived.materials).toBeCloseTo(before.materials + before.bonus.arrivalMaterials, 0);
  expect(arrived.herd).toBe(5);
  expect(arrived.resolve).toBeCloseTo(
    50 + GAME.crossings.safeResolve + GAME.clan.arrival.resolve,
    0,
  );
  expect(arrived.health).toBeCloseTo(40 + GAME.clan.arrival.health, 0);
  expect(arrived.camp).toEqual(before.camp);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile')!).camp);
  expect(saved.nomadicCamp).toEqual(before.camp);
  await page.screenshot({ path: 'test-results/nomadic-arrival.png' });
});

test('shaman upgrades strengthen actual burning damage without a new damage subsystem', async ({
  page,
}) => {
  await buyNomadicLevel(page, 'shamans-ger', 3);
  await closeOverlayOrPause(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    for (let i = 0; i < 10 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const e = s.enemies.getChildren().find((actor: any) => actor.active);
    e.health = e.maxHealth = 100;
    e.burning = 1;
    e.definition = { ...e.definition, speed: 0 };
    e.setPosition(s.player.x + 120, s.player.y);
    s.updateEnemies(0.2);
    return { health: e.health, multiplier: s.run.clan.campEffects.multipliers.burnDamage };
  });
  expect(result.multiplier).toBeCloseTo(1.331);
  expect(result.health).toBeCloseTo(98.08336);
});

test('archery, training, fletching and sacred upgrades alter real volleys and support fire', async ({
  page,
}) => {
  test.setTimeout(60000);
  for (const id of [
    'archery-range',
    'warriors-training-ground',
    'fletchers-workshop',
    'sacred-ovoo',
  ])
    await buyNomadicLevel(page, id, 3);
  await buyNomadicLevel(page, 'shamans-ger');
  await closeOverlayOrPause(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__gloam.scene.riders.filter((r: any) => r.visible).length,
      ),
    )
    .toBe(4);
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    for (let i = 0; i < 10 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const e = s.enemies.getChildren().find((actor: any) => actor.active);
    e.health = e.maxHealth = 10000;
    e.definition = { ...e.definition, speed: 0 };
    e.setPosition(s.player.x + 360, s.player.y);
    for (const shot of s.projectiles.getChildren()) shot.disableBody(true, true);
    s.spatial.rebuild(s.enemies.getChildren());
    s.fire();
    const shots = s.projectiles.getChildren().filter((p: any) => p.active);
    const interval = s.attackTimer;
    const player = shots.filter((p: any) => p.x === s.player.x && p.y === s.player.y);
    const damage = shots.map((p: any) => p.damage);
    s.supportTimer = s.wagonTimer = 0;
    s.updateSupport(0.01);
    return {
      interval,
      player: player.length,
      fire: player.some((p: any) => p.fire),
      damage,
      support: s.supportTimer,
      wagon: s.projectiles
        .getChildren()
        .filter((p: any) => p.active && p.x === s.camp.x && p.y === s.camp.y)
        .map((p: any) => p.damage),
      pierce: s.run.patrons.bow.pierce,
    };
  });
  expect(result.player).toBeGreaterThanOrEqual(2);
  expect(result.fire).toBe(true);
  expect(result.pierce).toBe(2);
  expect(result.interval).toBeCloseTo(0.514425);
  expect(result.damage.some((damage: number) => Math.abs(damage - 15.1734) < 0.001)).toBe(true);
  expect(result.support).toBeCloseTo(1.543275);
  expect(result.wagon).toEqual([28.5, 28.5, 28.5]);
});
