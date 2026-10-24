import { expect, test, type Page } from '@playwright/test';

// Trace filmstrips repeatedly read both GPU canvases and distort the render load sample.
test.use({ viewport: { width: 1280, height: 800 }, trace: 'off' });

async function open(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
    s.developerTools.invincible = s.developerTools.clanInvincible = true;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
  });
  await settled(page);
}
async function settled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const s = (window as any).__gloam.scene;
        s.events.once('postupdate', () => s.events.once('postupdate', () => resolve()));
      }),
  );
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 30000 },
    )
    .toBe(0);
}
async function command(page: Page, line: string): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill(line);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

test('3D terrain streams real walls, anchors painted sprites, and exposes paused debug views', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  const scene = () =>
    page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      const w = s.landscape.world3d;
      return {
        chunks: w.chunks.size,
        draws: w.renderer.info.render.calls,
        positions: w.sprites.positions.size,
        walls: [...w.chunks.values()].reduce(
          (n: number, c: any) => n + c.group.children[1].geometry.getAttribute('position').count,
          0,
        ),
        hurdles: w.effects.hurdleCount,
        player: w.sprites.positions.get(s.player),
        fence: w.actors.getObjectByName('camp-timber-hurdles')?.count,
        silhouette: w.actors.getObjectByName('occluded-khan-silhouette')?.visible,
        h: w.terrain.height(s.player.x, s.player.y) * w.terrain.region.biome.heightScale,
      };
    });
  const start = await scene();
  expect(start.chunks).toBeGreaterThan(10);
  expect(start.walls).toBeGreaterThan(0);
  expect(start.positions).toBeGreaterThan(30);
  expect(start.hurdles).toBeGreaterThan(20);
  expect(start.fence).toBeGreaterThan(100);
  expect(start.silhouette).toBe(true);
  expect(start.player.y).toBeCloseTo(start.h, 5);
  await page.keyboard.press('Backquote');
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  for (const mode of [
    'wireframe',
    'elevation',
    'normals',
    'slope',
    'traversal',
    'chunks',
    'collision',
  ]) {
    await command(page, `terrain-debug ${mode}`);
    await expect(page.locator('[data-world-debug]')).toContainText(mode.toUpperCase());
  }
  await command(page, 'camera-angle 55');
  await command(page, 'terrain-only on');
  await expect(page.locator('#game-hud')).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(frozen);
  await command(page, 'terrain-debug off');
  await page.keyboard.press('Backquote');
  await page.screenshot({ path: 'test-results/world3d/terrain-only.png' });
  await page.keyboard.press('F7');
  await expect(page.locator('#game-hud')).toBeVisible();
  await page.keyboard.press('F6');
  expect(await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.angle)).toBe(60);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="destination:2:orkhon-valley"]').click();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  await settled(page);
  expect(await page.evaluate(() => (window as any).__gloam.scene.cameras.main.alpha)).toBe(0);
  await expect(page.locator('#app')).not.toHaveClass(/terrain-only/);
  expect(errors).toEqual([]);
});

test('Khan movement follows the ramp, terrain occludes sprites, and elevated combat still hits', async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.player.body.reset(3370, 2600);
    s.cameras.main.stopFollow().centerOn(3050, 2600);
  });
  await page.keyboard.down('KeyA');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.player.x), { timeout: 20000 })
    .toBeLessThan(3150);
  await page.keyboard.up('KeyA');
  await settled(page);
  const position = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      w = s.landscape.world3d;
    return {
      ground: w.terrain.actorHeight(s.player.x, s.player.y) * 1000,
      visual: w.sprites.positions.get(s.player).y,
      walk: s.landscape.navigation.isWalkable(s.player.x, s.player.y, 8),
    };
  });
  expect(position.walk).toBe(true);
  expect(position.visual).toBeCloseTo(position.ground, 3);
  expect(position.ground).toBeGreaterThan(170);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.player.body.reset(2600, 2600);
    s.cameras.main.centerOn(2700, 2600);
    s.spawnEnemy();
    const e = s.enemies.getChildren().find((e: any) => e.active);
    e.enableBody(true, 2730, 2600, true, true);
    e.health = e.maxHealth = 100000;
    e.attackTimer = e.clanAttackTimer = 999;
    e.setVelocity(0, 0);
    s.testTarget = e;
    s.shootVolley(2600, 2600, e, 1, 1);
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.testTarget.health), {
      timeout: 10000,
    })
    .toBeLessThan(100000);
  await settled(page);
  await page.screenshot({ path: 'test-results/world3d/elevated-combat.png' });
  // Inspect real depth testing with a ray from the camera through a lower-side ground anchor.
  const occluded = await page.evaluate(() => {
    const w = (window as any).__gloam.scene.landscape.world3d;
    for (const c of w.chunks.values()) {
      const p = c.group.children[1].geometry.getAttribute('position');
      for (let i = 0; i < p.count; i += 6)
        for (const offset of [-20, 20])
          if (
            w.occludes({
              x: p.getX(i),
              y:
                w.terrain.height(p.getX(i), p.getZ(i) + offset) *
                  w.terrain.region.biome.heightScale +
                15,
              z: p.getZ(i) + offset,
            })
          )
            return true;
    }
    return false;
  });
  expect(occluded).toBe(true);
});

