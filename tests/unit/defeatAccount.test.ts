import { describe, expect, it } from 'vitest';
import { defeatAccount } from '../../src/game/data/story';
import { advanceClan, beginMigration, damageClan } from '../../src/game/state/clan';
import { createRun } from '../../src/game/state/run';
import { defeatAccountContent } from '../../src/ui/storyContent';
import type { RunState } from '../../src/game/types';

const text = (run: RunState) => defeatAccount(run).join(' ');

/** Leaves the first camp by the given route and completes the crossing to the Silent River. */
function crossToSilentRiver(route = 'river'): RunState {
  const run = createRun();
  run.phase = 'route';
  run.clan.stageTime = 45;
  expect(beginMigration(run, route, 'silent-river')).toBe(true);
  run.phase = 'playing';
  advanceClan(run, 200);
  expect(run.clan.locationId).toBe('silent-river');
  return run;
}

describe('the defeat account', () => {
  it('tells where the clan fell and what struck the last blow, from the recorded damage', () => {
    const run = createRun();
    run.phase = 'playing';
    // Each fifth of resolve lost costs a person; the last one empties the camp.
    run.clan.population = 1;
    run.clan.integrity = 15;
    damageClan(run, 100, undefined, 'attack', 'Hollow wolf');
    expect(run.clan.population).toBe(0);
    const account = defeatAccount(run);
    expect(account[0]).toBe(
      'At the Golden Pasture, before the clan had ever broken camp, the last of the clan was lost. The final blow came from a hollow wolf.',
    );
    expect(text(run)).toContain('In all, one person was lost on the road.');
    expect(account.at(-1)).toBe(
      'The journey ends here. The road it travelled is still remembered.',
    );
    expect(text(run)).not.toMatch(/Another clan|undefined|NaN|\$\{/);
  });

  it('names each recorded cause without inventing an attacker', () => {
    const run = createRun();
    const blow = (
      cause: 'attack' | 'starvation' | 'eruption' | 'seer' | 'area',
      source?: string,
    ) => {
      run.safety.lastDamage = { cause, at: 0, amount: 8, people: 1, ...(source ? { source } : {}) };
      return defeatAccount(run)[0]!;
    };
    expect(blow('attack', 'Earthbound hulk')).toContain('from an earthbound hulk.');
    expect(blow('attack', 'Rime hound')).toContain('from a rime hound.');
    expect(blow('attack', 'Skybreaker')).toContain('from the Skybreaker.');
    expect(blow('attack', '<b>forged</b>')).toContain('from the unreturned.');
    expect(blow('attack')).toContain('from the unreturned.');
    expect(blow('starvation')).toContain('hunger struck the final blow');
    expect(blow('eruption')).toContain('the ground erupted at the camp');
    expect(blow('seer')).toContain('a seer’s strike on the camp');
    expect(blow('area')).toContain('a spell or a shift in the land');
    run.safety.lastDamage = undefined;
    expect(defeatAccount(run)[0]).not.toContain('final blow');
  });

  it('separates a broken resolve from the loss of everyone, in singular and plural', () => {
    const run = createRun();
    run.clan.integrity = 0;
    run.clan.population = 3;
    expect(text(run)).toContain(
      'the clan’s resolve gave out with 3 people still beneath the banner',
    );
    run.clan.population = 1;
    expect(text(run)).toContain('with one person still beneath the banner');
    run.story.peopleLost = 1;
    expect(text(run)).toContain('In all, one person was lost on the road.');
  });

  it('recalls only the camps actually reached and never names the destination still ahead', () => {
    const run = crossToSilentRiver('refuge');
    run.phase = 'route';
    run.clan.stageTime = 45;
    expect(beginMigration(run, 'river', 'broken-pass')).toBe(true);
    run.phase = 'playing';
    run.clan.integrity = 0;
    const account = text(run);
    expect(account).toContain('On the road out of the Silent River, the clan’s resolve gave out');
    expect(account).toContain('The road had led from the Golden Pasture to the Silent River.');
    expect(account).toContain('On the way, the clan answered the blue banners.');
    expect(account).not.toMatch(/Broken Pass/);
  });

  it('lists every crossing in order and the final defense, without naming any companion', () => {
    const run = createRun();
    run.story.crossings = [
      { route: 'refuge', region: 1, population: 16, locationId: 'otgontenger' },
      { route: 'refuge', region: 2, population: 20, locationId: 'orkhon-valley' },
      { route: 'ridge', region: 3, population: 18, locationId: 'heart-of-the-steppe' },
    ];
    run.clan.region = 3;
    run.clan.locationId = 'heart-of-the-steppe';
    run.clan.stage = 'final';
    run.clan.population = 0;
    run.clan.finalBossDefeated = true;
    run.story.peopleLost = 18;
    const account = text(run);
    expect(account).toContain(
      'At the Heart of the Steppe, while the passage was still being cleared, the last of the clan was lost.',
    );
    expect(account).toContain(
      'from the Golden Pasture to Mount Otgontenger, Orkhon Valley, and the Heart of the Steppe.',
    );
    expect(account).toContain('answered the blue banners twice');
    expect(account).toContain('The Skybreaker had already fallen.');
    expect(account).not.toMatch(/Saran|Nara|Erden|Boro/);
  });

  it('acknowledges the Khans who carried the banner and a succession left unfinished', () => {
    const run = createRun();
    expect(text(run)).not.toMatch(/Khan/);
    run.khan.successionRemaining = 4;
    expect(text(run)).toContain('The Khan had fallen, and no successor had yet taken up the bow.');
    run.khan.generation = 3;
    expect(text(run)).toContain(
      'The banner had passed through 3 Khans’ hands; the last of them had fallen, and no successor had yet taken up the bow.',
    );
    run.khan.successionRemaining = 0;
    expect(text(run)).toContain('The banner had passed through 3 Khans’ hands.');
  });

  it('renders each paragraph escaped on its own line of the defeat screen', () => {
    const run = createRun();
    run.story.peopleLost = 2;
    const html = defeatAccountContent(run);
    expect(html.split('<br>')).toHaveLength(defeatAccount(run).length);
    expect(html).toContain('the clan’s resolve gave out with 8 people');
    expect(html.replaceAll('<br>', '')).not.toMatch(/[<>]/);
  });
});
