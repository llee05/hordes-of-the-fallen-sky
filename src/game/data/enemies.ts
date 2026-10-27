import type { EnemyDefinition, LocationId } from '../types';
import type { AreaHabitat, AreaThreatKind } from './areaEncounters';
import { GAME } from '../config';

/** Add an entry and a matching painted character clip to introduce another enemy. */
export const ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'wisp',
    title: 'Hollow wolf',
    texture: 'wolf',
    tacticalRole: 'pack',
    navigation: 'pack',
    health: 25,
    speed: 49,
    damage: 10,
    xp: 3,
    unlockAt: 0,
    weight: 6,
    scale: 2,
  },
  {
    id: 'bat',
    title: 'Winged shade',
    texture: 'shade',
    health: 18,
    speed: 90,
    damage: 8,
    xp: 4,
    unlockAt: 22,
    weight: 3,
    scale: 2,
  },
  {
    id: 'brute',
    title: 'Earthbound hulk',
    texture: 'earth',
    tacticalRole: 'bulwark',
    armor: GAME.tactics.heavyArmor,
    navigation: 'heavy',
    health: 100,
    speed: 35,
    damage: 18,
    xp: 12,
    unlockAt: 55,
    weight: 2,
    scale: 3,
  },
  {
    id: 'ghost-rider',
    title: 'Ghost rider',
    texture: 'ghost',
    health: 48,
    speed: 112,
    damage: 12,
    xp: 5,
    unlockAt: 90,
    weight: 3,
    scale: 2,
    behavior: 'charger',
  },
  {
    id: 'hollow-seer',
    title: 'Hollow seer',
    texture: 'seer',
    health: 65,
    speed: 45,
    damage: 9,
    xp: 7,
    unlockAt: 150,
    weight: 2,
    scale: 2,
    behavior: 'ranged',
  },
  {
    id: 'frost-mare',
    elite: true,
    title: 'Frost mare',
    texture: 'ghost',
    health: 250,
    speed: 82,
    damage: 20,
    xp: 22,
    unlockAt: 210,
    weight: 1,
    scale: 3,
    behavior: 'charger',
  },
  {
    id: 'eclipse-giant',
    elite: true,
    title: 'Eclipse giant',
    texture: 'earth',
    navigation: 'heavy',
    health: 400,
    speed: 34,
    damage: 24,
    xp: 30,
    unlockAt: 330,
    weight: 1,
    scale: 4,
    behavior: 'ranged',
  },
];

export function spawnInterval(elapsed: number): number {
  return Math.max(0.14, 0.85 - elapsed * 0.004);
}

/** Active-time pacing; a rejected placement retries without consuming an entire encounter slot. */
export function encounterSpawnDelay(
  stageTime: number,
  region: number,
  danger = 1,
  spawned = true,
): number {
  if (!spawned) return GAME.spawning.retryInterval;
  if (region === 0 && stageTime < GAME.spawning.openingDuration)
    return GAME.spawning.openingInterval;
  return spawnInterval(stageTime + region * 65) / danger;
}

export function chooseEnemy(elapsed: number, random = Math.random): EnemyDefinition {
  const available = ENEMIES.filter((enemy) => enemy.unlockAt <= elapsed);
  let roll = random() * available.reduce((sum, enemy) => sum + enemy.weight, 0);
  for (const enemy of available) {
    roll -= enemy.weight;
    if (roll < 0) return enemy;
  }
  return available[available.length - 1]!;
}

export const SKYBREAKER: EnemyDefinition = {
  id: 'skybreaker',
  title: 'Skybreaker',
  texture: 'skybreaker',
  health: 3600,
  speed: 42,
  damage: 26,
  xp: 160,
  unlockAt: 0,
  weight: 0,
  scale: 4,
  behavior: 'boss',
};

