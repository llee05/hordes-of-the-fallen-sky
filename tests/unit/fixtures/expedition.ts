import { CharacterMotion } from '../../../src/game/animation/CharacterMotion';
import { createAreaEncounter } from '../../../src/game/state/areaEncounters';
import type { WorldArchive } from '../../../src/game/state/expeditionArchive';

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
      abilityCooldowns: { q: 1, w: 2, e: 3, r: 4 },
      khanStatus: {
        guard: 2.5,
        reduction: 0.65,
        unstoppable: 2.5,
        speedMultiplier: 0.6,
        fortress: 3,
        fortressTimer: 0.4,
        shield: 12,
        shieldMax: 40,
        shieldPerSecond: 8,
      },
      dashTimer: 2,
      dashRemaining: 0.1,
      invulnerable: 0.3,
      supportTimer: 1,
      wagonTimer: 2,
      wardTimer: 3,
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
          spiritSlow: 0,
          lastGallop: -1,
          dangerTimer: 2,
          tacticalSlot: 1,
          preparingAttack: true,
          status: {
            stun: 0.5,
            slow: 2,
            slowMultiplier: 0.45,
            shred: 3,
            shredBonus: 0.3,
            forced: 0.2,
            forcedVx: 30,
            forcedVy: -10,
          },
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
