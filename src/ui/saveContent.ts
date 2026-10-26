import { SAVE_SLOTS, type SaveSlot } from '../shared/expeditionSave';
import type { HudSnapshot } from '../game/types';
import { formatTime } from '../game/state/run';
import { escapeHtml as h } from './progressionTree';

export interface SaveConfirmation {
  action: 'save' | 'load' | 'delete';
  slot: SaveSlot;
}
export function saveMenu(snapshot: HudSnapshot, confirmation?: SaveConfirmation): string {
  const state = snapshot.saves!;
  const disabled = state.busy ? 'disabled' : '';
  const confirmationText = confirmation
    ? {
        save: 'Overwrite this slot? The old save stays behind as its backup.',
        load: 'Load this expedition? It replaces the one in play, and anything unsaved is lost.',
        delete: 'Delete this save and its backup? This can’t be undone.',
      }[confirmation.action]
    : '';
  return `<section class="save-menu"><header><p class="eyebrow">THE REMEMBERED ROAD</p><h2 id="overlay-title">Saved expeditions</h2><p>A save keeps the whole journey: Khan, people, research, camp and battlefield. A loaded game waits, paused, for you.</p></header>
    <p class="save-message" role="status">${h(state.message)}</p>
    ${confirmation ? `<div class="save-confirmation" role="group" aria-label="Confirm ${confirmation.action}"><p>${confirmationText}</p><button class="primary-button" data-save-confirm data-primary ${disabled}>Confirm ${confirmation.action === 'save' ? 'overwrite' : confirmation.action}</button><button class="secondary-button" data-save-cancel ${disabled}>Cancel</button></div>` : ''}
    <div class="save-slots">${SAVE_SLOTS.map((slot) => {
      const entry = state.entries.find((e) => e.slot === slot);
      const ready = entry?.status === 'ready' || entry?.status === 'recovered';
      const name = slot === 'auto' ? 'Autosave' : `Slot ${slot.slice(-1)}`;
      const summary = entry?.summary;
      const details = summary
        ? `${h(summary.location)} · ${formatTime(summary.elapsed)} · ${summary.population} people · Level ${summary.level}${summary.stage === 'migration' ? ' · On the road' : ''}`
        : entry?.status === 'incompatible'
          ? 'Made by an unsupported version'
          : entry?.status === 'damaged'
            ? 'Damaged, with no usable backup'
            : 'Empty slot';
      return `<article class="save-slot" data-save-slot="${slot}"><div><h3>${name}${entry?.status === 'recovered' ? ' · Recovered backup' : ''}</h3><p>${details}</p>${entry?.savedAt ? `<time datetime="${new Date(entry.savedAt).toISOString()}">${h(new Date(entry.savedAt).toLocaleString())}</time>` : ''}</div><nav aria-label="${name} actions">
        ${ready ? `<button class="secondary-button" data-save-action="load" data-slot="${slot}" data-focus-key="load-${slot}" ${disabled}>Load ${name}</button>` : ''}
        ${slot !== 'auto' && state.canSave ? `<button class="primary-button" data-save-action="save" data-slot="${slot}" data-focus-key="save-${slot}" ${disabled}>Save to ${name}</button>` : ''}
        ${entry ? `<button class="secondary-button" data-save-action="delete" data-slot="${slot}" data-focus-key="delete-${slot}" ${disabled}>Delete ${name}</button>` : ''}</nav></article>`;
    }).join(
      '',
    )}</div><footer><p>Autosaves every 30 seconds of play, when you pause, and before the desktop game closes. They never touch your own slots.${snapshot.developerRun ? ' Developer and cheat runs can’t overwrite ordinary saves.' : ''}</p><button class="secondary-button" data-action="back" ${disabled}>Back</button></footer></section>`;
}
