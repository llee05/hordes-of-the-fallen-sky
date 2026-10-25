# Area encounters and local enemies

Location identity follows `clan.locationId`, independently of the chapter's winter,
eruption, and eclipse pressures. During a crossing the physical departure landscape
supplies its roster; choosing a destination does not import its monsters early.

`data/enemies.ts` retains seven shared enemies and adds two native variants for each
of the twelve locations. `ENEMIES` is the shared catalogue; `AREA_ENEMIES` holds the
24 exclusive locals; `ALL_ENEMIES` is their combined registry. Local definitions
include a stable ID, display name, home, arrival-time unlock, painted animation,
palette accent, tactical role, and optional volley/ability metadata. The roster
selector admits a local only in its home. Normal encounters favour locals at 70%
after the protected opening; the rest retain familiar shared enemies and their
existing progression unlocks. Featured global enemies remain recognisable across
the journey. Crossings and field gatherings also admit local members.

Golden Pasture's first 18 seconds retain the original gentle Hollow wolves. The
second native role unlocks after 35 active seconds in each stage, giving the first
native a readable introduction. Menus cannot advance these clocks. Existing enemy
pool and projectile limits still apply.

This pass reuses the existing registered painted animation clips with palette
accents and varied scale; it does not supply 24 new creature paintings. Native
prowlers flank, local bulwarks retain armour, and skirmishers/callers fire spaced
fans. `data/areaEncounters.ts` authors the local terrain-rule catalogue; subsequent
runtime modules consume its hazard and habitat metadata. These are invented
unreturned, distinct from the traditions and honoured local powers described in
`lore.md`. The extinct volcanic scenery at Altan Ovoo is not active lava.

| Location            | Native enemies                        |
| ------------------- | ------------------------------------- |
| Golden Pasture      | Thistle prowler; Dustwing             |
| Silent River        | Rime hound; Icebound lancer           |
| Broken Pass         | Scree crawler; Slate needle           |
| Heart of the Steppe | Ashbound outrider; Rift cantor        |
| Otgontenger         | Snowline hunter; White-ridge sentinel |
| Bogd Khan Uul       | Rootshade stalker; Canopy whisperer   |
| Altai Tavan Bogd    | Glacier skimmer; Moraine breaker      |
| Khan Tengri         | Windknife; Spire lancer               |
| Belukha             | Frostwood prowler; Meltwater caller   |
| Altan Ovoo          | Basalt carapace; Cinderwing           |
| Eej Khairkhan       | Sandglass stalker; Granite hollow     |
| Orkhon Valley       | Reed prowler; Silt caller             |
