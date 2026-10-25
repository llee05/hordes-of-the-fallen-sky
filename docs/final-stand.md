# The final stand

The final refuge still opens by surviving for 180 active seconds with people and resolve. The Skybreaker's defeat is optional. Three chapters change the pressure: **Gather the households**, **Hold the approaches** after 65 seconds, and **Carry the living** after 125 seconds.

The Skybreaker advances toward rotating camp approaches, stops for a 2.4-second marked aim, releases one broad fan, then exposes itself for four seconds. Recovery takes 50% more friendly damage. Later chapters shorten the advance, widen the fan's coverage with more projectiles, and summon two approach attackers. Its previous continuous radial firing and unannounced camp melee do not run alongside this cycle. World-space aim lines and impact rings, a recovery halo, animation poses, and the boss bar communicate the opening. Terrain navigation still selects connected positions outside the hurdles.

The camp braces once against each Skybreaker barrage; subsequent bolts from that barrage strike the hurdle artwork without multiplying an unavoidable camp hit. The Khan still dodges the individual projectiles. The barrage counter and last braced identity persist across saves.

Two optional work parties become available at 35 and 90 seconds, on connected ground beside the camp. Stand within 90 units for five active seconds while enemies stay at least 160 units away to help a party. Each completes once and advances passage opening by 12 seconds, for a maximum 24 seconds saved. Leaving retains work already completed; menus freeze it and a fallen Khan cannot work. The workers and their rings reuse existing painted assets. Passage markers are created only in the final stand and share the existing warning surface to keep ordinary regions within the established texture budget. The HUD explains the current optional task. Completing neither party leaves the original survival objective intact.

Balance lives in `GAME.finalStand`; renderer-independent progression in `state/finalStand.ts`; scene movement, attacks and markers remain in `ArenaScene`. Full saves retain phase, warning target, remaining time, approach, work, and barrage identities. Old expeditions initialize the new final-stand state on entering active final play. Loading a warning never fires a catch-up volley or reapplies work rewards.

Tests cover chapter thresholds, telegraph/release/recovery order, menus, no repeated barrage damage, contested/fallen work, optional acceleration, boss-alive victory, snapshot round trips, and the actual scene's volley and vulnerability behavior.
