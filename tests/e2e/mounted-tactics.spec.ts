import { expect, test } from '@playwright/test';
import { expectFrozen, openTitle, startExpedition } from './helpers';

test.beforeEach(async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    window.__gloam.hooks.quietBattlefield({
      timers: ['spawnTimer', 'attackTimer'],
      clearEnemies: true,
    });
  });
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
  await expectFrozen(
    page,
    () => page.evaluate(() => (window as any).__gloam.scene.hazards.map((h: any) => h.remaining)),
    16,
  );
  await page.locator('[data-action="exit-camp"]').first().click();
  const hit = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      h = s.hazards.find((h: any) => h.source === 'seer');
    s.player.body.reset(h.x, h.y);
    window.__gloam.hooks.setTimers({ invulnerable: 0 });
    const health = s.run.health;
    const visible = h.warning.commandBuffer.length > 0;
    s.updateHazards(2);
    return { visible, damage: health - s.run.health, left: s.hazards.length };
  });
  expect(hit).toEqual({ visible: true, damage: 12, left: 0 });
});
