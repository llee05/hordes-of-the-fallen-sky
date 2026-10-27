import { burningTempest } from './clan';
import { gallopingBarrage, wideVolleyResearch } from './researchRuntime';
import type { RunState } from '../types';

export function volleyFactors(run: RunState, count: number, personal: boolean, ancestral = false) {
  const tempest = burningTempest(run);
  const research = wideVolleyResearch(run, count, personal);
  const barrage = gallopingBarrage(run, personal);
  return {
    tempest,
    count: count + (tempest ? 2 : 0),
    spacing: (tempest ? 0.28 : 0.12) * (ancestral ? 1 : run.patrons.bow.spread) * research.spread,
    damage:
      research.damage *
      barrage.damage *
      (run.clan.formation === 'encircle' && run.clan.momentum > 0.5 ? 1.3 : 1),
    speed: barrage.speed,
  };
}
