import {
  BACKGROUNDS,
  BANNER_COLOURS,
  BANNER_EMBLEMS,
  BANNER_TRIMS,
  CLASSES,
  CLOTHING_COLOURS,
  HAIRSTYLES,
  HEADGEAR_OPTIONS,
  MOUNTS,
  OATHS,
  backgroundDefinition,
  classDefinition,
  oathDefinition,
  clothingColourDefinition,
  bannerColourDefinition,
} from '../../game/data/classes';
import type { CharacterCreatorState } from '../../game/state/characterCreator';
import { isValidCharacterName, MAX_CHARACTER_NAME_LENGTH } from '../../shared/characterProfile';
import { escapeHtml } from '../progressionTree';
import {
  classPortrait,
  optionCarousel,
  paintedCell,
  panelFrame,
  radioList,
  swatchRow,
} from './components';

export function characterCreatorContent(state: CharacterCreatorState): string {
  const p = state.profile;
  const background = backgroundDefinition(p.background);
  const tradition = classDefinition(p.classId);
  const oath = oathDefinition(p.oath);
  const genderRow = p.gender === 'woman' ? 0 : 1;
  const figure = (index: number) => paintedCell('figures', index, genderRow, 4, 2);
  const choices = <T extends { id: string; title: string }>(options: readonly T[], row: number) =>
    options.map((option, i) => ({ ...option, art: paintedCell('choices', i, row, 5, 5) }));
  const insignia = <T extends { id: string; title: string }>(options: readonly T[], row: number) =>
    options.map((option, i) => ({ ...option, art: paintedCell('insignia', i, row, 5, 3) }));
  const nameValid = isValidCharacterName(p.name);
  return `<section class="character-creator" aria-label="Character creation">
    <header class="creator-heading"><div><p>Hordes of the Fallen Sky</p><h2 id="overlay-title">Character Creation</h2></div><button class="creator-back" data-action="back">Back to title</button></header>
    <div class="creator-layout" data-scroll-key="creator-page">
      <div class="creator-column creator-left">
        ${panelFrame(
          'Identity',
          `<div class="creator-identity"><div class="creator-portrait">${paintedCell(
            'choices',
            HAIRSTYLES.findIndex((v) => v.id === p.hairstyle),
            genderRow,
            5,
            5,
          )}<span class="creator-portrait-hat">${paintedCell(
            'choices',
            HEADGEAR_OPTIONS.findIndex((v) => v.id === p.headgear),
            2,
            5,
            5,
          )}</span></div><div><h4>Gender</h4>${radioList(
            'gender',
            'Gender',
            [
              { id: 'woman', title: 'Woman' },
              { id: 'man', title: 'Man' },
            ],
            p.gender,
          )}</div></div>`,
        )}
        ${panelFrame('Appearance', `${optionCarousel('hairstyle', 'Hairstyle', choices(HAIRSTYLES, genderRow), p.hairstyle)}${optionCarousel('headgear', 'Headgear', choices(HEADGEAR_OPTIONS, 2), p.headgear)}${swatchRow('clothingColour', 'Clothing colour', CLOTHING_COLOURS, p.clothingColour)}`)}
        ${panelFrame('Background (Origin)', `<div class="creator-origin">${radioList('background', 'Origin', choices(BACKGROUNDS, 4), p.background, 'creator-origins')}<div class="creator-description" aria-live="polite"><h4>${escapeHtml(background.title)}</h4><p>${escapeHtml(background.summary)}</p><strong>Starting bonus</strong><p>${escapeHtml(background.bonusLabel)}</p></div></div>`)}
      </div>
      <div class="creator-center">
        <div class="creator-hero" role="img" aria-label="${escapeHtml(p.gender === 'woman' ? 'Woman' : 'Man')} · ${escapeHtml(tradition.title)}">${figure(CLASSES.findIndex((v) => v.id === p.classId))}<div class="creator-hero-caption"><strong>${escapeHtml(tradition.title)}</strong><span>${escapeHtml(tradition.subtitle)}</span><span class="creator-cloth-sample" style="--swatch:${clothingColourDefinition(p.clothingColour).hex}">Cloth · ${escapeHtml(clothingColourDefinition(p.clothingColour).title)}</span></div></div>
        <div class="creator-name"><label for="character-name">Name</label><input id="character-name" data-creator-name data-focus-key="creator-name" value="${escapeHtml(p.name)}" maxlength="${MAX_CHARACTER_NAME_LENGTH}" autocomplete="off" spellcheck="false" aria-describedby="creator-name-hint" aria-invalid="${!nameValid}"><button data-creator-random data-focus-key="creator-random" aria-label="Random name" title="Random name">↻</button><small id="creator-name-hint">${nameValid ? 'The name your clan will remember.' : 'Enter a name to begin your journey.'}</small></div>
      </div>
      <div class="creator-column creator-right">
        ${panelFrame(
          'Class / Combat Tradition',
          `${radioList(
            'classId',
            'Combat tradition',
            CLASSES.map((c, i) => ({
              id: c.id,
              title: c.title,
              art: classPortrait(c.id, figure(i)),
            })),
            p.classId,
            'creator-classes',
          )}<div class="creator-class-description" aria-live="polite"><div><h4>${escapeHtml(tradition.title)}</h4><p>${escapeHtml(tradition.summary)}</p></div><div><strong>Key traits</strong><ul>${tradition.keyTraits.map((trait) => `<li>${escapeHtml(trait)}</li>`).join('')}</ul></div></div>`,
        )}
        ${panelFrame('Oath', `${radioList('oath', 'Oath', insignia(OATHS, 0), p.oath, 'creator-oaths')}<p class="creator-description creator-oath-description" aria-live="polite">${escapeHtml(oath.summary)} <strong>${escapeHtml(oath.bonusLabel)}</strong></p>`)}
        ${panelFrame('Mount', optionCarousel('mount', 'Mount coat', choices(MOUNTS, 3), p.mount))}
        ${panelFrame(
          'Banner (Clan Standard)',
          `<div class="creator-banner-layout"><div class="creator-banner-preview" style="--banner-field:${bannerColourDefinition(p.banner.fieldColour).hex}" aria-label="Clan banner preview">${paintedCell(
            'insignia',
            BANNER_EMBLEMS.findIndex((v) => v.id === p.banner.emblem),
            1,
            5,
            3,
          )}${paintedCell(
            'insignia',
            BANNER_TRIMS.findIndex((v) => v.id === p.banner.trim),
            2,
            5,
            3,
          )}</div><div>${optionCarousel('emblem', 'Emblem', insignia(BANNER_EMBLEMS, 1), p.banner.emblem)}${swatchRow('fieldColour', 'Field colour', BANNER_COLOURS, p.banner.fieldColour)}${optionCarousel('trim', 'Trim / pattern', insignia(BANNER_TRIMS, 2), p.banner.trim)}</div></div>`,
        )}
      </div>
    </div>
    <footer class="creator-footer"><span>Choose who carries the banner.</span><button class="creator-begin" data-action="begin-journey" data-primary data-focus-key="creator-begin" ${nameValid ? '' : 'disabled'}>Begin Journey <span>→</span></button><small>Tab / arrows to browse · Enter / A to choose · Esc / B to return</small></footer>
  </section>`;
}
