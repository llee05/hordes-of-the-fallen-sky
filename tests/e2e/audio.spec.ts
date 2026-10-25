import { expect, test, type Page } from '@playwright/test';
import { selectCampBuilding, closeOverlayOrPause, buyNode, startExpedition } from './helpers';

async function heard(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).heardSounds);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        (window as any).audioContextsCreated = ((window as any).audioContextsCreated ?? 0) + 1;
      }
    };
  });
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(await page.evaluate(() => (window as any).audioContextsCreated ?? 0)).toBe(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.context)).toBeUndefined();
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await startExpedition(page);
  await page.evaluate(() => (window as any).__gloam.scene.audio.ready());
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.context?.state))
    .toBe('running');
  expect(await page.evaluate(() => (window as any).audioContextsCreated)).toBe(1);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = scene.attackTimer = 999;
    for (const enemy of scene.enemies.getChildren()) enemy.disableBody(true, true);
    scene.audio.reset();
    scene.audio.setPlaying(true);
    Object.assign(window, { heardSounds: [] });
    const play = scene.audio.play.bind(scene.audio);
    scene.audio.play = (...args: any[]) => {
      const accepted = play(...args);
      if (accepted) (window as any).heardSounds.push(args[0]);
      return accepted;
    };
  });
});

test('riding and combat use decoded recordings, and an empty volley stays silent', async ({
  page,
}) => {
  await page.evaluate(() => (window as any).__gloam.scene.fire());
  expect(await heard(page)).not.toContain('shoot');
  await page.keyboard.down('d');
  await expect.poll(async () => (await heard(page)).includes('hoof')).toBe(true);
  await page.keyboard.press('Space');
  await page.keyboard.up('d');
  expect(await heard(page)).toContain('dash');
  const combat = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.player.setPosition(scene.camp.x + 280, scene.camp.y);
    scene.audio.update(0.01, {
      speed: 0,
      galloping: false,
      caravan: false,
      region: 0,
      listener: scene.player,
      camp: scene.camp,
    });
    for (let i = 0; i < 10 && !scene.enemies.countActive(true); i++) scene.spawnEnemy();
    const enemy = scene.enemies.getFirstAlive();
    enemy.setPosition(scene.camp.x + 119, scene.camp.y);
    enemy.health = enemy.maxHealth = 10000;
    enemy.definition = { ...enemy.definition, speed: 0 };
    scene.updateEnemies(0.01);
    scene.damageEnemy(enemy, 5);
    scene.shootVolley(scene.player.x, scene.player.y, enemy, 1, 1);
    scene.fireHostile(enemy, 0);
    scene.damageEnemy(enemy, 10000);
    const voices = [...scene.audio.voices] as any[];
    return voices.map((voice) => {
      const samples = voice.source.buffer.getChannelData(0);
      return {
        kind: voice.kind,
        rate: voice.source.buffer.sampleRate,
        contextRate: scene.audio.context.sampleRate,
        layers: voice.layers.length,
        seconds: voice.source.buffer.duration,
        peak: samples.reduce((peak: number, sample: number) => Math.max(peak, Math.abs(sample)), 0),
      };
    });
  });
  for (const kind of ['barrier', 'impact', 'shoot', 'spell', 'defeat'])
    expect(await heard(page)).toContain(kind);
  expect(combat.length).toBeGreaterThan(0);
  expect(combat.length).toBeLessThanOrEqual(12);
  const bow = combat.find((voice) => voice.kind === 'shoot');
  expect(bow).toBeDefined();
  expect(bow!.seconds).toBeLessThan(0.4);
  expect(bow!.layers).toBe(2);
  for (const voice of combat) {
    expect(voice.rate).toBe(voice.contextRate);
    expect(voice.seconds).toBeGreaterThan(0.06);
    expect(voice.peak).toBeGreaterThan(0.05);
    expect(voice.peak).toBeLessThanOrEqual(0.801);
  }
});

test('camp work and research sound in menus while world cues and cadence are stopped', async ({
  page,
}) => {
  await page.keyboard.down('d');
  await expect.poll(async () => (await heard(page)).includes('hoof')).toBe(true);
  await page.keyboard.up('d');
  await page.keyboard.press('b');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.voices.size))
    .toBe(0);
  const frozen = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      time: scene.run.elapsed,
      activity: scene.audio.activity,
      hoof: scene.audio.hoofDistance,
    };
  });
  await selectCampBuilding(page, 'archery');
  await buyNode(page, 'archery-base');
  expect(await heard(page)).toContain('build');
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.play('shoot'))).toBe(false);
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        time: scene.run.elapsed,
        activity: scene.audio.activity,
        hoof: scene.audio.hoofDistance,
      };
    }),
  ).toEqual(frozen);
  await closeOverlayOrPause(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 1;
  });
  await page.keyboard.press('t');
  await buyNode(page, 'wolf-trail');
  expect(await heard(page)).toContain('research');
});

