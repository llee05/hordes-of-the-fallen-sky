import type { EnemyDefinition, LocationId } from '../game/types';
import { AREA_ENCOUNTERS } from '../game/data/areaEncounters';
import { AREA_ENEMIES, ENEMIES } from '../game/data/enemies';
import { enemyIllustration } from './artwork';
import { escapeHtml } from './progressionTree';

export function enemyTacticText(enemy: EnemyDefinition): string {
  const role = enemy.tacticalRole;
  let text =
    role === 'pack'
      ? 'Flanks, then closes in. Keep room around your horse.'
      : role === 'bulwark'
        ? 'Armoured until pinned. Charged pinning arrows open its guard.'
        : role === 'skirmisher'
          ? `Hangs back and looses ${enemy.volley?.shots ?? 2} shots in turn.`
          : enemy.behavior === 'charger'
            ? 'Marks its charge first. Sidestep, then strike while it recovers.'
            : `Plants itself and looses ${enemy.volley?.shots ?? 1} shots in turn.`;
  if (enemy.concealed) text += ' Hides in cover until you ride close.';
  if (enemy.ability) {
    const abilities = {
      frost: 'Marks circles of frost that leave slowing ice.',
      mire: 'Marks lingering silt that slows riders.',
      rockfall: 'Calls down marked stone.',
      crosswind: 'Marks a cutting gust.',
      cinder: 'Calls cinders that scorch the ground a moment.',
      rift: 'Marks a rift strike.',
    };
    text += ` ${abilities[enemy.ability.kind]} Defeat or pin it before it casts.`;
  }
  return text;
}
/** A read-only view of encounter content, shared by destination previews and the chronicle. */
export function areaIntel(id: LocationId): string {
  const area = AREA_ENCOUNTERS[id];
  const locals = area.natives.map((key) => AREA_ENEMIES.find((e) => e.id === key)!);
  return `<section class="area-intel" data-area-intel="${id}" aria-label="Local threats"><p class="eyebrow">LOCAL THREATS</p><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.rule)} <strong>${escapeHtml(area.counter)}</strong></p><div class="local-enemy-grid">${locals.map((e) => `<article class="local-enemy"><span class="enemy-portrait">${enemyIllustration(e.texture)}</span><div><h5>${escapeHtml(e.title ?? e.id)}</h5><p>${escapeHtml(enemyTacticText(e))}</p>${e.localUnlockAt ? `<small>Arrives after ${e.localUnlockAt} active seconds.</small>` : ''}</div></article>`).join('')}</div><p class="shared-enemies"><strong>Shared unreturned:</strong> ${ENEMIES.map((e) => escapeHtml(e.title ?? e.id)).join(', ')}. Any of these may turn up anywhere as the journey goes on.</p></section>`;
}
