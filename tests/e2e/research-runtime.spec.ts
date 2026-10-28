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

test('allied piercing bonuses and penalties agree while ghost arrows inherit one modifier', async ({
  page,
}) => {
  const results = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    enemy.setPosition(s.player.x + 80, s.player.y);
    enemy.definition = { ...enemy.definition, behavior: 'chaser', armor: 1, speed: 0 };
    enemy.health = enemy.maxHealth = 10000;
    r.upgrades = { 'km-drilling-shafts': 1, 'km-world-piercer': 1, 'km-barbed-flight': 1 };
    r.patrons.bow.pierce = 1;
    r.clan.momentum = 0;
    return ['khan', 'rider', 'echo', 'wagon', 'wagon-ricochet', 'ghost'].map((owner) => {
      for (const bolt of s.projectiles.getChildren()) bolt.disableBody(true, true);
      s.shootVolley(
        s.player.x,
        s.player.y,
        enemy,
        1,
        1,
        owner === 'echo' || owner === 'ghost',
        false,
        owner === 'khan'
          ? 'khan'
          : owner === 'wagon' || owner === 'wagon-ricochet'
            ? owner
            : 'rider',
        0,
        owner === 'ghost',
      );
      const bolt = s.projectiles.getFirstAlive(),
        base = bolt.damage,
        pierces = bolt.pierces;
      let total = 0,
        hits = 0;
      while (bolt.active && hits < 12) {
        enemy.spawnId++;
        const before = enemy.health;
        s.hitEnemy(bolt, enemy);
        total += before - enemy.health;
        hits++;
      }
      return { owner, base, pierces, damage: bolt.damage, total, hits };
    });
  });
  for (const result of results) {
    if (result.owner === 'ghost') {
      expect(result.pierces).toBe(1);
      expect(result.hits).toBe(2);
      expect(result.damage).toBe(result.base);
    } else {
      expect(result.pierces).toBe(8);
      expect(result.damage).toBeLessThan(result.base);
      expect(result.total).toBeCloseTo(result.base * 3);
    }
  }
});

test('Warm Ashes does not heal when an elite survives the recovery transition', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const elite = s.enemies.getFirstAlive();
    elite.elite = true;
    elite.health = 10000;
    elite.setPosition(s.player.x + 300, s.player.y);
    r.upgrades = { 'go-warm-ashes': 1 };
    r.clan.campEffects.bonuses.commanderRecovery = 0;
    r.health = 50;
    r.clan.stageTime = 63.99;
    r.encounters.phase = 'elite';
    s.update(0, 20);
    const combat = { health: r.health, phase: r.encounters.phase, eliteActive: elite.active };
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    for (const p of s.hostileShots.getChildren()) p.disableBody(true, true);
    r.clan.stageTime = 63.99;
    r.encounters.phase = 'elite';
    s.update(0, 20);
    return { combat, clearHealth: r.health };
  });
  expect(result.combat).toEqual({ health: 50, phase: 'recovery', eliteActive: true });
  expect(result.clearHealth).toBe(55);
});

test('eruption warnings reward leaving an entered area and ignore stationary proximity', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    r.upgrades = { 'lu-geomancers-eye': 1, 'lu-warning-signs': 1 };
    const x = s.player.x,
      y = s.player.y;
    const hazard = (offset: number) => ({
      x: x + offset,
      y,
      remaining: 1,
      warning: s.add.graphics(),
    });
    s.hazards = [hazard(80)];
    s.updateHazards(1);
    const nearby = r.researchRuntime?.dodgeUntil ?? 0;
    s.hazards = [hazard(0)];
    s.updateHazards(0.1);
    const entered = s.hazards[0].researchEntered;
    s.player.setPosition(x + 100, y);
    s.updateHazards(1);
    return { nearby, entered, until: r.researchRuntime.dodgeUntil, elapsed: r.elapsed };
  });
  expect(result.nearby).toBe(0);
  expect(result.entered).toBe(true);
  expect(result.until).toBe(result.elapsed + 3);
});

for (const attack of ['seer', 'cinder'] as const) {
  test(`Warm Ashes waits while a defeated enemy leaves ${attack} damage`, async ({ page }) => {
    const result = await page.evaluate((attack) => {
      const s = (window as any).__gloam.scene,
        r = s.run;
      r.upgrades = { 'go-warm-ashes': 1 };
      r.clan.campEffects.bonuses.commanderRecovery = 0;
      r.health = 50;
      const point = { x: s.player.x + 500, y: s.player.y };
      if (attack === 'seer')
        s.hazards.push({
          ...point,
          source: 'seer',
          remaining: 1,
          warning: s.add.graphics(),
          damage: 10,
        });
      else
        s.areaThreats.threats.push({
          ...point,
          id: 1,
          kind: 'cinder',
          age: 2.1,
          warning: 2,
          impacted: true,
          nextTick: 3,
          owner: '0:1',
        });
      r.clan.stageTime = 63.99;
      r.encounters.phase = 'elite';
      s.update(0, 20);
      const blocked = r.health;
      for (const hazard of s.hazards) hazard.warning.destroy();
      s.hazards = [];
      s.areaThreats.threats = [];
      r.clan.stageTime = 63.99;
      r.encounters.phase = 'elite';
      s.update(0, 20);
      return { blocked, clear: r.health };
    }, attack);
    expect(result).toEqual({ blocked: 50, clear: 55 });
  });
}

test('Shifting Ridge creates one patch at eruption resolution after a protected crossing', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    r.upgrades = { 'lu-eye-of-the-mountain': 1, 'lu-shifting-ridge': 1 };
    const x = s.player.x,
      y = s.player.y;
    s.hazards = [{ x, y, remaining: 2, warning: s.add.graphics() }];
    s.dashRemaining = 1;
    s.updateHazards(0.1);
    const crossing = {
      crossed: s.hazards[0].researchCrossed,
      patches: r.researchRuntime?.ridgePatches?.length ?? 0,
    };
    s.player.setPosition(x + 500, y);
    s.dashRemaining = 0;
    s.updateHazards(2);
    return { crossing, patches: r.researchRuntime.ridgePatches };
  });
  expect(result.crossing).toEqual({ crossed: true, patches: 0 });
  expect(result.patches).toHaveLength(1);
});
