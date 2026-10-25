import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';
for (const route of ['river', 'ridge', 'refuge'])
  test(`${route} crossing has a warned encounter with once-only arrival benefits`, async ({
    page,
  }) => {
    await openTitle(page);
    await startExpedition(page);
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.developerTools.invincible = s.developerTools.clanInvincible = true;
      s.spawnTimer = s.attackTimer = 999;
      s.run.clan.stageTime = 45;
      for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    });
    await expect(page.locator('#migrate')).toBeEnabled();
    await page.locator('#migrate').click();
    await expect(page.locator(`[data-route="${route}"]`)).toContainText('Optional:');
    await page.locator(`[data-route="${route}"]`).click();
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.run.clan.migrationProgress = 0.2;
      s.updateCrossing(0.01);
    });
    await page.locator('#pause').click();
    const frozen = await page.evaluate(() => (window as any).__gloam.scene.run.crossing.remaining);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => (window as any).__gloam.scene.run.crossing.remaining)).toBe(
      frozen,
    );
    await page.keyboard.press('Escape');
    const result = await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        c = s.run.crossing;
      s.run.clan.migrationProgress = 0.2;
      s.updateCrossing(4);
      for (let i = 0; i < 12; i++) s.updateCrossing(0.7);
      const wave = s.enemies.getChildren().filter((e: any) => e.active && e.crossingId === c.key);
      for (const e of wave) s.damageEnemy(e, 99999);
      if (c.escort) {
        Object.assign(c.escort, { x: s.camp.x + 20, y: s.camp.y + 20 });
        s.player.body.reset(s.camp.x, s.camp.y + 100);
        s.updateCrossing(2);
      }
      s.run.clan.integrity = 50;
      const materials = s.run.clan.materials;
      s.run.clan.stageTime = 1000;
      s.update(0, 16);
      return {
        route: c.route,
        spawned: c.spawned,
        defeated: c.defeated,
        paid: c.paid,
        phase: s.run.clan.stage,
        region: s.run.clan.region,
        people: s.run.clan.population,
        resolve: s.run.clan.integrity,
        materials: s.run.clan.materials - materials,
        memories: s.run.legacy.memories.map((m: any) => m.title),
      };
    });
    expect(result).toMatchObject({ route, paid: true, phase: 'camp', region: 1 });
    expect(result.defeated).toBe(result.spawned);
    expect(result.spawned).toBeGreaterThanOrEqual(4);
    if (route === 'river') expect(result.resolve).toBe(74);
    if (route === 'ridge') {
      expect(result.resolve).toBe(68);
      expect(result.materials).toBeGreaterThanOrEqual(38);
    }
    if (route === 'refuge') expect(result.people).toBe(18);
  });
test('the angled river route carves an actual connected ford and preserves live actors', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await startExpedition(page, { legacyCamp: false });
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.developerTools.invincible = s.developerTools.clanInvincible = true;
    s.run.clan.stageTime = 45;
    s.spawnTimer = s.attackTimer = 999;
  });
  await expect(page.locator('#migrate')).toBeEnabled();
  await page.locator('#migrate').click();
  await page.locator('[data-route="river"]').click();
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 45000 },
    )
    .toBe(0);
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      w = s.landscape.world3d;
    return {
      water: w.terrain.river.distance(3420, 2600),
      walk: Array.from({ length: 36 }, (_, i) =>
        s.landscape.navigation.isWalkable(2600 + i * 32, 2600, 24, true),
      ).every(Boolean),
      khan: s.landscape.navigation.isWalkable(s.player.x, s.player.y, 24, true),
      pending: w.pendingChunks,
    };
  });
  expect(result.water).toBeLessThan(160);
  expect(result.walk).toBe(true);
  expect(result.khan).toBe(true);
  await page.screenshot({ path: 'test-results/river-crossing-encounter.png' });
});
