import { RESEARCH_ICONS } from './researchIcons';
import propsSource from '/art/steppe-props.json?raw';
import actorsSource from '/art/steppe-actors.json?raw';
import clanSource from '/art/steppe-clan-motion.json?raw';
import scenerySource from '/art/steppe-scenery.json?raw';
import type { BuildingDefinition } from '../game/data/clan';
import { LANDSCAPES } from '../game/data/landscapes';
import { landscapeLandmarks } from '../game/assets/landscapeLayout';
import {
  riverChannels,
  riverOutline,
  riverPoint,
  type RiverPoint,
} from '../game/assets/riverGeometry';
import type { LocationId } from '../game/types';

// Public assets use root URLs in Vite. Bundle the metadata as text so both the
// browser preview and file-based desktop build share the same atlas definitions.
const props = JSON.parse(propsSource) as typeof import('../../public/art/steppe-props.json');
const actors = JSON.parse(actorsSource) as typeof import('../../public/art/steppe-actors.json');
const civilians = JSON.parse(
  clanSource,
) as typeof import('../../public/art/steppe-clan-motion.json');
const scenery = JSON.parse(scenerySource) as typeof import('../../public/art/steppe-scenery.json');

// Small brass-cut silhouettes stay legible at HUD scale. Decorative SVGs never add
// accessible names or focus targets to the buttons and labels that contain them.
const marks = {
  paw: '<path d="M14 32c0-10 6-16 10-16s10 6 10 16c0 8-7 1-10 1s-10 7-10-1Z" fill="currentColor" fill-opacity=".2"/><ellipse cx="9" cy="20" rx="3" ry="5"/><ellipse cx="19" cy="10" rx="3" ry="5"/><ellipse cx="29" cy="10" rx="3" ry="5"/><ellipse cx="39" cy="20" rx="3" ry="5"/>',
  road: '<path d="m9 43 10-20-2-18m22 38L29 23l2-18M24 38v-7m0-11v-6"/>',
  fang: '<path d="M10 8h28L28 27l-4 15-4-15L10 8Z" fill="currentColor" fill-opacity=".2"/><path d="m14 15 10 7 10-7"/>',
  drop: '<path d="M24 5C19 17 10 24 10 31a14 14 0 0 0 28 0C38 24 29 17 24 5Z" fill="currentColor" fill-opacity=".2"/><path d="M17 29c-2 5 1 8 5 9"/>',
  wind: '<path d="M5 17h29c12 0 8-15 1-10M5 24h19c13 0 9 17 1 11M5 31h7m20-7h11"/>',
  balance: '<path d="M24 6v35M14 41h20M7 15h34M12 15 5 29h14l-7-14Zm24 0-7 14h14l-7-14Z"/>',
  hand: '<path d="M13 40 7 26c-2-5 2-7 6-2l4 5V10c0-5 6-5 6 0v13-17c0-4 6-4 6 0v17-13c0-4 6-4 6 0v15-8c0-4 6-4 6 0v17l-7 8H17Z" fill="currentColor" fill-opacity=".15"/>',
  root: '<path d="M24 5v26m0-13L13 9m11 14L36 11M24 29l-8 7-9 2m17-9 8 7 9 2m-17-9v15m-8-8-3 8m19-8 3 8"/>',
  eye: '<path d="M4 24q20-26 40 0-20 26-40 0Z" fill="currentColor" fill-opacity=".15"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="2" fill="currentColor"/>',
  star: '<path d="m24 4 5 13 14 1-11 9 4 15-12-8-12 8 4-15-11-9 14-1Z" fill="currentColor" fill-opacity=".2"/>',
  quiver:
    '<path d="m12 19 22 4-5 20-20-4 3-20Zm5 1L21 5m3 17 5-17m2 19 8-15M17 9l4-4 1 6m3-3 4-3 2 6m3 1 5-3-1 6" fill="currentColor" fill-opacity=".15"/>',
  vessel:
    '<path d="M15 5h18v8l7 12v12q-16 12-32 0V25l7-12V5Zm0 8h18M8 28h32M17 35h14" fill="currentColor" fill-opacity=".15"/>',
  felt: '<path d="m7 15 27-7 7 25-27 8-7-26Zm7 26L6 36 3 23m10-2 21-6m-19 13 21-6m-19 13 21-6" fill="currentColor" fill-opacity=".15"/>',
  knot: '<path d="m24 5 10 10-10 10-10-10L24 5Zm0 18 10 10-10 10-10-10 10-10ZM5 24l10-10 10 10-10 10L5 24Zm18 0 10-10 10 10-10 10-10-10Z"/>',
  circle:
    '<circle cx="24" cy="24" r="17"/><path d="m17 9 7-5 7 5m8 8 5 7-5 7m-8 8-7 5-7-5M9 31l-5-7 5-7"/>',
  moon: '<path d="M31 5a19 19 0 1 0 12 27C24 39 13 16 31 5Z" fill="currentColor" fill-opacity=".2"/>',
  shield:
    '<path d="m7 9 17-5 17 5v16c0 8-9 15-17 19C16 40 7 33 7 25V9Z" fill="currentColor" fill-opacity=".15"/><path d="M24 10v27M13 19h22"/>',
  horn: '<path d="M8 35c20-3 21-15 25-29l10 7C30 29 29 40 10 42l-2-7Zm25-29 10 7M12 34l2 7" fill="currentColor" fill-opacity=".2"/>',
  sun: '<circle cx="24" cy="24" r="11"/><path d="M24 3v6m0 30v6M3 24h6m30 0h6M9 9l5 5m20 20 5 5M9 39l5-5m20-20 5-5"/>',
  storm:
    '<path d="M6 20c-5-11 9-18 16-10 8-14 25-2 18 10H6Zm18 3-7 12h9l-5 10 14-15H24l6-7" fill="currentColor" fill-opacity=".18"/>',
  hammer:
    '<path d="m9 7 24 3-1 10-24-3 1-10Zm10 12-4 24 8 1 4-24M5 7l-1 9m32-6 7 1-1 10-7-1" fill="currentColor" fill-opacity=".2"/>',
  snow: '<path d="M24 4v40M7 14l34 20M7 34l34-20M19 7l5 5 5-5m-10 34 5-5 5 5M7 20l7-1-1-7m22 24-1-7 7-1M7 28l7 1-1 7m22-24-1 7 7 1"/>',
  feather:
    '<path d="M10 42 35 8m-22 29C-3 18 19 5 38 5c2 25-5 39-25 32Zm0 0 2-16m5 5 1-13m5 7 1-11m-7 17h12m-6-6h10" fill="currentColor" fill-opacity=".15"/>',
  wolf: '<path d="m8 21 5-14 9 8 8-9 9 14-6 17-12 6-11-8-2-14Z" fill="currentColor" fill-opacity=".15"/><path d="m13 20 7 6-5 5m17-11-7 6 5 5m-15 0 7 5 8-5m-8-5v10m-4-14h.1m11 0h.1"/>',
  hearth:
    '<path d="M8 39h32M12 33h24m-20 6 8-6 8 6M24 5c4 9-5 9 1 17 2-3 4-4 5-7 10 11 5 19-6 19S8 25 15 15c0 7 5 8 4 1-1-5 1-8 5-11Z" fill="currentColor" fill-opacity=".16"/>',
  people:
    '<circle cx="24" cy="13" r="5"/><path d="M14 37v-9c0-6 4-9 10-9s10 3 10 9v9H14Z" fill="currentColor" fill-opacity=".2"/><path d="M8 34v-7c0-5 2-8 6-9m26 16v-7c0-5-2-8-6-9M18 8l6-4 6 4M18 28v9m12-9v9"/>',
  horse:
    '<path d="m33 7 2 7 6 5-3 6-7-2-3 7-12 1-5-7-5-1 3 10 6 3-3 7m13-10-2 10m8-17 5 8-2 9M15 15l7-4 7 5 4-9-8 2-5-3-5 9Z" fill="currentColor" fill-opacity=".18"/><path d="m10 23 7-3 12 1M36 18h.1M11 39l-4 4m20-5 4 5"/>',
  grain:
    '<path d="M24 42V9m0 12C12 21 11 13 12 9c9 1 12 7 12 12Zm0 9C11 30 9 23 10 19c9 0 14 5 14 11Zm0 7C12 37 8 31 9 27c9 0 15 5 15 10Zm0-16c12 0 13-8 12-12-9 1-12 7-12 12Zm0 9c13 0 15-7 14-11-9 0-14 5-14 11Zm0 7c12 0 16-6 15-10-9 0-15 5-15 10Z" fill="currentColor" fill-opacity=".16"/>',
  materials:
    '<path d="m8 15 23-8 9 5-23 9-9-6Zm0 0v8l9 6 23-9v-8M17 21v8M8 29l9 6 23-9m-32 3v7l9 6 23-9v-7M17 35v7" fill="currentColor" fill-opacity=".16"/>',
  spirit:
    '<path d="m24 4 5 14 14 6-14 6-5 14-5-14L5 24l14-6 5-14Z" fill="currentColor" fill-opacity=".2"/><path d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/><path d="m8 7 4 4m24 26 4 4M8 41l4-4m24-26 4-4"/>',
  ger: '<path d="m5 23 19-15 19 15v16H5V23Z" fill="currentColor" fill-opacity=".16"/><path d="M5 23h38M5 28h38M18 39V28h12v11M20 8V5h8v3M11 19l13-7 13 7M10 33h4m20 0h4"/>',
  bow: '<path d="M10 6c32 2 32 34 0 36l16-18L10 6Z" fill="currentColor" fill-opacity=".12"/><path d="M5 24h38m-6-5 6 5-6 5M5 20l4 4-4 4"/>',
  pierce:
    '<path d="M5 24h38m-7-7 7 7-7 7M18 7v11m0 12v11M29 7v11m0 12v11M3 19l5 5-5 5"/><path d="m14 12 4-5 4 5m3 24 4 5 4-5"/>',
  banner:
    '<path d="M12 43V7m0 4c9-9 18 7 27 0v20c-9 7-18-9-27 0" fill="currentColor" fill-opacity=".18"/><path d="m24 15 5 6-5 5-5-6 5-5ZM8 43h8M10 5h4"/>',
  journal:
    '<path d="M9 7h26l4 4v31H9V7Z" fill="currentColor" fill-opacity=".15"/><path d="M15 7v35M6 14h6m-6 9h6m-6 9h6m10-18 5 5-5 5-5-5 5-5ZM21 31h12m-12 5h8"/>',
  pause: '<path d="M15 10h5v28h-5zM28 10h5v28h-5z" fill="currentColor"/>',
  sanctuary:
    '<path d="M24 5v19m0-14 12 3-12 5M14 29l10-8 10 8H14ZM9 36l5-7h20l5 7H9ZM5 42l4-6h30l4 6H5Z" fill="currentColor" fill-opacity=".17"/><path d="m15 13-6 4 6 4m24-5-4 4 4 4"/>',
  wagon:
    '<path d="M8 31V19c0-8 6-12 15-12s16 4 16 12v12H8Z" fill="currentColor" fill-opacity=".18"/><path d="M8 25h31M16 9v16M30 9v16m9 6 6 4"/><circle cx="14" cy="36" r="6"/><circle cx="34" cy="36" r="6"/><path d="M14 30v12m-6-6h12m14-6v12m-6-6h12"/>',
  river:
    '<path d="M18 5c-12 10 19 10 8 20S8 36 18 43m10-38c-12 10 19 10 8 20S18 36 28 43M5 14l5-7 5 7H5Zm30 21 5-7 5 7H35Z" fill="currentColor" fill-opacity=".12"/>',
  mountain:
    '<path d="m4 39 15-27 9 16 6-10 11 21H4Z" fill="currentColor" fill-opacity=".16"/><path d="m13 23 6 3 5-5m5 7 5 3 4-5M30 7h8m-4-4v8"/>',
  healer:
    '<path d="M20 6h8v13h13v9H28v14h-8V28H7v-9h13V6Z" fill="currentColor" fill-opacity=".2"/><path d="m10 9 4 4m20 22 4 4M10 39l4-4M34 13l4-4"/>',
  volley:
    '<path d="M12 41V10m12 31V5m12 36V10M7 16l5-6 5 6m2-5 5-6 5 6m2 5 5-6 5 6M8 34l4 4 4-4m4 0 4 4 4-4m4 0 4 4 4-4"/>',
} as const;

