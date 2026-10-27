import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 }, trace: 'off' });

test('Golden Pasture arrivals use the visible camera edge, survive the next update, and retain pool/retry limits', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
    s.developerTools.invincible = s.developerTools.clanInvincible = true;
    s.run.phase = 'paused';
    s.physics.pause();
    s.audio.muted = true;
  });
  const results = [];
  for (const size of [
    { width: 1280, height: 800, zoom: 1 },
    { width: 1920, height: 1080, zoom: 1 },
    { width: 1920, height: 1080, zoom: 0.6 },
  ]) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.evaluate((zoom) => {
      const s = (window as any).__gloam.scene;
      s.run.phase = 'playing';
      s.changeZoom(0);
      if (zoom < 1) s.changeZoom(-20);
      s.run.phase = 'paused';
      return new Promise<void>((resolve) =>
        s.events.once('postupdate', () => s.events.once('postupdate', resolve)),
      );
    }, size.zoom);
    const result = await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d;
      for (const e of s.enemies.getChildren()) e.disableBody(true, true);
      const started = performance.now();
      let successes = 0;
      for (let i = 0; i < 150; i++) if (s.spawnEnemy()) successes++;
      const duration = performance.now() - started;
      const enemies = s.enemies.getChildren().filter((e: any) => e.active);
      const distances = enemies
        .map((e: any) =>
          Math.min(
            Math.hypot(e.x - s.player.x, e.y - s.player.y),
            Math.hypot(e.x - s.camp.x, e.y - s.camp.y),
          ),
        )
        .sort((a: number, b: number) => a - b);
      const valid = enemies.every((e: any) =>
        s.landscape.navigation.isWalkable(e.x, e.y, 24, true),
      );
      const outside = enemies.every((e: any) => {
        const p = w.camera.position
          .clone()
          .set(e.x, w.terrain.actorHeight(e.x, e.y) * 1000, e.y)
          .project(w.camera);
        return Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
      });
      const before = enemies.length;
      s.updateEnemies(0.001);
      return {
        size: [innerWidth, innerHeight],
        zoom: s.cameras.main.zoom,
        successes,
        spawned: before,
        culled: before - s.enemies.countActive(true),
        outside,
        valid,
        median: distances[75],
        duration,
      };
    });
    results.push(result);
    expect(result.zoom).toBe(size.zoom);
    expect(result.successes).toBe(150);
    expect(result.spawned).toBe(150);
    expect(result.culled).toBe(0);
    expect(result.outside).toBe(true);
    expect(result.valid).toBe(true);
  }
  console.log('Golden Pasture spawn audit', results);
  const limits = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    for (let i = 0; i < 400; i++) s.spawnEnemy();
    const cap = s.enemies.countActive(true),
      pool = s.enemies.getChildren().length,
      kills = s.run.kills;
    const rejected = s.spawnEnemy();
    s.run.phase = 'playing';
    s.run.clan.stageTime = 12;
    s.spawnTimer = 0;
    s.update(0, 16);
    s.run.phase = 'paused';
    const retry = s.spawnTimer;
    const reusable = s.enemies.getFirstAlive();
    reusable.disableBody(true, true);
    s.spawnTimer = 0;
    s.run.phase = 'playing';
    s.update(0, 16);
    s.run.phase = 'paused';
    const replenished = s.enemies.countActive(true),
      openingDelay = s.spawnTimer;
    const distant = s.enemies.getFirstAlive();
    distant.setPosition(24, 24);
    s.updateEnemies(0.001);
    const retired = !distant.active;
    s.spawnEnemy(); // Fill the released slot before checking a forced arrival.
    s.run.clan.stage = 'final';
    s.run.clan.stageTime = 20;
    s.run.clan.finalBossSpawned = false;
    s.spawnTimer = 999;
    s.run.phase = 'playing';
    s.update(0, 16);
    const bossDeferred = !s.run.clan.finalBossSpawned;
    s.enemies.getFirstAlive().disableBody(true, true);
    s.update(0, 16);
    s.run.phase = 'paused';
    const bossCreated =
      s.run.clan.finalBossSpawned && s.boss?.active && s.boss.definition.id === 'skybreaker';
    return {
      cap,
      pool,
      rejected,
      retry,
      replenished,
      openingDelay,
      retired,
      bossDeferred,
      bossCreated,
      killsChanged: s.run.kills !== kills,
    };
  });
  expect(limits).toEqual({
    cap: 350,
    pool: 350,
    rejected: false,
    retry: 0.2,
    replenished: 350,
    openingDelay: 2,
    retired: true,
    bossDeferred: true,
    bossCreated: true,
    killsChanged: false,
  });
});
