import type { EnemyDefinition, LocationId } from '../game/types';
import { AREA_ENCOUNTERS } from '../game/data/areaEncounters';
import { AREA_ENEMIES, ENEMIES } from '../game/data/enemies';
import { enemyIllustration } from './artwork';
import { escapeHtml } from './progressionTree';

export function enemyTacticText(enemy: EnemyDefinition): string {
  const role = enemy.tacticalRole;
  let text =
    role === 'pack'
      ? 'Flanks before closing. Keep space around your horse.'
      : role === 'bulwark'
        ? 'Armoured while unpinned. Charged pinning arrows create an opening.'
        : role === 'skirmisher'
          ? `Keeps its distance and fires ${enemy.volley?.shots ?? 2} spaced shots.`
          : enemy.behavior === 'charger'
            ? 'Marks a committed charge. Dodge sideways and punish its recovery.'
            : `Holds a firing position and sends ${enemy.volley?.shots ?? 1} spaced shots.`;
  if (enemy.concealed) text += ' Blends into suitable cover; approach to reveal it.';
  if (enemy.ability) {
    const abilities = {
      frost: 'Marks freezing circles that leave slowing ice.',
      mire: 'Marks lingering silt that slows riders.',
      rockfall: 'Calls marked falling stone.',
      crosswind: 'Marks a cutting wind strike.',
      cinder: 'Calls cinders that briefly scorch the ground.',
      rift: 'Marks a rift strike.',
    };
    text += ` ${abilities[enemy.ability.kind]} Defeat or pin it before release.`;
  }
  return text;
}
/** A read-only view of encounter content, shared by destination previews and the chronicle. */
export function areaIntel(id: LocationId): string {
  const area = AREA_ENCOUNTERS[id];
  const locals = area.natives.map((key) => AREA_ENEMIES.find((e) => e.id === key)!);
  return `<section class="area-intel" data-area-intel="${id}" aria-label="Local threats"><p class="eyebrow">LOCAL THREATS</p><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.rule)} <strong>${escapeHtml(area.counter)}</strong></p><div class="local-enemy-grid">${locals.map((e) => `<article class="local-enemy"><span class="enemy-portrait">${enemyIllustration(e.texture)}</span><div><h5>${escapeHtml(e.title ?? e.id)}</h5><p>${escapeHtml(enemyTacticText(e))}</p>${e.localUnlockAt ? `<small>Appears after ${e.localUnlockAt} active seconds.</small>` : ''}</div></article>`).join('')}</div><p class="shared-enemies"><strong>Shared unreturned:</strong> ${ENEMIES.map((e) => escapeHtml(e.title ?? e.id)).join(', ')}. Familiar enemies can appear in every location as the expedition progresses.</p></section>`;
}
