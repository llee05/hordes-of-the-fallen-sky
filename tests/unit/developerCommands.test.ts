import { describe, expect, it } from 'vitest';
import { createDeveloperTools, executeDeveloperCommand } from '../../src/game/dev/commands';
import { createRun } from '../../src/game/state/run';
import { damageKhan } from '../../src/game/state/khan';

describe('developer console commands', () => {
  it('supports explicit invincibility settings, case-insensitive aliases, and toggling', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    expect(executeDeveloperCommand(tools, run, '  GoD ON  ', true).cheated).toBe(true);
    expect(tools.invincible).toBe(true);
    executeDeveloperCommand(tools, run, 'invincible on', true);
    expect(tools.invincible).toBe(true);
    expect(executeDeveloperCommand(tools, run, 'god off', true).cheated).toBe(false);
    expect(tools.invincible).toBe(false);
    executeDeveloperCommand(tools, run, 'invincible', true);
    expect(tools.invincible).toBe(true);
    executeDeveloperCommand(tools, run, 'god', true);
    expect(tools.invincible).toBe(false);
    expect(tools.log.at(-1)?.text).toBe('Khan invincibility OFF.');
  });

  it('rejects invalid or unavailable commands without changing gameplay or cheats', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    run.health = 30;
    const before = structuredClone(run);
    for (const command of [
      'invincible yes',
      'god on off',
      'heal 999',
      'status on',
      'help god',
      'window.alert(1)',
      'a'.repeat(201),
    ]) {
      expect(executeDeveloperCommand(tools, run, command, true).cheated).toBe(false);
      expect(tools.log.at(-1)?.kind).toBe('error');
    }
    executeDeveloperCommand(tools, run, 'invincible on', false);
    executeDeveloperCommand(tools, run, 'heal', false);
    expect(tools.invincible).toBe(false);
    expect(run).toEqual(before);
    expect(tools.history.every((line) => line.length <= 200)).toBe(true);
  });

  it('heals a living Khan without granting revivals or bypassing succession', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    run.phase = 'playing';
    run.health = 20;
    const revives = run.patrons.hearth.revives;
    expect(executeDeveloperCommand(tools, run, 'heal', true).cheated).toBe(true);
    expect(run.health).toBe(run.stats.maxHealth);
    expect(run.patrons.hearth.revives).toBe(revives);
    run.patrons.hearth.revives = 0;
    damageKhan(run, 100000);
    const fallen = structuredClone(run);
    expect(executeDeveloperCommand(tools, run, 'heal', true).cheated).toBe(false);
    expect(run).toEqual(fallen);
  });

  it('bounds output and history, preserves history on clear, and resets cleanly', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    for (let i = 0; i < 100; i++) executeDeveloperCommand(tools, run, `unknown-${i}`, true);
    expect(tools.log).toHaveLength(80);
    expect(tools.history).toHaveLength(40);
    executeDeveloperCommand(tools, run, 'status', true);
    executeDeveloperCommand(tools, run, 'status', true);
    expect(tools.history.filter((line) => line === 'status')).toHaveLength(1);
    executeDeveloperCommand(tools, run, 'clear', true);
    expect(tools.log).toEqual([]);
    expect(tools.history.at(-1)).toBe('clear');
    executeDeveloperCommand(tools, run, 'help', true);
    expect(tools.log.some((entry) => entry.text.includes('Alias: god'))).toBe(true);
    expect(createDeveloperTools()).toEqual({
      invincible: false,
      log: [],
      history: [],
      revision: 0,
      nextEntry: 0,
    });
  });
});
