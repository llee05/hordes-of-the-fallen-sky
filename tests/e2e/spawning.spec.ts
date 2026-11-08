import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 }, trace: 'off' });

test('Golden Pasture arrivals survive at the camera edge and retire without kills when distant', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    window.__gloam.hooks.quietBattlefield({ clearEnemies: false });
    window.__gloam.hooks.invincible({ khan: true, clan: true });
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
    const culled = before - s.enemies.countActive(true);
    const kills = s.run.kills;
    const distant = s.enemies.getFirstAlive();
    distant.setPosition(24, 24);
    s.updateEnemies(0.001);
    return {
      spawned,
      count: before,
      culled,
      retired: !distant.active && !distant.body.enable,
      killsChanged: s.run.kills !== kills,
      outside,
      valid,
    };
  });
  expect(result.spawned).toBe(true);
  expect(result.count).toBe(1);
  expect(result.culled).toBe(0);
  expect(result.retired).toBe(true);
  expect(result.killsChanged).toBe(false);
  expect(result.outside).toBe(true);
  expect(result.valid).toBe(true);
});
