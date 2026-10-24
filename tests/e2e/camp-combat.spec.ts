import { expect, test, type Page } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

// Headless software rendering can need many wall-clock seconds for one active second.
// Preserve exact combat assertions while allowing the real simulation to reach them.
const activeExpect = expect.configure({ timeout: 20000 });

async function placeAttacker(page: Page, x: number, y: number, speed: number): Promise<void> {
  await page.evaluate(
    ({ x, y, speed }) => {
      const scene = (window as any).__gloam.scene;
      scene.spawnEnemy();
      const enemy = scene.enemies.getFirstAlive();
      enemy.setPosition(scene.camp.x + x, scene.camp.y + y);
      enemy.definition = { ...enemy.definition, speed };
      enemy.health = enemy.maxHealth = 10000;
      Object.assign(window, { campAttacker: enemy });
    },
    { x, y, speed },
  );
}

async function siegeState(page: Page) {
  return page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const enemy = (window as any).campAttacker;
    return {
      active: enemy.active,
      visible: enemy.visible,
      body: enemy.body.enable,
      x: enemy.x,
      y: enemy.y,
      distance: Math.hypot(enemy.x - scene.camp.x, enemy.y - scene.camp.y),
      speed: enemy.body.velocity.length(),
      cooldown: enemy.clanAttackTimer,
      frame: enemy.frame.name,
      resolve: scene.run.clan.integrity,
      elapsed: scene.run.elapsed,
      kills: scene.run.kills,
      spirit: scene.run.clan.spirit,
      gems: scene.gems.countActive(true),
    };
  });
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    scene.invulnerable = 999;
    scene.player.setPosition(scene.camp.x + 750, scene.camp.y);
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
  });
});

test('camp attackers stop outside the tents, repeat protected damage, freeze in menus, and only reward a defeat', async ({
  page,
}) => {
  await placeAttacker(page, 0, -190, 90);
  await activeExpect.poll(async () => (await siegeState(page)).resolve).toBeCloseTo(96.85);
  const first = await siegeState(page);
  expect(first).toMatchObject({
    active: true,
    visible: true,
    body: true,
    speed: 0,
    kills: 0,
    spirit: 0,
    gems: 0,
  });
  expect(first.distance).toBeGreaterThan(110);
  expect(first.distance).toBeLessThanOrEqual(120);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const enemy = (window as any).campAttacker;
    // Reaching the camp commits to attacking it even when the Khan rides closer.
    scene.player.setPosition(enemy.x + 28, enemy.y);
  });
  await page.waitForTimeout(200);
  const holding = await siegeState(page);
  expect(holding.x).toBe(first.x);
  expect(holding.y).toBe(first.y);
  expect(holding.speed).toBe(0);
  expect(holding.resolve).toBe(first.resolve);
  await page.keyboard.press('b');
  const frozen = await siegeState(page);
  await page.waitForTimeout(200);
  expect(await siegeState(page)).toEqual(frozen);
  await page.keyboard.press('Escape');
  await activeExpect
    .poll(async () => (await siegeState(page)).resolve)
    .toBeCloseTo(first.resolve - 3.15);
  expect((await siegeState(page)).elapsed - first.elapsed).toBeGreaterThan(1.3);
  const defeated = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const enemy = (window as any).campAttacker;
    scene.damageEnemy(enemy, enemy.health);
    return {
      active: enemy.active,
      body: enemy.body.enable,
      kills: scene.run.kills,
      spirit: scene.run.clan.spirit,
      xp: scene.gems.getFirstAlive().value,
    };
  });
  expect(defeated).toMatchObject({ active: false, body: false, kills: 1, xp: 3 });
  expect(defeated.spirit).toBeCloseTo(1.2);
  const reused = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const enemy = (window as any).campAttacker;
    const previousSpawn = enemy.spawnId;
    scene.spawnEnemy();
    return {
      same: scene.enemies.getFirstAlive() === enemy,
      spawn: enemy.spawnId - previousSpawn,
      body: enemy.body.enable,
      cooldown: enemy.clanAttackTimer,
      charging: enemy.chargeTimer,
      preparing: enemy.preparingAttack,
    };
  });
  expect(reused).toEqual({
    same: true,
    spawn: 1,
    body: true,
    cooldown: 0,
    charging: 0,
    preparing: false,
  });
});

