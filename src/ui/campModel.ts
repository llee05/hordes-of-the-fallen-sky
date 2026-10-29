import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { escapeHtml, type TreeViewState } from './progressionTree';
import { campSceneLandscape, nomadicBuildingMenu } from './nomadicCampModel';

function plaque(mark: string, name: string, detail: string, context = ''): string {
  return `<span class="camp-plaque"><span class="camp-plaque-badge">${clanMark(mark)}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}${context ? `<span class="sr-only"> ${escapeHtml(context)}</span>` : ''}</small></span>`;
}

export function buildingMenu(run: RunState, view: TreeViewState, _selected = ''): string {
  return nomadicBuildingMenu(run, view, { landscape: campSceneLandscape, plaque });
}
