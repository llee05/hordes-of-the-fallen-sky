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

// Keep each walkthrough below eight transitions without paying for 29 cold starts.
const groups = [
  { name: 'chapters', levels: DEVELOPER_LEVELS.filter((level) => level.group === 'chapters') },
  ...[0, 1, 2].map((region) => ({
    name: `crossings from chapter ${region + 1}`,
    levels: DEVELOPER_LEVELS.filter(
      (level) => level.group === 'crossings' && level.region === region,
    ),
  })),
  ...[1, 2].map((region) => ({
    name: `destinations in chapter ${region + 1}`,
    levels: DEVELOPER_LEVELS.filter(
      (level) => level.group === 'destinations' && level.region === region,
    ),
  })),
];

for (const group of groups)
  test(
    `developer checkpoints launch their real chapter, landscape, and crossing: ${group.name}`,
    group.name === 'chapters' ? { tag: '@core' } : {},
    async ({ page }) => {
      // The chapter and chapter-2 destination groups together sweep all 12 landscapes.
      const isLandscapeCheck =
        group.name === 'chapters' || group.name === 'destinations in chapter 2';
      // Landscape checks stream, freeze, and make one extra disposal transition per sweep.
      test.setTimeout(
        isLandscapeCheck
          ? 60000 + 30000 * (group.levels.length + 1)
          : group.levels.length > 4
            ? 240000
            : 120000,
      );
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
                region: scene.run.clan.region,
                locationId: scene.run.clan.locationId ?? 'golden-pasture',
                routeId: scene.run.clan.stage === 'migration' ? scene.run.clan.routeId : undefined,
                stage: scene.run.clan.stage,
                landscape: `landscape-${scene.landscape.world3d.terrain.region.scene.id}`,
                paused: scene.physics.world.isPaused,
                knowledge: scene.run.pendingUpgrades,
              };
            }),
          )
          .toEqual({
            region: level.region,
            locationId: level.locationId,
            routeId: level.routeId,
            stage: level.routeId ? 'migration' : level.region === 3 ? 'final' : 'camp',
            landscape: `landscape-${level.locationId}`,
            paused: false,
            knowledge: 40,
          });
        if (level.routeId) await expect(page.locator('#build')).toBeDisabled();
        else if (level.region < 3) await expect(page.locator('#migrate')).toBeEnabled();

        if (index > 0) await expectPreviousWorldDisposed(page);

        if (isLandscapeCheck) {
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
          expect(result.id).toBe(level.locationId);
          expect(result.chunks).toBeGreaterThan(5);
          expect(result.pending).toBe(0);
          expect(result.missing).toBe(0);
          expect(result.anchor).toBeCloseTo(result.height, 3);
          if (!level.routeId) expect(result.road).toBe(true);
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
      }
      if (isLandscapeCheck) {
        // One more restart checks that the last landscape in the sweep is disposed too.
        await rememberWorld(page);
        await page.keyboard.press('F8');
        await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
        await expectPreviousWorldDisposed(page);
        expect(
          await page.evaluate(
            () => (window as any).__gloam.scene.landscape.world3d.terrain.region.scene.id,
          ),
        ).toBe('golden-pasture');
      }
      expect(errors).toEqual([]);
    },
  );
