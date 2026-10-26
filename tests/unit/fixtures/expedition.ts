import type { WorldArchive } from '../../../src/game/state/expeditionArchive';
import { CharacterMotion } from '../../../src/game/animation/CharacterMotion';
import { createAreaEncounter } from '../../../src/game/state/areaEncounters';

export function world(): WorldArchive {
  const motion = new CharacterMotion('player').capture();
  const body = { x: 2600, y: 2700, vx: 13, vy: -22, flip: false };
  return {
    player: { ...body, motion },
    camp: { x: 2600, y: 2600 },
    facing: { x: 0, y: 1 },
    zoom: 0.8,
    timers: {
      spawnTimer: 0.4,
      attackTimer: 0.8,
      dashTimer: 2,
      dashRemaining: 0.1,
      invulnerable: 0.3,
      supportTimer: 1,
      wagonTimer: 2,
      wardTimer: 3,
      hazardTimer: 4,
    },
    generations: [4, 2],
    enemies: [
      {
        ...body,
        slot: 1,
        definition: 'wisp',
        motion,
        state: {
          health: 5,
          maxHealth: 20,
          spawnId: 2,
          attackTimer: 0.2,
          clanAttackTimer: 0.3,
          chargeTimer: 0,
          burning: 1,
          pinned: 0,
          lastGallop: -1,
          dangerTimer: 2,
          tacticalSlot: 1,
          preparingAttack: true,
          tactics: {
            phase: 'windup',
            remaining: 0.2,
            aim: { x: 2600, y: 2600 },
            direction: { x: 1, y: 0 },
          },
        },
      },
    ],
    projectiles: [
      {
        ...body,
        damage: 15,
        remaining: 0.8,
        fire: true,
        tempest: false,
        turn: 0,
        pierces: 1,
        pins: true,
        rotation: 0.2,
        tint: 0xffffff,
        hits: [{ slot: 1, spawnId: 2 }],
      },
    ],
    hostileShots: [],
    gems: [{ ...body, value: 23, attracted: true }],
    riders: [],
    support: { ancestorTimer: 0.8, waterTimer: 1.8, guardianTimer: 0.4, spirits: [] },
    hazards: [{ x: 2700, y: 2700, remaining: 0.4, radius: 90, damage: 8, source: 'seer' }],
    areaEncounter: createAreaEncounter(),
    areaThreats: {
      nextId: 2,
      threats: [
        {
          id: 1,
          kind: 'frost',
          x: 2700,
          y: 2800,
          age: 0.2,
          warning: 1,
          impacted: false,
          nextTick: 2,
          owner: '1:2',
        },
      ],
    },
  };
}
