import { CLASSES, classDefinition } from '../../game/data/classes';
import type { CharacterCreatorState } from '../../game/state/characterCreator';
import {
  CHARACTER_AGES,
  CHARACTER_BACKGROUNDS,
  CHARACTER_BANNER_COLOURS,
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
  CHARACTER_CLOTHING_COLOURS,
  CHARACTER_FACES,
  CHARACTER_GENDERS,
  CHARACTER_HAIRSTYLES,
  CHARACTER_HEADGEAR,
  CHARACTER_MOUNTS,
  CHARACTER_OATHS,
  CHARACTER_VOICES,
  isValidCharacterName,
  MAX_CHARACTER_NAME_LENGTH,
  type CharacterProfile,
} from '../../shared/characterProfile';
import { escapeHtml } from '../progressionTree';
import {
  CREATOR_AGE_LABELS,
  CREATOR_CLASS_TRAITS,
  CREATOR_ORIGINS,
  CREATOR_OATHS,
  CREATOR_VOICE_LABELS,
} from './characterCreatorOptions';

export type CreatorPortraitSelection = Pick<CharacterCreatorState['profile'], 'classId' | 'gender'>;

const BASE = import.meta.env.BASE_URL;

function sceneSource(selection: CreatorPortraitSelection): string {
  return `${BASE}art/creator-scene-${selection.classId}-${selection.gender}.webp`;
}

function oathSource(oath: CharacterProfile['oath']): string {
  return `${BASE}art/creator-oath-${oath.replace('oath-of-the-', '')}.webp`;
}

function atlasStyle(column: number, row: number): string {
  return `--atlas-column:${column};--atlas-row:${row}`;
}

function sectionTitle(title: string, subtitle?: string): string {
  return `<header class="creator-panel-heading">
    <span aria-hidden="true">◈</span>
    <h3>${escapeHtml(title)}</h3>
    ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}
    <span aria-hidden="true">◈</span>
  </header>`;
}

function choiceButton(
  field: string,
  value: string,
  label: string,
  selected: boolean,
  content: string,
  className: string,
): string {
  return `<button type="button" class="${className}" data-creator-field="${field}" data-creator-value="${value}" data-focus-key="${field}-${value}" role="radio" aria-checked="${selected}" tabindex="${selected ? '0' : '-1'}" aria-label="${escapeHtml(label)}">${content}</button>`;
}

function cycleRow(
  field: string,
  label: string,
  values: readonly string[],
  selectedValue: string,
  display: (value: string) => string,
  extra = '',
): string {
  const selectedIndex = values.indexOf(selectedValue);
  const previous = values[(selectedIndex - 1 + values.length) % values.length]!;
  const next = values[(selectedIndex + 1) % values.length]!;
  return `<div class="creator-cycle-row">
    <span>${escapeHtml(label)}</span>
    <button type="button" class="creator-arrow" data-creator-field="${field}" data-creator-value="${previous}" data-focus-key="${field}-previous" aria-label="Previous ${escapeHtml(label)}">‹</button>
    <strong>${escapeHtml(display(selectedValue))}</strong>
    <button type="button" class="creator-arrow" data-creator-field="${field}" data-creator-value="${next}" data-focus-key="${field}-next" aria-label="Next ${escapeHtml(label)}">›</button>
    ${extra}
  </div>`;
}

function selectorArrow(
  field: string,
  value: string,
  direction: 'previous' | 'next',
  label: string,
): string {
  return `<button type="button" class="creator-arrow creator-selector-arrow" data-creator-field="${field}" data-creator-value="${value}" data-focus-key="${field}-${direction}" aria-label="${direction === 'previous' ? 'Previous' : 'Next'} ${escapeHtml(label)}">${direction === 'previous' ? '‹' : '›'}</button>`;
}

function selectorNeighbours(values: readonly string[], selectedValue: string): [string, string] {
  const selectedIndex = values.indexOf(selectedValue);
  return [
    values[(selectedIndex - 1 + values.length) % values.length]!,
    values[(selectedIndex + 1) % values.length]!,
  ];
}

function thumbnailRow(
  profile: CharacterProfile,
  field: 'face' | 'hairstyle' | 'headgear',
  label: string,
  values: readonly string[],
  atlasRow: number,
): string {
  const selected = profile[field];
  const [previous, next] = selectorNeighbours(values, selected);
  return `<div class="creator-thumbnail-row">
    <span>${escapeHtml(label)}</span>
    ${selectorArrow(field, previous, 'previous', label)}
    <div class="creator-thumbnail-options" role="radiogroup" aria-label="${escapeHtml(label)}">
      ${values
        .map((value, index) =>
          choiceButton(
            field,
            value,
            `${label} ${index + 1}`,
            selected === value,
            `<span class="creator-atlas creator-selector-atlas" style="${atlasStyle(index, atlasRow)}" aria-hidden="true"></span>`,
            'creator-thumbnail-choice',
          ),
        )
        .join('')}
    </div>
    ${selectorArrow(field, next, 'next', label)}
  </div>`;
}

