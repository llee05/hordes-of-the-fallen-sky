import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Browser-loaded application modules are invisible to Playwright's Node import graph.
// Only changes known to be outside that application can use --only-changed safely.
export function needsFullSuite(files) {
  return files.some(
    (file) =>
      /^(src|public)\//.test(file) ||
      !(
        /\.md$/.test(file) ||
        /^(docs|steam|desktop|\.github)\//.test(file) ||
        /^tests\/(unit|desktop|pages)\//.test(file) ||
        /^tests\/e2e\//.test(file) ||
        ['.prettierignore', '.gitignore', 'LICENSE'].includes(file)
      ),
  );
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

export function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log(
      'Usage: npm run test:e2e:changed -- [base-ref] [--spec=pattern ...] [Playwright options]',
    );
    console.log(
      'Default: changed tests + smoke; application/config edits fall back to the full suite.',
    );
    console.log(
      '--spec explicitly selects focused review coverage + smoke, even for application edits.',
    );
    return;
  }
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
  if (!focused.length && needsFullSuite(files)) {
    console.log('Browser review: application/config changes require the full suite.');
    run(['test', ...args]);
    return;
  }
  if (focused.length)
    console.log(
      'Browser review: explicit focused coverage; the full suite is still required in CI.',
    );
  const report = JSON.parse(
    run(
      [
        'test',
        ...(focused.length ? focused : [`--only-changed=${mergeBase}`]),
        '--list',
        '--reporter=json',
      ],
      true,
    ),
  );
  const tests = selectedTests(report);
  console.log(`Browser review: ${tests.length} selected tests, including both smoke tests.`);
  const scratch = mkdtempSync(join(tmpdir(), 'bh-e2e-review-'));
  try {
    const list = join(scratch, 'tests.txt');
    writeFileSync(list, tests.join('\n') + '\n');
    run(['test', '--test-list', list, ...args]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
