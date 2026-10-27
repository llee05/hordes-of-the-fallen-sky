/** Pages smoke split; GitHub Actions runs nothing that starts or plays the game. */
export function pagesSmokeSelection(environment: Record<string, string | undefined> = process.env) {
  return {
    // Every test that starts or plays the game carries @gameplay and stays local;
    // CI keeps only the artwork/loading smoke, which never starts gameplay.
    grepInvert: Boolean(environment.CI) ? /@gameplay/ : undefined,
  };
}
