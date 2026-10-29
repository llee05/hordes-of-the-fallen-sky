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

test('Warm Ashes pays once after the surviving elite is defeated', async ({ page }) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const elite = s.enemies.getFirstAlive();
    elite.elite = true;
    elite.health = elite.maxHealth = 10000;
    elite.definition = {
      ...elite.definition,
      id: 'test-elite',
      behavior: 'chaser',
      speed: 0,
      ability: undefined,
    };
    elite.setPosition(s.player.x + 300, s.player.y);
    r.upgrades = { 'go-warm-ashes': 1 };
    r.clan.campEffects.bonuses.commanderRecovery = 0;
    r.health = 50;
    r.clan.stageTime = 63.99;
    r.encounters.phase = 'elite';
    s.update(0, 20);
    const combat = { health: r.health, phase: r.encounters.phase, eliteActive: elite.active };
    s.damageEnemy(elite, elite.health * 2);
    s.update(0, 20);
    const clearHealth = r.health;
    s.update(0, 20);
    return { combat, defeated: !elite.active, clearHealth, repeatedHealth: r.health };
  });
  expect(result.combat).toEqual({ health: 50, phase: 'recovery', eliteActive: true });
  expect(result.defeated).toBe(true);
  expect(result.clearHealth).toBe(55);
  expect(result.repeatedHealth).toBe(55);
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

test('Ghost-Fletched arrows inherit one modifier even with Burning Tempest owned', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    r.clan.paths.archery = ['fire-arrows'];
    r.clan.paths.sanctuary = ['wind-shamans'];
    r.patrons.bow.pierce = 2;
    const shoot = (ghost: boolean) => {
      for (const bolt of s.projectiles.getChildren()) bolt.disableBody(true, true);
      s.shootVolley(s.player.x, s.player.y, enemy, 1, 1, true, false, 'rider', 0, ghost);
      return s.projectiles
        .getChildren()
        .filter((bolt: any) => bolt.active)
        .map((bolt: any) => ({
          tempest: bolt.tempest,
          turn: bolt.turn,
          fire: bolt.fire,
          pierces: bolt.pierces,
        }));
    };
    return { ordinary: shoot(false), ghosts: shoot(true) };
  });
  expect(result.ordinary).toHaveLength(3);
  expect(result.ordinary[0]).toMatchObject({ tempest: true, fire: true });
  expect(result.ordinary[0].turn).not.toBe(0);
  expect(result.ghosts).toEqual([{ tempest: false, turn: 0, fire: false, pierces: 2 }]);
});

