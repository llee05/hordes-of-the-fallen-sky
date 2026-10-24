import { expect, test, type Page } from '@playwright/test';

async function openMountains(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.hazardTimer = scene.attackTimer = 999;
    scene.invulnerable = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
}

async function settled(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => (window as any).__gloam.scene.landscape.mountains?.pendingChunks ?? -1),
      { timeout: 20000 },
    )
    .toBe(0);
}

test('mountain chunks blend existing materials, stream without seams or landform sprites, and expose paused debug overlays', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openMountains(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.cameras.main.stopFollow().setZoom(0.28).centerOn(2600, 2600);
  });
  await settled(page);
  const inspect = () =>
    page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      const mountains = scene.landscape.mountains;
      const children = [...mountains.chunks.values()].flatMap((chunk: any) => chunk.container.list);
      return {
        chunks: mountains.chunks.size,
        cached: mountains.terrain.cachedChunks,
        materials: [
          ...new Set(
            children.filter((item: any) => item.type === 'Mesh').map((item: any) => item.name),
          ),
        ].sort(),
        missing: children.filter((item: any) => item.texture?.key === '__MISSING').length,
        modelSprites: [...scene.landscape.props, ...scene.landscape.regional.list].filter(
          (item: any) =>
            ['snow-dome', 'pyramid', 'foothill', 'glacier', 'twin-summit', 'crag'].includes(
              item.frame?.name,
            ),
        ).length,
        walls: scene.terrainCollision.walls.getLength(),
        debug: mountains.debugMode,
      };
    });
  const overview = await inspect();
  expect(overview.chunks).toBeGreaterThan(80);
  expect(overview.chunks).toBeLessThanOrEqual(121);
  expect(overview.cached).toBeLessThanOrEqual(48);
  expect(overview.materials).toEqual([
    'terrain-material-grassland',
    'terrain-material-rocky-soil',
    'terrain-material-snow',
    'terrain-material-stone',
    'terrain-material-tundra',
  ]);
  expect(overview.missing).toBe(0);
  expect(overview.modelSprites).toBe(0);
  expect(overview.walls).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/mountains/otgontenger-overview.png' });
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    (window as any).oldMountainChunks = [...scene.landscape.mountains.chunks.values()].map(
      (chunk: any) => chunk.container,
    );
    scene.cameras.main.setZoom(1).centerOn(1100, 1100);
  });
  await settled(page);
  expect((await inspect()).chunks).toBeLessThan(35);
  expect(
    await page.evaluate(() => (window as any).oldMountainChunks.some((chunk: any) => !chunk.scene)),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/mountains/otgontenger-ranges.png' });
  await page.keyboard.press('Escape');
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.keyboard.down('F9');
  await expect.poll(async () => (await inspect()).debug).toBe('elevation');
  await page.waitForTimeout(120);
  await page.keyboard.up('F9');
  expect((await inspect()).debug).toBe('elevation');
  for (const mode of ['elevation', 'slope', 'collision', 'off']) {
    await expect.poll(async () => (await inspect()).debug).toBe(mode);
    if (mode !== 'off') {
      await page.keyboard.press('F9');
    }
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(frozen);
  await page.keyboard.press('Escape');
  await page.keyboard.press('F9');
  for (const mode of ['elevation', 'slope', 'collision']) {
    await expect.poll(async () => (await inspect()).debug).toBe(mode);
    await page.screenshot({ path: `test-results/mountains/${mode}.png` });
    await page.keyboard.press('F9');
  }
  expect(errors).toEqual([]);
});

test('cliffs stop a galloping Khan and are removed with streamed terrain on migration arrival', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openMountains(page);
  const wall = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const nav = scene.landscape.navigation;
    for (let row = 1; row < nav.rows - 1; row++)
      for (let column = 2; column < nav.columns - 1; column++) {
        const cell = nav.terrain.cell(column, row);
        if (!cell.blocked || !nav.isWalkable(cell.x - 30, cell.sample.y, 24, true)) continue;
        scene.player.body.reset(cell.x - 30, cell.sample.y);
        scene.cameras.main.stopFollow().centerOn(cell.x, cell.sample.y);
        return { x: cell.x, y: cell.sample.y, start: scene.player.x };
      }
    throw new Error('Expected a connected cliff edge');
  });
  await page.keyboard.down('d');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.body.velocity.x))
    .toBeGreaterThan(0);
  await page.keyboard.press('Space');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.body.blocked.right))
    .toBe(true);
  await page.keyboard.up('d');
  const position = await page.evaluate(() => (window as any).__gloam.scene.player.x);
  expect(position).toBeGreaterThan(wall.start);
  expect(position).toBeLessThanOrEqual(wall.x - 9);
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => ({
    elapsed: (window as any).__gloam.scene.run.elapsed,
    x: (window as any).__gloam.scene.player.x,
  }));
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => ({
      elapsed: (window as any).__gloam.scene.run.elapsed,
      x: (window as any).__gloam.scene.player.x,
    })),
  ).toEqual(before);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.body.reset(scene.camp.x, scene.camp.y + 100);
    (window as any).oldTerrainRenderer = scene.landscape.mountains;
    (window as any).oldTerrainWalls = scene.terrainCollision.walls.getChildren().slice();
    scene.run.clan.stageTime = 45;
    scene.openRoutes();
  });
  await page.locator('[data-destination="orkhon-valley"]').click();
  await page.locator('[data-route="river"]').click();
  await page.evaluate(() => ((window as any).__gloam.scene.run.clan.stageTime = 200));
  await expect(page.locator('#location')).toHaveText('ORKHON VALLEY');
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        mountains: Boolean(scene.landscape.mountains),
        navigation: Boolean(scene.landscape.navigation),
        walls: scene.terrainCollision.walls.getLength(),
        oldChunks: (window as any).oldTerrainRenderer.chunks.size,
        oldWallsDestroyed: (window as any).oldTerrainWalls.every((wall: any) => !wall.scene),
      };
    }),
  ).toEqual({
    mountains: false,
    navigation: false,
    walls: 0,
    oldChunks: 0,
    oldWallsDestroyed: true,
  });
  expect(errors).toEqual([]);
});