test('bounded atlas batches support pooled combat without rebuilding settled terrain', async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.cameras.main.stopFollow().centerOn(2600, 2600);
    for (let i = 0; i < 350; i++) s.spawnEnemy();
    let i = 0;
    for (const e of s.enemies.getChildren()) {
      if (!e.active) continue;
      const angle = i * 2.3999;
      const radius = 100 + Math.sqrt(i / 350) * 330;
      e.enableBody(
        true,
        2600 + Math.cos(angle) * radius,
        2600 + Math.sin(angle) * radius,
        true,
        true,
      );
      e.health = e.maxHealth = 100000;
      e.attackTimer = e.clanAttackTimer = 999;
      i++;
    }
    s.testEnemyCount = i;
    const target = s.enemies.getChildren().find((e: any) => e.active);
    s.shootVolley(s.player.x, s.player.y, target, 250, 0.01);
  });
  await settled(page);
  await page.waitForTimeout(7500);
  const result = await page.evaluate(async () => {
    const s = (window as any).__gloam.scene;
    const w = s.landscape.world3d;
    const chunkIds = [...w.chunks.values()].map((c: any) => c.group.children[0].geometry.uuid);
    const start = performance.now();
    let frames = 0;
    let simulation = 0;
    let mark = 0;
    const before = () => {
      mark = performance.now();
    };
    const after = () => {
      simulation += performance.now() - mark;
    };
    s.events.on('preupdate', before);
    s.events.on('postupdate', after);
    await new Promise<void>((resolve) => {
      const tick = () => {
        frames++;
        if (performance.now() - start >= 1500) {
          s.events.off('prerender', tick);
          resolve();
        }
      };
      s.events.on('prerender', tick);
    });
    s.events.off('preupdate', before);
    s.events.off('postupdate', after);
    const gl = w.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      fps: (frames / (performance.now() - start)) * 1000,
      enemies: s.testEnemyCount,
      draws: w.renderer.info.render.calls,
      triangles: w.renderer.info.render.triangles,
      positions: w.sprites.positions.size,
      unchanged:
        JSON.stringify(chunkIds) ===
        JSON.stringify([...w.chunks.values()].map((c: any) => c.group.children[0].geometry.uuid)),
      nodes: w.terrain.cachedHeightNodes,
      textures: w.renderer.info.memory.textures,
      timings: w.timings,
      simulation: simulation / frames,
      gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      loopFPS: s.game.loop.actualFps,
      renderScale: w.renderScale,
    };
  });
  expect(result.enemies).toBeGreaterThan(300);
  expect(result.positions).toBeGreaterThan(500);
  expect(result.draws).toBeLessThan(45);
  expect(result.triangles).toBeLessThan(100000);
  expect(result.nodes).toBeLessThanOrEqual(32768);
  expect(result.unchanged).toBe(true);
  console.log('3D combat render sample', result);
  // Software rasterizers cannot validate target-GPU frame rate. Gate the CPU
  // and resource budget here, and retain measured FPS in the test report.
  expect(
    result.timings.sprites + result.timings.effects + result.timings.draw + result.simulation,
  ).toBeLessThan(50);
  expect(result.textures).toBeLessThan(20);
  if (!/SwiftShader|llvmpipe|software/i.test(result.gpu)) expect(result.fps).toBeGreaterThan(30);
  await page.screenshot({ path: 'test-results/world3d/combat-stress.png' });
});

test('all destinations use composed scenes by default, stream cleanly, and freeze water in the console', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  const places = [
    'golden-pasture',
    'silent-river',
    'broken-pass',
    'heart-of-the-steppe',
    'otgontenger',
    'bogd-khan-uul',
    'altai-tavan-bogd',
    'khan-tengri',
    'belukha',
    'altan-ovoo',
    'eej-khairkhan',
    'orkhon-valley',
  ];
  for (const id of places) {
    await page.keyboard.press('F8');
    const choice = page.locator(`[data-developer-level$=":${id}"]`).first();
    await choice.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__gloam.scene.landscape.world3d?.terrain.region.scene.id,
        ),
      )
      .toBe(id);
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
      s.developerTools.invincible = s.developerTools.clanInvincible = true;
    });
    await settled(page);
    const result = await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d;
      return {
        id: w.terrain.region.scene.id,
        chunks: w.chunks.size,
        pending: w.pendingChunks,
        missing: [...w.chunks.values()]
          .flatMap((c: any) => c.props)
          .filter((p: any) => p.texture.key === '__MISSING').length,
        height: w.terrain.actorHeight(s.player.x, s.player.y) * 1000,
        anchor: w.sprites.positions.get(s.player)?.y,
        road: s.landscape.navigation.isWalkable(3700, 2600, 12, true),
      };
    });
    expect(result.id).toBe(id);
    expect(result.chunks).toBeGreaterThan(5);
    expect(result.pending).toBe(0);
    expect(result.missing).toBe(0);
    expect(result.anchor).toBeCloseTo(result.height, 3);
    expect(result.road).toBe(true);
    await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
  }
  await page.keyboard.press('Backquote');
  const time = await page.evaluate(
    () => (window as any).__gloam.scene.landscape.world3d.water.time.value,
  );
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.water.time.value),
  ).toBe(time);
  await page.keyboard.press('Backquote');
  await page.screenshot({ path: 'test-results/overhaul/orkhon-default.png' });
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
