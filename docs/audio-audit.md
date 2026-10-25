# Audio audit — 25 October 2026

This records the implementation before the recorded-audio upgrade. The main cause of the electronic character is synthesis, rather than a bad recording or a missing sound driver.

## Sources and playback

- `src/game/audio/soundPalette.ts` generates all 21 cues into mono, 24 kHz PCM on demand. There are no recorded WAV/OGG/MP3 assets or music tracks in `public/`. Phaser's audio loader and sound manager are not used.
- There are no `OscillatorNode`s, but the generated buffers are still synthetic. Horns, wood, metal and drum skins sum sine-based resonances; strings and bowstrings use noise-excited delay loops. Filtered pseudorandom noise supplies air and breath. Calling these layers “wood”, “leather” or “horn” does not make them recordings of those materials.
- Each cue is waveshaped with `tanh`, DC-corrected and peak-limited. Three reproducible variants change excitation and tuning, then repeat in a fixed cycle. Musical cues explicitly use equal-tempered frequencies. This makes pickups, research, arrival and supernatural cues resemble electronic instruments.
- `src/game/systems/Audio.ts` creates one gesture-unlocked Web Audio context, caches generated buffers, and routes source → gain → stereo pan → shared master → compressor. Master gain is 0.65; compressor threshold −16 dB, ratio 6:1. There are no independent music, ambience, combat or interface buses. Dense overlaps can drive the shared compressor and flatten physical transients; source code alone cannot establish how much compression occurs on a particular user's device.
- `ArenaScene` triggers cues after actual volleys, damage, defeats, pickups, purchases, travel, hazards and succession. Shooting is already grouped per volley and silent when no projectile is fired. Impacts can request a sound for every nonlethal hit of at least one damage; pickup requests recur per collected shard. Cue cooldowns and overlap limits reduce requests, but do not establish a perceptual importance hierarchy within a large battle.
- Hooves are synthesized wood/skin/air contacts driven by travelled distance. Wind is a 1.3-second synthesized burst recurring approximately every 4.5–5 seconds. Cart creaks repeat every 1.1 seconds. Fixed pacing and repeated short buffers make the environment conspicuously cyclical. No horse breathing, recorded grass, fabric, fire, wildlife, river bed or continuous music exists.
- Pause, planning, story and focus-loss transitions fade current playback and gate world sounds. Purchases and outcomes can play in menus. Mute is the only saved audio preference. Restart retains the context and buffer cache; final destruction closes the context.

## What to preserve

Retain the scene's authority over gameplay time and phases, gesture unlocking, graceful handling of unavailable devices, positional attenuation/panning, event cooldowns, pooled-actor semantics, context reuse and bounded playback. These are useful foundations. No existing recorded asset needs to be discarded; none was found.

## Implementation sequence

1. Establish a recorded bow release, physical enemy impact, restrained spiritual cue, tactile interface response and long environmental wind bed. Keep a per-file source, editing and licence register. Retire the procedural-tone fallback. Preserve unfilled recording requests explicitly in a reusable manifest.
2. Extend `GameAudio` with layered events, nonrepeating sample selection, conservative variation, independent buses, smooth environment changes and a source/event budget that protects important feedback. Keep this presentation code separate from simulation.
3. Integrate spatial and environmental context from the existing scene, add saved mix controls and reference auditions, and test loading failures, mute/volume behaviour, dense bursts, pauses, restart and native offline decoding. Further music, vocals, horse and region-specific recording work should build on these references instead of inventing electronic substitutes.

The baseline tests verify generated waveform properties and lifecycle, not recorded timbre or the quality of a musical performance. The new tests must verify real bundled assets and playback behaviour; listening and in-game mix review remain necessary.
