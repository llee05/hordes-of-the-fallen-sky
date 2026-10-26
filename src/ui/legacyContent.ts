import { escapeHtml } from './progressionTree';
import { SUCCESSORS } from '../game/data/successors';
import { COMPANIONS } from '../game/data/story';
import { REGIONS } from '../game/data/clan';
import { locationById } from '../game/state/journey';
import { formatTime } from '../game/state/run';
import type { RunState } from '../game/types';

export function khanRecords(run: RunState): string {
  return `<section class="khan-records" aria-label="Those who carried the banner"><p class="eyebrow">THE TITLE TRAVELS WITH THE PEOPLE</p><h3>Those who carried the banner</h3>${run.khan.generation > run.legacy.khans.length ? `<p>Showing the most recent ${run.legacy.khans.length} of ${run.khan.generation} Khans.</p>` : ''}<ol>${run.legacy.khans
    .map((khan) => {
      const end = khan.fallenAt ?? run.elapsed;
      const kills = (khan.killsAtFall ?? run.kills) - khan.killsAtStart;
      const state =
        khan.fallenAt !== undefined
          ? `Fell in ${(khan.fallenLocationId && locationById(khan.fallenLocationId)?.name) || REGIONS[khan.fallenRegion!]!.name}`
          : run.legacy.outcome === 'won' || ['won', 'epilogue'].includes(run.phase)
            ? 'Carried the banner to refuge'
            : run.legacy.outcome === 'dead' || run.phase === 'dead'
              ? 'With the clan at the journey’s end'
              : 'Carries the banner';
      return `<li><strong>Khan ${khan.generation}${khan.trait ? ` · ${escapeHtml(SUCCESSORS[khan.trait].title)}` : ''}</strong><span>${escapeHtml(state)}</span><small>${escapeHtml(formatTime(khan.chosenAt))}–${escapeHtml(formatTime(end))} · ${escapeHtml(formatTime(end - khan.chosenAt))} in the saddle · ${Math.max(0, kills)} banished by the host</small><small>Chosen in ${escapeHtml((khan.locationId && locationById(khan.locationId)?.name) || REGIONS[khan.region]!.name)} with ${khan.people} ${khan.people === 1 ? 'person' : 'people'}</small></li>`;
    })
    .join('')}</ol></section>`;
}

export function clanMemories(run: RunState): string {
  if (!run.legacy.memories.length) return '';
  return `<section class="clan-memories" aria-label="Life beneath the banner"><h3>Life beneath the banner</h3><p>The latest ${run.legacy.memories.length} of ${run.legacy.totalMemories} moments from this expedition.</p>${run.legacy.memories.map((memory) => `<details class="clan-memory"><summary><span>${escapeHtml(memory.title)}</span><small>${escapeHtml(formatTime(memory.elapsed))} · ${memory.population} ${memory.population === 1 ? 'person' : 'people'}</small></summary><div class="story-memory-body"><p>${escapeHtml((memory.locationId && locationById(memory.locationId)?.name) || REGIONS[memory.region]!.name)} · ${escapeHtml(memory.detail)}</p>${memory.line ? `<blockquote><strong>${escapeHtml(COMPANIONS[memory.line.speaker].name)}</strong><br>${escapeHtml(memory.line.text)}</blockquote>` : ''}</div></details>`).join('')}</section>`;
}
