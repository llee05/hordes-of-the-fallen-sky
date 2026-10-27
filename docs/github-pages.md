# GitHub Pages browser release

The browser release contains the same playable expedition as the desktop game. It
needs no backend, account, API key, or runtime asset service. Only Vite's compiled
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
subpath; set `PAGES_PORT` to serve on another port when 4173 is busy. It checks
local assets and prologue paintings and the absence of development
hooks and native capabilities — that artwork smoke is the only Pages test GitHub
Actions runs. The `@gameplay` smokes, which never run on GitHub, check real camp
purchases, menu pausing, sound preference persistence, and play with unavailable
browser storage. The gameplay smoke uses the same angled 2.5D world as the desktop
game, including on software GPUs. The headless software Pages smoke run passed all
three tests. See [the world renderer guide](world-3d.md).
Run `npm run check` and
`npm run test:e2e` for the broader checks and development-browser regressions.

For a manual production preview:

```sh
npm run preview -- --base=/hordes-of-the-fallen-sky/ --port 4173 --strictPort
```

Open the full URL including the trailing slash. Keep Vite's relative `base: './'`:
the same files resolve artwork, scripts, styles, and local fonts under the project
path, a custom domain, or Electron's `file://` URL. The game has no client-side
routes, so it needs no SPA redirect or copied `404.html`.

## Publish on GitHub Pages

The prepared project URL is
`https://llee05.github.io/hordes-of-the-fallen-sky/`. It becomes available after the
first successful deployment; preparing or building locally does not publish it.

1. In the repository's **Settings → Pages → Build and deployment**, choose
   **GitHub Actions** as the source. This is a one-time repository setting.
2. Push the release commits to `main`. The **GitHub Pages** workflow runs all of
   `npm run check`, installs Chromium, and tests the exact production `dist/`
   artifact beneath the project subpath with the non-gameplay artwork smoke
   before uploading it for deployment.
3. Open the workflow in **Actions**. The deploy job publishes only when every build
   and smoke-test step succeeds. Its `github-pages` environment links to the live
   site. Any configured environment approval must be completed there.
4. Open the live URL in a fresh browser profile. Start an expedition, build a camp
   development, open the prologue, and check fullscreen and sound. Test any physical
   controller and additional browsers you intend to recommend to playtesters.

Pull requests to `main` run the same checks without uploading or deploying a site.
**Run workflow** on `main` can redeploy the current release; dispatching it on
another branch only runs checks. The workflow uses pinned official GitHub Actions,
the standard `GITHUB_TOKEN`, and deployment-scoped Pages/OIDC permissions. It needs
no personal access token or additional repository secret. In-progress releases are
not cancelled by a newer push.

For a rollback, revert the unwanted change on `main` and push it. The resulting
commit is rebuilt and verified before deployment. For a custom domain, configure
it in Pages settings and follow GitHub's domain instructions; the relative asset
paths do not need changing.

## Browser behavior

- Keyboard, mouse, standard gamepads, and the existing touch preview are available.
  Desktop browsers are the primary playtest target.
- Sound starts after interacting with the game. Fullscreen uses the browser's
  permission-controlled fullscreen API; there is no native Quit button.
- Best journey time and sound preference use browser storage on that browser and
  origin. They are separate from desktop saves and are lost if site data is cleared.
  With storage disabled, the game still starts; preferences cannot persist.
- Full expeditions can resume from three manual slots or the last completed autosave.
  Browser saves use storage on this origin and disappear if site data is cleared.
  Save before closing the tab; the desktop save-on-close handshake is unavailable here.
- All artwork and fonts are served from the site. Sounds are synthesized locally.
  The initial asset download is approximately 34 MB; there is no offline cache or
  service worker.

See [Vite's static deployment guide](https://vite.dev/guide/static-deploy.html) and
[GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