export function characterCreatorContent(
  state: CharacterCreatorState,
  previousPortrait?: CreatorPortraitSelection,
): string {
  const profile = state.profile;
  const selectedClass = classDefinition(profile.classId);
  const selectedOrigin = CREATOR_ORIGINS[profile.background];
  const selectedOath = CREATOR_OATHS[profile.oath];
  const nameValid = isValidCharacterName(profile.name);
  const portraitChanged =
    previousPortrait !== undefined &&
    (previousPortrait.classId !== profile.classId || previousPortrait.gender !== profile.gender);
  const faceIndex = CHARACTER_FACES.indexOf(profile.face);
  const [previousClothing, nextClothing] = selectorNeighbours(
    CHARACTER_CLOTHING_COLOURS,
    profile.clothingColour,
  );
  const [previousOath, nextOath] = selectorNeighbours(CHARACTER_OATHS, profile.oath);
  const [previousMount, nextMount] = selectorNeighbours(CHARACTER_MOUNTS, profile.mount);
  const [previousEmblem, nextEmblem] = selectorNeighbours(
    CHARACTER_BANNER_EMBLEMS,
    profile.banner.emblem,
  );
  const [previousField, nextField] = selectorNeighbours(
    CHARACTER_BANNER_COLOURS,
    profile.banner.fieldColour,
  );
  const [previousTrim, nextTrim] = selectorNeighbours(CHARACTER_BANNER_TRIMS, profile.banner.trim);

  return `<section class="character-creator" aria-label="Character creation">
    <article class="creator-manuscript" data-scroll-key="creator-page">
      <header class="creator-header">
        <img src="${BASE}art/creator-header-frieze.webp" alt="" aria-hidden="true" />
        <div class="creator-title-cartouche">
          <h2 id="overlay-title">Hordes of the Fallen Sky</h2>
          <p><span aria-hidden="true">◆</span> Character Creation <span aria-hidden="true">◆</span></p>
        </div>
        <button type="button" class="creator-back" data-action="back" data-focus-key="creator-back" aria-label="Back to title">‹ Back</button>
      </header>

      <main class="creator-layout">
        <aside class="creator-column creator-left-column">
          <section class="creator-panel creator-identity-panel">
            ${sectionTitle('Identity')}
            <div class="creator-identity-body">
              <div class="creator-face-preview" aria-hidden="true"><span class="creator-atlas creator-selector-atlas" style="${atlasStyle(faceIndex, 0)}"></span></div>
              <div class="creator-identity-controls">
                ${cycleRow('gender', 'Gender', CHARACTER_GENDERS, profile.gender, (value) => (value === 'woman' ? 'Woman' : 'Man'))}
                ${cycleRow('age', 'Age', CHARACTER_AGES, profile.age, (value) => CREATOR_AGE_LABELS[value as keyof typeof CREATOR_AGE_LABELS])}
                ${cycleRow('voice', 'Voice', CHARACTER_VOICES, profile.voice, (value) => CREATOR_VOICE_LABELS[value as keyof typeof CREATOR_VOICE_LABELS], `<button type="button" class="creator-voice-preview" data-creator-voice-preview data-focus-key="voice-preview" aria-label="Preview ${escapeHtml(CREATOR_VOICE_LABELS[profile.voice])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a4 4 0 0 0-2-3.46v6.92A4 4 0 0 0 15.5 12zm0-7.08v2.06a6 6 0 0 1 0 10.04v2.06a8 8 0 0 0 0-14.16z"/></svg></button>`)}
              </div>
            </div>
          </section>

          <section class="creator-panel creator-appearance-panel">
            ${sectionTitle('Appearance')}
            ${thumbnailRow(profile, 'face', 'Face', CHARACTER_FACES, 0)}
            ${thumbnailRow(profile, 'hairstyle', 'Hairstyle', CHARACTER_HAIRSTYLES, 1)}
            ${thumbnailRow(profile, 'headgear', 'Headgear', CHARACTER_HEADGEAR, 2)}
            <div class="creator-swatch-row">
              <span>Clothing Colour</span>
              ${selectorArrow('clothingColour', previousClothing, 'previous', 'clothing colour')}
              <div role="radiogroup" aria-label="Clothing colour">
                ${CHARACTER_CLOTHING_COLOURS.map((colour) => choiceButton('clothingColour', colour, colour, profile.clothingColour === colour, `<span class="creator-colour creator-colour-${colour}" aria-hidden="true"></span>`, 'creator-swatch-choice')).join('')}
              </div>
              ${selectorArrow('clothingColour', nextClothing, 'next', 'clothing colour')}
            </div>
          </section>

          <section class="creator-panel creator-origin-panel">
            ${sectionTitle('Background (Origin)')}
            <div class="creator-origin-body">
              <div class="creator-origin-list" role="radiogroup" aria-label="Background origin">
                ${CHARACTER_BACKGROUNDS.map((origin, index) => choiceButton('background', origin, CREATOR_ORIGINS[origin].title, profile.background === origin, `<span class="creator-choice-dot" aria-hidden="true"></span><span>${escapeHtml(CREATOR_ORIGINS[origin].title)}</span><span class="creator-atlas creator-vignette-atlas" style="${atlasStyle(index, 0)}" aria-hidden="true"></span>`, 'creator-origin-choice')).join('')}
              </div>
              <div class="creator-origin-detail" aria-live="polite">
                <h4>${escapeHtml(selectedOrigin.title)}</h4><p>${escapeHtml(selectedOrigin.description)}</p>
                <strong>Starting Bonus</strong><ul>${selectedOrigin.bonuses.map((bonus, index) => `<li><span class="creator-detail-icon" aria-hidden="true">${['✦', '▲', '●'][index % 3]}</span>${escapeHtml(bonus)}</li>`).join('')}</ul>
              </div>
            </div>
          </section>
        </aside>

        <section class="creator-centre" aria-label="Character illustration">
          <figure class="creator-scene-stage" role="img" aria-label="${profile.gender === 'woman' ? 'Female' : 'Male'} ${escapeHtml(selectedClass.title)} in the clan camp">
            ${portraitChanged ? `<img src="${sceneSource(previousPortrait)}" class="creator-scene creator-portrait-outgoing" alt="" aria-hidden="true" />` : ''}
            <img src="${sceneSource(profile)}" class="creator-scene${portraitChanged ? ' creator-portrait-incoming' : ''}" data-creator-portrait data-class="${profile.classId}" data-gender="${profile.gender}" alt="" aria-hidden="true" />
          </figure>
          <div class="creator-name-panel">
            <label for="character-name">Name</label>
            <div class="creator-name-frame">
              <input id="character-name" class="creator-name-field" data-creator-name data-focus-key="creator-name" value="${escapeHtml(profile.name)}" maxlength="${MAX_CHARACTER_NAME_LENGTH}" autocomplete="off" spellcheck="false" aria-describedby="creator-name-hint" aria-invalid="${!nameValid}" placeholder="Enter Name..." />
              <button type="button" class="creator-random-btn" data-creator-random data-focus-key="creator-random" aria-label="Random name" title="Random name">⚄</button>
            </div>
            <small id="creator-name-hint" class="${nameValid ? 'sr-only' : 'creator-name-error'}">${nameValid ? 'The name your clan will remember.' : 'Enter a name to begin your journey.'}</small>
          </div>
        </section>

        <aside class="creator-column creator-right-column">
          <section class="creator-panel creator-class-panel">
            ${sectionTitle('Class / Combat Tradition')}
            <div class="creator-class-cards" role="radiogroup" aria-label="Combat tradition">
              ${CLASSES.map((classItem) => choiceButton('classId', classItem.id, classItem.title, profile.classId === classItem.id, `<img src="${BASE}art/creator-class-card-${classItem.id}.webp" alt="" aria-hidden="true" /><span>${escapeHtml(classItem.title)}</span>`, 'creator-class-card')).join('')}
            </div>
            <div class="creator-class-detail" aria-live="polite">
              <div><h4>${escapeHtml(selectedClass.title)}</h4><p>${escapeHtml(selectedClass.summary)}</p></div>
              <div><strong>Key Traits</strong><ul>${CREATOR_CLASS_TRAITS[profile.classId].map((trait, index) => `<li><span class="creator-detail-icon" aria-hidden="true">${['➶', '◆', '✦'][index % 3]}</span>${escapeHtml(trait)}</li>`).join('')}</ul></div>
            </div>
          </section>

          <section class="creator-panel creator-oath-panel">
            ${sectionTitle('Oath')}
            <div class="creator-oath-selector">
              ${selectorArrow('oath', previousOath, 'previous', 'oath')}
              <div class="creator-oath-options" role="radiogroup" aria-label="Oath">
                ${CHARACTER_OATHS.map((oath) => choiceButton('oath', oath, CREATOR_OATHS[oath].title, profile.oath === oath, `<img src="${oathSource(oath)}" alt="" aria-hidden="true" /><span class="creator-choice-dot" aria-hidden="true"></span><span>${escapeHtml(CREATOR_OATHS[oath].title.replace('Oath of the ', ''))}</span>`, 'creator-oath-choice')).join('')}
              </div>
              ${selectorArrow('oath', nextOath, 'next', 'oath')}
            </div>
            <p class="creator-oath-description"><em>${escapeHtml(selectedOath.title)}:</em> ${escapeHtml(selectedOath.description)}</p>
          </section>

          <section class="creator-panel creator-mount-panel">
            ${sectionTitle('Mount')}
            <div class="creator-mount-selector">
              ${selectorArrow('mount', previousMount, 'previous', 'mount')}
              <div class="creator-mount-options" role="radiogroup" aria-label="Mount">
                ${CHARACTER_MOUNTS.map((mount, index) => choiceButton('mount', mount, mount, profile.mount === mount, `<span class="creator-atlas creator-selector-atlas" style="${atlasStyle(index, 3)}" aria-hidden="true"></span>`, 'creator-mount-choice')).join('')}
              </div>
              ${selectorArrow('mount', nextMount, 'next', 'mount')}
            </div>
          </section>

          <section class="creator-panel creator-banner-panel">
            ${sectionTitle('Banner (Clan Standard)')}
            <div class="creator-banner-body">
              <div class="creator-banner-preview" aria-label="Live clan standard preview">
                <span class="creator-banner-pole" aria-hidden="true"><span></span></span>
                <span class="creator-banner-flag banner-field-${profile.banner.fieldColour} banner-trim-${profile.banner.trim}" aria-hidden="true"><img src="${BASE}art/creator-banner-emblem-${profile.banner.emblem}.webp" alt="" /></span>
              </div>
              <div class="creator-banner-controls">
                <div><span>Emblem</span><div class="creator-banner-option-row">${selectorArrow('emblem', previousEmblem, 'previous', 'banner emblem')}<div role="radiogroup" aria-label="Banner emblem">${CHARACTER_BANNER_EMBLEMS.map((emblem, index) => choiceButton('emblem', emblem, emblem, profile.banner.emblem === emblem, `<span class="creator-atlas creator-vignette-atlas" style="${atlasStyle(index, 3)}" aria-hidden="true"></span>`, 'creator-banner-choice')).join('')}</div>${selectorArrow('emblem', nextEmblem, 'next', 'banner emblem')}</div></div>
                <div><span>Field Colour</span><div class="creator-banner-option-row">${selectorArrow('fieldColour', previousField, 'previous', 'banner field colour')}<div role="radiogroup" aria-label="Banner field colour">${CHARACTER_BANNER_COLOURS.map((colour) => choiceButton('fieldColour', colour, colour, profile.banner.fieldColour === colour, `<span class="creator-colour creator-colour-${colour}" aria-hidden="true"></span>`, 'creator-banner-choice creator-banner-colour')).join('')}</div>${selectorArrow('fieldColour', nextField, 'next', 'banner field colour')}</div></div>
                <div><span>Trim / Pattern</span><div class="creator-banner-option-row">${selectorArrow('trim', previousTrim, 'previous', 'banner trim')}<div role="radiogroup" aria-label="Banner trim">${CHARACTER_BANNER_TRIMS.map((trim, index) => choiceButton('trim', trim, trim, profile.banner.trim === trim, `<span class="creator-atlas creator-vignette-atlas creator-trim-atlas" style="${atlasStyle(index, 4)}" aria-hidden="true"></span>`, 'creator-banner-choice creator-banner-trim')).join('')}</div>${selectorArrow('trim', nextTrim, 'next', 'banner trim')}</div></div>
              </div>
            </div>
          </section>
        </aside>
      </main>
      <img class="creator-bottom-ornament" src="${BASE}art/creator-bottom-ornament.webp" alt="" aria-hidden="true" />
      <button type="button" class="creator-journey-button" data-action="begin-journey" data-focus-key="creator-begin" aria-disabled="${!nameValid}" aria-label="Begin Journey"><span aria-hidden="true">◆</span> Begin Journey <span aria-hidden="true">◆</span></button>
      <p id="creator-status" class="creator-status" aria-live="polite"></p>
    </article>
  </section>`;
}
