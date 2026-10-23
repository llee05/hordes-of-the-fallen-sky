import { ROUTES, type MigrationLocation } from '../game/data/clan';
import type { RunState } from '../game/types';
import { arrivalLocation, availableDestinations, currentLocation } from '../game/state/journey';
import { crossingForecast } from '../game/state/economy';
import { formatTime } from '../game/state/run';
import { routeIllustration } from './artwork';
import { heading, footer } from './panelContent';
import { escapeHtml } from './progressionTree';

export function destinationEffects(location: MigrationLocation): string {
  const labels = {
    food: 'Camp food',
    materials: 'Material gathering',
    mobility: 'Onward caravan speed',
    crossing: 'Approach time',
  };
  const changes = (Object.keys(labels) as (keyof typeof labels)[]).flatMap((key) => {
    const change = Math.round((location.balance[key] - 1) * 100);
    return change ? [`${labels[key]} ${change > 0 ? '+' : '−'}${Math.abs(change)}%`] : [];
  });
  return changes.join(' · ') || 'Standard gathering and travel';
}

export function routeMenu(run: RunState, selectedId: string = arrivalLocation(run).id): string {
  const destinations = availableDestinations(run);
  const destination =
    destinations.find((location) => location.id === selectedId) ?? destinations[0];
  if (!destination)
    return `<section class="game-panel route-dialog">${heading('THE ROAD AHEAD', 'No departure available.')}<div class="panel-body"><p>Return to your clan to continue the journey.</p></div>${footer()}</section>`;
  return `<section class="game-panel route-dialog">${heading(`CROSSING ${run.clan.region + 1} OF 3 / THE ROAD AHEAD`, 'Where the grass still grows.', true, 'banner')}<div class="panel-body migration-scroll">
    <section class="destination-picker" aria-label="Migration destinations"><h3>1. Choose your next camp</h3><p class="forecast-note">${destinations.length === 1 ? 'The final crossing leads to the Heart of the Steppe, the clan’s fictional refuge.' : 'Choose a familiar road or a new landscape. Named camps already visited are left behind.'}</p><div class="destination-grid">${destinations.map((location) => `<button class="destination-card" data-destination="${location.id}" data-focus-key="destination-${location.id}" aria-pressed="${location.id === destination.id}" aria-controls="destination-detail"><strong>${escapeHtml(location.name)}</strong><span>${escapeHtml(location.area)}</span></button>`).join('')}</div></section>
    <section class="destination-detail" id="destination-detail" aria-label="Selected destination"><p class="eyebrow">${escapeHtml(currentLocation(run).name)} → ${escapeHtml(destination.name)}</p><h3>${escapeHtml(destination.name)}</h3><p>${escapeHtml(destination.description)}</p>${destination.context ? `<p class="destination-context">${escapeHtml(destination.context)}</p>` : ''}<p class="destination-effects">${destinationEffects(destination)}</p></section>
    <section class="migration-approaches" aria-label="Routes to selected destination"><h3>2. Choose a route to ${escapeHtml(destination.name)}</h3><p class="forecast-note">Travel estimates use your current households, horses, and improvements. Losses can change them. Arrival supplies come after the crossing.</p><div class="upgrade-cards">${ROUTES.map(
      (route) => {
        const forecast = crossingForecast(run, route, destination);
        return `<button class="upgrade-card route-card" data-route="${route.id}" data-focus-key="route-${route.id}">${routeIllustration(route.id)}<span class="upgrade-subtitle">${route.subtitle}</span><h3>${route.title}</h3><p>${route.description}</p><span class="route-forecast"><span>Travel ~${formatTime(Math.ceil(forecast.duration))}</span><span>Food needed en route ~${forecast.foodNeeded.toFixed(1)}</span><span>Food after arrival ~${forecast.foodAfterArrival.toFixed(1)}</span>${forecast.shortfall > 0 ? `<strong class="forecast-shortfall">Food runs out before arrival · short ~${forecast.shortfall.toFixed(1)}</strong>` : '<span>Supplied for the crossing</span>'}</span><span class="card-bottom">PACK & DEPART <span>→</span></span></button>`;
      },
    ).join('')}</div></section>
  </div>${footer('Stay a little longer')}</section>`;
}
