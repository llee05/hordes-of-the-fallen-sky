import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    for (const actor of s.enemies.getChildren()) actor.disableBody(true, true);
  });
});

test('deferred research reaches real projectile collisions and per-rider firing clocks', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    enemy.setPosition(s.player.x + 80, s.player.y);
    enemy.definition = {
      ...enemy.definition,
      behavior: 'chaser',
      armor: 1,
      id: 'test-target',
      speed: 0,
    };
    enemy.health = enemy.maxHealth = 10000;
    s.spatial.rebuild(s.enemies.getChildren());
    r.upgrades['km-barbed-flight'] = 1;
    r.upgrades['km-sunder-the-ranks'] = 1;
    r.patrons.bow.pierce = 1;
    s.shootVolley(s.player.x, s.player.y, enemy, 1, 1, false, false, 'khan');
    s.hitEnemy(s.projectiles.getFirstAlive(), enemy);
    const key = `${enemy.tacticalSlot}:${enemy.spawnId}`;
    const bleed = r.researchRuntime.bleedStacks[key],
      sunder = r.researchRuntime.sunderStacks[key];
    for (const p of s.projectiles.getChildren()) p.disableBody(true, true);
    r.upgrades['su-horn-of-the-host'] = 1;
    r.researchRuntime.hornUntil = r.elapsed + 5;
    r.researchRuntime.riderFireAt = [];
    s.fireRiders();
    const initial = s.projectiles.countActive(true),
      at = r.researchRuntime.riderFireAt[0];
    s.fireRiders();
    const repeated = s.projectiles.countActive(true);
    r.elapsed = at;
    s.fireRiders();
    return {
      bleed,
      sunder,
      initial,
      repeated,
      after: s.projectiles.countActive(true),
      interval:
        at - (at - (r.stats.attackInterval * r.clan.campEffects.multipliers.hostInterval) / 1.25),
    };
  });
  expect(result.bleed).toBe(1);
  expect(result.sunder).toBe(1);
  expect(result.initial).toBeGreaterThan(0);
  expect(result.repeated).toBe(result.initial);
  expect(result.after).toBeGreaterThan(result.initial);
});

test('rally and Banner Formation controls work at desktop and narrow widths and freeze in research', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.upgrades['su-great-kurultai'] = 1;
    s.run.upgrades['su-banner-formation'] = 1;
    s.run.clan.integrity = 50;
    s.callbacks.onHud(s.snapshot());
  });
  await expect(page.locator('#rally-host')).toBeVisible();
  await page.locator('#rally-host').click();
  await expect(page.locator('#rally-host')).toBeDisabled();
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.clan.integrity),
  ).toBeGreaterThanOrEqual(60);
  await page.locator('#formation').click();
  await expect(page.locator('#formation-name')).toHaveText('Banner: Wedge');
  await page.screenshot({ path: testInfo.outputPath('research-runtime-desktop.png') });
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(page.locator('#formation')).toBeInViewport();
  await expect(page.locator('#rally-host')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('research-runtime-narrow.png') });
  await page.keyboard.press('t');
  const elapsed = await page.evaluate(() => (window as any).__gloam.scene.run.elapsed);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.elapsed)).toBe(elapsed);
});

test('World-Piercer applies its total damage budget after armour without ending the arrow early', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    enemy.setPosition(s.player.x + 80, s.player.y);
    enemy.definition = {
      ...enemy.definition,
      behavior: 'chaser',
      armor: 0.8,
      id: 'test-target',
      speed: 0,
    };
    enemy.health = enemy.maxHealth = 10000;
    enemy.pinned = 0;
    r.upgrades = { 'km-world-piercer': 1 };
    r.clan.momentum = 0;
    r.patrons.bow.pierce = 1;
    s.shootVolley(s.player.x, s.player.y, enemy, 1, 1, false, false, 'khan');
    const bolt = s.projectiles.getFirstAlive(),
      base = bolt.damage;
    let total = 0,
      hits = 0;
    while (bolt.active && hits < 10) {
      enemy.spawnId++;
      const health = enemy.health;
      s.hitEnemy(bolt, enemy);
      total += health - enemy.health;
      hits++;
    }
    return { total, base, hits };
  });
  expect(result.hits).toBe(4);
  expect(result.total).toBeCloseTo(result.base * 3);
});
