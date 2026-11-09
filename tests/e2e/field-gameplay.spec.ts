import { expect, test } from '@playwright/test';
import { expectFrozen, openTitle, startExpedition } from './helpers';

test('optional carts freeze in camp planning, pay once, and disappear on migration', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    window.__gloam.hooks.invincible({ khan: true, clan: true });
    window.__gloam.hooks.quietBattlefield({
      timers: ['spawnTimer', 'attackTimer'],
      clearEnemies: false,
    });
    s.run.clan.stageTime = 21;
    s.updateFieldObjectives(0.01);
  });
  await expect(page.locator('#field-objective')).toContainText('Scattered supplies');
  const before = await page.evaluate(() =>
    structuredClone((window as any).__gloam.scene.run.field),
  );
  await page.locator('#build').click();
  const frozen = await expectFrozen(
    page,
    () => page.evaluate(() => structuredClone((window as any).__gloam.scene.run.field)),
    19,
  );
  expect(frozen).toEqual(before);
  await page.locator('[data-action="exit-camp"]').first().click();
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene,
      o = s.run.field.objective;
    for (const e of s.enemies.getChildren()) e.disableBody(true, true);
    s.player.body.reset(o.x, o.y);
    const before = s.run.clan.materials;
    s.updateFieldObjectives(2);
    const after = s.run.clan.materials;
    s.updateFieldObjectives(2);
    return {
      status: o.status,
      gained: after - before,
      repeated: s.run.clan.materials - after,
      visible: s.fieldMarkers.image.visible,
    };
  });
  expect(result).toEqual({ status: 'complete', gained: 12, repeated: 0, visible: false });
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.stageTime = 60;
    s.run.field.nextAt = 59;
    s.updateFieldObjectives(0.01);
  });
  await expect(page.locator('#field-objective')).toContainText('A loose herd');
  await page.locator('#migrate').click();
  await page.locator('[data-route="river"]').click();
  await expect(page.locator('#field-objective')).toBeHidden();
});

test('marked gathering guards remain ordinary enemies and complete a bounded objective', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const result = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.legacy.crossings.push({ route: 'river', population: 8, locationId: 'otgontenger' });
    s.run.clan.stageTime = 30;
    s.updateFieldObjectives(0.01);
    // After one migration, the second opportunity at a camp is the enemy gathering.
    s.run.field.objective.status = 'complete';
    s.run.field.nextAt = 0;
    for (let i = 0; i < 5; i++) s.updateFieldObjectives(0.01);
    const o = s.run.field.objective;
    const guards = s.enemies.getChildren().filter((e: any) => e.active && e.objectiveId === o.id);
    for (const e of guards) s.damageEnemy(e, 9999);
    s.updateFieldObjectives(0.01);
    return {
      kind: o.kind,
      guards: guards.length,
      status: o.status,
      defeated: o.defeated,
      kills: s.run.kills,
      memories: s.run.legacy.memories.map((m: any) => m.title),
    };
  });
  expect(result).toMatchObject({
    kind: 'gathering',
    guards: 3,
    status: 'complete',
    defeated: 3,
    kills: 3,
  });
  expect(result.memories).toContain('An enemy gathering');
});
