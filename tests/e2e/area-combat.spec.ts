import { expect, test } from '@playwright/test';
import { openTitle, sceneFrames, startExpedition } from './helpers';

test('native spell warnings cancel on pinning, pause in menus, and leave bounded non-stacking ground effects', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const warned = await page.evaluate(async () => {
    const { AREA_ENEMIES } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/data/enemies.ts'
    )) as typeof import('../../src/game/data/enemies');
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    s.run.clan.region = 1;
    s.run.clan.locationId = 'bogd-khan-uul';
    s.run.clan.stageTime = 40;
    s.player.body.reset(s.camp.x + 600, s.camp.y + 100);
    s.updateAreaCombat(0.01);
    s.spawnEnemy(
      { ...AREA_ENEMIES.find((e) => e.id === 'canopy-whisperer')!, health: 10000, speed: 0 },
      { point: { x: s.player.x + 250, y: s.player.y } },
    );
    const e = s.enemies.getFirstAlive();
    s.testCaster = e;
    e.dangerTimer = 0;
    e.attackTimer = 999;
    s.updateEnemies(0.01);
    return {
      count: s.areaThreats.threats.length,
      released: s.areaThreats.threats.some((t: any) => t.impacted),
    };
  });
  expect(warned).toEqual({ count: 2, released: false });
  await page.locator('#build').click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'building');
  const frozen = await page.evaluate(() =>
    structuredClone((window as any).__gloam.scene.areaThreats),
  );
  await sceneFrames(page);
  expect(await page.evaluate(() => (window as any).__gloam.scene.areaThreats)).toEqual(frozen);
  await page.locator('[data-action="exit-camp"]').first().click();
  const effects = await page.evaluate(async () => {
    const { areaMovementMultiplier } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/state/areaThreats.ts'
    )) as typeof import('../../src/game/state/areaThreats');
    const s = (window as any).__gloam.scene,
      e = s.testCaster;
    e.pinned = 1;
    s.updateAreaCombat(0.05);
    const cancelled = s.areaThreats.threats.length;
    e.pinned = 0;
    e.dangerTimer = 0;
    s.updateEnemies(0.01);
    s.updateAreaCombat(2);
    return {
      cancelled,
      slow: areaMovementMultiplier(s.areaThreats, s.player),
      count: s.areaThreats.threats.length,
      graphics: s.areaEffects.commandBuffer.length,
    };
  });
  expect(effects.cancelled).toBe(0);
  expect(effects.slow).toBe(0.7);
  expect(effects.count).toBe(2);
  expect(effects.graphics).toBeGreaterThan(0);
});

for (const location of ['bogd-khan-uul', 'otgontenger', 'orkhon-valley', 'eej-khairkhan'])
  test(`native ${location} encounters use the real terrain and retain shared enemies`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await page.locator(`[data-developer-level="destination:2:${location}"]`).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
    await expect
      .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.locationId))
      .toBe(location);
    await expect
      .poll(
        () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
        { timeout: 45000 },
      )
      .toBe(0);
    const audit = await page.evaluate(async () => {
      const s = (window as any).__gloam.scene;
      s.setPhase('paused');
      s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
      for (const e of s.enemies.getChildren()) e.disableBody(true, true);
      s.run.clan.stageTime = 40;
      let successes = 0;
      for (let i = 0; i < 50; i++) if (s.spawnEnemy()) successes++;
      const enemies = s.enemies.getChildren().filter((e: any) => e.active),
        before = enemies.length;
      s.updateEnemies(0.001);
      s.updateCharacterAnimations(0.001);
      const { AREA_ENCOUNTERS } = (await import(
        // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
        '/src/game/data/areaEncounters.ts'
      )) as typeof import('../../src/game/data/areaEncounters');
      const home = s.run.clan.locationId;
      return {
        home,
        successes,
        valid: enemies.every((e: any) => s.landscape.navigation.isWalkable(e.x, e.y, 24, true)),
        shared: enemies.filter((e: any) => !e.definition.home).length,
        locals: enemies.filter((e: any) => e.definition.home === home).length,
        foreign: enemies.filter((e: any) => e.definition.home && e.definition.home !== home).length,
        seen: [...new Set(enemies.map((e: any) => e.definition.id))],
        expected: AREA_ENCOUNTERS[home as keyof typeof AREA_ENCOUNTERS].natives,
        poses: enemies.every((e: any) => String(e.frame.name).startsWith(e.definition.texture)),
        culled: before - s.enemies.countActive(true),
      };
    });
    expect(audit.home).toBe(location);
    expect(audit.successes).toBe(50);
    expect(audit.valid).toBe(true);
    expect(audit.foreign).toBe(0);
    expect(audit.culled).toBe(0);
    expect(audit.locals).toBeGreaterThan(10);
    expect(audit.shared).toBeGreaterThan(0);
    expect(audit.poses).toBe(true);
    for (const id of audit.expected) expect(audit.seen).toContain(id);
  });