type LocalArchetype = keyof typeof GAME.areaEnemies.profiles;
function native(
  home: LocationId,
  id: string,
  title: string,
  archetype: LocalArchetype,
  tint: number,
  habitat: AreaHabitat,
  ability?: AreaThreatKind,
  secondary = false,
): EnemyDefinition {
  const baseId = {
    prowler: 'wisp',
    skirmisher: 'bat',
    lancer: 'ghost-rider',
    bulwark: 'brute',
    caller: 'hollow-seer',
  }[archetype];
  const base = ENEMIES.find((e) => e.id === baseId)!;
  const role =
    archetype === 'prowler'
      ? 'pack'
      : archetype === 'bulwark'
        ? 'bulwark'
        : archetype === 'skirmisher'
          ? 'skirmisher'
          : undefined;
  return {
    ...base,
    ...GAME.areaEnemies.profiles[archetype],
    id,
    title,
    home,
    unlockAt: 0,
    localUnlockAt: secondary ? GAME.areaEnemies.secondaryAfter : 0,
    weight: 1,
    tint,
    habitat,
    tacticalRole: role,
    concealed: archetype === 'prowler' && (habitat === 'grove' || habitat === 'shore'),
    behavior: archetype === 'skirmisher' ? 'ranged' : base.behavior,
    volley:
      archetype === 'skirmisher'
        ? GAME.areaEnemies.volleys.skirmisher
        : archetype === 'caller'
          ? GAME.areaEnemies.volleys.caller
          : undefined,
    ability: ability ? { kind: ability, count: archetype === 'caller' ? 2 : 1 } : undefined,
  };
}
/** Local variants reuse registered painted clips; their identity and rules are independent of artwork. */
export const AREA_ENEMIES: readonly EnemyDefinition[] = [
  native('golden-pasture', 'thistle-prowler', 'Thistle prowler', 'prowler', 0xdbd09c, 'open'),
  native('golden-pasture', 'dustwing', 'Dustwing', 'skirmisher', 0xd8bb96, 'open', undefined, true),
  native('silent-river', 'rime-hound', 'Rime hound', 'prowler', 0xbcd8df, 'shore', 'frost'),
  native(
    'silent-river',
    'icebound-lancer',
    'Icebound lancer',
    'lancer',
    0xacc7e3,
    'snow',
    undefined,
    true,
  ),
  native('broken-pass', 'scree-crawler', 'Scree crawler', 'bulwark', 0xb9ac97, 'ridge', 'rockfall'),
  native(
    'broken-pass',
    'slate-needle',
    'Slate needle',
    'caller',
    0xa9b3c3,
    'ridge',
    undefined,
    true,
  ),
  native(
    'heart-of-the-steppe',
    'ashbound-outrider',
    'Ashbound outrider',
    'lancer',
    0xb1a3bd,
    'open',
  ),
  native(
    'heart-of-the-steppe',
    'rift-cantor',
    'Rift cantor',
    'caller',
    0xb1a5d1,
    'ridge',
    'rift',
    true,
  ),
  native('otgontenger', 'snowline-hunter', 'Snowline hunter', 'prowler', 0xd8e5db, 'snow'),
  native(
    'otgontenger',
    'white-ridge-sentinel',
    'White-ridge sentinel',
    'bulwark',
    0xc9d4d5,
    'ridge',
    'rockfall',
    true,
  ),
  native('bogd-khan-uul', 'rootshade-stalker', 'Rootshade stalker', 'prowler', 0xb3be92, 'grove'),
  native(
    'bogd-khan-uul',
    'canopy-whisperer',
    'Canopy whisperer',
    'caller',
    0xc1c9a7,
    'grove',
    'mire',
    true,
  ),
  native(
    'altai-tavan-bogd',
    'glacier-skimmer',
    'Glacier skimmer',
    'skirmisher',
    0xb5d5de,
    'shore',
    'frost',
  ),
  native(
    'altai-tavan-bogd',
    'moraine-breaker',
    'Moraine breaker',
    'bulwark',
    0xb7c7ca,
    'ridge',
    'rockfall',
    true,
  ),
  native('khan-tengri', 'windknife', 'Windknife', 'skirmisher', 0xc1c2de, 'ridge'),
  native(
    'khan-tengri',
    'spire-lancer',
    'Spire lancer',
    'lancer',
    0xd7d6ed,
    'snow',
    'crosswind',
    true,
  ),
  native('belukha', 'frostwood-prowler', 'Frostwood prowler', 'prowler', 0xb1c9bc, 'grove'),
  native(
    'belukha',
    'meltwater-caller',
    'Meltwater caller',
    'caller',
    0xc4d8dc,
    'shore',
    'frost',
    true,
  ),
  native('altan-ovoo', 'basalt-carapace', 'Basalt carapace', 'bulwark', 0xa6a196, 'open'),
  native('altan-ovoo', 'cinderwing', 'Cinderwing', 'skirmisher', 0xd5a88e, 'open', 'cinder', true),
  native('eej-khairkhan', 'sandglass-stalker', 'Sandglass stalker', 'lancer', 0xddc49b, 'shelter'),
  native(
    'eej-khairkhan',
    'granite-hollow',
    'Granite hollow',
    'bulwark',
    0xd2b89e,
    'shelter',
    'rockfall',
    true,
  ),
  native('orkhon-valley', 'reed-prowler', 'Reed prowler', 'prowler', 0xb9c6a3, 'shore'),
  native('orkhon-valley', 'silt-caller', 'Silt caller', 'caller', 0xb2c5b2, 'shore', 'mire', true),
];
export const ALL_ENEMIES: readonly EnemyDefinition[] = [...ENEMIES, ...AREA_ENEMIES];
export function areaRoster(
  location: LocationId,
  score: number,
  localTime: number,
): EnemyDefinition[] {
  return ALL_ENEMIES.filter((e) =>
    e.home ? e.home === location && localTime >= (e.localUnlockAt ?? 0) : e.unlockAt <= score,
  );
}
