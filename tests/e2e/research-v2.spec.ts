import { expect, test } from '@playwright/test';
import { buyNode, inspectNode, openTitle, startExpedition } from './helpers';

test('V2 research exposes proposed content honestly, pins legal routes, and works by keyboard in compact mode', async ({
  page,
}) => {
  test.setTimeout(90000);
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.pendingUpgrades = 30;
    scene.spawnTimer = 999;
    scene.developerTools.invincible = scene.developerTools.clanInvincible = true;
  });
  await page.keyboard.press('t');
  await expect(page.locator('.patron-navigation [data-tree-branch-select]')).toHaveCount(10);
  await inspectNode(page, 'gen-mapmaker');
  await expect(page.locator('.node-effect')).toContainText('Proposed effect');
  await expect(page.locator('.node-purchase-status')).toContainText('discovery pool');
  await expect(page.locator('.tree-purchase')).toBeDisabled();
  await inspectNode(page, 'on-bond-of-ashes');
  await expect(page.locator('.node-purchase-status')).toContainText('expiry lifecycle');
  await inspectNode(page, 'hy-galloping-barrage');
  await expect(page.locator('.node-route')).toContainText('6 knowledge points');
  await page.getByRole('button', { name: 'Pin research target', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pinned: Galloping Barrage', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zoom research map in', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reset research map zoom', exact: true }),
  ).toHaveText('110%');
  await expect(page.locator('.tree-graph')).toHaveCSS('zoom', '1.1');
  await page.getByRole('button', { name: 'Reset research map zoom', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a branch' }).fill('Golomt');
  await page.getByRole('button', { name: 'Pinned: Galloping Barrage', exact: true }).click();
  await expect(page.locator('[data-tree-branch="hybrids"]')).toBeVisible();
  await page.getByRole('button', { name: 'Compact list', exact: true }).click();
  await expect(page.locator('.tree-graph')).toHaveAttribute('data-compact', 'true');
  for (const id of ['power', 'power', 'haste', 'wolf-trail', 'wolf-trail']) await buyNode(page, id);
  await page.getByRole('button', { name: 'Pinned: Galloping Barrage', exact: true }).click();
  await expect(page.locator('.tree-purchase')).toBeEnabled();
  await page.locator('.tree-purchase').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-node="hy-galloping-barrage"]')).toHaveAttribute(
    'data-status',
    'learned',
  );
  await inspectNode(page, 'one-perfect-shot');
  await page.locator('.tree-purchase').click();
  await expect(page.locator('.tree-purchase')).toContainText('Confirm choice:');
  expect(
    await page.evaluate(() => (window as any).__gloam.scene.run.upgrades['one-perfect-shot'] ?? 0),
  ).toBe(0);
  await page.locator('.tree-purchase').press('Enter');
  await expect(page.locator('[data-node="through-the-horde"]')).toHaveAttribute(
    'data-status',
    'excluded',
  );
  await page.setViewportSize({ width: 800, height: 600 });
  const purchase = (await page.locator('.tree-purchase').boundingBox())!;
  expect(purchase.x + purchase.width).toBeLessThanOrEqual(800);
  expect(purchase.y + purchase.height).toBeLessThanOrEqual(600);
  await page.screenshot({ path: 'test-results/research-v2-compact.png' });
});

test('research links open destinations hidden by search filters', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('t');
  const search = page.getByRole('searchbox', { name: 'Find a branch' });
  await search.fill('Galloping Barrage');
  await page.locator('[data-node="hy-galloping-barrage"]').click();
  await page.locator('.node-prerequisites [data-tree-select="wolf-trail"]').click();
  await expect(page.locator('.node-inspector h3')).toHaveText('The wolf’s trail');
  await expect(search).toHaveValue('');
  await search.fill('Galloping Barrage');
  await page.locator('[data-node="hy-galloping-barrage"]').click();
  await page.locator('.node-route [data-tree-select="wolf-trail"]').first().click();
  await expect(page.locator('.node-inspector h3')).toHaveText('The wolf’s trail');
  await search.fill('Golomt');
  await page.getByRole('button', { name: 'Patron overview', exact: true }).click();
  await page.locator('[data-focus-key="bridge-hy-galloping-barrage"]').click();
  await expect(page.locator('.node-inspector h3')).toHaveText('Galloping Barrage');
  await expect(search).toHaveValue('');
});