test('terrain rules warn on real cliff-foot ground and woodland concealment reveals without leaking into reused actors', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.locationId))
    .toBe('otgontenger');
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  const rock = await page.evaluate(async () => {
    const { areaSurface } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/systems/AreaHabitat.ts'
    )) as typeof import('../../src/game/systems/AreaHabitat');
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
    const nav = s.landscape.navigation;
    let point;
    for (let x = 1400; x < 4200 && !point; x += 64)
      for (let y = 1300; y < 3700; y += 64)
        if (
          Math.hypot(x - 2600, y - 2600) > 400 &&
          nav.isWalkable(x, y, 24, true) &&
          areaSurface(nav.terrain, 'otgontenger', x, y).shelter > 0.4
        ) {
          point = { x, y };
          break;
        }
    if (!point) throw Error('No connected cliff-foot test position');
    s.player.body.reset(point.x, point.y);
    s.run.clan.stageTime = 30;
    s.areaEncounter.clock = 30;
    s.areaEncounter.announced = true;
    s.areaEncounter.nextThreat = 0;
    s.updateAreaCombat(0.01);
    s.setPhase('paused');
    return {
      count: s.areaThreats.threats.length,
      kind: s.areaThreats.threats[0]?.kind,
      visible: s.areaEffects.commandBuffer.length > 0,
      walk: s.areaThreats.threats.every((t: any) => nav.isWalkable(t.x, t.y, 8, true)),
      marked: s.areaThreats.threats.every((t: any) => !t.impacted),
    };
  });
  expect(rock).toMatchObject({ kind: 'rockfall', visible: true, walk: true, marked: true });
  expect(rock.count).toBeGreaterThan(0);
  expect(rock.count).toBeLessThanOrEqual(3);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="destination:2:bogd-khan-uul"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.locationId))
    .toBe('bogd-khan-uul');
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  const forest = await page.evaluate(async () => {
    const { AREA_ENEMIES, ENEMIES } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/data/enemies.ts'
    )) as typeof import('../../src/game/data/enemies');
    const { areaSurface } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/systems/AreaHabitat.ts'
    )) as typeof import('../../src/game/systems/AreaHabitat');
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    s.setPhase('paused');
    const nav = s.landscape.navigation;
    let point;
    for (let x = 1500; x < 4000 && !point; x += 64)
      for (let y = 1400; y < 3700; y += 64)
        if (
          Math.hypot(x - s.camp.x, y - s.camp.y) > 400 &&
          Math.hypot(x - s.player.x, y - s.player.y) > 400 &&
          Math.hypot(x - 2600, y - 2600) < 1400 &&
          nav.isWalkable(x, y, 24, true) &&
          areaSurface(nav.terrain, 'bogd-khan-uul', x, y).grove > 0.55
        ) {
          point = { x, y };
          break;
        }
    if (!point) throw Error('No connected woodland test position');
    s.spawnEnemy(
      AREA_ENEMIES.find((e) => e.id === 'rootshade-stalker'),
      { point },
    );
    const e = s.enemies.getFirstAlive();
    s.updateEnemies(0.01);
    const hidden = e.alpha;
    s.player.body.reset(e.x, e.y);
    s.updateEnemies(0.01);
    const revealed = e.alpha;
    e.disableBody(true, true);
    s.player.body.reset(s.camp.x, s.camp.y + 100);
    s.spawnEnemy(ENEMIES[0]);
    const reused = s.enemies.getFirstAlive();
    return {
      hidden,
      revealed,
      reused: reused === e,
      alpha: reused.alpha,
      home: reused.definition.home ?? null,
    };
  });
  expect(forest).toEqual({ hidden: 0.58, revealed: 1, reused: true, alpha: 1, home: null });
});
