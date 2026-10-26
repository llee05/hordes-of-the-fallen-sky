import { availableFormations, canMigrate } from './clan';
import type { RunState } from '../types';
import { economyForecast, type EconomyForecast } from './economy';
import { GAME } from '../config';

export type GuidanceStep =
  'ride' | 'build' | 'shards' | 'research' | 'formation' | 'depart' | 'crossing';
export interface GuidanceState {
  enabled: boolean;
  completed: GuidanceStep[];
}
export interface Guidance {
  id: GuidanceStep | 'prepare' | 'succession';
  title: string;
  text: string;
  action?: 'build' | 'research' | 'formation' | 'migrate';
  label?: string;
}

export function completeGuidance(run: RunState, step: GuidanceStep): void {
  if (!run.guidance.completed.includes(step)) run.guidance.completed.push(step);
}

/** A single suggestion follows real actions; reading it never pauses or changes the expedition. */
export function currentGuidance(run: RunState): Guidance | undefined {
  if (!run.guidance.enabled || run.clan.region > 0 || run.guidance.completed.includes('crossing'))
    return;
  const done = (step: GuidanceStep) => run.guidance.completed.includes(step);
  if (run.khan.successionRemaining > 0)
    return {
      id: 'succession',
      title: 'The people carry on',
      text: 'The camp’s defenses fight on while a new Khan is chosen. Only losing every person, or all resolve, ends the expedition.',
    };
  if (run.clan.stage === 'migration')
    return {
      id: 'crossing',
      title: 'Bring everyone across',
      text: 'Follow the clan arrow and keep beside the wagons. The road eats into the food; route rewards wait on the far side.',
    };
  if (canMigrate(run))
    return {
      id: 'depart',
      title: 'Choose when to leave',
      text: 'The roads are open. Staying brings in supplies, but the pasture shrinks and danger grows. M / Y shows the roads with the world paused.',
      action: 'migrate',
      label: 'Inspect routes · M / Y',
    };
  if (!done('ride'))
    return {
      id: 'ride',
      title: 'Ride out, keep watch',
      text: 'Ride with WASD, arrows, the left stick or a touch drag; your bow fires on its own. Space / controller A breaks into a short, protected gallop.',
    };
  if (run.pendingUpgrades > 0 && !done('research'))
    return {
      id: 'research',
      title: 'Put knowledge to work',
      text: 'Your shards have earned a knowledge point. T / LB opens the patron tree and pauses the world. You can also keep the point for later.',
      action: 'research',
      label: 'Patron tree · T / LB',
    };
  if (!done('build'))
    return {
      id: 'build',
      title: 'Your camp is your strength',
      text: 'B / X opens the camp. Archery grounds add three riders and formations; herding grounds help feed the clan. What you build holds its workers and travels with you.',
      action: 'build',
      label: 'Develop camp · B / X',
    };
  if (!done('shards'))
    return {
      id: 'shards',
      title: 'Gather what the fallen leave',
      text: 'Ride close to the turquoise spirit shards to gather them. A full tradition bar earns a knowledge point, and the fight never stops.',
    };
  if (availableFormations(run).length > 1 && !done('formation'))
    return {
      id: 'formation',
      title: 'Give the riders a purpose',
      text: 'F / RB steps through your unlocked formations. Caravan guard keeps riders by your people and softens clan damage; the others favour attacking on the move.',
      action: 'formation',
      label: 'Change formation · F / RB',
    };

  return {
    id: 'prepare',
    title: 'Keep the people ready',
    text: 'Keep an eye on resolve and food as you gather. Routes open after 45 active seconds and you choose when to pack; buildings and traditions go with the clan.',
  };
}

/** Persistent danger text remains available even when the introductory guidance is hidden. */
export function clanWarning(
  run: RunState,
  forecast: EconomyForecast = economyForecast(run),
): string {
  const clan = run.clan;
  if (clan.food <= 0)
    return clan.stage === 'migration'
      ? 'The food is gone. Starvation takes people and livestock. Guard the caravan to arrival.'
      : 'The food is gone. Starvation takes people and livestock. Find provisions.';
  if (clan.integrity <= 35)
    return 'Clan resolve is critical. Get back to your people; if resolve runs out, the expedition ends.';
  if (clan.population <= 3)
    return 'Only a few people are left. Protect them; if the last falls, the expedition ends.';
  if (clan.food < 15)
    return clan.stage === 'migration'
      ? 'Food is low. Guard the caravan; the route rewards come on arrival.'
      : clan.stage === 'final'
        ? 'Food is low. Build up herding or provisions and protect what stores remain.'
        : 'Food is low. Build up herding or provisions, or look for a river route.';
  if (forecast.foodSeconds !== undefined && forecast.foodSeconds <= GAME.clan.foodWarningSeconds)
    return clan.stage === 'migration'
      ? 'Food will run out before arrival. Protect the caravan; supplies wait at the far end.'
      : clan.stage === 'final'
        ? 'Food will run out before the passage opens. Build up herding or provisions.'
        : 'Food will run out soon. Build up herding or provisions, or scout a route ahead.';
  if (clan.stage === 'camp' && clan.pasture <= 25)
    return 'The pasture is nearly spent. Gathering slows, but every mouth still needs feeding. Scout a route ahead.';
  if (clan.stage === 'final' && clan.pasture <= 25)
    return 'The pasture is nearly spent. Guard your provisions and hold until the passage opens.';
  return '';
}
