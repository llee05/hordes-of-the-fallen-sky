import { researchPreviewById } from '../game/state/progressionPreview';
import { synergyContent } from './synergyContent';
import { PATRONS } from '../game/data/patrons';
import { RESEARCH } from '../game/data/research';
import { UPGRADES } from '../game/data/upgrades';
import {
  researchExcluded,
  researchState,
  validateResearchPurchase,
  researchBuildingModifiers,
} from '../game/state/research';
import { planResearch } from '../game/state/researchPaths';
import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import {
  progressionMenu,
  escapeHtml,
  selectedNode,
  type TreeBranch,
  type TreeViewState,
} from './progressionTree';

export function researchBranches(run: RunState, view?: TreeViewState): TreeBranch[] {
  const groups = [
    ...PATRONS.map((p) => ({
      id: p.id,
      title: p.name,
      category: p.playstyle,
      description: p.description,
      symbol: p.symbol,
    })),
    {
      id: 'general',
      title: 'General research',
      category: 'Expedition',
      description:
        'Shared knowledge, unlocked by completed crossings. Proposed effects remain unavailable until their gameplay systems exist.',
      symbol: 'journal' as const,
    },
    {
      id: 'hybrids',
      title: 'Hybrid discoveries',
      category: 'Discoveries',
      description:
        'Early discoveries require two knowledge spent in each patron; advanced discoveries require five in each. Hybrid costs never fund patron tiers.',
      symbol: 'spirit' as const,
    },
  ];
  const state = researchState(run);
  const building = researchBuildingModifiers(run);
  const label = (key: string) => key.replace(/[A-Z]/g, (c) => ' ' + c.toLowerCase());
  const sources = [
    ...Object.entries(building.bonuses)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => ({ label: label(k), value: `+${v}` })),
    ...Object.entries(building.multipliers)
      .filter(([, v]) => v !== 1)
      .map(([k, v]) => ({ label: label(k), value: `${v}×` })),
  ];
  return groups.map((group) => {
    const technologies = RESEARCH.filter((t) =>
      group.id === 'general'
        ? t.tier === 'general'
        : group.id === 'hybrids'
          ? t.tier === 'hybrid'
          : t.patronIds.length === 1 && t.patronIds[0] === group.id,
    );
    const learned = technologies.reduce((sum, t) => sum + (run.upgrades[t.id] ?? 0), 0);
    const functional = technologies.filter((t) => !t.unavailableReason).length;
    const branch: TreeBranch = {
      id: group.id,
      title: group.title,
      category: group.category,
      description: group.description,
      illustration: clanMark(group.symbol),
      progress: `${learned} ranks learned · ${functional} implemented / ${technologies.length} technologies`,
      layout: 'tiers',
      nodes: technologies.map((t) => {
        const rank = run.upgrades[t.id] ?? 0;
        const validation = validateResearchPurchase(state, t.id, rank);
        const mastered = rank >= t.maxRank;
        const missing = validation.reasonCodes.some((c) => c !== 'knowledge' && c !== 'max-rank');
        const original = UPGRADES.find((u) => u.id === t.id);
        const requirements = [...t.requiresAll, ...t.requiresAny];
        const gates = [
          ...Object.entries(t.minSpendByPatron).map(
            ([p, min]) =>
              `${PATRONS.find((x) => x.id === p)?.name}: ${validation.spentByPatron[p as keyof typeof validation.spentByPatron]} / ${min} knowledge spent`,
          ),
          ...(t.minCompletedCrossings
            ? [`Crossings: ${state.completedCrossings} / ${t.minCompletedCrossings}`]
            : []),
          ...(t.requiresAny.length
            ? [
                `ANY: ${t.requiresAny.map((r) => `${RESEARCH.find((x) => x.id === r.id)?.title} rank ${r.rank}`).join(' or ')}`,
              ]
            : []),
        ];
        return {
          id: t.id,
          title: t.title,
          description:
            (t.unavailableReason ? 'Proposed effect — unavailable. ' : '') + t.description,
          status: mastered
            ? 'learned'
            : researchExcluded(state, t.id)
              ? 'excluded'
              : missing
                ? 'locked'
                : validation.missingKnowledge > 0
                  ? 'unaffordable'
                  : 'available',
          ranks: { current: rank, max: t.maxRank },
          icon: original?.icon ?? group.symbol,
          choiceGroup: t.exclusiveGroup,
          price: { knowledge: t.pointCostPerRank[rank] ?? t.pointCostPerRank[0]! },
          preview: researchPreviewById(run, t.id),
          prerequisites: requirements.map((r) => ({
            ...r,
            title: RESEARCH.find((x) => x.id === r.id)?.title ?? r.id,
            current: run.upgrades[r.id] ?? 0,
            any: t.requiresAny.some((x) => x.id === r.id),
          })),
          excludes: t.exclusiveGroup
            ? RESEARCH.filter((o) => o.id !== t.id && o.exclusiveGroup === t.exclusiveGroup).map(
                (o) => ({ id: o.id, title: o.title }),
              )
            : [],
          cost: mastered
            ? 'Mastered'
            : `${t.pointCostPerRank[rank]} knowledge point${t.pointCostPerRank[rank] === 1 ? '' : 's'}`,
          reason: mastered
            ? 'Learned'
            : validation.reasons.join(' · ') ||
              (view?.confirmResearch === t.id
                ? 'Confirm this irreversible choice. Alternatives in this group close for this expedition.'
                : `Learn rank ${rank + 1}`),
          progress: `${rank} / ${t.maxRank} ranks learned`,
          kind:
            t.tier === 'foundation'
              ? 'foundation'
              : t.tier === 'doctrine'
                ? 'capstone'
                : 'practice',
          tierLabel:
            t.tier === 'hybrid'
              ? `${t.pointCostPerRank[0] === 2 ? 'Early' : 'Advanced'} hybrid`
              : t.tier,
          requires: requirements
            .filter((r) => technologies.some((x) => x.id === r.id))
            .map((r) => r.id),
          requirementsLabel: gates.join(' · '),
          forecast: [`Tags: ${t.tags.join(', ')}`, ...gates].join(' · '),
          action: {
            research: t.id,
            rank: String(rank + 1),
            ...(t.exclusiveGroup ? { choice: t.exclusiveGroup } : {}),
          },
          modifierSources: sources,
          confirmChoice: view?.confirmResearch === t.id,
        };
      }),
    };
    const selected = selectedNode(branch, view?.node);
    // Search only the selected and pinned goals, never all 166 on each render.
    for (const node of branch.nodes.filter((n) => n.id === selected.id || n.id === view?.pinned)) {
      const path = planResearch(state, node.id);
      node.plannedRoute = {
        nodes: path.steps.map((s) => ({
          id: s.id,
          title: `${RESEARCH.find((t) => t.id === s.id)!.title} rank ${s.rank}`,
        })),
        price: { knowledge: path.cost },
        reasons: path.reasons,
      };
    }
    return branch;
  });
}

