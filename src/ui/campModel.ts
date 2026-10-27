import type { RunState } from '../game/types';
import { campProp, campResident, clanMark } from './artwork';
import { escapeHtml, type TreeViewState } from './progressionTree';
import { nomadicBuildingMenu } from './nomadicCampModel';

function plaque(mark: string, name: string, detail: string): string {
  return `<span class="camp-plaque"><span class="camp-plaque-badge">${clanMark(mark)}</span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(detail)}</small></span>`;
}
function mapLandscape(): string {
  return `<div class="camp-map-painting" aria-hidden="true"><svg viewBox="0 0 1200 600" preserveAspectRatio="none"><g fill="none" stroke="#f1dfb2" stroke-width="26" opacity=".5"><path d="M-30 560C240 500 240 280 590 260S900 170 1230 80M590 260Q420 80 210 120M590 260Q740 430 1090 450M590 260Q520 440 620 630"/></g><g fill="#728366" opacity=".28"><path d="M0 65Q170-50 330 55L270 95 180 65 70 120 0 90ZM930 560Q1070 470 1200 520V600H900Z"/><path d="M1020 0Q1120 85 1200 35V0Z"/></g><g fill="none" stroke="#77794e" stroke-width="2" opacity=".3"><path d="m36 46 22-16 20 16m-37-3 16-10 17 10M1040 530q50-28 94-8m-75 20q38-20 68-6M70 360q25-14 50-2m-47 9q27-13 44-4"/></g></svg><span class="map-decoration map-households">${campProp('ger')}</span><span class="map-decoration map-households-small">${campProp('ger')}</span><span class="map-decoration map-road-cart">${campProp('cart')}</span><span class="map-decoration map-blue-banner">${campProp('banner')}</span><span class="map-decoration map-grazing-horse">${campResident('packhorse')}</span><span class="map-decoration map-second-horse">${campResident('packhorse')}</span><span class="map-decoration map-sheep">${campProp('sheep')}</span><span class="map-decoration map-stones">${campProp('rock')}</span></div>`;
}

export function buildingMenu(run: RunState, view: TreeViewState, _selected = ''): string {
  return nomadicBuildingMenu(run, view, { landscape: mapLandscape, plaque });
}
