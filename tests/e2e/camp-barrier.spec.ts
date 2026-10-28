import { expect, test, type Page } from '@playwright/test';
import { GAME } from '../../src/game/config';
import {
  selectCampBuilding,
  closeOverlayOrPause,
  buyNode,
  openTitle,
  startExpedition,
} from './helpers';

async function barrierState(page: Page): Promise<{
  radius: number;
  travelling: boolean;
  wear: number;
  pieces: {
    visible: boolean;
    x: number;
    y: number;
    depth: number;
    commands: number;
    impact: number;
  }[];
}> {
  return page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const barrier = scene.campBarrier;
    return {
      radius: barrier.radius,
      travelling: barrier.travelling,
      wear: barrier.wear,
      pieces: barrier.hurdles.map((piece: any) => ({
        visible: piece.image.visible,
        x: piece.image.x,
        y: piece.image.y,
        depth: piece.image.depth,
        commands: piece.image.commandBuffer.length,
        impact: piece.impactRemaining,
      })),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    scene.player.setPosition(scene.camp.x + 650, scene.camp.y);
    scene.cameras.main.stopFollow().centerOn(scene.camp.x, scene.camp.y);
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
});

test('wooden hurdles receive local melee and missile impacts, with feedback frozen in camp menus', async ({
  page,
}) => {
  const initial = await barrierState(page);
  expect(initial.radius).toBe(196);
  expect(initial.pieces).toHaveLength(48);
  const visible = initial.pieces.filter((piece) => piece.visible);
  expect(visible.length).toBeGreaterThanOrEqual(24);
  expect(visible.every((piece) => piece.commands > 0)).toBe(true);
  expect(new Set(visible.map((piece) => piece.depth)).size).toBeGreaterThan(10);
  const firstHit = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    // Random offscreen spawns can be rejected by minimumPlayerDistance after centering
    // on camp. Use the actual attack position, safely away from the Khan, instead.
    if (
      !scene.spawnEnemy(undefined, {
        point: { x: scene.camp.x + scene.campBarrier.radius + 11, y: scene.camp.y },
      })
    )
      throw new Error('Could not place the barrier attacker');
    const enemy = scene.enemies.getFirstAlive();
    enemy.setPosition(scene.camp.x + scene.campBarrier.radius + 11, scene.camp.y);
    enemy.health = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
    scene.updateEnemies(0.01);
    enemy.clanAttackTimer = 999;
    Object.assign(window, { barrierAttacker: enemy });
    scene.openBuildings();
    return {
      resolve: scene.run.clan.integrity,
      active: enemy.active,
      speed: enemy.body.velocity.length(),
    };
  });
  expect(firstHit).toMatchObject({ active: true, speed: 0 });
  expect(firstHit.resolve).toBeCloseTo(96.85);
  const frozen = await barrierState(page);
  const struck = frozen.pieces.filter((piece) => piece.impact > 0);
  expect(struck).toHaveLength(1);
  expect(struck[0]!.x).toBeGreaterThan(2600 + 100);
  await page.waitForTimeout(250);
  expect(await barrierState(page)).toEqual(frozen);
  await closeOverlayOrPause(page);
  await expect
    .poll(async () => (await barrierState(page)).pieces.every((piece) => piece.impact === 0))
    .toBe(true);
  const missile = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.fireHostile((window as any).barrierAttacker, Math.PI);
    const shot = scene.hostileShots.getFirstAlive();
    shot.setPosition(scene.camp.x + scene.campBarrier.radius - 1, scene.camp.y);
    shot.setVelocity(0, 0);
    shot.damage = 20;
    const resolveBefore = scene.run.clan.integrity;
    scene.updateProjectiles(0.01);
    return {
      active: shot.active,
      body: shot.body.enable,
      resolve: scene.run.clan.integrity,
      resolveBefore,
    };
  });
  expect(missile).toMatchObject({ active: false, body: false });
  expect(missile.resolve).toBeCloseTo(missile.resolveBefore - 7);
  expect((await barrierState(page)).pieces.filter((piece) => piece.impact > 0)).toHaveLength(1);
  await page.screenshot({ path: 'test-results/camp-barrier-impact.png' });
});

