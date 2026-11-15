import { CLASSES, classDefinition } from '../../game/data/classes';
import type { CharacterCreatorState } from '../../game/state/characterCreator';
import { isValidCharacterName, MAX_CHARACTER_NAME_LENGTH } from '../../shared/characterProfile';
import { escapeHtml } from '../progressionTree';

export type CreatorPortraitSelection = Pick<CharacterCreatorState['profile'], 'classId' | 'gender'>;

function portraitSource(selection: CreatorPortraitSelection): string {
  return `${import.meta.env.BASE_URL}art/creator-portrait-${selection.classId}-${selection.gender}.webp`;
}

function classEmblem(classId: CharacterCreatorState['profile']['classId']): string {
  if (classId === 'iron-pagoda') {
    return `<svg class="creator-class-symbol" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M32 8v6M27 14h10M18 39c0-13 5-22 14-25 9 3 14 12 14 25" />
      <path d="M15 39h34l-3 8H18l-3-8ZM19 47h26l-3 8H22l-3-8Z" />
      <path d="M24 39V25m16 14V25M32 39V19" />
      <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="28" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="34" r="1.5" fill="currentColor" stroke="none" />
    </svg>`;
  }
  if (classId === 'spirit-caller') {
    return `<svg class="creator-class-symbol" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M36 6c2 10-7 14-4 24 2-7 8-10 11-17 8 9 12 19 8 29-4 10-12 15-22 15S12 51 12 40c0-10 5-18 15-28-2 9 1 14 5 18 1-10 0-17 4-24Z" />
      <path d="M31 51c-5 0-8-4-8-9 0-5 3-8 8-14-1 7 6 9 6 15 0 4-2 7-6 8Z" />
    </svg>`;
  }
  return `<img src="${import.meta.env.BASE_URL}art/creator-class-${classId}.png" alt="" aria-hidden="true" />`;
}

