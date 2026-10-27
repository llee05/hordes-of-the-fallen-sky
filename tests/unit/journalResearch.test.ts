import { describe, expect, it } from 'vitest';
import { createRun, applyResearch } from '../../src/game/state/run';
import { journalMenu } from '../../src/ui/menuContent';
import { clanMark } from '../../src/ui/artwork';

describe('chronicle research records', () => {
  it('shows legally purchased V2 patron and hybrid research alongside legacy ranks without mutation', () => {
    const run = createRun();
    run.pendingUpgrades = 30;
    for (const id of [
      'power',
      'power',
      'wide-quiver',
      'km-feathered-fan',
      'wolf-trail',
      'wolf-trail',
      'haste',
      'hy-galloping-barrage',
    ])
      expect(applyResearch(run, id)).toBe(true);
    run.phase = 'journal';
    const before = structuredClone(run);
    const html = journalMenu(run, 'traditions');
    expect(html).toContain('Khükhedei Mergen · The measured bow <small>RANK 2</small>');
    expect(html).toContain('Khükhedei Mergen · Feathered Fan <small>RANK 1</small>');
    expect(html).toContain(
      'Börte Chino + Khükhedei Mergen · Galloping Barrage <small>RANK 1</small>',
    );
    for (const id of Object.keys(run.upgrades)) expect(html).toContain(clanMark(`research:${id}`));
    expect(html.match(/class="tradition-entry"/g)).toHaveLength(6);
    expect(run).toEqual(before);
  });
  it('labels general research records independently of patrons', () => {
    const run = createRun();
    run.upgrades['gen-mapmaker'] = 1;
    const html = journalMenu(run, 'traditions');
    expect(html).toContain(
      'General research · Cartographer of the Open Steppe <small>RANK 1</small>',
    );
    expect(html).toContain(clanMark('research:gen-mapmaker'));
  });
  it('does not present zero ranks as learned traditions', () => {
    const run = createRun();
    run.upgrades.power = 0;
    const html = journalMenu(run, 'traditions');
    expect(html).toContain('Collect the shards');
    expect(html).not.toContain('class="tradition-entry"');
  });
});
