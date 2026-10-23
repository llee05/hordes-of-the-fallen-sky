# Developer level checkpoints

The checkpoint catalog in `src/game/dev/levels.ts` covers all four journey chapters,
all three approaches to each of the three crossings, and all eight named camps in
both chapters 2 and 3. IDs derive from the existing chapter, route, and location data.

`createDeveloperRun(id)` returns a fresh, renderer-independent test expedition or
`undefined` for an unknown ID. It uses the normal migration and arrival rules to
establish earlier crossings and their remembered destinations. The selected crossing
begins at zero progress; its rewards still require arrival. Camp checkpoints have
routes available immediately, and the final stand starts with its full timer and
the Skybreaker still to come.

Test expeditions have a healthy Khan, 24 people, generous supplies, and 40 unspent
knowledge points. No technologies or camp developments are selected automatically.
Camp scenes and guidance are off for the test expedition; earlier encounters are
recorded as passed without granting story gifts. Normal new games retain their
usual state and preferences. Test provisions are configured in `GAME.developer`.

The scene must guard checkpoint activation with `import.meta.env.DEV`, recreate the
world when switching checkpoints, and exclude test expeditions from saved records.
