import { expect, test } from '@playwright/test';

for (const terrainRenderer of ['2d', '3d']) {
  test(`legacy ${terrainRenderer} profiles always load the angled world`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((terrainRenderer) => {
      if (!localStorage.getItem('gloam-profile'))
        localStorage.setItem(
          'gloam-profile',
          JSON.stringify({
            version: 1,
            bestSeconds: 55,
            muted: true,
            visualSettings: {
              terrainRenderer,
              projectileContrast: 'high',
              effectDensity: 'reduced',
            },
          }),
        );
      // A software driver must never select a different renderer.
      for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const original = context.prototype.getParameter;
        context.prototype.getParameter = function (parameter: number) {
          return parameter === 37446
            ? 'ANGLE (Vulkan SwiftShader Device)'
            : original.call(this, parameter);
        };
      }
    }, terrainRenderer);
    await page.goto('/?terrain=2d');
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
    await expect(page.getByText('Software graphics detected', { exact: false })).toHaveCount(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Terrain', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Projectile contrast', exact: true })).toHaveText(
      'High',
    );
    await expect(page.getByRole('button', { name: 'Effect density', exact: true })).toHaveText(
      'reduced',
    );
    await page.getByRole('button', { name: 'Projectile contrast', exact: true }).click();
    await page.reload();
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Projectile contrast', exact: true })).toHaveText(
      'Standard',
    );
    expect(errors).toEqual([]);
  });
}

for (const scenario of [
  { location: 'golden-pasture', level: 'chapter:golden-pasture' },
  { location: 'otgontenger', level: 'destination:2:otgontenger' },
]) {
  test(`${scenario.location} preserves actors and XP on blocked ground when restoring`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await page.locator(`[data-developer-level="${scenario.level}"]`).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const blocked = await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      const target = s.landscape.navigation;
      const size = target.terrain.cellSize;
      for (let y = size / 2; y < target.terrain.worldSize; y += size)
        for (let x = size / 2; x < target.terrain.worldSize; x += size)
          if (!target.isWalkable(x, y, 18, true)) return { x, y };
      throw new Error('Expected inaccessible ground');
    });
    const before = await page.evaluate(async (point) => {
      const { captureExpedition } = (await import(
        // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
        '/src/game/state/expeditionArchive.ts'
      )) as typeof import('../../src/game/state/expeditionArchive');
      const s = (window as any).__gloam.scene;
      for (const actor of s.enemies.getChildren()) actor.disableBody(true, true);
      for (const gem of s.gems.getChildren()) gem.disableBody(true, true);
      s.spawnEnemy();
      const enemy = s.enemies.getFirstAlive();
      if (!enemy) throw new Error('Expected a live enemy');
      s.player.body.reset(point.x, point.y);
      enemy.body.reset(point.x, point.y);
      enemy.health = 3;
      const gem = s.gems.get(point.x, point.y, 'gem');
      gem.enableBody(true, point.x, point.y, true, true);
      gem.value = 37;
      gem.attracted = true;
      s.riders[0].setVisible(true).setPosition(point.x, point.y);
      s.testTerrainSave = captureExpedition(s.run, s.captureWorld());
      return { xp: s.run.xp, points: s.run.pendingUpgrades, spawnId: enemy.spawnId };
    }, blocked);
    const inspect = () =>
      page.evaluate(() => {
        const s = (window as any).__gloam.scene;
        const nav = s.landscape.navigation;
        const enemy = s.enemies.getFirstAlive();
        const gem = s.gems.getFirstAlive();
        const actors = [s.player, enemy, gem, s.riders[0]];
        return {
          reachable: actors.every((actor) => actor && nav.isWalkable(actor.x, actor.y, 18, true)),
          bodiesAligned: [s.player, enemy, gem].every((actor) =>
            ['x', 'y'].every(
              (axis) =>
                Math.abs(
                  actor.body.position[axis] -
                    (actor.getTopLeft()[axis] +
                      actor.body.offset[axis] * (axis === 'x' ? actor.scaleX : actor.scaleY)),
                ) < 0.01,
            ),
          ),
          enemies: s.enemies.countActive(true),
          gems: s.gems.countActive(true),
          health: enemy?.health,
          spawnId: enemy?.spawnId,
          value: gem?.value,
          attracted: gem?.attracted,
          xp: s.run.xp,
          points: s.run.pendingUpgrades,
        };
      });
    const expected = {
      reachable: true,
      bodiesAligned: true,
      enemies: 1,
      gems: 1,
      health: 3,
      spawnId: before.spawnId,
      value: 37,
      attracted: true,
      xp: before.xp,
      points: before.points,
    };
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.scene.restart({ expedition: s.testTerrainSave });
    });
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    expect(await inspect()).toEqual(expected);
  });
}
