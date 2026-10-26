import { expect, test, type Page } from '@playwright/test';
import { closeOverlayOrPause, buyNode, openTitle, startExpedition } from './helpers';

// Tests use isolated browser contexts; parallel mode also balances CI shards.
test.describe.configure({ mode: 'parallel' });

async function fall(page: Page) {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
  });
  await expect(page.getByText('Choosing a new Khan', { exact: true })).toBeVisible();
}

async function chooseSoon(page: Page, generation: number) {
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.khan.successionRemaining = 0.1;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.khan.generation))
    .toBe(generation);
  await expect(page.locator('#khan-succession')).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
});

test('the clan fights on while choosing a new Khan, who returns protected at camp', async ({
  page,
}) => {
  await expect(page.locator('.health-heading').first()).toContainText('THE KHAN');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.setPosition(scene.camp.x + 600, scene.camp.y);
    scene.run.upgrades.power = 1;
    scene.run.stats.damage = 20;
    scene.run.pendingUpgrades = 3;
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.setPosition(scene.camp.x + 60, scene.camp.y);
    enemy.health = enemy.maxHealth = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
  });
  await fall(page);
  await expect(page.locator('#dash')).toBeDisabled();
  const waiting = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      phase: scene.run.phase,
      active: scene.player.active,
      body: scene.player.body.enable,
      visible: scene.player.visible,
      shadow: scene.shadow.visible,
      health: scene.run.health,
      remaining: scene.run.khan.successionRemaining,
      elapsed: scene.run.elapsed,
    };
  });
  expect(waiting).toMatchObject({
    phase: 'playing',
    active: false,
    body: false,
    visible: false,
    shadow: false,
    health: 0,
  });
  expect(waiting.remaining).toBeGreaterThan(9);
  await page.keyboard.down('d');
  await page.keyboard.press('Space');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.integrity))
    .toBeLessThan(100);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.momentum)).toBe(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.dashRemaining)).toBe(0);
  await page.keyboard.up('d');
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const progress = (await page.locator('.tradition-hud').boundingBox())!;
    const vitals = (await page.locator('.vitals-hud').boundingBox())!;
    expect(progress.y).toBeGreaterThanOrEqual(0);
    expect(progress.y + progress.height).toBeLessThanOrEqual(vitals.y);
  }
  await page.screenshot({ path: 'test-results/mobile-khan-succession.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/choosing-new-khan.png' });
  await chooseSoon(page, 2);
  const chosen = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.takeDamage(1000); // The new Khan's entry protection prevents an immediate repeat death.
    return {
      active: scene.player.active,
      body: scene.player.body.enable,
      health: scene.run.health,
      x: scene.player.x - scene.camp.x,
      y: scene.player.y - scene.camp.y,
      protection: scene.invulnerable,
      points: scene.run.pendingUpgrades,
      damage: scene.run.stats.damage,
      learned: scene.run.upgrades.power,
    };
  });
  expect(chosen).toMatchObject({
    active: true,
    body: true,
    health: 100,
    points: 3,
    damage: 20,
    learned: 1,
  });
  expect(Math.abs(chosen.x)).toBeLessThan(3);
  expect(chosen.y).toBeCloseTo(90, 0);
  expect(chosen.protection).toBeGreaterThan(2);
  await expect(page.locator('#khan-title')).toHaveText('THE KHAN · 2');
  await expect(page.locator('#dash')).toBeEnabled();
});

test('pause and research freeze succession, and healing research cannot bypass the delay', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.pendingUpgrades = 2;
    scene.run.patrons.hearth.regeneration = 100;
  });
  await fall(page);
  await closeOverlayOrPause(page);
  const before = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(before);
  await page.getByRole('button', { name: 'Patron tech tree', exact: true }).click();
  await buyNode(page, 'vitality');
  const state = await page.evaluate(() => (window as any).__gloam.scene.run);
  expect(state.health).toBe(0);
  expect(state.stats.maxHealth).toBe(120);
  expect(state.khan.successionRemaining).toBe(JSON.parse(before).khan.successionRemaining);
  await closeOverlayOrPause(page);
  await closeOverlayOrPause(page);
  await chooseSoon(page, 2);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.health)).toBe(120);
});

test('successors return to the moving caravan and an arrival cannot end succession early', async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 45;
  });
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 25;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.camp.x))
    .toBeGreaterThan(2800);
  await fall(page);
  await chooseSoon(page, 2);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return Math.abs(scene.player.x - scene.camp.x);
    }),
  ).toBeLessThan(5);
  await fall(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 70;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(1);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.health)).toBe(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.player.body.enable)).toBe(false);
  await chooseSoon(page, 3);
  expect(await page.evaluate(() => (window as any).__gloam.scene.player.x)).toBeCloseTo(2600, 0);
});

test('ancestral echoes defend camp during succession and uncollected XP waits for the new Khan', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.patrons.ancestors.count = 2;
    scene.player.setPosition(scene.camp.x + 600, scene.camp.y);
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getChildren().find((actor: any) => actor.active);
    enemy.setPosition(scene.camp.x + 220, scene.camp.y);
    enemy.health = enemy.maxHealth = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
  });
  await fall(page);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.enemies.getFirstAlive().health), {
      timeout: 60000,
    })
    .toBeLessThan(10000);
  const collection = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const gem = scene.gems.get(scene.camp.x, scene.camp.y + 90, 'gem');
    gem.enableBody(true, scene.camp.x, scene.camp.y + 90, true, true);
    gem.value = 8;
    gem.attracted = true;
    scene.collectGems(1);
    return {
      level: scene.run.level,
      active: gem.active,
      echoes: scene.patronSupport.spirits
        .filter((spirit: any) => spirit.image.visible)
        .map((spirit: any) =>
          Math.hypot(spirit.image.x - scene.camp.x, spirit.image.y - scene.camp.y),
        ),
    };
  });
  expect(collection.level).toBe(1);
  expect(collection.active).toBe(true);
  expect(collection.echoes).toHaveLength(2);
  expect(collection.echoes.every((distance: number) => distance < 100)).toBe(true);
  await chooseSoon(page, 2);
  await expect.poll(() => page.evaluate(() => (window as any).__gloam.scene.run.level)).toBe(2);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('losing the clan during succession ends the expedition and a fresh run resets the Khan lineage', async ({
  page,
}) => {
  await fall(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.khan.generation)).toBe(1);
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.khan)).toEqual({
    generation: 1,
    successionRemaining: 0,
  });
});

test('the clan can complete the final stand while choosing a new Khan', async ({ page }) => {
  await fall(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.stage = 'final';
    scene.run.clan.region = 3;
    scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.health)).toBe(0);
});
