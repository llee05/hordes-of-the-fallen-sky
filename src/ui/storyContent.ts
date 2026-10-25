import { clanMemories, khanRecords } from './legacyContent';
import { COMPANIONS, epilogueText, storyAct, storyGiftLabel } from '../game/data/story';
import { introImageUrl } from '../game/data/intro';
import { clanDoctrine } from '../game/state/clan';
import { formatTime } from '../game/state/run';
import type { RunState } from '../game/types';
import type { StoryLine } from '../game/story/types';
import { clanMark } from './artwork';
import { storyConsequence } from '../game/data/storyConsequences';
import { COMPANION_IDS, companionStanding, type Standing } from '../game/state/storyBonds';
import type { Companion } from '../game/story/types';

const STANDINGS: Record<Companion, Record<Standing, string>> = {
  saran: {
    close: 'Lets others share the hearth',
    steady: 'Keeps the hearth',
    strained: 'Carries too much alone',
  },
  boro: {
    close: 'Trusts your counsel',
    steady: 'Watching the grass',
    strained: 'Doubts the tally',
  },
  erden: {
    close: 'Answers openly',
    steady: 'Keeps careful counts',
    strained: 'Works at the edge of the firelight',
  },
  nara: { close: 'Carries real work', steady: 'Asks who is missing', strained: 'Feels overlooked' },
};

/** Derived from the choices actually made; hidden when too few remain to name the cast. */
function besideTheFire(run: RunState): string {
  if (run.clan.population < 5 || !run.story.records.some((record) => record.choice)) return '';
  return `<ul class="story-bonds" aria-label="Beside the fire">${COMPANION_IDS.map((id) => {
    const companion = COMPANIONS[id];
    const standing = companionStanding(run, id);
    return `<li data-standing="${standing}"><span class="speaker-seal">${clanMark(companion.mark)}</span><span><strong>${companion.name}</strong><small>${STANDINGS[id][standing]}</small></span></li>`;
  }).join('')}</ul>`;
}

function lastingNote(choiceId: string): string {
  const lasting = storyConsequence(choiceId)?.lasting;
  return lasting ? ` · Lasting: ${lasting.label}` : '';
}

function speeches(lines: readonly StoryLine[]): string {
  return lines
    .map((line) => {
      const companion = COMPANIONS[line.speaker];
      return `<article class="story-speech"><span class="speaker-seal">${clanMark(companion.mark)}</span><div><h3>${companion.name} <small>${companion.role}</small></h3><p>${line.text}</p></div></article>`;
    })
    .join('');
}

function picture(image: string, caption: string): string {
  return `<figure class="story-picture"><img src="${introImageUrl(image)}" alt="" width="1536" height="1024" /><figcaption>${caption}</figcaption></figure>`;
}

export function storyMenu(run: RunState): string {
  const scene = run.story.active!;
  const act = storyAct(scene.act === 1 ? 0 : 2);
  return `<section class="game-panel story-panel"><header class="panel-heading"><div><p class="eyebrow">ACT ${scene.act === 1 ? 'I' : 'II'} · ${act.title.toUpperCase()}</p><h2 id="overlay-title">${scene.title}</h2></div><button class="panel-close" data-action="story-skip" aria-label="Skip this scene" title="Skip this scene (Escape)">×</button></header><div class="panel-body story-layout">${picture(scene.image, 'THE BLUE BANNER CLAN')}<div class="story-body"><p class="story-setting">${scene.setting}</p><div class="story-dialogue">${speeches(scene.lines)}</div><div class="story-choices" aria-label="Choose your response">${scene.choices.map((choice) => `<button class="story-choice" data-story-choice="${choice.id}" ><strong>${choice.label} <span aria-hidden="true">→</span></strong><span>${choice.description}</span><small>${storyGiftLabel(choice.benefit)}${lastingNote(choice.id)}</small></button>`).join('')}</div></div></div><footer class="panel-footer"><span class="paused-note">Ⅱ THE WORLD IS PAUSED</span><button class="secondary-button" data-action="story-skip" data-primary>Continue without choosing <kbd>ESC / B</kbd></button></footer></section>`;
}

export function storyRecords(run: RunState): string {
  const act = storyAct(run.clan.region);
  return `<div class="story-records"><div class="story-record-heading"><p class="eyebrow">ACT ${act.number === 1 ? 'I' : 'II'} · ${act.title.toUpperCase()}</p><h3>The cloth we carry.</h3><p>${run.story.records.length} of 8 camp memories · ${run.story.crossings.length} crossings · ${run.story.peopleLost} ${run.story.peopleLost === 1 ? 'person' : 'people'} lost</p></div>${besideTheFire(run)}${run.story.records.length ? run.story.records.map((record) => `<details class="story-memory"><summary><span>${record.encounter.act === 1 ? 'I' : 'II'} · ${record.encounter.title}</span><small>${formatTime(record.elapsed)} · ${record.population} ${record.population === 1 ? 'person' : 'people'}</small></summary><div class="story-memory-body">${record.status === 'passed' ? '<p>The clan travelled on without pausing for a camp conversation.</p>' : `<p class="story-setting">${record.encounter.setting}</p>${speeches(record.encounter.lines)}`}<p class="story-memory-choice"><strong>${record.choice?.label ?? (record.status === 'passed' ? 'Camp scenes were off.' : 'We continued without choosing.')}</strong>${record.choice ? `<br>${record.choice.response}${storyConsequence(record.choice.id)?.lasting ? `<br><small>Lasting: ${storyConsequence(record.choice.id)!.lasting!.label}</small>` : ''}` : ''}</p></div></details>`).join('') : '<p class="journal-callout">The first memory begins when you lead your people out onto the steppe.</p>'}${khanRecords(run)}${clanMemories(run)}</div>`;
}

export function storyLogMenu(run: RunState): string {
  return `<section class="game-panel journal-dialog"><header class="panel-heading"><div><p class="eyebrow">THE CLAN CHRONICLE</p><h2 id="overlay-title">Our remembered road.</h2></div><button class="panel-close" data-action="back" aria-label="Close memories">×</button></header><div class="panel-body">${storyRecords(run)}</div><footer class="panel-footer"><span class="paused-note">Ⅱ THE WORLD IS PAUSED</span><button class="secondary-button" data-action="back" data-primary>Back <kbd>ESC / B</kbd></button></footer></section>`;
}

export function epilogueMenu(run: RunState): string {
  const paragraphs = epilogueText(run);
  return `<section class="game-panel story-panel epilogue-panel"><header class="panel-heading"><div><p class="eyebrow">EPILOGUE · ${clanDoctrine(run).toUpperCase()}</p><h2 id="overlay-title">A place beside the fire.</h2></div><button class="panel-close" data-action="epilogue-close" aria-label="Skip epilogue">×</button></header><div class="panel-body story-layout">${picture('intro-hearth.png', `${run.clan.population} ${run.clan.population === 1 ? 'PERSON' : 'PEOPLE'} · ONE SHARED HEARTH`)}<div class="story-body epilogue-copy">${paragraphs.map((paragraph, index) => (index === paragraphs.length - 1 ? `<blockquote>${paragraph}</blockquote>` : `<p>${paragraph}</p>`)).join('')}</div></div><footer class="panel-footer"><span class="paused-note">THE CLAN HAS REACHED REFUGE</span><button class="primary-button" data-action="epilogue-close" data-primary>See journey results <span>→</span></button></footer></section>`;
}
