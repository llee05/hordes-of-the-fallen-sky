import { expect, test, type Page } from '@playwright/test';
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
  const advancing = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    for (const e of s.enemies.getChildren()) if (e !== s.boss) e.disableBody(true, true);
    s.run.finalStand.phase = 'advance';
    s.run.finalStand.approach = 2;
    s.boss.setPosition(s.camp.x + 330, s.camp.y);
    s.player.setPosition(s.camp.x + 320, s.camp.y);
    s.updateEnemies(0.01);
    return s.boss.body.velocity.length();
  });
  expect(advancing).toBeGreaterThan(0);
});

/** Use a disposable checkpoint; the scene still fires and collides its own arrows. */
async function faceSkybreaker(page: Page): Promise<void> {
  await openTitle(page);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:heart-of-the-steppe"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 21;
  });
  await expect
    .poll(() => page.evaluate(() => !!(window as any).__gloam.scene.boss?.active))
    .toBe(true);
}

async function defeatInCombat(
  page: Page,
  options: { population: number; resolve: number; speech: boolean; coolingDown?: boolean },
): Promise<void> {
  await page.evaluate(async (options) => {
    const s = (window as any).__gloam.scene;
    for (const enemy of s.enemies.getChildren())
      if (enemy !== s.boss) enemy.disableBody(true, true);
    s.spawnTimer = 999;
    s.invulnerable = 999;
    s.run.clan.population = options.population;
    s.run.clan.integrity = options.resolve;
    s.run.story.enabled = options.speech;
    s.run.legacy.reactionUntil = 0;
    if (options.coolingDown) {
      const modulePath = '/src/game/state/legacy.ts';
      const { rememberClan } = await import(modulePath);
      rememberClan(
        s.run,
        'The watch gathered',
        'The defenders kept close to the wagons.',
        { speaker: 'nara', text: 'Keep close to the wagons.' },
        'The remaining hands kept watch.',
      );
    }
    s.run.finalStand.phase = 'advance';
    s.run.finalStand.remaining = 999;
    s.player.setPosition(s.camp.x + 600, s.camp.y);
    s.boss.setPosition(s.player.x + 140, s.player.y);
    s.boss.health = 1;
    s.attackTimer = 0;
  }, options);
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.finalBossDefeated))
    .toBe(true);
  await expect(page.locator('#boss-bar')).toBeHidden();
  await expect(page.locator('#clan-message')).toHaveText(
    'The Skybreaker has fallen. Protect the families until the passage opens.',
  );
}

async function openDefeatMemory(page: Page) {
  await page.keyboard.press('j');
  await page.getByRole('tab', { name: 'Our story' }).click();
  const memory = page.locator('.clan-memory').filter({ hasText: 'The Skybreaker fell' });
  await expect(memory).toHaveCount(1);
  await memory.locator('summary').click();
  await memory.scrollIntoViewIfNeeded();
  return memory;
}

test('defeating the Skybreaker restores resolve once and retains Boro in the chronicle', async ({
  page,
}) => {
  test.setTimeout(60000);
  await faceSkybreaker(page);
  await defeatInCombat(page, { population: 8, resolve: 50, speech: true });
  await expect(page.locator('#companion-reaction')).toContainText('Boro:');
  await expect(page.locator('#companion-reaction')).toContainText('It is down.');
  const reward = await page.evaluate(async () => {
    const s = (window as any).__gloam.scene;
    const configPath = '/src/game/config.ts';
    const { GAME } = await import(configPath);
    return { resolve: s.run.clan.integrity, expected: 50 + GAME.finalStand.bossResolve };
  });
  expect(reward.resolve).toBe(reward.expected);
  await page.screenshot({ path: test.info().outputPath('skybreaker-defeat-hud.png') });
  const memory = await openDefeatMemory(page);
  await expect(memory).toContainText('8 people watched the great creature fall');
  await expect(memory.locator('blockquote')).toContainText('Boro');
  await expect(memory).toContainText('back to the wagons. We are not through yet.');
  const repeated = await page.evaluate(async () => {
    const s = (window as any).__gloam.scene;
    const modulePath = '/src/game/state/finalStand.ts';
    const { defeatSkybreaker } = await import(modulePath);
    const before = JSON.stringify({ clan: s.run.clan, legacy: s.run.legacy });
    s.damageEnemy(s.boss, 100000);
    const accepted = defeatSkybreaker(s.run);
    return {
      accepted,
      unchanged: before === JSON.stringify({ clan: s.run.clan, legacy: s.run.legacy }),
      memories: s.run.legacy.memories.filter((m: any) => m.title === 'The Skybreaker fell').length,
    };
  });
  expect(repeated).toEqual({ accepted: false, unchanged: true, memories: 1 });
  await test.info().attach('skybreaker-state', {
    body: JSON.stringify({ reward, repeated }),
    contentType: 'application/json',
  });
  await page.screenshot({ path: test.info().outputPath('skybreaker-boro-memory.png') });
});

