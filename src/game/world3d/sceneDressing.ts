import type { TerrainBounds } from '../terrain/types';
import { terrainSeed } from '../terrain/noise';
import { terrainHabitat } from './terrainHabitat';
import type { ComposedTerrain } from './ComposedTerrain';

export type SceneProp =
  | 'pine'
  | 'larch'
  | 'willow'
  | 'boulders'
  | 'scrub'
  | 'crag'
  | 'grass'
  | 'dry-grass'
  | 'flowers'
  | 'reeds'
  | 'branch'
  | 'pebbles';
export interface SceneDressing {
  x: number;
  z: number;
  kind: SceneProp;
  width: number;
  flip: boolean;
  tint: number;
  heightScale: number;
  texture: string;
  frame: string;
  shadow: boolean;
}
interface Candidate {
  x: number;
  z: number;
  random: (offset: number) => number;
  id: string;
}
const DETAILS = new Set<SceneProp>(['grass', 'dry-grass', 'flowers', 'reeds', 'branch', 'pebbles']);

/** Global cluster parents generate whole neighborhoods before clipping into resident chunks. */
export function sceneDressing(terrain: ComposedTerrain, bounds: TerrainBounds): SceneDressing[] {
  const result: { id: string; prop: SceneDressing }[] = [];
  const vegetation = terrain.region.scene.vegetation;
  const within = (x: number, z: number) =>
    x >= bounds.x && z >= bounds.y && x < bounds.x + bounds.width && z < bounds.y + bounds.height;
  const randomFor = (key: string) => (offset: number) =>
    terrainSeed(`${terrain.seed}:${key}:${offset}`) / 4294967295;
  const habitat = (x: number, z: number) => {
    const sample = terrain.sample(x, z),
      height = sample.elevation * terrain.region.biome.heightScale;
    return {
      sample,
      height,
      cover: terrainHabitat(terrain, x, z, height, 1 / Math.hypot(1, sample.slope)),
    };
  };
  const add = (c: Candidate, kind: SceneProp, width: number, tree = false): void => {
    const { x, z, random } = c;
    if (!within(x, z) || terrain.protection(x, z) > 0.15) return;
    const { sample, height } = habitat(x, z);
    if (sample.slope > (tree ? 0.38 : 0.62) || terrain.snowAt(height, 1) > 0.65) return;
    if (terrain.river && terrain.river.sample(x, z).shoreDistance < (tree ? 20 : 5)) return;
    const detail = DETAILS.has(kind);
    result.push({
      id: c.id,
      prop: {
        x,
        z,
        kind,
        width,
        flip: random(11) > 0.5,
        tint: [0xffffff, 0xf2f0d9, 0xe1e8dc][Math.floor(random(12) * 3)]!,
        heightScale: tree ? 0.91 + random(13) * 0.18 : 1,
        texture: detail ? 'steppe-ground-details' : 'tapestry-scenery',
        frame: kind === 'boulders' ? 'boulder' : kind,
        shadow: !detail && width > 42,
      },
    });
  };
  const parents = (size: number, padding: number, visit: (c: Candidate) => void) => {
    for (
      let row = Math.floor((bounds.y - padding) / size);
      row * size < bounds.y + bounds.height + padding;
      row++
    )
      for (
        let col = Math.floor((bounds.x - padding) / size);
        col * size < bounds.x + bounds.width + padding;
        col++
      ) {
        const id = `${size}:${col}:${row}`,
          random = randomFor(id);
        visit({
          id,
          x: (col + 0.25 + random(1) * 0.5) * size,
          z: (row + 0.25 + random(2) * 0.5) * size,
          random,
        });
      }
  };
  const trees: Candidate[] = [];
  parents(448, 230, (parent) => {
    const { cover, height } = habitat(parent.x, parent.z);
    const woodland = vegetation === 'woodland' && cover.grove > 0.39;
    const riparian =
      vegetation !== 'desert' && cover.shore > 0.05 && cover.moisture > 0.57 && cover.grove > 0.35;
    const steppe =
      (vegetation === 'meadow' || vegetation === 'river') &&
      cover.grove > 0.62 &&
      cover.moisture > 0.42;
    const alpine =
      vegetation === 'alpine' &&
      cover.grove > 0.65 &&
      cover.exposure < 0.48 &&
      height < terrain.region.scene.snowLine - 80;
    if (
      !(woodland || riparian || steppe || alpine) ||
      cover.exposure > 0.63 ||
      height - terrain.region.scene.floor > 350
    )
      return;
    for (let i = 0; i < (woodland ? 7 : riparian ? 5 : 3); i++) {
      const random = randomFor(`${parent.id}:tree:${i}`),
        angle = random(1) * Math.PI * 2,
        radius = 35 + Math.sqrt(random(2)) * 120;
      trees.push({
        id: `${parent.id}:tree:${i}`,
        x: parent.x + Math.cos(angle) * radius,
        z: parent.z + Math.sin(angle) * radius,
        random,
      });
    }
  });
  if (terrain.river && vegetation !== 'desert')
    for (const [channelIndex, channel] of terrain.river.channels.entries())
      for (let i = 6; i < channel.sections.length; i += 24)
        for (const side of [-1, 1]) {
          const section = channel.sections[i]!,
            key = `riparian:${channelIndex}:${i}:${side}`,
            random = randomFor(key);
          if (random(1) < 0.52) continue;
          for (let j = 0; j < 3; j++) {
            const r = randomFor(`${key}:${j}`),
              offset = (side < 0 ? section.left : section.right) + 48 + r(2) * 65;
            const along = (j - 1) * 68 + r(3) * 18;
            trees.push({
              id: `${key}:${j}`,
              random: r,
              x: terrain.river.center + section.x + section.nx * offset * side + section.ny * along,
              z: terrain.river.center + section.y + section.ny * offset * side - section.nx * along,
            });
          }
        }
  for (const tree of trees) {
    if (
      trees.some(
        (other) =>
          other !== tree &&
          other.random(9) > tree.random(9) &&
          Math.hypot(other.x - tree.x, other.z - tree.z) < 64,
      )
    )
      continue;
    const { cover } = habitat(tree.x, tree.z);
    const kind: SceneProp =
      cover.shore > 0.05 && cover.moisture > 0.6
        ? 'willow'
        : vegetation === 'woodland'
          ? tree.random(5) > 0.5
            ? 'larch'
            : 'pine'
          : vegetation === 'alpine'
            ? 'pine'
            : 'larch';
    add(tree, kind, 100 + tree.random(6) * 65, true);
    if (tree.random(7) > 0.65)
      add(
        { ...tree, x: tree.x + 27, z: tree.z + 20, id: `${tree.id}:branch` },
        'branch',
        45 + tree.random(8) * 22,
      );
  }
  parents(192, 110, (parent) => {
    const { cover, height } = habitat(parent.x, parent.z);
    const rocky = cover.cliffFoot > 0.3;
    const patch = cover.patch > 0.4 && cover.patch < 0.73;
    if (!(rocky || patch) || terrain.snowAt(height, 1) > 0.65) return;
    for (let i = 0; i < (rocky ? 4 : 3); i++) {
      const id = `${parent.id}:litter:${i}`,
        random = randomFor(id),
        angle = random(1) * Math.PI * 2,
        radius = random(2) * 55;
      const c = {
        id,
        random,
        x: parent.x + Math.cos(angle) * radius,
        z: parent.z + Math.sin(angle) * radius,
      };
      const local = habitat(c.x, c.z).cover;
      if (rocky) {
        add(c, i === 0 && random(5) > 0.3 ? 'boulders' : 'pebbles', 24 + random(6) * 44);
        continue;
      }
      const kind: SceneProp =
        vegetation === 'desert'
          ? random(5) > 0.78
            ? 'scrub'
            : 'dry-grass'
          : local.moisture > 0.52
            ? random(5) > 0.79
              ? 'flowers'
              : 'grass'
            : random(5) > 0.85
              ? 'scrub'
              : 'dry-grass';
      add(c, kind, kind === 'scrub' ? 38 + random(6) * 20 : 20 + random(6) * 22);
    }
    if (cover.exposure > 0.25 && parent.random(14) > 0.95)
      add({ ...parent, id: `${parent.id}:outcrop` }, 'crag', 85 + parent.random(15) * 45);
  });
  if (terrain.river)
    for (const [channelIndex, channel] of terrain.river.channels.entries())
      for (let i = 0; i < channel.sections.length; i += 12)
        for (const side of [-1, 1]) {
          const p = channel.sections[i]!,
            key = `bank:${channelIndex}:${i}:${side}`,
            parentRandom = randomFor(key);
          if (parentRandom(1) < 0.35) continue;
          for (let j = 0; j < 2 + Math.floor(parentRandom(2) * 3); j++) {
            const id = `${key}:${j}`,
              random = randomFor(id),
              bank = (side < 0 ? p.left : p.right) + 10 + random(3) * 35,
              along = (random(6) - 0.5) * 90;
            const c = {
              id,
              random,
              x: terrain.river.center + p.x + p.nx * bank * side + p.ny * along,
              z: terrain.river.center + p.y + p.ny * bank * side - p.nx * along,
            };
            add(
              c,
              random(4) > 0.38 && vegetation !== 'desert' ? 'reeds' : 'pebbles',
              27 + random(5) * 21,
            );
          }
        }

  return result.sort((a, b) => a.id.localeCompare(b.id)).map((item) => item.prop);
}
