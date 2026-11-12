import { classDefinition, khanBasicRange } from '../data/classes';
import { SUCCESSORS } from '../data/successors';
import type { BuildingId, RunState } from '../types';
import { gallopCooldown, wagonDefence } from './campCombat';
import { clanDamageMultiplier, hasDevelopment, riderCount } from './clan';
import { developmentPreview } from './developmentPreview';
import { economyForecast, migrationMobility, pastureDepletion } from './economy';
import { khanVolleyFactors } from './volley';

export interface StatChange {
  label: string;
  before: string;
  after: string;
  improves: boolean;
  context?: string;
}
interface Metric {
  label: string;
  value: number;
  unit?: string;
  lower?: boolean;
  context?: string;
}
const n = (value: number) => Number(value.toFixed(3)).toString();
function metrics(r: RunState): Metric[] {
  const rates = economyForecast(r),
    c = r.clan.campEffects;
  const cls = classDefinition(r.character?.classId);
  const basicProjectiles =
    cls.basicAttack.projectiles + Math.max(0, r.stats.projectiles - cls.stats.projectiles);
  const basicVolley =
    cls.basicAttack.shape === 'projectile' ? khanVolleyFactors(r, basicProjectiles) : undefined;
  return [
    { label: 'Clan population', value: r.clan.population },
    { label: 'Herd', value: r.clan.herd },
    { label: 'Food now', value: r.clan.food },
    { label: 'Clan resolve now', value: r.clan.integrity },
    { label: 'Shared attack damage', value: r.stats.damage },
    {
      label: 'Khan basic attack range',
      value: khanBasicRange(r),
      unit: ' paces',
      context: `${cls.basicAttack.name}; aimed manually`,
    },
    {
      label: 'Host firing interval',
      value: r.stats.attackInterval * c.multipliers.hostInterval,
      unit: 's',
      lower: true,
      context: 'Manual basic attack; class abilities have separate cooldowns',
    },
    {
      label: 'Khan basic attack projectiles',
      value: basicVolley?.count ?? 1,
    },
    {
      label: 'Khan basic attack spread',
      value: basicVolley ? (basicVolley.spacing * 180) / Math.PI : 0,
      unit: '°',
    },
    {
      label: 'Khan basic attack damage',
      value:
        r.stats.damage *
        cls.basicAttack.damage *
        (cls.basicAttack.shape === 'projectile'
          ? 1
          : 1 + Math.max(0, r.stats.projectiles - cls.stats.projectiles) * 0.3),
      context: 'Before enemy armour and hit-specific effects',
    },
    { label: 'Additional arrow pierces', value: r.stats.pierce },
    { label: 'Riding speed', value: r.stats.speed, unit: ' paces/s' },
    { label: 'Gallop cooldown', value: gallopCooldown(r), unit: 's', lower: true },
    { label: 'Maximum Khan health', value: r.stats.maxHealth },
    { label: 'Khan health now', value: r.health },
    {
      label: 'Khan damage reduction',
      value: (1 - (r.khan.trait ? SUCCESSORS[r.khan.trait].protection : 1)) * 100,
      unit: '%',
    },
    {
      label: 'Khan recovery',
      value: c.bonuses.commanderRecovery,
      unit: '/s',
      context: 'Only while the Khan is alive',
    },
    {
      label: 'Clan damage reduction',
      value: (1 - clanDamageMultiplier(r)) * 100,
      unit: '%',
      context: `Includes current ${r.clan.formation} formation and learned camp protection`,
    },
    { label: 'Accompanying riders', value: riderCount(r) },
    {
      label: 'Rider arrow damage',
      value:
        r.stats.damage *
        (0.6 + (hasDevelopment(r, 'archery', 'veteran-riders') ? 0.3 : 0)) *
        c.multipliers.riderDamage,
    },
    {
      label: 'Migration mobility',
      value: migrationMobility(r) * 100,
      unit: '%',
      context: 'Includes current herd, location, and camp developments',
    },
    { label: 'Food net', value: rates.foodNet, unit: '/s' },
    { label: 'Material gathering', value: rates.materials, unit: '/s' },
    { label: 'Pasture depletion', value: pastureDepletion(r), unit: ' pp/s', lower: true },
    {
      label: 'Spirit gained from kills',
      value: c.multipliers.spiritGain * 100,
      unit: '%',
    },
    { label: 'Shard attraction', value: r.stats.pickupRadius, unit: ' paces' },
    {
      label: 'Wagon defence arrow damage',
      value: wagonDefence(r).active ? r.stats.damage * wagonDefence(r).damage : 0,
      context: 'Includes current camp modifiers',
    },
    { label: 'Wagon damage multiplier', value: c.multipliers.wagonDamage, unit: '×' },
    {
      label: 'Wagon firing interval',
      value: 0.9,
      unit: 's',
      lower: true,
    },
    { label: 'Food on arrival', value: c.bonuses.arrivalFood },
    { label: 'Materials on arrival', value: c.bonuses.arrivalMaterials },
    { label: 'Resolve on arrival', value: c.bonuses.arrivalResolve },
    {
      label: 'Health on arrival',
      value: c.bonuses.arrivalHealth,
      context: 'Only while the Khan is alive',
    },
    { label: 'Resolve per kill', value: 0 },
  ];
}
export function progressionChanges(before: RunState, after: RunState): StatChange[] {
  const previous = metrics(before);
  return metrics(after).flatMap((metric, i) => {
    const a = previous[i]!;
    if (Math.abs(metric.value - a.value) < 0.000001) return [];
    return [
      {
        label: metric.label,
        before: n(a.value) + (a.unit ?? ''),
        after: n(metric.value) + (metric.unit ?? ''),
        improves: metric.lower ? metric.value < a.value : metric.value > a.value,
        context: metric.context,
      },
    ];
  });
}
export function campStatPreview(run: RunState, id: BuildingId, path?: string): StatChange[] {
  const preview = developmentPreview(run, id, path);
  return preview ? progressionChanges(run, preview.projected) : [];
}