test('V2 target, shard and volley effects are consumed by actual scene gameplay hooks', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const result = await page.evaluate(async () => {
    const rules =
      // @ts-expect-error Vite serves renderer modules by source URL.
      (await import('/src/game/state/run.ts')) as typeof import('../../src/game/state/run');
    const { applyResearch } = rules;
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    scene.run.pendingUpgrades = 40;
    for (const e of scene.enemies.getChildren()) e.disableBody(true, true);
    for (const p of scene.projectiles.getChildren()) p.disableBody(true, true);
    for (const id of [
      'ancestral-companion',
      'ancestral-companion',
      'remembered-aim',
      'on-spirit-signal',
      'spirit-thread',
      'on-memory-vessels',
      'on-quiet-council',
      'council-of-ancestors',
      'on-ancestral-archers',
      'power',
      'wide-quiver',
      'power',
      'km-feathered-fan',
    ]) {
      if (!applyResearch(scene.run, id)) throw Error(`Cannot purchase ${id}`);
    }
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getFirstAlive();
    enemy.setPosition(scene.player.x + 120, scene.player.y);
    enemy.health = enemy.maxHealth = 10000;
    scene.spatial.rebuild([]);
    scene.patronSupport.clock.restore({ ancestorTimer: 0, waterTimer: 999, guardianTimer: 999 });
    scene.patronSupport.update(scene.run, 0.016, scene.player, scene.camp, scene.spatial, {
      damage: () => {},
      volley: () => {},
    });
    const emptyCounted =
      scene.run.researchRuntime?.echoAttacks?.some((n: number) => n > 0) ?? false;
    scene.spatial.rebuild([enemy]);
    scene.shootVolley(scene.player.x, scene.player.y, enemy, 2, 1, false, false, 'khan');
    const bolt = scene.projectiles.getFirstAlive();
    const damage = bolt.damage;
    scene.hitEnemy(bolt, enemy);
    const target = scene.run.researchRuntime.targetSpawn === enemy.spawnId;
    const gem = scene.gems.get(scene.player.x, scene.player.y, 'gem');
    gem.enableBody(true, scene.player.x, scene.player.y, true, true);
    gem.value = 1;
    gem.attracted = false;
    scene.collectGems(0.016);
    const stacks = scene.run.researchRuntime.memoryStacks;
    let shots = 0;
    scene.patronSupport.clock.restore({ ancestorTimer: 0, waterTimer: 999, guardianTimer: 999 });
    scene.run.researchRuntime.echoAttacks = [3, 3, 3];
    scene.patronSupport.update(scene.run, 0.016, scene.player, scene.camp, scene.spatial, {
      damage: () => {},
      volley: () => {
        shots++;
      },
    });
    return {
      target,
      stacks,
      shots,
      damage,
      expectedDamage: scene.run.stats.damage * 0.95,
      emptyCounted,
      paidPurchases: scene.run.researchPurchases.length,
      recordedKhanDamage: scene.run.researchObservations?.damage.khan ?? 0,
    };
  });
  expect(result.emptyCounted).toBe(false);
  expect(result.paidPurchases).toBe(13);
  expect(result.recordedKhanDamage).toBeGreaterThan(0);
  expect(result.target).toBe(true);
  expect(result.stacks).toBe(1);
  expect(result.shots).toBe(6);
  expect(result.damage).toBeCloseTo(result.expectedDamage);
});
