import { expect, test, type Page } from '@playwright/test';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { DEVELOPER_LEVELS } from '../../src/game/dev/levels';
import { sceneFrames } from './helpers';

test.describe.configure({ mode: 'parallel' });

async function settled(page: Page): Promise<void> {
  await sceneFrames(page);
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__gloam.scene.landscape.world3d?.pendingChunks),
      { timeout: 30000 },
    )
    .toBe(0);
}

function rememberWorld(page: Page): Promise<void> {
  return page.evaluate(() => {
    (window as any).previousWorld = (window as any).__gloam.scene.landscape.world3d;
  });
}

// A restart must replace the world, release its chunks, and leave exactly one renderer canvas.
async function expectPreviousWorldDisposed(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const world = (window as any).__gloam.scene.landscape.world3d;
        return Boolean(world) && world !== (window as any).previousWorld;
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => ({
      chunks: (window as any).previousWorld.chunks.size,
      connected: (window as any).previousWorld.renderer.domElement.isConnected,
    })),
  ).toEqual({ chunks: 0, connected: false });
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
}

// Two walkthroughs of four real places each keep every sweep below eight transitions.
const groups = [0, 4].map((start) => ({
  name: `real places ${start + 1}–${start + 4}`,
  levels: DEVELOPER_LEVELS.slice(start, start + 4),
}));

for (const group of groups)
  test(
    `developer checkpoints launch their real place and landscape: ${group.name}`,
    group.levels[0]!.locationId === 'otgontenger' ? { tag: '@core' } : {},
    async ({ page }) => {
      // Landscape checks stream, freeze, and make one extra disposal transition per sweep.
      test.setTimeout(60000 + 30000 * (group.levels.length + 1));
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible({
        timeout: 15000,
      });
      for (const [index, level] of group.levels.entries()) {
        if (index > 0) await rememberWorld(page);
        await page.keyboard.press('F8');
        await page.locator(`[data-developer-level="${level.id}"]`).click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(page.locator('#developer-run')).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(() => {
              const scene = (window as any).__gloam.scene;
              return {
                locationId: scene.run.clan.locationId,
                stage: scene.run.clan.stage,
                landscape: `landscape-${scene.landscape.world3d.terrain.region.scene.id}`,
                paused: scene.physics.world.isPaused,
              };
            }),
          )
          .toEqual({
            locationId: level.locationId,
            stage: 'camp',
            landscape: `landscape-${level.locationId}`,
            paused: false,
          });
        await expect(page.locator('#migrate')).toBeEnabled();

        if (index > 0) await expectPreviousWorldDisposed(page);

        await page.evaluate(() => {
          window.__gloam.hooks.quietBattlefield({ clearEnemies: false });
          window.__gloam.hooks.invincible({ khan: true, clan: true });
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
        expect(result.id).toBe(level.locationId);
        expect(result.chunks).toBeGreaterThan(5);
        expect(result.pending).toBe(0);
        expect(result.missing).toBe(0);
        expect(result.anchor).toBeCloseTo(result.height, 3);
        expect(result.road).toBe(true);
        await expect(page.locator('canvas[data-world-renderer="3d"]')).toHaveCount(1);
        await page.keyboard.press('Backquote');
        await expect(page.locator('#app')).toHaveAttribute('data-phase', 'console');
        const frozenState = () =>
          page.evaluate(() => {
            const scene = (window as any).__gloam.scene;
            return {
              run: JSON.stringify(scene.run),
              water: scene.landscape.world3d.water?.time.value ?? null,
            };
          });
        const frozen = await frozenState();
        if (LANDSCAPES[level.locationId].water) expect(frozen.water).toEqual(expect.any(Number));
        else expect(frozen.water).toBeNull();
        await sceneFrames(page);
        expect(await frozenState()).toEqual(frozen);
        await page.keyboard.press('Backquote');
        await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
      }
      // One more restart checks that the last landscape in the sweep is disposed too.
      await rememberWorld(page);
      await page.keyboard.press('F8');
      await page.locator('[data-developer-level="place:otgontenger"]').click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
      await expectPreviousWorldDisposed(page);
      expect(
        await page.evaluate(
          () => (window as any).__gloam.scene.landscape.world3d.terrain.region.scene.id,
        ),
      ).toBe('otgontenger');
      expect(errors).toEqual([]);
    },
  );
