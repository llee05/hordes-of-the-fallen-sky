import type { BuildingId, RunState } from '../game/types';
import { developmentPreview } from '../game/state/developmentPreview';
import { economyForecast, type EconomyForecast } from '../game/state/economy';
import { formatTime } from '../game/state/run';

export const FORECAST_NOTE =
  'Estimates follow the shifting pasture, your households and improvements. Battles and new purchases will move them.';

export function signedRate(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}/s`;
}

export function foodOutlook(run: RunState, forecast = economyForecast(run)): string {
  if (forecast.foodSeconds !== undefined)
    return forecast.foodSeconds <= 0
      ? 'Stores empty'
      : `Stores empty in ~${formatTime(Math.ceil(forecast.foodSeconds))}`;
  return run.clan.stage === 'migration'
    ? 'Food lasts to arrival'
    : run.clan.stage === 'final'
      ? 'Food lasts to passage'
      : 'Stores sustained';
}

export function economySummary(run: RunState): string {
  const forecast = economyForecast(run);
  return `<section class="economy-summary" aria-label="Camp economy"><h4>Provisions & gathering</h4><p>Food produced ${signedRate(forecast.foodProduction)} · Consumed ${forecast.foodConsumption.toFixed(2)}/s</p><p><strong>Food net ${signedRate(forecast.foodNet)}</strong> · Materials ${signedRate(forecast.materials)}</p><p>${foodOutlook(run, forecast)}</p><p class="forecast-note">${FORECAST_NOTE}</p></section>`;
}

export function developmentOutlook(
  run: RunState,
  id: BuildingId,
  path?: string,
): string | undefined {
  const preview = developmentPreview(run, id, path);
  if (!preview) return undefined;
  const { before, after, foodGift, crossingFood } = preview;
  const changes: string[] = [];
  const rateChange = (label: string, key: 'foodNet' | 'materials'): void => {
    if (Math.abs(before[key] - after[key]) > 0.000001)
      changes.push(`${label} ${signedRate(before[key])} → ${signedRate(after[key])}`);
  };
  if (foodGift) changes.push(`${foodGift > 0 ? '+' : ''}${foodGift} food now`);
  rateChange('Food net', 'foodNet');
  rateChange('Materials', 'materials');
  if (foodTimeChanged(before, after)) {
    const afterLabel =
      before.foodSeconds !== undefined &&
      before.foodSeconds > 0 &&
      after.foodSeconds !== undefined &&
      after.foodSeconds > 0
        ? `~${formatTime(Math.ceil(after.foodSeconds))}`
        : foodOutlook(run, after);
    changes.push(`${foodOutlook(run, before)} → ${afterLabel}`);
  }
  if (
    crossingFood &&
    crossingFood.before.some((food, index) => Math.abs(food - crossingFood.after[index]!) > 0.01)
  ) {
    const range = (food: number[]): string =>
      `~${Math.min(...food).toFixed(1)}–${Math.max(...food).toFixed(1)}`;
    changes.push(
      `Crossing food (route range) ${range(crossingFood.before)} → ${range(crossingFood.after)}`,
    );
  }
  return changes.length ? changes.join(' · ') : undefined;
}

function foodTimeChanged(before: EconomyForecast, after: EconomyForecast): boolean {
  if (before.foodSeconds === undefined || after.foodSeconds === undefined)
    return before.foodSeconds !== after.foodSeconds;
  return Math.abs(before.foodSeconds - after.foodSeconds) >= 1;
}
