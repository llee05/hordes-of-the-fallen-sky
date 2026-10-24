export const DEVELOPER_COMMAND_MAX_LENGTH = 200;
export const DEVELOPER_HISTORY_LIMIT = 40;

/** Saved text is recall-only: it is never executed on load. Bound and copy untrusted input. */
export function normalizeDeveloperHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const history: string[] = [];
  for (const entry of value.slice(-DEVELOPER_HISTORY_LIMIT)) {
    if (typeof entry !== 'string') continue;
    const line = entry.trim();
    if (!line || line.length > DEVELOPER_COMMAND_MAX_LENGTH || /[\r\n\0]/.test(line)) continue;
    if (history.at(-1) !== line) history.push(line);
  }
  return history;
}

export function isDeveloperHistory(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= DEVELOPER_HISTORY_LIMIT &&
    value.every(
      (entry) =>
        typeof entry === 'string' &&
        entry.length > 0 &&
        entry.length <= DEVELOPER_COMMAND_MAX_LENGTH &&
        entry === entry.trim() &&
        !/[\r\n\0]/.test(entry),
    )
  );
}
