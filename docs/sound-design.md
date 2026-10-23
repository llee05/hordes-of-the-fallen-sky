# Sounds of the travelling clan

The sound direction translates the Living Steppe Tapestry's wood, felt, leather, brass, horses, and cold supernatural forms into short, tactile effects. Original horn and plucked-string phrases give the fictional clan a recurring musical voice. These are synthesized game materials; no external recordings, services, or runtime downloads are used.

## Palette

| Action                   | Sound materials                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Bow volley               | Softened, dry bowstring release, low wooden body, and a quiet feather rush         |
| Riding / gallop          | Weighted hoof contacts with low drum body, dry wood, grass, and a brief cloth rush |
| Khan hit                 | Leather and wood over a low membrane thud                                          |
| Creature hit / defeat    | Dry bone and stone knocks, then an ash-like breath                                 |
| Barricade hit            | Resonant timber crack, peg rattle, and rope twang at the struck panel              |
| Spirit shard / knowledge | Small metal overtones and warm string plucks                                       |
| Construction / research  | Mallet taps and lashings / a brief string phrase with a light metal accent         |
| Departure / arrival      | A low two-part clan horn / open string notes and a gentle harness bell             |
| Moving caravan           | Cart creaks, low rope resonance, wheel knocks, and small harness bells             |
| Steppe air               | Infrequent, quiet filtered wind gusts                                              |
| Hostile spell / thunder  | Air and reed-like resonance / a low rolling body with a sharp stone transient      |
| Fallen Khan / successor  | A descending drum and string resonance / a returning horn and brighter pluck       |
| Victory / clan loss      | A fuller version of the clan phrase / sparse fading wood, drum, and wind           |

`src/game/audio/soundPalette.ts` defines all 21 cues as typed material layers. Strings use a damped delay loop excited by noise; wood, membrane, horn, and metal use different resonances, envelopes, and transients. Filtered noise supplies breath, grass, and cloth. Three reproducible variants vary tuning and excitation. Each mono PCM buffer renders at 24 kHz, with quiet endpoints, DC removal, and peak headroom, then caches on first use.

Bowstrings have their own short, heavily damped release rather than the sustained
pluck used by musical cues. A 2.4 kHz excitation filter softens the initial edge,
the wooden body sits lower, and the feather rush stays short and quiet. Each shot
lasts 115 milliseconds including its silent buffer tail; most energy arrives in
the first 30 milliseconds, with less than 3% remaining after 60 milliseconds.
This keeps repeated volleys dry without a bright click or lingering musical note.

## Mixing and lifecycle

`src/game/systems/Audio.ts` unlocks Web Audio through a user action. A shared output gain and compressor mix at most 16 live sources. Per-cue cooldowns and overlap limits restrain large volleys and crowds. Important clan signals can replace a quieter voice. World sources pan gently left or right and fade with distance from the living Khan, or from camp during succession. Barricade hits retain a quiet minimum level so a distant attack on the clan remains audible.

`ArenaScene` emits sounds only after actual actions: a successful purchase, a fired volley, a hit, a defeat, a journey transition, or succession. Empty volleys stay silent. Hoof cadence follows distance ridden, speeds up during gallop, and stops while the Khan is fallen. Cart and wind timing uses active gameplay seconds. Pausing, story, planning, focus-loss pause, and ended phases fade existing world playback; world cues cannot start in those phases. Explicit construction, research, arrival, and outcome cues may play in their corresponding menus. These presentation timers never own or delay simulation values.

Mute suppresses new sounds and fades current voices over 15 milliseconds. Its existing native/browser preference persists. Restarts stop voices and reset presentation clocks while retaining one unlocked context and bounded buffer caches. Final scene destruction disconnects nodes and closes the context. A missing audio device or Web Audio API leaves gameplay operational.

## Verification

`tests/unit/soundPalette.test.ts` checks every rendered cue for finite samples, audible energy, headroom, DC, endpoints, and repeatable variation, plus the bow release's short decay at 24, 44.1, and 48 kHz. `tests/unit/audio.test.ts` checks gating, mute, voice limits, cleanup, active-time cadence, and audio-device failure. `tests/e2e/audio.spec.ts` exercises real Web Audio buffers, scene actions, paused purchases, mute persistence, journey signals, succession, and context reuse. Run `npm run check`, the focused browser tests, and the Electron smoke test when changing playback or lifecycle behavior.