for (const scenario of [
  { name: 'three survivors remember collectively', population: 3, speech: true, speaker: 'clan' },
  { name: 'five survivors still hear Boro', population: 5, speech: true, speaker: 'boro' },
  { name: 'Camp scenes Off retains the fact without speech', population: 8, speech: false },
  {
    name: 'reaction cooldown retains the fact without a transcript',
    population: 8,
    speech: true,
    coolingDown: true,
  },
]) {
  test(`Skybreaker defeat: ${scenario.name}`, async ({ page }) => {
    test.setTimeout(60000);
    await faceSkybreaker(page);
    await defeatInCombat(page, { ...scenario, resolve: 90 });
    const state = await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      return {
        resolve: s.run.clan.integrity,
        memories: s.run.legacy.memories.filter((m: any) => m.title === 'The Skybreaker fell'),
      };
    });
    expect(state.resolve).toBe(100);
    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].line?.speaker).toBe(scenario.speaker);
    await test.info().attach('skybreaker-state', {
      body: JSON.stringify(state),
      contentType: 'application/json',
    });
    if (scenario.speaker === 'clan')
      await expect(page.locator('#companion-reaction')).toContainText(
        'The great creature lies still. The few who remain turn back to the wagons.',
      );
    else if (scenario.speaker === 'boro')
      await expect(page.locator('#companion-reaction')).toContainText('Boro:');
    else if (scenario.coolingDown) {
      await expect(page.locator('#companion-reaction')).toContainText(
        'Nara: “Keep close to the wagons.”',
      );
      await expect(page.locator('#companion-reaction')).not.toContainText('Boro');
    } else await expect(page.locator('#companion-reaction')).toBeHidden();
    const memory = await openDefeatMemory(page);
    await expect(memory).toContainText(
      `${scenario.population} people watched the great creature fall`,
    );
    if (scenario.speaker) {
      await expect(memory.locator('blockquote')).toHaveCount(1);
      if (scenario.speaker === 'clan') {
        await expect(memory).toContainText('The few who remain');
        await expect(memory).not.toContainText('Boro');
      }
    } else await expect(memory.locator('blockquote')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('skybreaker-memory.png') });
  });
}

for (const defeated of [true, false]) {
  test(`surviving the final stand preserves the ${defeated ? 'defeated' : 'living'} Skybreaker epilogue`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await faceSkybreaker(page);
    if (defeated) await defeatInCombat(page, { population: 8, resolve: 50, speech: true });
    await page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      s.run.story.enabled = true;
      s.run.clan.stageTime = 180;
    });
    await expect(page.getByRole('heading', { name: 'Hold the road.' })).toBeVisible();
    await expect(page.locator('.story-dialogue')).toContainText(
      defeated ? 'The great creature has fallen' : 'The great creature is still coming.',
    );
    await page.getByRole('button', { name: /Continue without choosing/ }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'epilogue');
    await expect(page.locator('.epilogue-copy')).toContainText(
      defeated
        ? 'The Skybreaker has fallen behind them.'
        : 'The Skybreaker still walks beyond the mountain.',
    );
    await expect(page.locator('.epilogue-copy')).toContainText(
      'Keep a place beside the fire. Someone is still coming home.',
    );
    await page.screenshot({ path: test.info().outputPath('skybreaker-epilogue.png') });
  });
}