export function characterCreatorContent(
  state: CharacterCreatorState,
  previousPortrait?: CreatorPortraitSelection,
): string {
  const profile = state.profile;
  const selectedClass = classDefinition(profile.classId);
  const nameValid = isValidCharacterName(profile.name);
  const portraitChanged =
    previousPortrait !== undefined &&
    (previousPortrait.classId !== profile.classId || previousPortrait.gender !== profile.gender);
  const portraitLabel = `${profile.gender === 'woman' ? 'Female' : 'Male'} ${selectedClass.title}`;

  return `<section class="character-creator" aria-label="Character creation">
    <div class="creator-scroll-surface" data-scroll-key="creator-page">
      <figure class="creator-portrait-stage" role="img" aria-label="${escapeHtml(portraitLabel)} portrait">
        ${
          portraitChanged
            ? `<img
                src="${portraitSource(previousPortrait)}"
                class="creator-portrait creator-portrait-outgoing"
                alt=""
                aria-hidden="true"
              />`
            : ''
        }
        <img
          src="${portraitSource(profile)}"
          class="creator-portrait${portraitChanged ? ' creator-portrait-incoming' : ''}"
          data-creator-portrait
          data-class="${profile.classId}"
          data-gender="${profile.gender}"
          alt=""
          aria-hidden="true"
        />
        <figcaption class="creator-portrait-caption">
          <span>${escapeHtml(selectedClass.title)}</span>
          <small>${profile.gender === 'woman' ? 'Woman' : 'Man'} · Chosen Khan</small>
        </figcaption>
      </figure>

      <div class="creator-controls">
        <header class="creator-heading">
          <p>The clan chronicle</p>
          <h2 id="overlay-title">Choose your Khan</h2>
        </header>

        <div class="creator-field creator-name-section">
          <label class="creator-label" for="character-name">Name</label>
          <div class="creator-name-frame">
            <input
              id="character-name"
              class="creator-name-field"
              data-creator-name
              data-focus-key="creator-name"
              data-nav-up="creator-back"
              data-nav-down="gender-woman"
              data-nav-right="creator-random"
              value="${escapeHtml(profile.name)}"
              maxlength="${MAX_CHARACTER_NAME_LENGTH}"
              autocomplete="off"
              spellcheck="false"
              aria-label="Name"
              aria-describedby="creator-name-hint"
              aria-invalid="${!nameValid}"
              placeholder="Enter a name..."
            />
            <button
              type="button"
              class="creator-random-btn"
              data-creator-random
              data-focus-key="creator-random"
              data-nav-left="creator-name"
              data-nav-down="gender-man"
              aria-label="Random name"
              title="Random name"
            >
              <svg class="creator-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>
          <small id="creator-name-hint" class="creator-name-hint ${nameValid ? 'sr-only' : 'invalid'}">
            ${nameValid ? 'The name your clan will remember.' : 'Enter a name to begin your journey.'}
          </small>
        </div>

        <div class="creator-field creator-gender-section">
          <span class="creator-label" id="creator-gender-label">Gender</span>
          <div class="creator-gender-options" role="radiogroup" aria-labelledby="creator-gender-label">
            ${(
              [
                ['woman', 'Female', '♀', 'creator-name', 'gender-man', 'class-mounted-archer'],
                ['man', 'Male', '♂', 'creator-random', 'gender-woman', 'class-iron-pagoda'],
              ] as const
            )
              .map(([gender, label, symbol, up, horizontal, down]) => {
                const selected = profile.gender === gender;
                return `<button
                  type="button"
                  class="creator-gender-btn"
                  data-creator-field="gender"
                  data-creator-value="${gender}"
                  data-focus-key="gender-${gender}"
                  data-nav-up="${up}"
                  data-nav-${gender === 'woman' ? 'right' : 'left'}="${horizontal}"
                  data-nav-down="${down}"
                  role="radio"
                  aria-checked="${selected}"
                  tabindex="${selected ? '0' : '-1'}"
                  aria-label="${label}"
                ><span aria-hidden="true">${symbol}</span><span class="gender-text">${label}</span></button>`;
              })
              .join('')}
          </div>
        </div>

        <div class="creator-field creator-class-section">
          <span class="creator-label" id="creator-class-label">Class</span>
          <div class="creator-classes-grid" role="radiogroup" aria-labelledby="creator-class-label">
            ${CLASSES.map((classItem, index) => {
              const selected = profile.classId === classItem.id;
              const up = index < 2 ? 'gender-woman' : 'gender-man';
              const down = index < 2 ? 'creator-back' : 'creator-begin';
              const left = index === 0 ? 'gender-woman' : `class-${CLASSES[index - 1]!.id}`;
              const right =
                index === CLASSES.length - 1 ? 'creator-begin' : `class-${CLASSES[index + 1]!.id}`;
              return `<button
                type="button"
                class="creator-class-option"
                data-creator-field="classId"
                data-creator-value="${classItem.id}"
                data-focus-key="class-${classItem.id}"
                data-nav-up="${up}"
                data-nav-right="${right}"
                data-nav-down="${down}"
                data-nav-left="${left}"
                role="radio"
                aria-checked="${selected}"
                tabindex="${selected ? '0' : '-1'}"
                aria-label="${escapeHtml(classItem.title)}"
                title="${escapeHtml(classItem.title)}: ${escapeHtml(classItem.subtitle)}"
              >
                <span class="creator-class-emblem">
                  ${classEmblem(classItem.id)}
                </span>
                <span class="creator-class-title">${escapeHtml(classItem.title)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="creator-class-description" aria-live="polite">
          <span class="creator-divider" aria-hidden="true"></span>
          <h3>${escapeHtml(selectedClass.title)}</h3>
          <p>${escapeHtml(selectedClass.summary)}</p>
          <span class="creator-divider" aria-hidden="true"></span>
        </div>

        <div class="creator-actions">
          <button
            type="button"
            class="creator-action creator-action-back"
            data-action="back"
            data-focus-key="creator-back"
            data-nav-up="class-mounted-archer"
            data-nav-right="creator-begin"
            aria-label="Back to title"
          >Back</button>
          <button
            type="button"
            class="creator-action creator-action-begin"
            data-action="begin-journey"
            data-focus-key="creator-begin"
            data-nav-up="class-spirit-caller"
            data-nav-left="creator-back"
            aria-disabled="${!nameValid}"
            aria-label="Begin Journey"
          >Begin</button>
        </div>
      </div>
    </div>
  </section>`;
}
