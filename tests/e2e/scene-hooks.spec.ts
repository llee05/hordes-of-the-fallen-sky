import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

// Browser tests reach ArenaScene members by name through window.__gloam.scene.
// When code moves out of the scene, each name must keep working through a
// forwarder, or the specs that use it fail far from the cause. This list is the
// contract; see docs/arena-scene.md.

/** Live objects and arrays that tests read or change in place; reads return the same object. */
const LIVE = [
  'run',
  'player',
  'shadow',
  'camp',
  'enemies',
  'projectiles',
  'hostileShots',
  'gems',
  'landscape',
  'spatial',
  'audio',
  'controller',
  'callbacks',
  'playerMotion',
  'campBarrier',
  'clanLife',
  'defeats',
  'developerTools',
  'fieldMarkers',
  'areaEncounter',
  'areaThreats',
  'areaEffects',
  'joystick',
  'riders',
  'packedGers',
  'hazards',
] as const;

/** Values tests read; they may be undefined or primitive. */
const READABLE = [
  'dragOrigin',
  'developerRun',
  'saveBusy',
  'packingRemaining',
  'canSaveExpedition',
] as const;

/** Saved timers (WorldArchive.timers); tests assign them directly. */
const TIMERS = [
  'spawnTimer',
  'attackTimer',
  'dashTimer',
  'dashRemaining',
  'invulnerable',
  'supportTimer',
  'wagonTimer',
  'wardTimer',
] as const;

/** Other members tests assign directly. */
const ASSIGNABLE = ['hazards'] as const;

/** Methods tests call with positional arguments. */
const METHODS = [
  'update',
  'spawnEnemy',
  'updateEnemies',
  'takeDamage',
  'hurtPlayer',
  'damageEnemy',
  'damageClan',
  'shootVolley',
  'fire',
  'fireRiders',
  'fireHostile',
  'updateProjectiles',
  'hitEnemy',
  'collectGems',
  'updateHazards',
  'updateSupport',
  'updateCamp',
  'updateAreaCombat',
  'updateFieldObjectives',
  'updateCharacterAnimations',
  'hideFallenKhan',
  'burst',
  'snapshot',
  'publishPhase',
  'setPhase',
  'finish',
  'captureWorld',
  'requestCheckpoint',
  'saveExpedition',
  'loadExpedition',
  'prepareToClose',
  'startRun',
  'restart',
  'togglePause',
  'openBuildings',
  'openRoutes',
  'closeCamp',
  'improveNomadicCamp',
  'chooseRoute',
  'cycleFormation',
  'dash',
  'changeZoom',
] as const;

test('scene members used by browser tests stay reachable with their kinds', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();

  const problems = await page.evaluate(
    ({ live, readable, timers, assignable, methods }) => {
      const s = (window as any).__gloam.scene;
      const found: string[] = [];
      for (const name of [
        'quietBattlefield',
        'spawn',
        'volley',
        'advance',
        'setTimers',
        'invincible',
      ] as const)
        if (typeof window.__gloam.hooks[name] !== 'function')
          found.push(`hooks.${name}: not a method`);
      for (const name of live) {
        const value = s[name];
        if (value === null || typeof value !== 'object') found.push(`${name}: not a live object`);
        else if (s[name] !== value) found.push(`${name}: returns a new object on each read`);
      }
      for (const name of readable) if (!(name in s)) found.push(`${name}: missing`);
      for (const name of methods)
        if (typeof s[name] !== 'function') found.push(`${name}: not a method`);
      for (const name of [...timers, ...assignable]) {
        // Assigning a missing name would create a new property and still read back.
        if (!(name in s)) {
          found.push(`${name}: missing`);
          continue;
        }
        const before = s[name];
        const probe = typeof before === 'number' ? before + 1.25 : [...before];
        s[name] = probe;
        if (s[name] !== probe) found.push(`${name}: assignment is not read back`);
        s[name] = before;
      }
      return found;
    },
    { live: LIVE, readable: READABLE, timers: TIMERS, assignable: ASSIGNABLE, methods: METHODS },
  );
  expect(problems).toEqual([]);
});

test('assigned scene timers are the timers a save captures', async ({ page }) => {
  await openTitle(page);
  await startExpedition(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();

  const result = await page.evaluate((timers) => {
    const s = (window as any).__gloam.scene;
    const assigned = Object.fromEntries(timers.map((name, index) => [name, 10.5 + index]));
    for (const name of timers) s[name] = assigned[name];
    const captured = s.captureWorld().timers;
    const facadeAssigned = Object.fromEntries(timers.map((name, index) => [name, 20.5 + index]));
    window.__gloam.hooks.setTimers(facadeAssigned);
    const facadeCaptured = s.captureWorld().timers;
    let rejected = false;
    try {
      window.__gloam.hooks.setTimers({ spawnTimer: 0, renamedTimer: 99 } as never);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes('Unknown arena timer');
    }
    const afterRejected = s.captureWorld().timers;
    const beforeAdvance = s.run.elapsed;
    window.__gloam.hooks.advance(0.1);
    return {
      assigned,
      captured,
      facadeAssigned,
      facadeCaptured,
      rejected,
      afterRejected,
      pausedElapsed: s.run.elapsed - beforeAdvance,
    };
  }, TIMERS);
  expect(result.captured).toEqual(result.assigned);
  expect(result.facadeCaptured).toEqual(result.facadeAssigned);
  expect(result.rejected).toBe(true);
  expect(result.afterRejected).toEqual(result.facadeAssigned);
  expect(result.pausedElapsed).toBe(0);
});
