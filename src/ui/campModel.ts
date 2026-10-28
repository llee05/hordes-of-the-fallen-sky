import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { escapeHtml, type TreeViewState } from './progressionTree';
import { nomadicBuildingMenu } from './nomadicCampModel';

function plaque(mark: string, name: string, detail: string, context = ''): string {
  return `<span class="camp-plaque"><span class="camp-plaque-badge">${clanMark(mark)}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}${context ? `<span class="sr-only"> ${escapeHtml(context)}</span>` : ''}</small></span>`;
}

function mapLandscape(): string {
  return `<div class="camp-map-painting" aria-hidden="true"><img class="camp-panorama" src="${import.meta.env.BASE_URL}art/nomadic-camp-life.png" alt="" draggable="false"/></div>`;
}

export function buildingMenu(run: RunState, view: TreeViewState, _selected = ''): string {
  return nomadicBuildingMenu(run, view, { landscape: mapLandscape, plaque });
}
