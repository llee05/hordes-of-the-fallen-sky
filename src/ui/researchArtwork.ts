import type { TreeArtwork } from './progressionTree';

/** Local, per-region artwork. Navigation and overview use symbols without fetching paintings. */
const REGIONS = new Set([
  'borte-chino',
  'etugen-eke',
  'khukhedei-mergen',
  'golomt',
  'lus',
  'ongod',
  'sulde',
  'burkhan-guardian',
  'general',
  'hybrids',
]);

export function researchArtwork(region: string): TreeArtwork | undefined {
  if (!REGIONS.has(region)) return undefined;
  // CSS variables are consumed in the built stylesheet, so relative URLs would
  // resolve under assets/ in Electron. Resolve them against the document instead.
  const root =
    typeof document === 'undefined'
      ? import.meta.env.BASE_URL
      : new URL(import.meta.env.BASE_URL, document.baseURI).href;
  const base = `${root}art/research/${region}`;
  return {
    landscape: `${base}.webp`,
    detail: `${base}-detail.webp`,
    vignettes: [0, 1, 2].map((index) => `${base}-vignette-${index}.webp`),
  };
}
