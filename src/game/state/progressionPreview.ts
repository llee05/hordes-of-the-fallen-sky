import { GAME } from '../config';
import type { BuildingId, RunState, UpgradeDefinition } from '../types';
import { applyResearch } from './run';
import { RESEARCH_BY_ID } from '../data/research';
import { clanDamageMultiplier, hasDevelopment, riderCount, burningTempest } from './clan';
import { economyForecast, migrationMobility, pastureDepletion } from './economy';
import { gallopCooldown } from './patrons';
import { developmentPreview } from './developmentPreview';

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
  return [
    { label: 'Clan population', value: r.clan.population },
    { label: 'Herd', value: r.clan.herd },
    { label: 'Food now', value: r.clan.food },
    { label: 'Clan resolve now', value: r.clan.integrity },
    { label: 'Shared attack damage', value: r.stats.damage },
    {
      label: 'Damage above half momentum',
      value: r.stats.damage * r.patrons.hunt.movingDamage,
      context: 'Before enemy-specific or formation bonuses',
    },
    {
      label: 'Damage vs wounded enemies',
      value: r.stats.damage * r.patrons.hunt.executeDamage,
      context: 'Enemy below half health; before momentum and formation bonuses',
    },
    {
      label: 'Khan targeting range',
      value: GAME.projectile.range + r.patrons.bow.range + c.bonuses.range + r.clan.momentum * 120,
      unit: ' paces',
      context: 'Includes the current momentum targeting bonus',
    },
    {
      label: 'Host firing interval',
      value: r.stats.attackInterval * c.multipliers.hostInterval,
      unit: 's',
      lower: true,
      context: 'Before Feigned retreat’s momentum condition',
    },
    { label: 'Khan arrows per volley', value: r.stats.projectiles + (burningTempest(r) ? 2 : 0) },
    { label: 'Additional arrow pierces', value: r.patrons.bow.pierce },
    {
      label: 'Volley spacing',
      value: (0.12 * r.patrons.bow.spread * 180) / Math.PI,
      unit: '°',
      context: 'Ordinary multi-arrow volleys; Tempest uses its own wider fan',
    },
    { label: 'Riding speed', value: r.stats.speed, unit: ' paces/s' },
    { label: 'Gallop cooldown', value: gallopCooldown(r), unit: 's', lower: true },
    { label: 'Maximum Khan health', value: r.stats.maxHealth },
    { label: 'Khan health now', value: r.health },
    { label: 'Khan damage reduction', value: (1 - r.patrons.hearth.damageTaken) * 100, unit: '%' },
    {
      label: 'Khan recovery',
      value: r.patrons.hearth.regeneration + c.bonuses.commanderRecovery,
      unit: '/s',
      context: 'Only while the Khan is alive',
    },
    { label: 'Last Ember charges', value: r.patrons.hearth.revives },
    {
      label: 'Health per moving kill',
      value: r.patrons.hunt.killHeal,
      context: 'Above half momentum',
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
        r.patrons.banner.damage *
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
      value: r.patrons.ancestors.spiritGain * c.multipliers.spiritGain * 100,
      unit: '%',
    },
    { label: 'Shard attraction', value: r.stats.pickupRadius, unit: ' paces' },
    {
      label: 'Ancestral echoes',
      value: Math.min(GAME.patrons.ancestors.maximum, r.patrons.ancestors.count),
    },
    {
      label: 'Echo arrow damage',
      value: r.patrons.ancestors.count ? r.stats.damage * r.patrons.ancestors.damage : 0,
      context: 'Before momentum, execution, and formation bonuses',
    },
    { label: 'Echo firing interval', value: r.patrons.ancestors.interval, unit: 's', lower: true },
    { label: 'Enemy slow in fields', value: Math.min(0.8, r.patrons.water.slow) * 100, unit: '%' },
    { label: 'Slowing field radius', value: r.patrons.water.radius, unit: ' paces' },
    { label: 'Extra eruption warning', value: r.patrons.water.warning, unit: 's' },
    {
      label: 'Eruption damage reduction',
      value: (1 - r.patrons.water.hazardDamage) * 100,
      unit: '%',
    },
    { label: 'Water pulse damage', value: r.patrons.water.pulseDamage * r.stats.damage },
    { label: 'Camp ward damage', value: r.patrons.guardian.wardDamage * r.stats.damage },
    { label: 'Wagon damage multiplier', value: c.multipliers.wagonDamage, unit: '×' },
    {
      label: 'Wagon firing interval',
      value: 0.9 * r.patrons.guardian.wagonInterval,
      unit: 's',
      lower: true,
    },
    {
      label: 'Camp material price multiplier',
      value: r.patrons.guardian.cost * 100,
      unit: '%',
      lower: true,
      context: 'Each actual price is rounded up',
    },
    { label: 'Food on arrival', value: c.bonuses.arrivalFood },
    { label: 'Materials on arrival', value: c.bonuses.arrivalMaterials },
    { label: 'Resolve on arrival', value: c.bonuses.arrivalResolve },
    {
      label: 'Health on arrival',
      value: c.bonuses.arrivalHealth,
      context: 'Only while the Khan is alive',
    },
    { label: 'Resolve per kill', value: r.patrons.banner.resolveOnKill },
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
/** Run the same validated purchase on a disposable copy; no mutation or timer advancement. */
export function researchPreview(run: RunState, upgrade: UpgradeDefinition): StatChange[] {
  return researchPreviewById(run, upgrade.id);
}
export function researchPreviewById(run: RunState, id: string): StatChange[] {
  const definition = RESEARCH_BY_ID.get(id);
  if (!definition) return [];
  const copy = structuredClone(run);
  // This is a clearly hypothetical stat comparison, not purchase permission.
  // Only the knowledge shortage is waived; every other gate remains authoritative.
  copy.pendingUpgrades = Math.max(
    definition.pointCostPerRank[run.upgrades[id] ?? 0] ?? 0,
    copy.pendingUpgrades,
  );
  return applyResearch(copy, id) ? progressionChanges(run, copy) : [];
}
export function campStatPreview(run: RunState, id: BuildingId, path?: string): StatChange[] {
  const preview = developmentPreview(run, id, path);
  return preview ? progressionChanges(run, preview.projected) : [];
}
