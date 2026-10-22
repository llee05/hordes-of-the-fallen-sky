import { availableFormations, canMigrate } from './clan';
import type { RunState } from '../types';

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
      text: 'Your defenses keep fighting while a new Khan is chosen. The expedition ends only if the clan loses all people or resolve.',
    };
  if (run.clan.stage === 'migration')
    return {
      id: 'crossing',
      title: 'Bring everyone across',
      text: 'Follow the clan arrow and ride beside the wagons. Food is consumed on the road; route rewards arrive after the crossing.',
    };
  if (canMigrate(run))
    return {
      id: 'depart',
      title: 'Choose when to leave',
      text: 'Routes are open. Staying gathers supplies, but pasture shrinks and danger grows. M / Y lets you inspect the roads while the world is paused.',
      action: 'migrate',
      label: 'Inspect routes · M / Y',
    };
  if (!done('ride'))
    return {
      id: 'ride',
      title: 'Ride out, keep watch',
      text: 'Ride with WASD, arrows, the left stick, or a touch drag. Your bow fires automatically. Space / controller A gives a brief protected gallop.',
    };
  if (run.pendingUpgrades > 0 && !done('research'))
    return {
      id: 'research',
      title: 'Put knowledge to work',
      text: 'Your spirit shards earned a knowledge point. Open the patron tree with T / LB; planning pauses the world. Points can be saved for later.',
      action: 'research',
      label: 'Patron tree · T / LB',
    };
  if (!done('build'))
    return {
      id: 'build',
      title: 'Your camp is your strength',
      text: 'Open camp development with B / X. Archery grounds add three riders and formations; herding grounds help feed the clan. Purchases reserve workers and travel with you.',
      action: 'build',
      label: 'Develop camp · B / X',
    };
  if (!done('shards'))
    return {
      id: 'shards',
      title: 'Gather what the fallen leave',
      text: 'Ride near turquoise spirit shards to collect them. Fill the tradition bar to earn knowledge points without interrupting the battle.',
    };
  if (availableFormations(run).length > 1 && !done('formation'))
    return {
      id: 'formation',
      title: 'Give the riders a purpose',
      text: 'F / RB cycles unlocked formations. Caravan guard keeps riders near your people and reduces clan damage; other formations support moving attacks.',
      action: 'formation',
      label: 'Change formation · F / RB',
    };

  return {
    id: 'prepare',
    title: 'Keep the people ready',
    text: 'Watch clan resolve and food as you gather. Routes open after 45 active seconds. You choose when to pack; buildings and traditions travel with the clan.',
  };
}

/** Persistent danger text remains available even when the introductory guidance is hidden. */
export function clanWarning(run: RunState): string {
  const clan = run.clan;
  if (clan.food <= 0)
    return clan.stage === 'migration'
      ? 'No food. Starvation costs people and livestock. Protect the caravan until arrival.'
      : 'No food. Starvation costs people and livestock. Seek provisions.';
  if (clan.integrity <= 35)
    return 'Clan resolve is critical. Return to guard your people; all resolve lost ends the expedition.';
  if (clan.population <= 3)
    return 'Few people remain. Protect the clan; losing everyone ends the expedition.';
  if (clan.food < 15)
    return clan.stage === 'migration'
      ? 'Food is low. Guard the caravan until arrival brings the route rewards.'
      : clan.stage === 'final'
        ? 'Food is low. Develop herding or provisions and protect the remaining supplies.'
        : 'Food is low. Develop herding or provisions, or seek a river route.';
  if (clan.stage === 'camp' && clan.pasture <= 25)
    return 'Pasture is nearly spent. Gathering slows while mouths still need feeding. Inspect a route east.';
  if (clan.stage === 'final' && clan.pasture <= 25)
    return 'Pasture is nearly spent. Protect your provisions and hold until the passage opens.';
  return '';
}
