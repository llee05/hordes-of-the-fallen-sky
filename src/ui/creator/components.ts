import type { ClanMark } from '../artwork';

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
