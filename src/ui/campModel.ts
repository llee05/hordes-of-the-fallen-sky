import type { RunState } from '../game/types';
import { campProp, campResident, clanMark } from './artwork';
import { escapeHtml, type TreeViewState } from './progressionTree';
import { nomadicBuildingMenu } from './nomadicCampModel';

function plaque(mark: string, name: string, detail: string): string {
  return `<span class="camp-plaque"><span class="camp-plaque-badge">${clanMark(mark)}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></span>`;
}
function mapLandscape(): string {
  return `<div class="camp-map-painting" aria-hidden="true"><img class="camp-panorama" src="${import.meta.env.BASE_URL}art/nomadic-camp-terrain.png" alt="" draggable="false"/><span class="map-decoration map-households">${campProp('ger')}</span><span class="map-decoration map-households-small">${campProp('ger')}</span><span class="map-decoration map-road-cart">${campProp('cart')}</span><span class="map-decoration map-blue-banner">${campProp('banner')}</span><span class="map-decoration map-grazing-horse">${campResident('packhorse')}</span><span class="map-decoration map-second-horse">${campResident('packhorse')}</span><span class="map-decoration map-sheep">${campProp('sheep')}</span><span class="map-decoration map-stones">${campProp('rock')}</span></div>`;
}

export function buildingMenu(run: RunState, view: TreeViewState, _selected = ''): string {
  return nomadicBuildingMenu(run, view, { landscape: mapLandscape, plaque });
}
