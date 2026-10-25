import { launchElectron } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';

test.use({ trace: 'off' });
test('Golden Pasture art review, water pause, and pooled combat retain native resource budgets', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp('/tmp/steppe-art-review-');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const env = { ...process.env, GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]! };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await launchElectron({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /THREE|WebGL|shader/i.test(message.text()))
        errors.push(message.text());
    });
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(1280, 800),
    );
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(1280);
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.spawnTimer = s.attackTimer = s.hazardTimer = 999;
      s.developerTools.invincible = s.developerTools.clanInvincible = true;
      for (const e of s.enemies.getChildren()) e.disableBody(true, true);
      s.player.body.reset(2600, 2700);
      s.cameras.main.stopFollow().setZoom(1).centerOn(2600, 2600);
      s.setPhase('playing');
    });
    await expect
      .poll(
        () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.pendingChunks),
        { timeout: 30000 },
      )
      .toBe(0);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d;
      s.run.elapsed = 45;
      s.run.phase = 'paused';
      s.physics.pause();
      w.setRenderScale(1);
      w.qualityTime = performance.now() + 60000;
      w.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    });
    await page.screenshot({ path: 'test-results/environment/after-golden-wide.png' });
    await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.setTerrainOnly(true));
    await expect(page.locator('#game-hud')).toBeHidden();
    await page.screenshot({ path: 'test-results/environment/after-terrain-wide.png' });
    await page.evaluate(() =>
      (window as any).__gloam.scene.landscape.world3d.setTerrainOnly(false),
    );
    const qualityBefore = await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d;
      w.setRenderScale(0.5);
      return {
        anchor: w.sprites.positions.get(s.player).y,
        height: w.terrain.actorHeight(s.player.x, s.player.y) * 1000,
        terrain: JSON.stringify(
          [...w.chunks.values()].map((c: any) => c.group.children[0].geometry.uuid),
        ),
      };
    });
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(
        () => (window as any).__gloam.scene.landscape.world3d.materials.samplingDetail.value,
      ),
    ).toBe(0);
    expect(qualityBefore.anchor).toBeCloseTo(qualityBefore.height, 4);
    expect(
      await page.evaluate(() =>
        JSON.stringify(
          [...(window as any).__gloam.scene.landscape.world3d.chunks.values()].map(
            (c: any) => c.group.children[0].geometry.uuid,
          ),
        ),
      ),
    ).toBe(qualityBefore.terrain);
    await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.setRenderScale(1));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d;
      s.setPhase('playing');
      w.qualityTime = 0;
      for (let i = 0; i < 350; i++) s.spawnEnemy();
      let index = 0;
      for (const e of s.enemies.getChildren())
        if (e.active) {
          const angle = index * 2.3999,
            radius = 100 + Math.sqrt(index / 350) * 280;
          e.enableBody(
            true,
            2600 + Math.cos(angle) * radius,
            2600 + Math.sin(angle) * radius,
            true,
            true,
          );
          e.health = e.maxHealth = 100000;
          e.attackTimer = e.clanAttackTimer = 999;
          index++;
        }
      s.testEnemyCount = index;
      s.shootVolley(
        s.player.x,
        s.player.y,
        s.enemies.getChildren().find((e: any) => e.active),
        250,
        0.01,
      );
    });
    const metrics = await page.evaluate(async () => {
      const s = (window as any).__gloam.scene,
        w = s.landscape.world3d,
        start = performance.now();
      let frames = 0;
      const ids = JSON.stringify(
        [...w.chunks.values()].map((c: any) => c.group.children[0].geometry.uuid),
      );
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
      const gl = w.renderer.getContext(),
        debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        fps: (frames / (performance.now() - start)) * 1000,
        renderScale: w.renderScale,
        secondarySamples: w.materials.samplingDetail.value,
        enemies: s.testEnemyCount,
        draws: w.renderer.info.render.calls,
        triangles: w.renderer.info.render.triangles,
        textures: w.renderer.info.memory.textures,
        sameTerrain:
          ids ===
          JSON.stringify([...w.chunks.values()].map((c: any) => c.group.children[0].geometry.uuid)),
        gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable',
        nodes: w.terrain.cachedHeightNodes,
        sprites: w.sprites.positions.size,
      };
    });
    console.log('Golden Pasture native combat', metrics);
    expect(metrics.enemies).toBe(350);
    expect(metrics.sameTerrain).toBe(true);
    expect(metrics.draws).toBeLessThan(45);
    expect(metrics.textures).toBeLessThan(20);
    expect(metrics.triangles).toBeLessThan(100000);
    expect(metrics.nodes).toBeLessThanOrEqual(32768);
    if (!/SwiftShader|llvmpipe|software/i.test(metrics.gpu))
      expect(metrics.fps).toBeGreaterThan(30);
    await page.screenshot({ path: 'test-results/environment/after-combat-wide.png' });
    await page.keyboard.press('Backquote');
    await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toBeFocused();
    const frozen = await page.evaluate(
      () => (window as any).__gloam.scene.landscape.world3d.water.time.value,
    );
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.water.time.value),
    ).toBe(frozen);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Backquote');
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__gloam.scene.landscape.world3d.water.motion.value),
      )
      .toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
