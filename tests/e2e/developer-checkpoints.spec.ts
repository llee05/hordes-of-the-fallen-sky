import { expect, test } from '@playwright/test';
import { DEVELOPER_LEVELS } from '../../src/game/dev/levels';

// A fresh page per checkpoint bounds CI deadlines and makes each level shardable.
test.describe.configure({ mode: 'parallel' });

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
  test(`developer checkpoints launch their real chapter, landscape, and crossing: ${group.name}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?terrain=2d');
    await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
    for (const level of group.levels) {
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
              landscape: scene.landscape.regional.name,
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
    }
    expect(errors).toEqual([]);
  });
