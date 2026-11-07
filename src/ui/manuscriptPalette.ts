/**
 * Centralised medieval manuscript colour palette and rendering tokens
 * for the Interactive Medieval Manuscript art direction.
 *
 * All hex strings and 24-bit integer colours derive from the historical
 * mineral and vegetable pigments specified in the overhaul brief.
 */
export const MANUSCRIPT_PALETTE = {
  agedParchment: '#d9c8a5',
  lightParchment: '#e8d9b9',
  parchmentHighlight: '#f2e6cc',
  parchmentShadow: '#c4b089',
  darkInk: '#43382c',
  mutedInk: '#5c4d3c',
  faintInk: '#766552',
  fadedOchre: '#ad824d',
  warmOchre: '#c49a5c',
  terracotta: '#98614d',
  deepTerracotta: '#7d4b3a',
  sageGreen: '#7d896c',
  deepSage: '#5d694e',
  meadowParchment: '#a9ab7e',
  dustyBlue: '#607a8b',
  paleRiverBlue: '#8ba3b0',
  deepRiverBlue: '#465d6d',
  fadedBurgundy: '#794e4c',
} as const;

export const MANUSCRIPT_COLORS = {
  agedParchment: 0xd9c8a5,
  lightParchment: 0xe8d9b9,
  parchmentHighlight: 0xf2e6cc,
  parchmentShadow: 0xc4b089,
  darkInk: 0x43382c,
  mutedInk: 0x5c4d3c,
  faintInk: 0x766552,
  fadedOchre: 0xad824d,
  warmOchre: 0xc49a5c,
  terracotta: 0x98614d,
  deepTerracotta: 0x7d4b3a,
  sageGreen: 0x7d896c,
  deepSage: 0x5d694e,
  meadowParchment: 0xa9ab7e,
  dustyBlue: 0x607a8b,
  paleRiverBlue: 0x8ba3b0,
  deepRiverBlue: 0x465d6d,
  fadedBurgundy: 0x794e4c,
} as const;
