import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';
test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
  });
});
test('charged arrows pin a charger and pooled arrows clear their special effect', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const s = (window as any).__gloam.scene;
    const { ENEMIES } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/data/enemies.ts'
    )) as typeof import('../../src/game/data/enemies');
    s.spawnEnemy({ ...ENEMIES.find((e) => e.id === 'ghost-rider')!, health: 10000 });
    const e = s.enemies.getFirstAlive();
    e.setPosition(s.player.x + 120, s.player.y);
    e.health = e.maxHealth = 10000;
    e.tactics.phase = 'charge';
    e.tactics.remaining = 0.5;
    e.tactics.direction = { x: -1, y: 0 };
    e.tactics.aim = { x: s.player.x, y: s.player.y };
    s.run.upgrades['piercing-shaft'] = 1;
    s.shootVolley(s.player.x, s.player.y, e, 1, 1, false, true);
    const arrow = s.projectiles.getFirstAlive();
    s.hitEnemy(arrow, e);
    const pin = { remaining: e.pinned, phase: e.tactics.phase, health: e.health };
    for (const b of s.projectiles.getChildren()) b.disableBody(true, true);
    s.shootVolley(s.player.x, s.player.y, e, 1, 1);
    const reused = s.projectiles.getFirstAlive();
    // Copying simulation state must remain safe for purchase previews.
    const copy = structuredClone(s.run);
    return {
      pin,
      reused: reused === arrow,
      pins: reused.pins,
      plainDamage: reused.damage,
      clone: !!copy.combat,
    };
  });
  expect(result.pin.remaining).toBe(0.65);
  expect(result.pin.phase).toBe('recover');
  expect(result.pin.health).toBeCloseTo(10000 - 16 * 1.35);
  expect(result).toMatchObject({ reused: true, pins: false, plainDamage: 16, clone: true });
});
test('seer danger zones warn and strike in the opening area, while menus freeze them', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const s = (window as any).__gloam.scene;
    const { ENEMIES } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/data/enemies.ts'
    )) as typeof import('../../src/game/data/enemies');
    s.spawnEnemy({ ...ENEMIES.find((e) => e.id === 'hollow-seer')!, health: 10000, speed: 0 });
    const e = s.enemies.getFirstAlive();
    e.setPosition(s.player.x + 300, s.player.y);
    e.dangerTimer = 0;
    e.attackTimer = 999;
    s.updateEnemies(0.01);
    s.updateHazards(0.01);
  });
  await page.locator('#build').click();
  const before = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    return s.hazards.map((h: any) => h.remaining);
  });
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.hazards.map((h: any) => h.remaining)),
  ).toEqual(before);
  await page.locator('[data-action="exit-camp"]').first().click();
  const hit = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      h = s.hazards.find((h: any) => h.source === 'seer');
    s.player.body.reset(h.x, h.y);
    s.invulnerable = 0;
    const health = s.run.health;
    const visible = h.warning.commandBuffer.length > 0;
    s.updateHazards(2);
    return { visible, damage: health - s.run.health, left: s.hazards.length };
  });
  expect(hit).toEqual({ visible: true, damage: 12, left: 0 });
});