export type ClanMark = keyof typeof marks;

export function clanMark(name: string): string {
  const icon = name.startsWith('research:') ? RESEARCH_ICONS[name.slice(9)] : undefined;
  const body = icon
    ? `<g transform="translate(1 1) scale(.75)">${marks[icon[0]]}</g><g transform="translate(25 25) scale(.46)">${marks[icon[1]]}</g>`
    : (marks[name as ClanMark] ?? marks.spirit);
  return `<svg class="clan-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const BUILDING_MARKS: Readonly<Record<string, ClanMark>> = {
  ger: 'ger',
  archery: 'bow',
  herd: 'horse',
  sanctuary: 'sanctuary',
  wagon: 'wagon',
  felt: 'materials',
  provisions: 'grain',
  relay: 'horse',
};

/** Crop the existing painted world art with its shared atlas metadata, without
 * creating duplicate raster assets or pulling simulation state into the UI. */
export function campIllustration(name: NonNullable<BuildingDefinition['illustration']>): string {
  const [atlas, frame] =
    name === 'archery'
      ? [actors, actors.frames.rider.frame]
      : [
          props,
          props.frames[
            name === 'herd'
              ? 'sheep'
              : name === 'sanctuary'
                ? 'pillar'
                : name === 'wagon'
                  ? 'cart'
                  : name
          ].frame,
        ];
  return atlasIllustration(atlas, frame);
}

/** Local enemy variants retain the existing painted archetype portrait. */
export function enemyIllustration(name: string): string {
  const frame = actors.frames[name as keyof typeof actors.frames]?.frame;
  return frame ? atlasIllustration(actors, frame) : '';
}

function atlasIllustration(
  atlas: { meta: { image: string; size: { w: number; h: number } } },
  frame: { x: number; y: number; w: number; h: number },
): string {
  const root = `${import.meta.env.BASE_URL}art/`;
  // Clip the atlas frame before the outer SVG fits it into its UI slot; clipping
  // only the outer viewport exposes adjacent subjects when it adds side margins.
  return `<svg class="camp-illustration" viewBox="0 0 ${frame.w} ${frame.h}" aria-hidden="true" focusable="false"><svg width="${frame.w}" height="${frame.h}" viewBox="${frame.x} ${frame.y} ${frame.w} ${frame.h}" overflow="hidden"><image href="${root}${atlas.meta.image}" width="${atlas.meta.size.w}" height="${atlas.meta.size.h}"/></svg></svg>`;
}

/** Static resting poses in the planning miniature; character clocks stay paused. */
export function campResident(name: 'worker' | 'packhorse'): string {
  return atlasIllustration(civilians, civilians.frames[`${name}-attack-0`].frame);
}

export function campProp(name: keyof typeof props.frames): string {
  return atlasIllustration(props, props.frames[name].frame);
}

/** The same painted landmarks let players recognize a destination before departing. */
export function destinationIllustration(id: LocationId): string {
  const landscape = LANDSCAPES[id];
  const color = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
  const root = `${import.meta.env.BASE_URL}art/`;
  const water = landscape.water;
  const waterPath = (points: readonly RiverPoint[]) =>
    points
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'}${(120 + point.x * 0.065).toFixed(1)},${(94 + point.y * 0.065).toFixed(1)}`,
      )
      .join(' ') + 'Z';
  const river = water
    ? `<g data-river-kind="${water.kind}">${riverChannels(water)
        .map((channel, index) => {
          const sections = channel.sections.filter(
            (_, i) => i % 6 === 0 || i === channel.sections.length - 1,
          );
          const ice =
            water.kind === 'frozen'
              ? sections
                  .filter((_, i) => i % 5 === 0)
                  .map((section, i) => {
                    const point = riverPoint(section, i % 2 ? -0.65 : 0.65);
                    const x = 120 + point.x * 0.065;
                    const y = 94 + point.y * 0.065;
                    return `<path d="M${x - 3},${y}l2,-1.2 4,.2 2,1.2 -4,1Z" fill="#e4e8d7" opacity=".85"/>`;
                  })
                  .join('')
              : '';
          return `<path d="${waterPath(riverOutline(sections, 1, 12))}" fill="${color(water.bank)}" opacity=".7"/><path data-river-channel="${index}" d="${waterPath(riverOutline(sections))}" fill="${color(water.color)}"/><path d="${waterPath(riverOutline(sections, 0.45, 0, 0.08))}" fill="#426f76" opacity=".2"/>${ice}`;
        })
        .join('')}</g>`
    : '';
  const landmarks = landscapeLandmarks(id)
    .map((item) => {
      const frame = scenery.frames[item.prop].frame;
      const width = item.width * 0.2;
      const height = Math.min(66, (width * frame.h) / frame.w);
      const x = 120 + item.x * 0.17 - width / 2;
      const y = 87 + item.y * 0.025 - height;
      return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${frame.x} ${frame.y} ${frame.w} ${frame.h}" overflow="hidden"><image href="${root}${scenery.meta.image}" width="${scenery.meta.size.w}" height="${scenery.meta.size.h}"/></svg>`;
    })
    .join('');
  return `<svg class="destination-illustration" data-landscape="${id}" viewBox="0 0 240 110" aria-hidden="true" focusable="false"><path d="M0 65Q55 45 120 64T240 58V110H0Z" fill="${color(landscape.ground)}"/><path d="M0 91Q80 72 151 92T240 83V110H0Z" fill="${color(landscape.patch)}" opacity=".5"/>${river}${landmarks}</svg>`;
}

