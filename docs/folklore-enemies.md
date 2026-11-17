# Folklore enemies

The Almas, Olgoi-Khorkhoi and Muu Shuuvuu are complete development-only enemies. They are
registered in `FOLKLORE_ENEMIES` so development hooks and expedition saves can resolve their
stable IDs, but they are deliberately absent from `ENCOUNTER_ENEMIES`, area rosters, encounter
phases, authored camps and waves.

## Local preview

Run `npm run dev:web`, begin or select a development expedition, then use the development
console in browser developer tools. Pause ordinary arrivals and spawn one enemy near the Khan:

```js
window.__gloam.hooks.quietBattlefield();
window.__gloam.hooks.spawn({
  id: 'almas',
  x: window.__gloam.scene.player.x + 360,
  y: window.__gloam.scene.player.y,
});
```

Replace `almas` with `death-worm` or `muu-shuuvuu`. Use a fresh position for each spawn. The
hook exists only in development builds and uses the real pooled `EnemyDirector` path.

## Roles and balance

| Enemy          | Health / speed / damage / XP | Attack cadence and counterplay                                                                                                                                                                                                                         |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Almas          | 240 / 28 / 20 / 20           | 0.48 s claw warning inside 92 units; 0.95 s, 112-unit ground slam; 0.85 s charge line, followed by 1.4 s recovery. Its 30% armour, large control resistance and low speed make it a durable commitment test rather than another fast charger.          |
| Olgoi-Khorkhoi | 110 / 40 / 12 / 10           | 0.38 s bite warning inside 86 units; alternating 0.72 s poison spit and 0.55 s burrow tell. The emergence point remains marked for 1.15 s in a 78-unit circle. It is tougher than a seer but has shorter range and must expose its fixed ambush point. |
| Muu Shuuvuu    | 75 / 72 / 10 / 9             | Circles at 245–293 units, then alternates a 0.78 s committed dive line with a 1 s, 190-unit shriek circle. Both attacks have 1.2 s recovery. Its health sits between a ghost rider and brute because orbiting movement already taxes aim.              |

All warnings use the shared field-marker surface. They remain visible at Minimal effect density;
decorative rings and bursts follow the existing effect-density behavior. Timers advance only in
active gameplay, and pooled/saved actors reset or serialize their `folklore` attack state.

## Painted animation assets

The built-in image generation tool produced one transparent six-frame atlas per enemy:

- `public/art/steppe-almas-motion.png`: four heavy walk poses, claw windup, ground-slam release.
- `public/art/steppe-death-worm-motion.png`: four slither poses, poison windup, strike release.
- `public/art/steppe-muu-shuuvuu-motion.png`: four articulated flight poses, dive/shriek windup,
  dive release.

Each prompt requested one 1536 × 1024, six-column transparent source strip in a high
three-quarter view, with identical character scale and registration, upper-left warm light,
matte gouache/mineral wash, carbon-umber ink contours, restrained hatching, low-chroma enemy
colors, no background, floor, shadow, text, loose projectile, CG rendering or photorealism.
The subject lines specified an ash-brown shaggy Almas with heavy arms, a rust/ash segmented
Olgoi-Khorkhoi with poison maw, and an ash/indigo nonsexualized bird-woman with articulated
wings. ImageMagick isolated the six generated subjects and registered their ground/air anchors
to the shared 256 × 360 logical canvas without altering the generated paintings.
