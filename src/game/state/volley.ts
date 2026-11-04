import type { RunState } from '../types';
import { burningTempest } from './clan';

export function volleyFactors(run: RunState, count: number) {
  const tempest = burningTempest(run);
  return {
    tempest,
    count: count + (tempest ? 2 : 0),
    spacing: tempest ? 0.28 : 0.12,
    damage: run.clan.formation === 'encircle' && run.clan.momentum > 0.5 ? 1.3 : 1,
    speed: 1,
  };
}
