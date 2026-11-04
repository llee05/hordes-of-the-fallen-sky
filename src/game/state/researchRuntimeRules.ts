import type { Rule } from './archiveRules';
import {
  CORE_RESEARCH_RUNTIME_RULES,
  BORTE_CHINO_RUNTIME_RULES,
  ETUGEN_EKE_RUNTIME_RULES,
  KHUKHEDEI_MERGEN_RUNTIME_RULES,
  GOLOMT_RUNTIME_RULES,
  ONGOD_RUNTIME_RULES,
  HYBRID_FIELD_RUNTIME_RULES,
} from './researchRuntime';
import { COMPANION_RUNTIME_RULES } from './researchCompanions';
import { ECHO_RUNTIME_RULES } from './researchEchoes';
import { GUARDIAN_RUNTIME_RULES } from './researchGuardian';
import { HYBRID_RUNTIME_RULES } from './researchHybrids';
import { LEADERSHIP_RUNTIME_RULES } from './researchLeadership';
import { TERRAIN_RUNTIME_RULES } from './researchTerrain';

/**
 * Save rules for `researchRuntime`, one slice per research system. Slices never share a key, and
 * the combined record accepts the same JSON keys as before the split, so older saves load unchanged.
 */
export const RESEARCH_RUNTIME_SLICES: Readonly<Record<string, Readonly<Record<string, Rule>>>> = {
  core: CORE_RESEARCH_RUNTIME_RULES,
  borteChino: BORTE_CHINO_RUNTIME_RULES,
  etugenEke: ETUGEN_EKE_RUNTIME_RULES,
  khukhedeiMergen: KHUKHEDEI_MERGEN_RUNTIME_RULES,
  golomt: GOLOMT_RUNTIME_RULES,
  ongod: ONGOD_RUNTIME_RULES,
  hybridField: HYBRID_FIELD_RUNTIME_RULES,
  companions: COMPANION_RUNTIME_RULES,
  echoes: ECHO_RUNTIME_RULES,
  guardian: GUARDIAN_RUNTIME_RULES,
  hybrids: HYBRID_RUNTIME_RULES,
  leadership: LEADERSHIP_RUNTIME_RULES,
  terrain: TERRAIN_RUNTIME_RULES,
};

export const RESEARCH_RUNTIME_RULES: Readonly<Record<string, Rule>> = Object.assign(
  {},
  ...Object.values(RESEARCH_RUNTIME_SLICES),
);
