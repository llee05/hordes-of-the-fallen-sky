import { describe, expect, it } from 'vitest';
import { createDeveloperTools, executeDeveloperCommand } from '../../src/game/dev/commands';
import { createRun } from '../../src/game/state/run';
import { damageKhan } from '../../src/game/state/khan';
import type { DeveloperTerrainControls } from '../../src/game/dev/commands';

describe('developer console commands', () => {
  it('restores only bounded history, with fresh cheat flags and output', () => {
    const history = ['god on', 'clan-invincible on'];
    const tools = createDeveloperTools(history);
    history.push('heal');
    expect(tools.history).toEqual(['god on', 'clan-invincible on']);
    expect(tools.invincible).toBe(false);
    expect(tools.clanInvincible).toBe(false);
    expect(tools.log).toEqual([]);
    expect(
      createDeveloperTools(Array.from({ length: 50 }, (_, i) => `unknown-${i}`)).history,
    ).toHaveLength(40);
  });
  it('validates terrain tools and delegates without changing the run or cheat flags', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    const before = structuredClone(run);
    const terrain: DeveloperTerrainControls = {
      terrainOnly: false,
      angle: 65,
      debugMode: 'off',
      setTerrainOnly(value) {
        Object.assign(this, { terrainOnly: value });
      },
      setAngle(angle) {
        Object.assign(this, { angle });
      },
      setDebug(mode) {
        Object.assign(this, { debugMode: mode });
      },
      cycleDebug() {
        Object.assign(this, { debugMode: 'wireframe' });
      },
    };
    for (const command of [
      'terrain-only yes',
      'camera-angle NaN',
      'camera-angle 54',
      'camera-angle 81',
      'camera-angle 65 80',
      'terrain-debug banana',
    ]) {
      executeDeveloperCommand(tools, run, command, true, terrain);
      expect(tools.log.at(-1)?.kind).toBe('error');
    }
    executeDeveloperCommand(tools, run, 'terrain-debug normals', true, terrain);
    expect(terrain.debugMode).toBe('normals');
    executeDeveloperCommand(tools, run, 'camera-angle 55', true, terrain);
    expect(terrain.angle).toBe(55);
    executeDeveloperCommand(tools, run, 'terrain-only', true, terrain);
    expect(terrain.terrainOnly).toBe(true);
    executeDeveloperCommand(tools, run, 'terrain-only off', true, terrain);
    expect(terrain.terrainOnly).toBe(false);
    executeDeveloperCommand(tools, run, 'terrain-debug', true);
    expect(tools.log.at(-1)?.kind).toBe('error');
    expect(run).toEqual(before);
    expect(tools.invincible).toBe(false);
  });
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
      'clan-invincible yes',
      'clan-invincible on off',
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
    executeDeveloperCommand(tools, run, 'clan-invincible on', false);
    executeDeveloperCommand(tools, run, 'heal', false);
    expect(tools.invincible).toBe(false);
    expect(tools.clanInvincible).toBe(false);
    expect(run).toEqual(before);
    expect(tools.history.every((line) => line.length <= 200)).toBe(true);
  });

  it('toggles clan protection independently without replenishing resolve, people, or supplies', () => {
    const tools = createDeveloperTools();
    const run = createRun();
    run.clan.integrity = 25;
    const before = structuredClone(run);
    expect(executeDeveloperCommand(tools, run, 'clan-invincible on', true).cheated).toBe(true);
    expect(tools.clanInvincible).toBe(true);
    expect(tools.invincible).toBe(false);
    expect(run).toEqual(before);
    executeDeveloperCommand(tools, run, 'god on', true);
    executeDeveloperCommand(tools, run, 'clan-invincible off', true);
    expect(tools.clanInvincible).toBe(false);
    expect(tools.invincible).toBe(true);
    executeDeveloperCommand(tools, run, 'clan-invincible', true);
    executeDeveloperCommand(tools, run, 'status', true);
    expect(tools.log.at(-1)?.text).toContain('Clan invincibility: ON');
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
      clanInvincible: false,
      log: [],
      history: [],
      revision: 0,
      nextEntry: 0,
    });
  });
});
