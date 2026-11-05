import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 }, trace: 'off' });

test('Golden Pasture arrivals use the visible camera edge and survive the next update', async ({
  page,
}) => {
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
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      w = s.landscape.world3d;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    const spawned = s.spawnEnemy();
    const enemies = s.enemies.getChildren().filter((e: any) => e.active);
    const valid = enemies.every((e: any) => s.landscape.navigation.isWalkable(e.x, e.y, 24, true));
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
      spawned,
      count: before,
      culled: before - s.enemies.countActive(true),
      outside,
      valid,
    };
  });
  expect(result.spawned).toBe(true);
  expect(result.count).toBe(1);
  expect(result.culled).toBe(0);
  expect(result.outside).toBe(true);
  expect(result.valid).toBe(true);
});