test('every enemy can hold and animate a camp attack, including a charging rider and ranged creatures', async ({
  page,
}) => {
  const attackers = await page.evaluate(async () => {
    const { ENEMIES, SKYBREAKER } = await import('/src/game/data/enemies.ts');
    const scene = (window as any).__gloam.scene;
    const definitions = [...ENEMIES, SKYBREAKER];
    for (const [index, definition] of definitions.entries()) {
      const before = scene.enemies.countActive(true);
      for (let attempt = 0; attempt < 10 && scene.enemies.countActive(true) === before; attempt++)
        scene.spawnEnemy({ ...definition, damage: 0, health: 10000 });
      const enemy = scene.boss;
      const angle = (index * Math.PI * 2) / definitions.length;
      enemy.setPosition(scene.camp.x + Math.cos(angle) * 118, scene.camp.y + Math.sin(angle) * 118);
      enemy.chargeTimer = 2.9;
      enemy.setData('chargeAngle', angle + Math.PI);
      enemy.attackTimer = 0;
    }
    scene.updateEnemies(0.01);
    scene.updateCharacterAnimations(0.01);
    return {
      shots: scene.hostileShots.countActive(true),
      enemies: scene.enemies.getChildren().map((enemy: any) => ({
        active: enemy.active,
        body: enemy.body.enable,
        speed: enemy.body.velocity.length(),
        charging: enemy.chargeTimer,
        cooldown: enemy.clanAttackTimer,
        frame: enemy.frame.name,
        texture: enemy.definition.texture,
      })),
    };
  });
  expect(attackers.enemies).toHaveLength(8);
  expect(attackers.shots).toBe(14);
  for (const enemy of attackers.enemies) {
    expect(enemy).toMatchObject({ active: true, body: true, speed: 0, charging: 0, cooldown: 1.5 });
    expect(enemy.frame).toBe(`${enemy.texture}-attack-1`);
  }
  const wardHealth = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.patrons.guardian.wardDamage = 0.65;
    scene.spatial.rebuild(scene.enemies.getChildren());
    scene.patronSupport.update(scene.run, 0.01, scene.player, scene.camp, scene.spatial, {
      damage: (enemy: any, amount: number) => scene.damageEnemy(enemy, amount),
      volley: () => {},
    });
    return scene.enemies.getChildren().map((enemy: any) => enemy.health);
  });
  for (const health of wardHealth) expect(health).toBeCloseTo(10000 - 16 * 0.65);
  await page.screenshot({ path: 'test-results/camp-under-attack.png' });
});

test('attackers chase the caravan again and cannot damage it while it is out of reach', async ({
  page,
}) => {
  await placeAttacker(page, -118, 0, 0);
  await activeExpect.poll(async () => (await siegeState(page)).resolve).toBeCloseTo(96.85);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 45;
  });
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  await activeExpect
    .poll(() =>
      page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return scene.camp.x - (window as any).campAttacker.x;
      }),
    )
    .toBeGreaterThan(130);
  const before = await siegeState(page);
  await page.evaluate(() => {
    (window as any).campAttacker.clanAttackTimer = 0;
  });
  await page.waitForTimeout(200);
  expect((await siegeState(page)).resolve).toBe(before.resolve);
  await page.evaluate(() => {
    const enemy = (window as any).campAttacker;
    enemy.definition = { ...enemy.definition, speed: 120 };
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).campAttacker.body.velocity.x))
    .toBeGreaterThan(0);
  await expect.poll(async () => (await siegeState(page)).resolve).toBeLessThan(before.resolve);
  expect((await siegeState(page)).active).toBe(true);
});
