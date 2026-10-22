import { expect, test, type Page } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

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
  await openTitle(page);
  expect(await page.evaluate(() => (window as any).audioContextsCreated ?? 0)).toBe(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.context)).toBeUndefined();
  await startExpedition(page);
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

test('riding and combat use real material buffers, and an empty volley stays silent', async ({
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
        rate: voice.source.buffer.sampleRate,
        seconds: voice.source.buffer.duration,
        peak: samples.reduce((peak: number, sample: number) => Math.max(peak, Math.abs(sample)), 0),
      };
    });
  });
  for (const kind of ['barrier', 'impact', 'shoot', 'spell', 'defeat'])
    expect(await heard(page)).toContain(kind);
  expect(combat.length).toBeGreaterThan(0);
  expect(combat.length).toBeLessThanOrEqual(16);
  for (const voice of combat) {
    expect(voice.rate).toBe(24000);
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
    return { time: scene.run.elapsed, wind: scene.audio.windTimer, hoof: scene.audio.hoofDistance };
  });
  await page.locator('[data-node="archery-base"]').click();
  expect(await heard(page)).toContain('build');
  expect(await page.evaluate(() => (window as any).__gloam.scene.audio.play('shoot'))).toBe(false);
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        time: scene.run.elapsed,
        wind: scene.audio.windTimer,
        hoof: scene.audio.hoofDistance,
      };
    }),
  ).toEqual(frozen);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.pendingUpgrades = 1;
  });
  await page.keyboard.press('t');
  await page.locator('[data-node="wolf-trail"]').click();
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
  await page.keyboard.press('Escape');
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
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await startExpedition(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('paused');
  await page.keyboard.press('Escape');
  await page.keyboard.down('d');
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.audio.lastPlayed.has('hoof')))
    .toBe(true);
  await page.keyboard.up('d');
});
