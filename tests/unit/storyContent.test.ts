import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { storyEncounter, STORY_ORDER } from '../../src/game/data/story';
import { storyMenu, storyRecords } from '../../src/ui/storyContent';
import { clanMemories, khanRecords } from '../../src/ui/legacyContent';

const payload = `<b>x</b> & "quoted" 'text'`;
const escaped = '&lt;b&gt;x&lt;/b&gt; &amp; &quot;quoted&quot; &#39;text&#39;';

function storyRun() {
  const run = createRun();
  const encounter = storyEncounter(run, 'fire');
  encounter.title = payload;
  encounter.setting = payload;
  encounter.lines = [{ speaker: 'saran', text: payload }];
  encounter.choices = [
    {
      ...encounter.choices[0]!,
      id: payload,
      label: payload,
      description: payload,
      response: payload,
    },
  ];
  run.story.active = encounter;
  run.story.records = [
    { encounter, choice: encounter.choices[0], elapsed: 0, population: 8, status: 'chosen' },
  ];
  return run;
}

describe('chronicle text rendering', () => {
  it('escapes active scene text and choice attributes while keeping the dialogue markup', () => {
    const html = storyMenu(storyRun());
    expect(html).not.toContain(payload);
    expect(html).toContain(`<h2 id="overlay-title">${escaped}</h2>`);
    expect(html).toContain(`<p class="story-setting">${escaped}</p>`);
    expect(html).toContain(`<p>${escaped}</p>`);
    expect(html).toContain(`data-story-choice="${escaped}"`);
    expect(html).toContain(`<strong>${escaped} <span`);
    expect(html).toContain(`<span>${escaped}</span>`);
  });

  it('escapes the saved transcript, setting, title, chosen label and response', () => {
    const html = storyRecords(storyRun());
    expect(html).not.toContain(payload);
    expect(html).toContain(`<p>${escaped}</p>`);
    expect(html).toContain(`I · ${escaped}</span>`);
    expect(html).toContain(`<p class="story-setting">${escaped}</p>`);
    expect(html).toContain(`<strong>${escaped}</strong><br>${escaped}`);
    expect(html).toContain(`1 of ${STORY_ORDER.length} camp memories`);
  });

  it('escapes clan memory titles, details and spoken lines', () => {
    const run = createRun();
    run.legacy.memories.push({
      sequence: 1,
      elapsed: 0,
      region: 0,
      population: 8,
      title: payload,
      detail: payload,
      line: { speaker: 'boro', text: payload },
    });
    const html = clanMemories(run);
    expect(html).not.toContain(payload);
    expect(html).toContain(`<span>${escaped}</span>`);
    expect(html).toContain(` · ${escaped}</p>`);
    expect(html).toContain(`<br>${escaped}</blockquote>`);
  });

  it('renders a fallen Khan using validated region indexes', () => {
    const run = createRun();
    Object.assign(run.legacy.khans[0]!, {
      region: 0,
      fallenRegion: 3,
      fallenAt: 60,
      killsAtFall: 5,
    });
    const html = khanRecords(run);
    expect(html).toContain('Fell in The Heart of the Steppe');
    expect(html).toContain('Chosen in The Golden Pasture');
  });
});
