import { BORTE_CHINO_HANDLERS } from './borteChino';
import { ETUGEN_EKE_HANDLERS } from './etugenEke';
import { KHUKHEDEI_MERGEN_HANDLERS } from './khukhedeiMergen';
import { GOLOMT_HANDLERS } from './golomt';
import { LUS_HANDLERS } from './lus';
import { ONGOD_HANDLERS } from './ongod';
import { SULDE_HANDLERS } from './sulde';
import { GUARDIAN_HANDLERS } from './guardian';
import { HYBRID_HANDLERS } from './hybrids';

/**
 * Every research technology with an implemented runtime effect. Enabling a technology means
 * adding its ID to one group file and removing its `RESEARCH_BLOCKERS` entry; the handler type
 * and the purchasable count are derived from this table.
 */
export const RESEARCH_HANDLERS = [
  ...BORTE_CHINO_HANDLERS,
  ...ETUGEN_EKE_HANDLERS,
  ...KHUKHEDEI_MERGEN_HANDLERS,
  ...GOLOMT_HANDLERS,
  ...LUS_HANDLERS,
  ...ONGOD_HANDLERS,
  ...SULDE_HANDLERS,
  ...GUARDIAN_HANDLERS,
  ...HYBRID_HANDLERS,
] as const;

export type ResearchHandlerId = (typeof RESEARCH_HANDLERS)[number];