for (const pierces of [0, 1]) {
  test(`wagon ricochet preserves one arrow and its damage with Burning Tempest and Encircle (${pierces} pierces)`, async ({
    page,
  }) => {
    const result = await page.evaluate((pierces) => {
      const s = (window as any).__gloam.scene,
        r = s.run;
      for (let i = 0; i < 20 && s.enemies.countActive(true) < 2; i++) s.spawnEnemy();
      const targets = s.enemies
        .getChildren()
        .filter((enemy: any) => enemy.active)
        .slice(0, 2);
      for (const [i, enemy] of targets.entries()) {
        enemy.body.reset(s.player.x + 80 + i * 40, s.player.y);
        enemy.definition = {
          ...enemy.definition,
          id: 'test-target',
          behavior: 'chaser',
          armor: 1,
          speed: 0,
        };
        enemy.health = enemy.maxHealth = 10000;
        enemy.pinned = 0;
      }
      for (const bolt of s.projectiles.getChildren()) bolt.disableBody(true, true);
      s.spatial.rebuild(s.enemies.getChildren());
      r.upgrades = { 'gu-circling-volley': 1 };
      r.clan.paths.archery = ['fire-arrows'];
      r.clan.paths.sanctuary = ['wind-shamans'];
      r.clan.formation = 'encircle';
      r.clan.momentum = 1;
      r.patrons.bow.pierce = pierces;
      r.stats.damage = 20;
      s.shootVolley(s.player.x, s.player.y, targets[0], 1, 0.6, false, false, 'wagon');
      const ordinary = s.projectiles.getChildren().filter((bolt: any) => bolt.active);
      const original = ordinary[0];
      const initialCount = ordinary.length;
      const originalDamage = original.damage;
      for (const bolt of ordinary.slice(1)) bolt.disableBody(true, true);
      const random = Math.random;
      try {
        Math.random = () => 0;
        s.hitEnemy(original, targets[0]);
        const ricochets = s.projectiles
          .getChildren()
          .filter((bolt: any) => bolt.active && bolt.source === 'wagon-ricochet');
        const arrows = ricochets.map((bolt: any) => ({
          damage: bolt.damage,
          tempest: bolt.tempest,
          turn: bolt.turn,
        }));
        const ricochet = ricochets[0];
        const sourceBefore = targets[0].health;
        ricochet.body.reset(targets[0].body.center.x, targets[0].body.center.y);
        const sourceOverlap = s.physics.overlap(ricochet, targets[0], s.hitEnemy, undefined, s);
        const sourceAfter = targets[0].health;
        const survivesSource = ricochet.active;
        const before = targets[1].health;
        ricochet.body.reset(targets[1].body.center.x, targets[1].body.center.y);
        const nextOverlap = s.physics.overlap(ricochet, targets[1], s.hitEnemy, undefined, s);
        return {
          sourceOverlap,
          sourceBefore,
          sourceAfter,
          survivesSource,
          nextOverlap,
          initialCount,
          originalDamage,
          arrows,
          dealt: before - targets[1].health,
          afterHit: s.projectiles
            .getChildren()
            .filter((bolt: any) => bolt.active && bolt.source === 'wagon-ricochet').length,
        };
      } finally {
        Math.random = random;
      }
    }, pierces);
    expect(result.sourceOverlap).toBe(true);
    expect(result.sourceAfter).toBe(result.sourceBefore);
    expect(result.survivesSource).toBe(true);
    expect(result.nextOverlap).toBe(true);
    expect(result.initialCount).toBe(3);
    expect(result.originalDamage).toBeCloseTo(20 * 0.6 * 1.3);
    expect(result.arrows).toEqual([{ damage: result.originalDamage, tempest: false, turn: 0 }]);
    expect(result.dealt).toBeCloseTo(result.originalDamage);
    expect(result.afterHit).toBe(pierces);
  });
}

test('Arrow Platforms inherit Iron-Rimmed Wagons guard range and migration damage', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      r = s.run;
    for (let i = 0; i < 20 && !s.enemies.countActive(true); i++) s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    enemy.setPosition(s.camp.x + 230, s.camp.y);
    enemy.health = enemy.maxHealth = 10000;
    s.spatial.rebuild(s.enemies.getChildren());
    r.upgrades = { 'gu-arrow-platforms': 1, 'gu-iron-rimmed-wagons': 1 };
    r.clan.buildings.wagon = 1;
    r.clan.paths.wagon = [];
    r.clan.paths.archery = [];
    r.clan.paths.sanctuary = [];
    r.clan.formation = 'guard';
    r.clan.momentum = 0;
    r.stats.damage = 20;
    const shoot = (stage: string, distance: number) => {
      for (const bolt of s.projectiles.getChildren()) bolt.disableBody(true, true);
      r.clan.stage = stage;
      enemy.setPosition(s.camp.x + distance, s.camp.y);
      s.spatial.rebuild(s.enemies.getChildren());
      r.researchRuntime = {};
      s.wagonTimer = s.supportTimer = s.wardTimer = 999;
      s.updateSupport(0);
      return s.projectiles
        .getChildren()
        .filter((bolt: any) => bolt.active)
        .map((bolt: any) => ({ damage: bolt.damage, remaining: bolt.remaining }));
    };
    return {
      camp: shoot('camp', 230),
      migration: shoot('migration', 230),
      outside: shoot('migration', 243),
    };
  });
  expect(result.camp).toHaveLength(1);
  expect(result.camp[0]!.damage).toBeCloseTo(12);
  expect(result.migration).toHaveLength(1);
  expect(result.migration[0]!.damage).toBeCloseTo(14.4);
  expect(result.migration[0]!.remaining).toBe(result.camp[0]!.remaining);
  expect(result.outside).toEqual([]);
});
