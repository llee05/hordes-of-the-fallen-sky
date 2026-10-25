import { expect, test } from '@playwright/test';
import { openTitle } from './helpers';
test('Skybreaker warnings lead to one volley and a vulnerable paused-safe recovery window', async ({
  page,
}) => {
  await openTitle(page);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:heart-of-the-steppe"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.stageTime = 21;
  });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__gloam.scene.boss?.active))
    .toBe(true);
  const state = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.stageTime = 130;
    s.run.finalStand.phase = 'advance';
    s.run.finalStand.remaining = 0.01;
    s.updateFinalStand(0.02);
    const warning = s.run.finalStand.phase,
      before = s.hostileShots.countActive(true);
    s.updateFinalStand(2.4);
    const fired = s.hostileShots.countActive(true) - before;
    const health = s.boss.health;
    s.damageEnemy(s.boss, 10);
    s.setPhase('paused');
    const remaining = s.run.finalStand.remaining;
    s.updateFinalStand(100);
    return {
      warning,
      fired,
      phase: s.run.finalStand.phase,
      damage: health - s.boss.health,
      remaining,
      after: s.run.finalStand.remaining,
    };
  });
  expect(state).toMatchObject({ warning: 'warning', phase: 'recovery', fired: 11, damage: 15 });
  expect(state.after).toBe(state.remaining);
  await expect(page.locator('#boss-stage')).toContainText('VULNERABLE');
});
