import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RESEARCH, RESEARCH_BY_ID } from '../../src/game/data/research';
import { RESEARCH_EXPANSIONS } from '../../src/game/data/researchCatalogue';
import { RESEARCH_HANDLERS } from '../../src/game/data/researchHandlers';
import type { ResearchDefinition } from '../../src/game/data/researchTypes';

const doc = readFileSync(
  new URL('../../docs/patron-research-v2-status.md', import.meta.url),
  'utf8',
);
const rows = [...doc.matchAll(/^\| `([^`]+)` +\| (.+?) +\|$/gm)].map(([, id, status]) => ({
  id: id!,
  status: status!,
}));
const handlers = new Set<string>(RESEARCH_HANDLERS);

/** Purchasable now: available itself and through every AND and at least one ANY prerequisite. */
function reachable(t: ResearchDefinition): boolean {
  const ok = (id: string): boolean => reachable(RESEARCH_BY_ID.get(id)!);
  return (
    !t.unavailableReason &&
    t.requiresAll.every((r) => ok(r.id)) &&
    (t.requiresAny.length === 0 || t.requiresAny.some((r) => ok(r.id)))
  );
}
function unavailableAncestors(t: ResearchDefinition): string[] {
  const found = new Set<string>();
  const visit = (d: ResearchDefinition): void => {
    for (const r of [...d.requiresAll, ...d.requiresAny]) {
      const parent = RESEARCH_BY_ID.get(r.id)!;
      if (parent.unavailableReason) found.add(parent.id);
      visit(parent);
    }
  };
  visit(t);
  return [...found];
}

describe('research delivery status document', () => {
  it('has one row for every research expansion', () => {
    expect(rows.map((r) => r.id).sort()).toEqual(RESEARCH_EXPANSIONS.map((t) => t.id).sort());
  });

  it('marks a row Working exactly when its handler is wired and reachable', () => {
    for (const { id, status } of rows) {
      const t = RESEARCH_BY_ID.get(id)!;
      const state = !handlers.has(id) ? 'deferred' : reachable(t) ? 'working' : 'blocked';
      expect({ id, working: status.startsWith('**Working**') }).toEqual({
        id,
        working: state === 'working',
      });
      expect({ id, blocked: status.startsWith('effect wired; blocked by prerequisite') }).toEqual({
        id,
        blocked: state === 'blocked',
      });
      if (state === 'blocked')
        for (const ancestor of unavailableAncestors(t))
          expect(status, `${id} names ${ancestor}`).toContain(`\`${ancestor}\``);
    }
  });

  it('states header counts that match the registry', () => {
    const header = doc.split('\n\n')[1]!.replace(/\s+/g, ' ');
    const counts = header.match(
      /All (\d+) IDs are registered\. (\d+) technologies are working .*?; (\d+) remain unavailable: (\d+) have no runtime effect and (\d+) have wired effects blocked .*?\. (\d+) runtime effects are wired in total\./,
    );
    expect(counts, header).not.toBeNull();
    const working = RESEARCH.filter(reachable).length;
    const wired = RESEARCH.filter((t) => !t.unavailableReason).length;
    expect(counts!.slice(1).map(Number)).toEqual([
      RESEARCH.length,
      working,
      RESEARCH.length - working,
      RESEARCH.length - wired,
      wired - working,
      wired,
    ]);
  });
});
