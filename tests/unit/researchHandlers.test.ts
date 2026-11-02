import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RESEARCH_BY_ID } from '../../src/game/data/research';
import { RESEARCH_EXPANSIONS } from '../../src/game/data/researchCatalogue';
import { RESEARCH_HANDLERS } from '../../src/game/data/researchHandlers';
import { RESEARCH_BLOCKERS } from '../../src/game/data/researchIntegration';

const handlers = new Set<string>(RESEARCH_HANDLERS);

/** Gameplay sources outside the content tables, which list every ID by definition. */
function gameplaySources(): string[] {
  const root = fileURLToPath(new URL('../../src/game/', import.meta.url));
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts') && !file.replaceAll('\\', '/').startsWith('data/'))
    .map((file) => readFileSync(root + file, 'utf8'));
}

describe('research handler table', () => {
  it('lists each handler once, and only for a registered expansion', () => {
    expect(handlers.size).toBe(RESEARCH_HANDLERS.length);
    const expansions = new Set(RESEARCH_EXPANSIONS.map((t) => t.id));
    expect(RESEARCH_HANDLERS.filter((id) => !expansions.has(id))).toEqual([]);
  });

  it('makes every expansion either a working handler or unavailable, never both', () => {
    for (const { id } of RESEARCH_EXPANSIONS) {
      const t = RESEARCH_BY_ID.get(id)!;
      const runtime = t.effects.some((e) => e.kind === 'runtime' && e.handler === id);
      expect({ id, runtime, unavailable: Boolean(t.unavailableReason) }).toEqual({
        id,
        runtime: handlers.has(id),
        unavailable: !handlers.has(id),
      });
    }
  });

  it('keeps no blocker for an implemented handler', () => {
    expect(Object.keys(RESEARCH_BLOCKERS).filter((id) => handlers.has(id))).toEqual([]);
  });

  it('references every handler ID in gameplay code', () => {
    const sources = gameplaySources();
    expect(RESEARCH_HANDLERS.filter((id) => !sources.some((s) => s.includes(`'${id}'`)))).toEqual(
      [],
    );
  });
});