export function researchMenu(run: RunState, view: TreeViewState): string {
  const state = researchState(run);
  const bridges = `<section class="research-bridges" aria-label="Hybrid bridges"><h3>Discoveries between traditions</h3>${RESEARCH.filter(
    (t) => t.tier === 'hybrid',
  )
    .map((t) => {
      const v = validateResearchPurchase(state, t.id, run.upgrades[t.id] ?? 0);
      const owned = (run.upgrades[t.id] ?? 0) > 0;
      const near =
        !owned &&
        !t.unavailableReason &&
        v.missingRequirements.length <= 1 &&
        t.patronIds.every((p) => (t.minSpendByPatron[p] ?? 0) - v.spentByPatron[p] <= 1);
      return `<button data-tree-select="${escapeHtml(t.id)}" data-focus-key="bridge-${escapeHtml(t.id)}" data-near="${near}"><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.patronIds.map((p) => PATRONS.find((x) => x.id === p)!.name).join(' + '))} · ${t.pointCostPerRank[0] === 2 ? 'Early' : 'Advanced'}</small><span>${t.unavailableReason ? 'Proposed — unavailable' : owned ? 'Learned' : v.allowed ? 'Ready to learn' : near ? 'Near discovery' : 'Inspect requirements'}</span></button>`;
    })
    .join('')}</section>`;
  return progressionMenu({
    title: 'Patron tech tree',
    eyebrow: '8 PATRONS · GENERAL RESEARCH · HYBRID DISCOVERIES',
    mark: 'spirit',
    kind: 'patrons',
    allLabel: 'All patrons',
    view,
    introduction:
      'Knowledge belongs to this expedition. Choose one Doctrine and one Mythic per patron. T2/T3/T4/Mythic require 3/6/10/14 knowledge already spent with that patron. Proposed effects stay unavailable until their gameplay systems are implemented.',
    summary: [
      { label: 'Knowledge points', value: String(run.pendingUpgrades) },
      {
        label: 'Ranks learned',
        value: String(Object.values(run.upgrades).reduce((sum, r) => sum + r, 0)),
      },
      {
        label: 'Implemented technologies',
        value: String(RESEARCH.filter((t) => !t.unavailableReason).length),
      },
    ],
    branches: researchBranches(run, view),
    recipes: synergyContent(run),
    bridges,
    notice:
      'Previews combine technology and current building bonuses, labelled separately. Stored Spirit pays for camp construction. Knowledge belongs to this expedition; research resets on a new expedition.',
  });
}
