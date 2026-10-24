import { isKhanActive } from '../state/khan';
import type { RunState } from '../types';

export const DEVELOPER_COMMAND_MAX_LENGTH = 200;
const LOG_LIMIT = 80;
const HISTORY_LIMIT = 40;

export const DEVELOPER_COMMANDS = [
  { name: 'help', usage: 'help', description: 'List console commands.' },
  {
    name: 'invincible',
    usage: 'invincible [on|off]',
    description: 'Protect the Khan from all damage. Alias: god. No argument toggles.',
  },
  {
    name: 'clan-invincible',
    usage: 'clan-invincible [on|off]',
    description:
      'Protect clan resolve, people, and livestock from attacks and starvation. No argument toggles.',
  },
  { name: 'heal', usage: 'heal', description: 'Restore the living Khan to full health.' },
  {
    name: 'status',
    usage: 'status',
    description: 'Show invincibility, Khan health, and clan resolve.',
  },
  { name: 'clear', usage: 'clear', description: 'Clear console output; retain command history.' },
] as const;

export interface DeveloperConsoleEntry {
  id: number;
  kind: 'command' | 'output' | 'error';
  text: string;
}

export interface DeveloperToolsState {
  invincible: boolean;
  clanInvincible: boolean;
  log: DeveloperConsoleEntry[];
  history: string[];
  revision: number;
  nextEntry: number;
}

export interface DeveloperConsoleSnapshot extends DeveloperToolsState {
  focusInput: boolean;
  canCheat: boolean;
}

export function createDeveloperTools(): DeveloperToolsState {
  return {
    invincible: false,
    clanInvincible: false,
    log: [],
    history: [],
    revision: 0,
    nextEntry: 0,
  };
}

/** Explicit commands only. The scene supplies DEV access and the paused expedition context. */
export function executeDeveloperCommand(
  state: DeveloperToolsState,
  run: RunState,
  input: string,
  activeExpedition: boolean,
): { cheated: boolean } {
  const line = input.trim();
  if (!line) return { cheated: false };
  const write = (text: string, kind: DeveloperConsoleEntry['kind'] = 'output') => {
    state.log.push({ id: state.nextEntry++, kind, text });
    state.log.splice(0, Math.max(0, state.log.length - LOG_LIMIT));
  };
  state.revision += 1;
  if (line.length > DEVELOPER_COMMAND_MAX_LENGTH) {
    write(`Commands are limited to ${DEVELOPER_COMMAND_MAX_LENGTH} characters.`, 'error');
    return { cheated: false };
  }
  write(line, 'command');
  if (state.history.at(-1) !== line) state.history.push(line);
  state.history.splice(0, Math.max(0, state.history.length - HISTORY_LIMIT));
  const [command, ...args] = line.toLowerCase().split(/\s+/);
  const name = command === 'god' ? 'invincible' : command;
  const definition = DEVELOPER_COMMANDS.find((entry) => entry.name === name);
  if (!definition) {
    write(`Unknown command: ${command}. Type help for commands.`, 'error');
    return { cheated: false };
  }
  if (
    (['invincible', 'clan-invincible'].includes(name!) &&
      (args.length > 1 || (args.length === 1 && !['on', 'off'].includes(args[0]!)))) ||
    (!['invincible', 'clan-invincible'].includes(name!) && args.length > 0)
  ) {
    write(`Usage: ${definition.usage}`, 'error');
    return { cheated: false };
  }
  if (name === 'help') {
    for (const entry of DEVELOPER_COMMANDS) write(`${entry.usage} — ${entry.description}`);
    write(
      'Khan and clan protection toggle independently. Food consumption and journey clocks continue.',
    );
  } else if (name === 'clear') {
    state.log.length = 0;
  } else if (name === 'status') {
    write(
      `Khan invincibility: ${state.invincible ? 'ON' : 'OFF'}. Health: ${Math.ceil(run.health)} / ${run.stats.maxHealth}. Clan invincibility: ${state.clanInvincible ? 'ON' : 'OFF'}. Clan resolve: ${Math.ceil(run.clan.integrity)}%.`,
    );
  } else if (!activeExpedition) {
    write('Start an expedition or select a developer checkpoint first.', 'error');
  } else if (name === 'invincible') {
    state.invincible = args[0] ? args[0] === 'on' : !state.invincible;
    write(`Khan invincibility ${state.invincible ? 'ON' : 'OFF'}.`);
    return { cheated: state.invincible };
  } else if (name === 'clan-invincible') {
    state.clanInvincible = args[0] ? args[0] === 'on' : !state.clanInvincible;
    write(`Clan invincibility ${state.clanInvincible ? 'ON' : 'OFF'}.`);
    return { cheated: state.clanInvincible };
  } else if (name === 'heal') {
    if (!isKhanActive(run)) {
      write('The Khan has fallen. Wait for succession before using heal.', 'error');
    } else {
      run.health = run.stats.maxHealth;
      write(`Khan health restored to ${run.stats.maxHealth}.`);
      return { cheated: true };
    }
  }
  return { cheated: false };
}