export function routeIllustration(name: 'river' | 'ridge' | 'refuge'): string {
  const landscape = {
    river:
      '<path d="M0 60 50 42l35 9 55-20 60 20 40-10v55H0Z" fill="#b3b58b"/><path d="m0 76 52-18 36 12 38-12 55 13 59-14v39H0Z" fill="#828e72"/><path d="M144 34c-68 32 72 19-6 39L72 96h56l37-18c72-34-54-17-12-44Z" fill="#89b6b5"/><path class="route-current" d="M150 39c-33 17 47 20-4 34l-47 17" stroke="#dbd7b8" stroke-width="2" fill="none"/>',
    ridge:
      '<path d="m0 87 57-62 35 32L143 7l86 80Z" fill="#667c77"/><path d="m57 25 10 50 25-18-18-15Zm86-18 4 54 29-22-18-10Z" fill="#d2c8a8"/><path d="m143 7-38 66 42-12Zm33 32-29 22 45 8Z" fill="#415e64"/><path d="m0 85 60-14 55 14 73-17 52 15v13H0Z" fill="#a09d72"/>',
    refuge:
      '<path d="m0 77 46-22 40 12 53-23 45 13 56-11v50H0Z" fill="#a7ac7d"/><path d="m0 91 52-17 56 11 58-17 74 10v18H0Z" fill="#7c9077"/><path d="M89 77V15m47 53V7" stroke="#635c42" stroke-width="3"/><g class="route-flags"><path d="M91 17c15-10 19 10 37 0v25c-18 10-22-10-37 0Z" fill="#3b7c82"/><path d="M138 10c16-10 20 10 37 0v29c-17 10-21-10-37 0Z" fill="#a25b40"/><path d="m108 23 4 6-4 5-4-5Zm45-5 4 6-4 5-4-5Z" fill="#e4bf78"/></g>',
  };
  return `<svg class="route-illustration" viewBox="0 0 240 96" aria-hidden="true" focusable="false"><circle cx="188" cy="23" r="13" fill="#d4aa65" opacity=".65"/>${landscape[name]}<path d="M0 95h240" stroke="#9b7546" stroke-width="2"/></svg>`;
}
