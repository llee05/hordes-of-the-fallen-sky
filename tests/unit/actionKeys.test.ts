import { describe, expect, it } from 'vitest';
import { ActionKeys } from '../../src/game/systems/ActionKeys';

describe('one-shot keyboard actions', () => {
  it('consumes each native event once even when an interleaved queue is replayed', () => {
    const keys = new ActionKeys();
    const escape = { repeat: false };
    const journal = { repeat: false };
    expect(keys.consume(escape)).toBe(true);
    expect(keys.consume(journal)).toBe(true);
    expect(keys.consume(escape)).toBe(false);
    expect(keys.consume(journal)).toBe(false);
  });

  it('ignores held-key repeat without debouncing a distinct rapid press', () => {
    const keys = new ActionKeys();
    expect(keys.consume({ repeat: false })).toBe(true);
    expect(keys.consume({ repeat: true })).toBe(false);
    expect(keys.consume({ repeat: false })).toBe(true);
  });
});
