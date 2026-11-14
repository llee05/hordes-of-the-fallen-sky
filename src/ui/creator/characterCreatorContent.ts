import { CLASSES, classDefinition } from '../../game/data/classes';
import type { CharacterCreatorState } from '../../game/state/characterCreator';
import { isValidCharacterName, MAX_CHARACTER_NAME_LENGTH } from '../../shared/characterProfile';
import { clanMark } from '../artwork';
import { escapeHtml } from '../progressionTree';
import { ABILITY_MARKS, framedCornerFrets } from './components';

export function characterCreatorContent(
  state: CharacterCreatorState,
  expandedAbilityId?: string,
  abilityDetailsMode: 'accordion' | 'all' = 'accordion',
): string {
  const p = state.profile;
  const tradition = classDefinition(p.classId);
  const nameValid = isValidCharacterName(p.name);
  const isMan = p.gender === 'man';
  const isWoman = p.gender === 'woman';
  const activeAbilityId = tradition.abilities.some((ability) => ability.id === expandedAbilityId)
    ? expandedAbilityId
    : tradition.abilities[0]?.id;

  return `<section class="character-creator" aria-label="Character creation">
    <h2 id="overlay-title" class="sr-only">Character Creation</h2>
    <div class="creator-scroll-surface" data-scroll-key="creator-page">
      <!-- Left Column: Identity & Tradition -->
      <div class="creator-column creator-left">
        <!-- Section: Name -->
        <div class="creator-section creator-name-section">
          <div class="creator-section-header">
            <span class="creator-header-knot" aria-hidden="true">❖</span>
            <span class="creator-header-label">Name</span>
          </div>
          <div class="creator-framed-input">
            ${framedCornerFrets()}
            <input
              id="character-name"
              class="creator-name-field"
              data-creator-name
              data-focus-key="creator-name"
              data-nav-up="creator-back"
              data-nav-down="gender-man"
              data-nav-right="creator-random"
              value="${escapeHtml(p.name)}"
              maxlength="${MAX_CHARACTER_NAME_LENGTH}"
              autocomplete="off"
              spellcheck="false"
              aria-label="Name"
              aria-describedby="creator-name-hint"
              aria-invalid="${!nameValid}"
              placeholder="Enter rider name..."
            />
            <button
              type="button"
              class="creator-random-btn"
              data-creator-random
              data-focus-key="creator-random"
              data-nav-left="creator-name"
              data-nav-down="gender-woman"
              aria-label="Random name"
              title="Random name"
            >
              <svg class="creator-dice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <small id="creator-name-hint" class="creator-name-hint ${nameValid ? 'sr-only' : 'invalid'}">
            ${nameValid ? 'The name your clan will remember.' : 'Enter a name to begin your journey.'}
          </small>
        </div>

        <!-- Section: Gender -->
        <div class="creator-section creator-gender-section">
          <div class="creator-section-header">
            <span class="creator-header-knot" aria-hidden="true">❖</span>
            <span class="creator-header-label">Gender</span>
          </div>
          <div class="creator-gender-options" role="radiogroup" aria-label="Gender">
            <button
              type="button"
              class="creator-gender-btn creator-framed-tile"
              data-creator-field="gender"
              data-creator-value="man"
              data-focus-key="gender-man"
              data-nav-up="creator-name"
              data-nav-right="gender-woman"
              data-nav-down="class-mounted-archer"
              role="radio"
              aria-checked="${isMan}"
              tabindex="${isMan ? '0' : '-1'}"
              aria-label="Male"
            >
              ${framedCornerFrets()}
              <span class="gender-sym" aria-hidden="true">♂</span>
              <span class="gender-text">Male</span>
            </button>
            <button
              type="button"
              class="creator-gender-btn creator-framed-tile"
              data-creator-field="gender"
              data-creator-value="woman"
              data-focus-key="gender-woman"
              data-nav-up="creator-random"
              data-nav-left="gender-man"
              data-nav-down="class-lancer"
              role="radio"
              aria-checked="${isWoman}"
              tabindex="${isWoman ? '0' : '-1'}"
              aria-label="Female"
            >
              ${framedCornerFrets()}
              <span class="gender-sym" aria-hidden="true">♀</span>
              <span class="gender-text">Female</span>
            </button>
          </div>
        </div>

        <!-- Section: Class -->
        <div class="creator-section creator-class-section">
          <div class="creator-section-header">
            <span class="creator-header-knot" aria-hidden="true">❖</span>
            <span class="creator-header-label">Class</span>
          </div>
          <div class="creator-classes-grid" role="radiogroup" aria-label="Combat class">
            ${CLASSES.map((c) => {
              const selected = p.classId === c.id;
              const navigation = {
                'mounted-archer': {
                  up: 'gender-man',
                  right: 'class-lancer',
                  down: 'class-iron-pagoda',
                  left: 'creator-back',
                },
                lancer: {
                  up: 'gender-woman',
                  right: `ability-${tradition.abilities[0]?.id ?? ''}`,
                  down: 'class-spirit-caller',
                  left: 'class-mounted-archer',
                },
                'iron-pagoda': {
                  up: 'class-mounted-archer',
                  right: 'class-spirit-caller',
                  down: 'creator-back',
                  left: 'creator-back',
                },
                'spirit-caller': {
                  up: 'class-lancer',
                  right: `ability-${tradition.abilities.at(-1)?.id ?? ''}`,
                  down: 'creator-begin',
                  left: 'class-iron-pagoda',
                },
              }[c.id];
              return `<button
                type="button"
                class="creator-class-tile creator-framed-tile"
                data-creator-field="classId"
                data-creator-value="${c.id}"
                data-focus-key="class-${c.id}"
                data-nav-up="${navigation.up}"
                data-nav-right="${navigation.right}"
                data-nav-down="${navigation.down}"
                data-nav-left="${navigation.left}"
                role="radio"
                aria-checked="${selected}"
                tabindex="${selected ? '0' : '-1'}"
                aria-label="${escapeHtml(c.title)}"
                title="${escapeHtml(c.title)}: ${escapeHtml(c.subtitle)}"
              >
                ${framedCornerFrets()}
                <img src="${import.meta.env.BASE_URL}art/creator-class-${c.id}.png" class="creator-tile-icon" alt="" aria-hidden="true" />
                <span class="creator-tile-title">${escapeHtml(c.title)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Centre: Arched Rider Preview -->
      <div class="creator-center-zone" aria-label="Mounted character preview">
        <canvas
          id="creator-rider-canvas"
          class="creator-rider-canvas"
          data-class="${p.classId}"
          data-gender="${p.gender}"
          width="512"
          height="720"
          role="img"
          aria-label="${escapeHtml(p.gender === 'woman' ? 'Female' : 'Male')} ${escapeHtml(tradition.title)} on horseback"
        ></canvas>
        <div class="creator-preview-caption sr-only">
          <strong>${escapeHtml(tradition.title)}</strong>
          <span>${escapeHtml(p.gender === 'woman' ? 'Female Rider' : 'Male Rider')}</span>
        </div>
      </div>

      <!-- Right Column: Description & Abilities -->
      <div class="creator-column creator-right" aria-label="Class traits and abilities">
        <div class="creator-class-details">
          <div class="creator-detail-header">
            <h3 class="creator-detail-title">${escapeHtml(tradition.title)}</h3>
            <p class="creator-detail-subtitle">${escapeHtml(tradition.subtitle)}</p>
          </div>
          <p class="creator-detail-summary">${escapeHtml(tradition.summary)}</p>
          <div class="creator-detail-traits" aria-label="Key traits">
            ${tradition.keyTraits.map((t) => `<span class="creator-trait-badge">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="creator-abilities-panel">
            <h4 class="sr-only">Class abilities</h4>
            <div class="creator-abilities-list">
              ${tradition.abilities
                .map((ability, index) => {
                  const expanded = abilityDetailsMode === 'all' || ability.id === activeAbilityId;
                  return `<button
                type="button"
                class="creator-ability-item"
                data-creator-ability="${ability.id}"
                data-focus-key="ability-${ability.id}"
                data-nav-up="${index === 0 ? 'gender-woman' : `ability-${tradition.abilities[index - 1]!.id}`}"
                data-nav-right="creator-begin"
                data-nav-down="${index === tradition.abilities.length - 1 ? 'creator-begin' : `ability-${tradition.abilities[index + 1]!.id}`}"
                data-nav-left="${index < 2 ? 'class-lancer' : 'class-spirit-caller'}"
                aria-expanded="${expanded}"
                aria-controls="creator-ability-description-${ability.id}"
              >
                <div class="creator-ability-badge">
                  <span class="creator-ability-key">${escapeHtml(ability.slotLabel)}</span>
                  ${clanMark(ABILITY_MARKS[ability.id] ?? 'spirit')}
                </div>
                <div class="creator-ability-body">
                  <strong class="creator-ability-name">${escapeHtml(ability.name)}</strong>
                  <p
                    id="creator-ability-description-${ability.id}"
                    class="creator-ability-desc"
                    ${expanded ? '' : 'hidden'}
                  >${escapeHtml(ability.description)}</p>
                </div>
              </button>`;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom: Back & Begin plaque buttons -->
      <div class="creator-bottom-bar">
        <button
          type="button"
          class="creator-plaque-btn creator-btn-back"
          data-action="back"
          data-focus-key="creator-back"
          data-nav-up="class-iron-pagoda"
          data-nav-right="creator-begin"
          aria-label="Back to title"
        >
          <span>‹ Back</span>
        </button>
        <button
          type="button"
          class="creator-plaque-btn creator-btn-begin"
          data-action="begin-journey"
          data-focus-key="creator-begin"
          data-nav-up="ability-${tradition.abilities.at(-1)?.id ?? ''}"
          data-nav-left="creator-back"
          aria-disabled="${!nameValid}"
          aria-label="Begin Journey"
        >
          <span>Begin ›</span>
        </button>
      </div>
    </div>
  </section>`;
}
