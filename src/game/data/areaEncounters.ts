import type { LocationId } from '../types';
export type AreaHabitat = 'open' | 'grove' | 'shore' | 'ridge' | 'snow' | 'shelter';
export type AreaThreatKind = 'frost' | 'mire' | 'rockfall' | 'crosswind' | 'cinder' | 'rift';
export interface AreaEncounterDefinition {
  title: string;
  warning: string;
  rule: string;
  counter: string;
  natives: readonly [string, string];
  habitat: AreaHabitat;
  pattern: 'flanks' | 'banks' | 'shelves' | 'shelter' | 'crossfire';
  threat?: AreaThreatKind;
}
/** These are fictional unreturned shaped by terrain, never the honoured powers of real sacred places. */
export const AREA_ENCOUNTERS: Readonly<Record<LocationId, AreaEncounterDefinition>> = {
  'golden-pasture': {
    title: 'The grassland hunt',
    warning: 'Prowlers spread through the long grass.',
    rule: 'Packs approach from alternating flanks.',
    counter: 'Keep moving; charge a volley before the pack closes.',
    natives: ['thistle-prowler', 'dustwing'],
    habitat: 'open',
    pattern: 'flanks',
  },
  'silent-river': {
    title: 'The frozen shallows',
    warning: 'Rime is gathering beside the river.',
    rule: 'Warned ice patches slow riders along the banks.',
    counter: 'Leave blue circles before they freeze; use dry banks.',
    natives: ['rime-hound', 'icebound-lancer'],
    habitat: 'shore',
    pattern: 'banks',
    threat: 'frost',
  },
  'broken-pass': {
    title: 'The falling slate',
    warning: 'Loose stone shifts above the road.',
    rule: 'Rockfall threatens the feet of exposed cliffs.',
    counter: 'Read the marked falls and ride onto open ground.',
    natives: ['scree-crawler', 'slate-needle'],
    habitat: 'ridge',
    pattern: 'shelves',
    threat: 'rockfall',
  },
  'heart-of-the-steppe': {
    title: 'The torn threshold',
    warning: 'The rift gathers across the basin.',
    rule: 'Staggered rift strikes sweep exposed approaches.',
    counter: 'Cross each marked lane after it strikes; protect the households.',
    natives: ['ashbound-outrider', 'rift-cantor'],
    habitat: 'open',
    pattern: 'crossfire',
    threat: 'rift',
  },
  otgontenger: {
    title: 'Below the white ridge',
    warning: 'Snowline hunters descend from the shelves.',
    rule: 'Hunters use the ridge approaches; loose stone falls below ledges.',
    counter: 'Keep broad passes open and leave the cliff-foot warnings.',
    natives: ['snowline-hunter', 'white-ridge-sentinel'],
    habitat: 'ridge',
    pattern: 'shelves',
    threat: 'rockfall',
  },
  'bogd-khan-uul': {
    title: 'The woodland hunt',
    warning: 'Shapes move beneath the larches.',
    rule: 'Stalkers blend into groves and attack from separate flanks.',
    counter: 'Watch for muted silhouettes; draw the pack into clearings.',
    natives: ['rootshade-stalker', 'canopy-whisperer'],
    habitat: 'grove',
    pattern: 'flanks',
  },
  'altai-tavan-bogd': {
    title: 'The glacial seams',
    warning: 'Cold spreads from the glacier channels.',
    rule: 'Freezing patches collect near glacial water and snow shelves.',
    counter: 'Stay off marked ice and take the broad gravel approaches.',
    natives: ['glacier-skimmer', 'moraine-breaker'],
    habitat: 'snow',
    pattern: 'banks',
    threat: 'frost',
  },
  'khan-tengri': {
    title: 'The exposed spire',
    warning: 'A crosswind cuts across the high shelf.',
    rule: 'Windknives and lancers contest exposed shelves with crossfire.',
    counter: 'Ride across the warning lines and punish committed charges.',
    natives: ['windknife', 'spire-lancer'],
    habitat: 'ridge',
    pattern: 'crossfire',
    threat: 'crosswind',
  },
  belukha: {
    title: 'The frostwood edge',
    warning: 'Prowlers gather where cold water meets the forest.',
    rule: 'Concealed woodland approaches meet freezing river margins.',
    counter: 'Use clearings to reveal prowlers; avoid the marked frost.',
    natives: ['frostwood-prowler', 'meltwater-caller'],
    habitat: 'grove',
    pattern: 'flanks',
    threat: 'frost',
  },
  'altan-ovoo': {
    title: 'Ash on the basalt',
    warning: 'Calamity ash gathers above the old basalt.',
    rule: 'Warned cinders briefly scorch exposed ground.',
    counter: 'Leave ember circles before impact; pin the armoured creatures.',
    natives: ['basalt-carapace', 'cinderwing'],
    habitat: 'open',
    pattern: 'crossfire',
    threat: 'cinder',
  },
  'eej-khairkhan': {
    title: 'The granite shelter',
    warning: 'Grit cuts between the granite outcrops.',
    rule: 'Stone shelter breaks the marked blasts on exposed ground.',
    counter: 'Ride beside the outcrops or leave the marked blast.',
    natives: ['sandglass-stalker', 'granite-hollow'],
    habitat: 'shelter',
    pattern: 'shelter',
    threat: 'rockfall',
  },
  'orkhon-valley': {
    title: 'The reed-bank crossfire',
    warning: 'Reeds stir on both sides of the water.',
    rule: 'Reed prowlers flank the banks; silt pools slow the shallows.',
    counter: 'Follow open banks and crossings; interrupt the silt callers.',
    natives: ['reed-prowler', 'silt-caller'],
    habitat: 'shore',
    pattern: 'banks',
    threat: 'mire',
  },
};
