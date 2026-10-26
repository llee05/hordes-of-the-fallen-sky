import { expect, test } from '@playwright/test';

test('terrain toggles immediately while paused and persists across reloads', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  // The visible hardware test and headless software test start with different defaults.
  if ((await terrain.textContent()) === 'Flat 2D') await terrain.click();
  await expect(terrain).toHaveText('Angled 3D');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back ESC', exact: true }).click();
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  for (const label of ['Flat 2D', 'Angled 3D', 'Flat 2D']) {
    await terrain.click();
    await expect(terrain).toHaveText(label);
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(
      label === 'Angled 3D' ? 1 : 0,
    );
    expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(
      frozen,
    );
    expect(await page.evaluate(() => (window as any).__gloam.scene.cameras.main.alpha)).toBe(
      label === 'Angled 3D' ? 0 : 1,
    );
  }
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(terrain).toHaveText('Flat 2D');
  await terrain.click();
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(terrain).toHaveText('Angled 3D');
  expect(errors).toEqual([]);
});

test('software WebGL starts flat with a dismissible notice and honors an explicit choice', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    // Inject only the reported driver string; render with the actual test GPU.
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.getParameter;
      context.prototype.getParameter = function (parameter: number) {
        if (parameter === 37446) return 'ANGLE (Vulkan SwiftShader Device)';
        return original.call(this, parameter);
      };
    }
  });
  await page.goto('/');
  const notice = page.getByRole('status').filter({ hasText: 'Software graphics detected' });
  await expect(notice).toBeVisible();
  // Check the rendered text against the title cloth, including its transparency.
  const contrast = await notice.evaluate((element) => {
    const channels = (color: string) => color.match(/[\d.]+/g)!.map(Number);
    const luminance = (rgb: number[]) =>
      rgb.slice(0, 3).reduce((sum, channel, index) => {
        const value = channel / 255;
        const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    const cloth = channels(
      getComputedStyle(element.closest('.title-menu')!, '::before').backgroundColor,
    );
    // White behind translucent cloth gives the light text its lowest contrast.
    const alpha = cloth[3] ?? 1;
    const background = luminance(cloth.slice(0, 3).map((c) => c * alpha + 255 * (1 - alpha)));
    return [element, element.querySelector('button')!].map((text) => {
      const foreground = luminance(channels(getComputedStyle(text).color));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
  });
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismiss terrain notice' }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  await expect(terrain).toHaveText('Flat 2D');
  await terrain.click();
  await expect(terrain).toHaveText('Angled 3D');
  await page.reload();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await expect(notice).toHaveCount(0);
});

for (const scenario of [
  { location: 'golden-pasture', level: 'chapter:golden-pasture', source: 'Flat 2D' },
  { location: 'otgontenger', level: 'destination:2:otgontenger', source: 'Angled 3D' },
]) {
  test(`${scenario.location} preserves actors and XP on blocked ground when toggling and restoring`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
    if ((await terrain.textContent()) !== scenario.source) await terrain.click();
    await page.getByRole('button', { name: 'Back ESC', exact: true }).click();
    await page.keyboard.press('F8');
    await page.locator(`[data-developer-level="${scenario.level}"]`).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.testSourceNavigation = s.landscape.navigation;
    });
    await terrain.click();
    const blocked = await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      const target = s.landscape.navigation;
      const source = s.testSourceNavigation;
      const size = target.terrain.cellSize;
      for (let y = size / 2; y < target.terrain.worldSize; y += size)
        for (let x = size / 2; x < target.terrain.worldSize; x += size)
          if (!target.isWalkable(x, y, 18, true) && (!source || source.isWalkable(x, y, 18, true)))
            return { x, y };
      throw new Error('Expected ground made inaccessible by the target renderer');
    });
    await terrain.click();
    const before = await page.evaluate(async (point) => {
      const { captureExpedition } = await import('/src/game/state/expeditionArchive.ts');
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
    await terrain.click();
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
          renderer: s.terrainRenderer,
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
      renderer: scenario.source === 'Flat 2D' ? '3d' : '2d',
    };
    expect(await inspect()).toEqual(expected);
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.scene.restart({ expedition: s.testTerrainSave });
    });
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    expect(await inspect()).toEqual(expected);
  });
}