test('the journey and successive Khans have distinct cues, with one audio context across restarts', async ({
  page,
}) => {
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    Object.assign(window, { originalAudioContext: scene.audio.context });
    scene.run.clan.stageTime = 45;
  });
  await page.keyboard.press('m');
  await page.locator('[data-route="river"]').click();
  expect(await heard(page)).toContain('depart');
  await expect.poll(async () => (await heard(page)).includes('caravan')).toBe(true);
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 100;
  });
  await expect.poll(async () => (await heard(page)).includes('arrive')).toBe(true);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
    scene.run.khan.successionRemaining = 0.01;
  });
  expect(await heard(page)).toContain('fall');
  await expect.poll(async () => (await heard(page)).includes('succession')).toBe(true);
  await page.evaluate(() => (window as any).__gloam.scene.finish('won'));
  expect(await heard(page)).toContain('victory');
  await page.evaluate(() => (window as any).__gloam.scene.restart());
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        same: scene.audio.context === (window as any).originalAudioContext,
        voices: scene.audio.voices.size,
      };
    }),
  ).toEqual({ same: true, voices: 0 });
  await startExpedition(page);
  await page.evaluate(() => (window as any).__gloam.scene.finish('dead'));
  expect(await heard(page)).toContain('loss');
  await page.evaluate(() => (window as any).__gloam.scene.game.destroy(true));
  await expect
    .poll(() => page.evaluate(() => (window as any).originalAudioContext.state))
    .toBe('closed');
});

test('muting cancels a playing cue, persists, and unmuting restores audio without resuming a paused game', async ({
  page,
}) => {
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.play('victory'))).toBe(true);
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.voices.size))
    .toBe(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.play('build'))).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Unmute sound', exact: true }).click();
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await startExpedition(page);
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await closeOverlayOrPause(page);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('paused');
  await closeOverlayOrPause(page);
  await page.keyboard.down('d');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.lastPlayed.has('hoof')))
    .toBe(true);
  await page.keyboard.up('d');
});

test('independent volume sliders persist, reference auditions stay in Settings, and zero silences only its bus', async ({
  page,
}) => {
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.locator('.audio-reference-controls summary').click();
  await page.getByRole('slider', { name: 'Combat volume', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Bow', exact: true }).click();
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.diagnostics.events)).toBe(0);
  await page.getByRole('button', { name: 'Parchment', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.diagnostics.events))
    .toBeGreaterThan(0);
  await page.getByRole('slider', { name: 'Ambience volume', exact: true }).fill('24');
  await page.getByRole('slider', { name: 'Music volume', exact: true }).fill('17');
  await page.getByRole('slider', { name: 'Interface volume', exact: true }).fill('43');
  await page.getByRole('slider', { name: 'Interface volume', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Interface volume', exact: true })).toHaveValue(
    '44',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('slider', { name: 'Interface volume', exact: true })).toHaveValue(
    '43',
  );
  for (const size of [
    { width: 1280, height: 800 },
    { width: 960, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.getByRole('slider', { name: 'Interface volume' })).toBeVisible();
    expect(
      await page.locator('.utility-panel').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(frozen);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Combat volume', exact: true })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: 'Ambience volume', exact: true })).toHaveValue(
    '24',
  );
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('17');
  await expect(page.getByRole('slider', { name: 'Interface volume', exact: true })).toHaveValue(
    '43',
  );
});

test('unavailable recorded bows fail quietly with a clear diagnostic and the rest of the palette still works', async ({
  page,
}) => {
  await page.route('**/audio/bow-*.ogg', (route) => route.fulfill({ status: 404, body: '' }));
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => (window as any).__gloam.scene.audio.ready());
  const result = await page.evaluate(() => {
    const audio = (window as any).__gloam.scene.audio;
    return {
      failed: Object.keys(audio.diagnostics.failed),
      pending: audio.diagnostics.needed,
      shot: audio.play('shoot', undefined, 1, true),
      impact: audio.play('impact', undefined, 1, true),
    };
  });
  expect(result.failed).toEqual(expect.arrayContaining(['bow1', 'bow2', 'bow3', 'bow4']));
  expect(result.pending).toContain('music-steppe.ogg');
  expect(result.shot).toBe(false);
  expect(result.impact).toBe(true);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});
