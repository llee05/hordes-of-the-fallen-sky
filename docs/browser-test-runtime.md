# Browser test runtime measurements

Measured on 2026-10-26 against application commit `297a02b`, with the review runner
added in `0a205a4`. This is a shared 12-core Linux host with Intel Iris Xe graphics,
not a dedicated benchmark machine. Browser runs used `/usr/bin/chromium`, visible
windows routed by the existing compositor configuration, and the existing ANGLE
OpenGL policy. Both WebGL checks reported **Mesa Intel Iris Xe (RPL-U)**. No
software-rendering, focus, or background-throttling policy changed in this work.

## Review fast path

The full GPU baseline took **1,096.34 seconds (18m16s)**: **151 passed, 6 failed**,
157 total. A focused review of `mounted-tactics` and `patron-effects`, including
both smoke tests, took **56.41 seconds**: **9 passed**. That is 19.4 times less wall
time for explicitly narrower review coverage. It does not establish a full-suite
pass or replace the full CI run.

```sh
flock /tmp/bh-playwright.lock env E2E_PORT=5268 \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  npm run test:e2e:changed -- origin/main \
  --spec=mounted-tactics --spec=patron-effects
```

`test:e2e:changed` automatically includes keyboard/lifecycle and default 3D smoke
tests. Without `--spec`, it uses Playwright's changed-spec/import selection for
browser-test and documentation changes. Application, asset, dependency, config,
and unknown changes fall back to the full suite. Missing base refs and invalid
focused patterns fail the command rather than silently running no coverage.

Bare `playwright test --only-changed=origin/main` is unsafe as a general gameplay
review gate here. Most tests load the application with `page.goto` and mutate it
through `page.evaluate`; Playwright's Node import graph cannot see those runtime
dependencies. A gameplay change can select some specs that directly import shared
content while omitting broad game/lifecycle coverage. Explicit `--spec` patterns
therefore describe a reviewer's chosen partial scope; they are not an inferred
proof that other specs are unaffected.

## Changed-test selection on recent changes

These rows replay the exact changed paths from four historical commits against the
current test import graph, using Playwright 1.64.1's own related-test resolver. They
do not check out or time four historical application versions. Enumeration takes
0.9–1.4 seconds, launches no Chromium, and has no test failures to count. The full
runtime below reuses the one measured 157-test baseline, rather than repeating an
identical full selection for each row.

| Change                                       | Native selected tests | Enumeration wall | Safe review selection | Measured execution wall / Chromium CPU / failures |
| -------------------------------------------- | --------------------: | ---------------: | --------------------: | ------------------------------------------------- |
| `297a02b` coverage/dependency/config changes |                     0 |           1.24 s |             Full: 157 | 1,096.34 s / 215.4% / 6 (shared baseline)         |
| `5c3f413` browser server/config changes      |                     0 |           0.98 s |             Full: 157 | 1,096.34 s / 215.4% / 6 (shared baseline)         |
| `c2441d9` Skybreaker gameplay and tests      |                    29 |           1.35 s |             Full: 157 | 1,096.34 s / 215.4% / 6 (shared baseline)         |
| `14c0038` story documentation                |                     0 |           0.89 s |              Smoke: 2 | 18.79 s / 161.3% / 0                              |

For `c2441d9`, native selection includes `destinations`, `developer-console`,
`developer-mode`, and `final-stand`; it omits `game.spec.ts` despite the
`ArenaScene` change. This is why the automatic source-change fallback matters.
A temporary comment edit to `mounted-tactics.spec.ts` also verified the actual
review runner's changed-spec branch: two affected tests plus both smoke tests were
listed (four total, 1.53 seconds, no Chromium). The edit was restored immediately.

| Review mode                                           | Tests |       Wall | Chromium CPU | Failures |
| ----------------------------------------------------- | ----: | ---------: | -----------: | -------: |
| Full GPU baseline                                     |   157 | 1,096.34 s |       215.4% |        6 |
| Explicit `mounted-tactics` + `patron-effects` + smoke |     9 |    56.41 s |       213.8% |        0 |
| Automatic smoke-only selection                        |     2 |    18.79 s |       161.3% |        0 |

## Measurement method

Each browser command held `/tmp/bh-playwright.lock`; a fresh Vite server used
`E2E_PORT=5268`. Wall time starts after lock acquisition and includes server start,
hardware verification, test discovery, browser launches, failure artifacts, and
shutdown. Chromium CPU is the sum of CPU time sampled every 0.5 seconds from the
command's Chromium descendant processes, divided by wall time. **100% means one
logical core**; very short processes between samples may be missed. This measures
Chromium, not Vite or total host CPU.

The fixed subset now contains **13 tests**, rather than the planning snapshot's
11: `mounted-tactics`, `patron-effects`, `field-gameplay`, and
`crossing-encounters`. It includes the actual 3D river crossing, menus, animation,
and screenshot work. Baseline settings are one worker and 1440×1000. Experimental
settings were supplied through an external Playwright config; the 30 FPS experiment
used a temporary Vite transform adding Phaser's `fps: { limit: 30 }` during module
loading. No benchmark-only product setting or source patch ships.

