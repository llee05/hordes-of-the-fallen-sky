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
    warning: 'Prowlers are spreading through the long grass.',
    rule: 'Packs come at you from one flank, then the other.',
    counter: 'Keep moving, and charge a volley before the pack closes in.',
    natives: ['thistle-prowler', 'dustwing'],
    habitat: 'open',
    pattern: 'flanks',
  },
  'silent-river': {
    title: 'The frozen shallows',
    warning: 'Rime is gathering along the river.',
    rule: 'Marked ice patches slow riders on the banks.',
    counter: 'Get out of the blue circles before they freeze, and keep to the dry banks.',
    natives: ['rime-hound', 'icebound-lancer'],
    habitat: 'shore',
    pattern: 'banks',
    threat: 'frost',
  },
  'broken-pass': {
    title: 'The falling slate',
    warning: 'Loose stone is shifting above the road.',
    rule: 'Rock comes down at the foot of the exposed cliffs.',
    counter: 'Watch for the marked falls and ride out onto open ground.',
    natives: ['scree-crawler', 'slate-needle'],
    habitat: 'ridge',
    pattern: 'shelves',
    threat: 'rockfall',
  },
  'heart-of-the-steppe': {
    title: 'The torn threshold',
    warning: 'The rift is gathering across the basin.',
    rule: 'Rift strikes sweep the open approaches one after another.',
    counter: 'Cross each marked lane just after it strikes, and keep the households covered.',
    natives: ['ashbound-outrider', 'rift-cantor'],
    habitat: 'open',
    pattern: 'crossfire',
    threat: 'rift',
  },
  otgontenger: {
    title: 'Below the white ridge',
    warning: 'Snowline hunters are coming down from the shelves.',
    rule: 'Hunters come by the ridge approaches, and loose stone falls beneath the ledges.',
    counter: 'Keep to the broad passes, and get clear of the warnings at the cliff foot.',
    natives: ['snowline-hunter', 'white-ridge-sentinel'],
    habitat: 'ridge',
    pattern: 'shelves',
    threat: 'rockfall',
  },
  'bogd-khan-uul': {
    title: 'The woodland hunt',
    warning: 'Something is moving under the larches.',
    rule: 'Stalkers blend into the groves and strike from different flanks.',
    counter: 'Look for muted silhouettes, and draw the pack out into the clearings.',
    natives: ['rootshade-stalker', 'canopy-whisperer'],
    habitat: 'grove',
    pattern: 'flanks',
  },
  'altai-tavan-bogd': {
    title: 'The glacial seams',
    warning: 'Cold is spreading from the glacier channels.',
    rule: 'Freezing patches form near glacial water and snow shelves.',
    counter: 'Stay off the marked ice, and take the broad gravel approaches.',
    natives: ['glacier-skimmer', 'moraine-breaker'],
    habitat: 'snow',
    pattern: 'banks',
    threat: 'frost',
  },
  'khan-tengri': {
    title: 'The exposed spire',
    warning: 'A crosswind cuts across the high shelf.',
    rule: 'Windknives and lancers catch the exposed shelves in crossfire.',
    counter: 'Ride across the warning lines, and punish any charge once it commits.',
    natives: ['windknife', 'spire-lancer'],
    habitat: 'ridge',
    pattern: 'crossfire',
    threat: 'crosswind',
  },
  belukha: {
    title: 'The frostwood edge',
    warning: 'Prowlers gather where cold water meets the forest.',
    rule: 'Hidden woodland approaches run down to freezing river margins.',
    counter: 'Use the clearings to flush out prowlers, and avoid the marked frost.',
    natives: ['frostwood-prowler', 'meltwater-caller'],
    habitat: 'grove',
    pattern: 'flanks',
    threat: 'frost',
  },
  'altan-ovoo': {
    title: 'Ash on the basalt',
    warning: 'Calamity ash is gathering over the old basalt.',
    rule: 'Marked cinders scorch open ground for a moment.',
    counter: 'Leave the ember circles before they land, and pin the armoured creatures.',
    natives: ['basalt-carapace', 'cinderwing'],
    habitat: 'open',
    pattern: 'crossfire',
    threat: 'cinder',
  },
  'eej-khairkhan': {
    title: 'The granite shelter',
    warning: 'Grit is blowing between the granite outcrops.',
    rule: 'Marked blasts sweep the open ground, but the granite breaks them.',
    counter: 'Ride in the lee of the outcrops, or get out of the marked blast.',
    natives: ['sandglass-stalker', 'granite-hollow'],
    habitat: 'shelter',
    pattern: 'shelter',
    threat: 'rockfall',
  },
  'orkhon-valley': {
    title: 'The reed-bank crossfire',
    warning: 'The reeds are stirring on both banks.',
    rule: 'Reed prowlers flank the banks, and silt pools slow the shallows.',
    counter: 'Keep to the open banks and crossings, and interrupt the silt callers.',
    natives: ['reed-prowler', 'silt-caller'],
    habitat: 'shore',
    pattern: 'banks',
    threat: 'mire',
  },
};
