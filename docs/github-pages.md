# GitHub Pages browser release

The browser release contains the same playable expedition as the desktop game. It
needs no server, account, API key, or runtime asset service. Only Vite's compiled
`dist/` directory is published; Electron, source files, tests, and development
dependencies stay out of the site.

## Build and verify locally

Use Node.js 22.12+ and install the locked dependencies with `npm ci`.

```sh
npm run build:web
npx playwright install chromium
npm run test:pages
```

If Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its
executable instead. The smoke suite serves the production artifact at
`http://127.0.0.1:4173/hordes-of-the-fallen-sky/`, matching a GitHub project site's
subpath. It checks local assets and prologue paintings, the absence of development
hooks and native capabilities, real camp purchases, menu pausing, sound preference
persistence, and play with unavailable browser storage. Run `npm run check` and
`npm run test:e2e` for the broader checks and development-browser regressions.

For a manual production preview:

```sh
npm run preview -- --base=/hordes-of-the-fallen-sky/ --port 4173 --strictPort
```

Open the full URL including the trailing slash. Keep Vite's relative `base: './'`:
the same files resolve artwork, scripts, styles, and local fonts under the project
path, a custom domain, or Electron's `file://` URL. The game has no client-side
routes, so it needs no SPA redirect or copied `404.html`.

## Browser behavior

- Keyboard, mouse, standard gamepads, and the existing touch preview are available.
  Desktop browsers are the primary playtest target.
- Sound starts after interacting with the game. Fullscreen uses the browser's
  permission-controlled fullscreen API; there is no native Quit button.
- Best journey time and sound preference use browser storage on that browser and
  origin. They are separate from desktop saves and are lost if site data is cleared.
  With storage disabled, the game still starts; preferences cannot persist.
- Expeditions are not resumable. Reloading or closing the tab ends the current run.
- All artwork and fonts are served from the site. Sounds are synthesized locally.
  The initial asset download is approximately 34 MB; there is no offline cache or
  service worker.

See [Vite's static deployment guide](https://vite.dev/guide/static-deploy.html) and
[GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