The first subset baseline ran during substantial unrelated host activity and took
181.56 seconds (163.3% Chromium CPU, 12 passed / 1 failed). Treat that as a
confounded observation, not evidence that a smaller viewport is three times faster.
The short comparisons were repeated together later on the same GPU baseline.

## Render cost and parallelism

Each cell reports **initial / repeat** measurements on the same 13-test subset.
The initial baseline is confounded as explained above; use the repeat column for
comparisons. All successful tests passed on their first attempt; no retries were
configured.

| Setting                          |   Wall seconds | Chromium CPU % | Failures |
| -------------------------------- | -------------: | -------------: | -------: |
| 1440×1000, normal FPS, 1 worker  | 181.56 / 64.88 |  163.3 / 227.6 |    1 / 0 |
| 1280×800, normal FPS, 1 worker   |  63.82 / 62.58 |  226.3 / 225.1 |    0 / 0 |
| 1440×1000, 30 FPS, 1 worker      |  67.92 / 62.61 |  200.4 / 217.7 |    1 / 0 |
| 1440×1000, normal FPS, 2 workers |  51.15 / 55.08 |  376.4 / 373.8 |    0 / 0 |
| 1440×1000, normal FPS, 3 workers |  47.74 / 50.97 |  475.8 / 459.5 |    0 / 0 |

The smaller viewport and frame cap save only about 3.5% wall time in the repeat,
with only two trials and shared-host variation. Neither justifies changing the
presentation used by tests. The two-worker repeat saves 15.1% wall time while
consuming 39.4% more total Chromium CPU seconds; three workers save 21.4% while
consuming 58.6% more CPU seconds. These subset passes cannot demonstrate full-suite
stability, especially with existing baseline failures. Retaining one worker avoids
claiming safety from a small subset and avoids three unnecessary full runs for a
default change that is not being proposed.

To reproduce the baseline subset, use the normal config and the same four specs:

```sh
flock /tmp/bh-playwright.lock env E2E_PORT=5268 \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  npx playwright test mounted-tactics patron-effects field-gameplay crossing-encounters
```

`--workers=2` and `--workers=3` reproduce the parallel variants. For the viewport
trial, override only `use.viewport` in a temporary config to 1280×800. For the
frame-cap trial, add `fps: { limit: 30 }` to the temporary development game's
Phaser config while retaining the normal viewport. Neither override is needed or
recommended for ordinary reviews.

## Full-suite failures

The full baseline ran the original application and browser specs unchanged. Its
six failures were:

- `camp-culture:89`: existing arrival resolve expectation, 72 versus 76.
- `characters:89`: existing undefined creature/boss reference.
- `intro:186`: controller focus expectation.
- `story:216`: controller story-log navigation.
- `world3d:110`: physics group no longer available during evaluation.
- `world3d:182`: rendering budget, 89 calls versus a limit below 45.

These are baseline observations, not changes introduced or fixed by the review
runner. The initial subset and 30 FPS trial also exposed the existing ridge reward
assertion's floating-point edge: 37.99999999999999 compared with a minimum of 38.
It was left unchanged so the experiments compare the same tests.

## Decisions

Only the review selection command is adopted. The full-suite default remains one
worker at 1440×1000; `E2E_WORKERS=1`, `CI=1`, and the existing GPU/headless policy
retain their previous behavior. No three-run full-suite stability claim is made.
The parallel subset results are exploratory and do not authorize a new full-suite
default. The GPU-headless and separate-workspace hypotheses were already addressed
by the earlier merged GPU test work and were not repeated here.

## CI shard follow-up

BH-16b was retargeted to the eight CI shards rather than increasing the local
worker count. Its prerequisite measurements deliberately retained one local
worker. The scope is topic splits, independent test scheduling, and the assigned
software-renderer regressions; it does not introduce a duration-aware scheduler.

