import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Changes to public/art, terrain or renderer, saves, input, arena scene/split, or project config
// require running the full suite. Other application and test changes run the core subset plus area specs.
export function needsFullSuite(files) {
  return files.some((file) => {
    // Artwork changes
    if (/^public\/art\//.test(file)) return true;

    // Terrain or renderer code
    if (
      /^src\/game\/(terrain|world3d)\//.test(file) ||
      /^src\/game\/assets\/(SteppeLandscape|landscapeLayout|riverGeometry)\.ts$/.test(file) ||
      /^src\/game\/data\/(landscapes|terrainBiomes|crossingLandscapes)\.ts$/.test(file) ||
      /^src\/game\/systems\/(CameraView|AreaHabitat)\.ts$/.test(file)
    ) {
      return true;
    }

    // Saves and persistence
    if (
      /^src\/(platform\/|shared\/(expeditionSave|profile|campArchive|nomadicCamp)\.ts|saves\.css|ui\/saveContent\.ts)/.test(
        file,
      ) ||
      /^src\/game\/state\/(campArchive|expeditionArchive)\.ts$/.test(file)
    ) {
      return true;
    }

    // Input systems
    if (/^src\/game\/systems\/(GamepadInput|ActionKeys)\.ts$/.test(file)) {
      return true;
    }

    // Arena scene / arena-split PRs
    if (/^src\/game\/(scenes\/ArenaScene\.ts|scenes\/arena\/|createGame\.ts|main\.ts)/.test(file)) {
      return true;
    }

    // Non-source files that are safe review targets: documentation, desktop, tests, etc.
    if (
      /\.md$/.test(file) ||
      /^(docs|steam|desktop|\.github)\//.test(file) ||
      /^tests\/(unit|desktop|pages)\//.test(file) ||
      /^tests\/e2e\//.test(file) ||
      ['.prettierignore', '.gitignore', 'LICENSE'].includes(file)
    ) {
      return false;
    }

    // Public non-art assets like audio or manifest
    if (/^public\//.test(file)) {
      return false;
    }

    // Known application content that can be safely mapped to areas:
    if (
      /^src\/(game\/(data|state|entities|animation|audio|dev|systems|story)\/|ui\/|shared\/|[^/]+\.css$)/.test(
        file,
      )
    ) {
      return false;
    }

    // Any other root, build, dependency, config, or unknown file requires the full suite.
    return true;
  });
}

export const AREA_SPEC_MAPPINGS = [
  {
    pattern: /audio/i,
    specs: ['tests/e2e/audio.spec.ts'],
  },
  {
    pattern: /(camp|nomadic)/i,
    specs: [
      'tests/e2e/camp-model.spec.ts',
      'tests/e2e/camp-tree.spec.ts',
      'tests/e2e/camp-barrier.spec.ts',
      'tests/e2e/camp-culture.spec.ts',
      'tests/e2e/camp-life.spec.ts',
      'tests/e2e/nomadic-camp.spec.ts',
      'tests/e2e/game-camp-journey.spec.ts',
      'tests/e2e/camp-combat.spec.ts',
    ],
  },
  {
    pattern:
      /(combat|enemy|enemies|spawning|actors|volley|synerg|tactics|CharacterVisuals|CharacterMotion)/i,
    specs: [
      'tests/e2e/game-combat.spec.ts',
      'tests/e2e/area-combat.spec.ts',
      'tests/e2e/camp-combat.spec.ts',
      'tests/e2e/mounted-tactics.spec.ts',
      'tests/e2e/spawning.spec.ts',
      'tests/e2e/combat-readability.spec.ts',
      'tests/e2e/characters.spec.ts',
    ],
  },
  {
    pattern: /(research|patron|upgrade|specialization)/i,
    specs: [
      'tests/e2e/research.spec.ts',
      'tests/e2e/research-v2.spec.ts',
      'tests/e2e/research-runtime.spec.ts',
      'tests/e2e/research-artwork.spec.ts',
      'tests/e2e/patron-tree.spec.ts',
      'tests/e2e/patron-effects.spec.ts',
    ],
  },
  {
    pattern: /(crossing|destination|journey|migration|fieldObjectives|FieldMarkers|worldRegions)/i,
    specs: [
      'tests/e2e/game-camp-journey.spec.ts',
      'tests/e2e/crossing-encounters.spec.ts',
      'tests/e2e/destinations.spec.ts',
      'tests/e2e/destination-previews.spec.ts',
      'tests/e2e/field-gameplay.spec.ts',
    ],
  },
  {
    pattern: /finalStand/i,
    specs: ['tests/e2e/final-stand.spec.ts'],
  },
  {
    pattern: /(story|intro)/i,
    specs: [
      'tests/e2e/intro.spec.ts',
      'tests/e2e/story.spec.ts',
      'tests/e2e/story-controller.spec.ts',
      'tests/e2e/story-journey.spec.ts',
    ],
  },
  {
    pattern: /(clan|khan|tradition|economy|guidance|legacy|metrics)/i,
    specs: [
      'tests/e2e/starting-traditions.spec.ts',
      'tests/e2e/clan-safety.spec.ts',
      'tests/e2e/khan.spec.ts',
      'tests/e2e/economy.spec.ts',
      'tests/e2e/guidance.spec.ts',
      'tests/e2e/legacy.spec.ts',
      'tests/e2e/expedition-metrics.spec.ts',
      'tests/e2e/game.spec.ts',
    ],
  },
  {
    pattern: /(dev|cheats)/i,
    specs: [
      'tests/e2e/developer-mode.spec.ts',
      'tests/e2e/developer-console.spec.ts',
      'tests/e2e/developer-console-cheats.spec.ts',
      'tests/e2e/developer-console-history.spec.ts',
      'tests/e2e/developer-checkpoints.spec.ts',
    ],
  },
  {
    pattern: /(GameUI|menuContent|panelContent|Motion|tapestry|style\.css|zoom)/i,
    specs: [
      'tests/e2e/game-interface.spec.ts',
      'tests/e2e/layout-resize.spec.ts',
      'tests/e2e/motion.spec.ts',
      'tests/e2e/zoom.spec.ts',
    ],
  },
];

export function areaSpecs(files) {
  const result = new Set();
  for (const file of files) {
    if (/^tests\/e2e\/.*\.spec\.ts$/.test(file)) {
      result.add(file);
      continue;
    }
    for (const mapping of AREA_SPEC_MAPPINGS) {
      if (mapping.pattern.test(file)) {
        for (const spec of mapping.specs) {
          result.add(spec);
        }
      }
    }
  }
  return [...result];
}

export const smokeTests = [
  'game.spec.ts > starts, moves, dashes, pauses, resumes, and resets a run',
  'world3d.spec.ts > 3D terrain streams real walls, anchors painted sprites, and exposes paused debug views',
];

export function selectedTests(report, testDir = join(root, 'tests/e2e')) {
  const selected = new Set(smokeTests);
  function visit(suites, parents = [], fileSuites = true) {
    for (const suite of suites ?? []) {
      // The first suite is the file; nested suites are describe titles.
      const titles = fileSuites ? [] : [...parents, suite.title];
      for (const spec of suite.specs ?? []) {
        const file = relative(
          testDir,
          resolve(report.config?.rootDir ?? testDir, spec.file),
        ).replaceAll('\\', '/');
        selected.add([file, ...titles, spec.title].join(' > '));
      }
      visit(suite.suites, titles, false);
    }
  }
  visit(report.suites);
  return [...selected];
}

function run(args, capture = false) {
  const environment = { ...process.env };
  // Selection needs JSON on stdout even if the outer benchmark run writes a report.
  if (capture) {
    delete environment.PLAYWRIGHT_JSON_OUTPUT_FILE;
    delete environment.PLAYWRIGHT_JSON_OUTPUT_NAME;
    delete environment.PLAYWRIGHT_JSON_OUTPUT_DIR;
  }
  const result = spawnSync(
    process.execPath,
    [join(root, 'node_modules/playwright/cli.js'), ...args],
    {
      cwd: root,
      env: environment,
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Playwright exited with status ${result.status}`);
  return result.stdout;
}

function executeTestList(tests, args) {
  const scratch = mkdtempSync(join(tmpdir(), 'bh-e2e-review-'));
  try {
    const list = join(scratch, 'tests.txt');
    writeFileSync(list, tests.join('\n') + '\n');
    run(['test', '--test-list', list, ...args]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(
      'Usage: npm run test:e2e:changed -- [base-ref] [--full] [--spec=pattern ...] [Playwright options]',
    );
    console.log('Default: @core subset plus specs mapped to touched areas and smoke tests.');
    console.log('--full explicitly runs the full suite instead of the fast core + area subset.');
    console.log(
      '--spec explicitly selects focused review coverage + smoke, even for application edits.',
    );
    return;
  }
  const forceFull = args.includes('--full');
  args = args.filter((arg) => arg !== '--full');
  const focused = args.filter((arg) => arg.startsWith('--spec=')).map((arg) => arg.slice(7));
  if (focused.some((pattern) => !pattern))
    throw new Error('--spec needs a non-empty test-file pattern');
  args = args.filter((arg) => !arg.startsWith('--spec='));
  const base = args[0] && !args[0].startsWith('-') ? args.shift() : 'origin/main';
  const git = (...gitArgs) => {
    const result = spawnSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim());
    return result.stdout;
  };
  const mergeBase = git('merge-base', 'HEAD', base).trim();
  const files = [
    ...git('diff', '--no-renames', '--name-only', '-z', mergeBase, '--').split('\0'),
    ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
  ].filter(Boolean);

  if (forceFull || (!focused.length && needsFullSuite(files))) {
    console.log(
      forceFull
        ? 'Browser review: full suite requested.'
        : 'Browser review: public/art, terrain, renderer, save, input, or config changes require the full suite.',
    );
    run(['test', ...args]);
    return;
  }

  if (focused.length) {
    console.log(
      'Browser review: explicit focused coverage; run the full local suite before shipping gameplay changes.',
    );
    const report = JSON.parse(run(['test', ...focused, '--list', '--reporter=json'], true));
    const tests = selectedTests(report);
    console.log(`Browser review: ${tests.length} selected tests, including both smoke tests.`);
    executeTestList(tests, args);
    return;
  }

  // Default: core 29 tests + area-mapped specs + any changed test files + smoke tests
  const mapped = areaSpecs(files);
  const selected = new Set(smokeTests);

  const coreReport = JSON.parse(
    run(['test', '--grep', '@core', '--list', '--reporter=json'], true),
  );
  for (const testTitle of selectedTests(coreReport)) {
    selected.add(testTitle);
  }

  if (mapped.length) {
    const areaReport = JSON.parse(run(['test', ...mapped, '--list', '--reporter=json'], true));
    for (const testTitle of selectedTests(areaReport)) {
      selected.add(testTitle);
    }
  }

  const tests = [...selected];
  console.log(
    `Browser review: ${tests.length} selected tests (29-test @core subset + ${mapped.length} area-mapped spec files).`,
  );
  executeTestList(tests, args);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
