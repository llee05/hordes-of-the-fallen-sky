import { escapeHtml } from '../progressionTree';
import type { ClanMark } from '../artwork';

export interface CreatorOption {
  id: string;
  title: string;
  art?: string;
  hex?: string;
}

/** Stepped Central Asian fretwork corner brackets for framed UI tiles and inputs. */
export function framedCornerFrets(): string {
  return `<span class="creator-corners" aria-hidden="true"><svg class="creator-corner tl" viewBox="0 0 12 12"><path d="M1 11V1h10M3 9V3h6M5 7V5h2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><svg class="creator-corner tr" viewBox="0 0 12 12"><path d="M11 11V1H1M9 9V3H3M7 7V5H5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><svg class="creator-corner bl" viewBox="0 0 12 12"><path d="M1 1v10h10M3 3v6h6M5 5v2h2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><svg class="creator-corner br" viewBox="0 0 12 12"><path d="M11 1v10H1M9 3v6H3M7 5v2H5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></span>`;
}

/** Clan mark symbol associated with each class ability for antique manuscript etching. */
export const ABILITY_MARKS: Readonly<Record<string, ClanMark>> = {
  'parthian-shot': 'bow',
  'rain-of-arrows': 'volley',
  'splintering-arrow': 'pierce',
  windstep: 'wind',
  breakthrough: 'pierce',
  'sweeping-lance': 'horn',
  'lance-vault': 'horse',
  'unstoppable-charge': 'road',
  'iron-wall': 'shield',
  'crushing-hooves': 'hammer',
  'chain-snare': 'knot',
  'unbroken-fortress': 'sanctuary',
  'ongod-guardians': 'spirit',
  'wind-of-tengri': 'storm',
  'sacred-ovoo': 'hearth',
  'veil-between-worlds': 'moon',
};

export function panelFrame(title: string, content: string, extraClass = ''): string {
  return `<section class="creator-panel ${extraClass}" aria-label="${escapeHtml(title)}"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

export function radioList(
  field: string,
  label: string,
  options: readonly CreatorOption[],
  selected: string,
  extraClass = '',
): string {
  return `<div class="creator-options ${extraClass}" role="group" aria-label="${escapeHtml(label)}">${options.map((option) => `<button type="button" class="creator-option" data-creator-field="${field}" data-creator-value="${option.id}" data-focus-key="creator-${field}-${option.id}" aria-label="${escapeHtml(option.title)}" aria-pressed="${option.id === selected}" title="${escapeHtml(option.title)}">${option.art ?? ''}<span>${escapeHtml(option.title)}</span></button>`).join('')}</div>`;
}

/** Every choice stays directly reachable; arrows also cycle the current choice. */
export function optionCarousel(
  field: string,
  label: string,
  options: readonly CreatorOption[],
  selected: string,
): string {
  const index = options.findIndex((option) => option.id === selected);
  const adjacent = (step: number) => options[(index + step + options.length) % options.length]!;
  return `<div class="creator-option-row"><h4>${escapeHtml(label)}</h4><div class="creator-carousel"><button type="button" class="creator-cycle" aria-label="Previous ${escapeHtml(label)}" data-creator-field="${field}" data-creator-value="${adjacent(-1).id}" data-focus-key="creator-${field}-previous">‹</button>${radioList(field, label, options, selected, 'creator-thumbnails')}<button type="button" class="creator-cycle" aria-label="Next ${escapeHtml(label)}" data-creator-field="${field}" data-creator-value="${adjacent(1).id}" data-focus-key="creator-${field}-next">›</button></div></div>`;
}

export function swatchRow(
  field: string,
  label: string,
  options: readonly CreatorOption[],
  selected: string,
): string {
  return `<div class="creator-option-row"><h4>${escapeHtml(label)}</h4>${radioList(
    field,
    label,
    options.map((option) => ({
      ...option,
      art: `<i class="creator-swatch" style="--swatch:${option.hex}" aria-hidden="true"></i>`,
    })),
    selected,
    'creator-swatches',
  )}</div>`;
}

/** Atlas cells are intentionally left whole, preserving painted gutters. */
export function paintedCell(
  sheet: 'figures' | 'choices' | 'insignia',
  column: number,
  row: number,
  columns: number,
  rows: number,
  extraClass = '',
): string {
  const aspect = sheet === 'figures' ? 0.75 : sheet === 'insignia' ? 0.9 : 1;
  const source = `${import.meta.env.BASE_URL}art/creator-${sheet}.png`;
  return `<svg class="creator-paint creator-${sheet} ${extraClass}" aria-hidden="true" focusable="false" viewBox="0 0 ${aspect} 1" preserveAspectRatio="xMidYMid meet"><svg width="${aspect}" height="1" viewBox="${column * aspect} ${row} ${aspect} 1" overflow="hidden"><image href="${source}" width="${columns * aspect}" height="${rows}" /></svg></svg>`;
}