The complete [158-test CI baseline](https://github.com/llee05/hordes-of-the-fallen-sky/actions/runs/40333418906)
provides per-file observations from the timestamps between consecutive test
starts. These include failure artifacts and worker restarts, so they are useful
for identifying long groups rather than measuring pure simulation cost.

| File                | Recorded seconds |
| ------------------- | ---------------: |
| `world3d`           |           437.46 |
| `destinations`      |           424.83 |
| `game`              |           398.46 |
| `developer-mode`    |           303.31 |
| `area-combat`       |           294.45 |
| `final-stand`       |           284.63 |
| `story`             |           279.70 |
| `intro`             |           279.66 |
| `developer-console` |           232.83 |
| `audio`             |           221.08 |
| `khan`              |           215.44 |
| `camp-culture`      |           204.34 |

Game contracts now have separate input/lifecycle, combat, camp/journey, and
interface files. Console history and cheats have separate files; the complete
story journey and controller walkthrough also have their own files. The named
`game.spec.ts` smoke contract remains in place for the changed-only selector.
Checkpoint coverage uses six chapter/topic groups with at most eight transitions
per test, instead of one 29-transition test. Camp and destination inspection run
independently at all three original viewport sizes. No checkpoint, facility,
destination, story choice, or assertion was removed. Files marked parallel use
isolated page contexts and have no shared `beforeAll`/`afterAll` state.

The audio regression records accepted reference auditions: a short recording can
finish before a slow browser samples the live voice count. The opening-fight
fixture places a real pooled enemy in firing range and leaves the normal scene
update to fire and record the milestone. Siege checks wait for the real camp and
playing phases before comparing frozen and active state. Active combat and the
intentionally complete story/controller walkthroughs retain their assertions with
wall-time budgets appropriate to software rendering.

### Projection limits

Playwright shards these groups by **test count**, not by duration. Replaying the
complete baseline costs over the new 168-test grouping gives the following
projection. New viewport cases divide the old three-viewport cost equally;
checkpoint groups divide the old cost by their number of levels; the split console
contracts divide their former cost equally. This ignores extra setup costs and
any measured savings from the fixes. It is a projection, not an after-run CI
measurement.

The second cost column subtracts the ten assigned failures' explicit deadlines
(615 seconds in aggregate), clamped at zero per original test and divided by the
same proportions. This is deliberately optimistic: those deadlines include useful
work, and successful tests still cost time. It isolates timeout sensitivity without
claiming that every deadline second becomes a saving. Terrain failures and their
costs remain unchanged in both columns; BH-24 owns their follow-up.

| Shard | Tests | Recorded costs replayed (s) | Assigned timeout budgets subtracted (s) |
| ----- | ----: | --------------------------: | --------------------------------------: |
| 1     |    21 |                      872.64 |                                  837.64 |
| 2     |    24 |                      743.40 |                                  683.40 |
| 3     |    18 |                      569.72 |                                  379.38 |
| 4     |    25 |                      888.69 |                                  754.03 |
| 5     |    25 |                      816.28 |                                  816.28 |
| 6     |    14 |                      704.30 |                                  689.30 |
| 7     |    21 |                      480.46 |                                  480.46 |
| 8     |    20 |                    1,096.30 |                                  916.30 |

The projected slowest shard is **18m16s**, or **15m16s** with those timeout budgets
removed. Neither meets the target of **10m39s**, 30% below the first full run's
15m13s timeout-limited test step. The first run also stopped two shards early, so
it is not a complete successful-suite baseline. No 30% improvement is claimed.
Measure again after the CI fixes are integrated; duration-aware sharding is a
follow-up if the remaining count imbalance matters.

### Local verification

The exact eight `--list --shard=N/8 --reporter=json` outputs match every projected
test title and shard count above. The static `expect(` count across `tests/e2e`
increased from **1,071 to 1,076** against the task's `origin/main` base.

| Run      | Coverage                                                                            | Passed | Failed / flaky | Reporter duration |
| -------- | ----------------------------------------------------------------------------------- | -----: | -------------: | ----------------: |
| Software | Assigned failing contracts, all split checkpoints/viewports, two shared smoke tests |     22 |          0 / 0 |          341.91 s |
| GPU 1    | All changed specs plus two shared smoke tests                                       |     73 |          0 / 0 |          446.94 s |
| GPU 2    | Same selection                                                                      |     73 |          0 / 0 |          436.69 s |
| GPU 3    | Same selection                                                                      |     73 |          0 / 0 |          442.12 s |

The GPU runs were consecutive, with no retries or edits between them. They use the
unchanged visible Intel GPU policy, 1440×1000 viewport, and one worker. These are
focused review passes, not a claim that the complete browser suite passed. The
software check used a temporary external config importing the normal config,
forcing `--use-angle=swiftshader --enable-unsafe-swiftshader`, and setting the
pending CI workflow's 15-second assertion timeout. It kept the normal real game
loop and all assertions. No test-only renderer configuration ships.

Each Playwright command was inside `flock /tmp/bh-playwright.lock`, with
`E2E_PORT=5271`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`, a built-in JSON
reporter, and `--timeout=90000` (individual explicit budgets still apply). To repeat
the GPU selection from the branch against its base:

```sh
flock /tmp/bh-playwright.lock env E2E_PORT=5271 \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium \
  npm run test:e2e:changed -- origin/main --timeout=90000 --reporter=line,json
```

`npm run check` also passed: formatting, both strict type checks, all **452 unit
tests in 71 files**, and production renderer/desktop builds.

The exploratory run before the three passes exposed an incorrect newly added
camp DOM phase label (`planning` rather than `building`), which was corrected.
It also exposed the existing guidance overlap assertion at 390×844. The only
guidance edit had been scheduling metadata under one worker; that edit was
reverted and the unchanged guidance contract remains outside this focused
selection. No guidance assertion or layout was weakened to obtain the passes.