test('the barricade encloses new crafts and households while both attack and ward reach follow its edge', async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.population = 32;
  });
  await expect.poll(async () => (await barrierState(page)).radius).toBeGreaterThanOrEqual(196);
  await page.keyboard.press('b');
  await selectCampBuilding(page, 'felt');
  await buyNode(page, 'felt-base');
  await expect(page.locator('[data-camp-site="artisans-ger"]')).toHaveAttribute('data-level', '1');
  await closeOverlayOrPause(page);
  const expanded = await barrierState(page);
  expect(expanded.radius).toBe(200);
  expect(expanded.pieces).toHaveLength(48);
  const attack = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    // Random offscreen spawns can be rejected by minimumPlayerDistance after centering
    // on camp. Use the actual attack position, safely away from the Khan, instead.
    if (
      !scene.spawnEnemy(undefined, {
        point: { x: scene.camp.x + scene.campBarrier.radius + 11, y: scene.camp.y },
      })
    )
      throw new Error('Could not place the barrier attacker');
    const enemy = scene.enemies.getFirstAlive();
    enemy.setPosition(scene.camp.x + scene.campBarrier.radius + 11, scene.camp.y);
    enemy.health = enemy.maxHealth = 1000;
    enemy.definition = { ...enemy.definition, speed: 0 };
    scene.updateEnemies(0.01);
    scene.run.patrons.guardian.wardDamage = 0.65;
    scene.spatial.rebuild(scene.enemies.getChildren());
    scene.patronSupport.update(scene.run, 0.01, scene.player, scene.camp, scene.spatial, {
      damage: (target: any, amount: number) => scene.damageEnemy(target, amount),
      volley: () => {},
    });
    return {
      resolve: scene.run.clan.integrity,
      health: enemy.health,
      speed: enemy.body.velocity.length(),
    };
  });
  expect(attack.resolve).toBeCloseTo(96.85);
  expect(attack.health).toBeCloseTo(1000 - 16 * 0.65);
  expect(attack.speed).toBe(0);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.integrity = 25;
  });
  await expect.poll(async () => (await barrierState(page)).wear).toBe(2);
  await page.screenshot({ path: 'test-results/expanded-camp-barrier.png' });
});

test('the same bounded barrier follows the caravan, freezes, redeploys on arrival, and resets for a new game', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    Object.assign(window, {
      oldBarrierPieces: scene.campBarrier.hurdles.map((piece: any) => piece.image),
    });
    // Random offscreen spawns can be rejected by minimumPlayerDistance after centering
    // on camp. Use the actual attack position, safely away from the Khan, instead.
    if (
      !scene.spawnEnemy(undefined, {
        point: { x: scene.camp.x + scene.campBarrier.radius + 11, y: scene.camp.y },
      })
    )
      throw new Error('Could not place the barrier attacker');
    const enemy = scene.enemies.getFirstAlive();
    enemy.setPosition(scene.camp.x + scene.campBarrier.radius + 11, scene.camp.y);
    enemy.definition = { ...enemy.definition, speed: 0, damage: 0 };
    Object.assign(window, { frontAttacker: enemy });
    scene.run.clan.stageTime = 45;
  });
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  await expect.poll(async () => (await barrierState(page)).travelling).toBe(true);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.camp.x))
    .toBeGreaterThan(2605);
  // updateEnemies pushes to attackRange - 1 only after crossing that clearance.
  // Fractional caravan steps can leave the attacker anywhere in the contact band.
  await expect
    .poll(() =>
      page.evaluate((attackReach) => {
        const scene = (window as any).__gloam.scene;
        const distance = (window as any).frontAttacker.x - scene.camp.x;
        const attackRange = scene.campBarrier.radius + attackReach;
        return {
          outsideClearance: distance >= attackRange - 1,
          withinAttackReach: distance <= attackRange,
        };
      }, GAME.camp.barrier.attackReach),
    )
    .toEqual({ outsideClearance: true, withinAttackReach: true });
  await closeOverlayOrPause(page);
  const frozen = await barrierState(page);
  await page.waitForTimeout(200);
  expect(await barrierState(page)).toEqual(frozen);
  await closeOverlayOrPause(page);
  await page.screenshot({ path: 'test-results/caravan-barrier.png' });
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.campBarrier.hit(scene.camp, { x: scene.camp.x + 200, y: scene.camp.y });
    scene.run.clan.stageTime = 100;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(1);
  const arrived = await barrierState(page);
  expect(arrived.travelling).toBe(false);
  expect(arrived.pieces.every((piece) => piece.impact === 0)).toBe(true);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return scene.campBarrier.hurdles.every(
        (piece: any, index: number) => piece.image === (window as any).oldBarrierPieces[index],
      );
    }),
  ).toBe(true);
  for (const piece of arrived.pieces.filter((piece) => piece.visible)) {
    expect(Math.abs(piece.x - 2600)).toBeLessThanOrEqual(arrived.radius);
    expect(Math.abs(piece.y - 2600)).toBeLessThanOrEqual(arrived.radius);
  }
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await startExpedition(page);
  const restarted = await barrierState(page);
  expect(restarted.radius).toBe(196);
  expect(restarted.pieces).toHaveLength(48);
  expect(restarted.pieces.every((piece) => piece.impact === 0)).toBe(true);
  expect(
    await page.evaluate(() => (window as any).oldBarrierPieces.every((image: any) => !image.scene)),
  ).toBe(true);
});
