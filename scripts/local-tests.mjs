import { spawnSync } from 'node:child_process';
import { availableParallelism, loadavg } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), '..');

export async function waitForIdle({
  sample = () => ({ load: loadavg()[0], cpus: availableParallelism() }),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console.log,
} = {}) {
  // Leave at least half the logical CPUs idle before launching graphics work.
  for (let attempt = 0; attempt <= 6; attempt++) {
    const { load, cpus } = sample();
    if (load <= cpus * 0.5) return;
    if (attempt === 6)
      throw new Error(
        `Machine busy, results unreliable: 1-minute load ${load.toFixed(2)} exceeds half of ${cpus} CPUs. Retry test:perf when idle. No budgets measured.`,
      );
    log(
      `Machine busy: load ${load.toFixed(2)} / ${cpus} CPUs; waiting 5s before performance tests.`,
    );
    await sleep(5000);
  }
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export async function main(args = process.argv.slice(2)) {
  const locked = args[0] === '--locked';
  if (locked) args.shift();
  const mode = args.shift();
  if (!['local', 'e2e', 'desktop', 'perf', 'review'].includes(mode))
    throw new Error('Expected local, e2e, desktop, perf, or review');
  if (!locked) {
    console.log(
      `Waiting for ${mode === 'perf' ? 'exclusive' : 'shared'} browser lock: /tmp/bh-playwright.lock`,
    );
    // One blocking foreground acquisition; never poll the lock or nest acquisitions.
    const result = spawnSync(
      'flock',
      [
        mode === 'perf' ? '-x' : '-s',
        '/tmp/bh-playwright.lock',
        process.execPath,
        script,
        '--locked',
        mode,
        ...args,
      ],
      { cwd: root, stdio: 'inherit' },
    );
    if (result.error?.code !== 'ENOENT') {
      if (result.error) throw result.error;
      process.exitCode = result.status ?? 1;
      return;
    }
    console.warn('flock unavailable; running without browser test isolation.');
  }
  console.log(`Browser tests started: ${mode}`);
  const env = { ...process.env, BH_PERF_TESTS: mode === 'perf' ? '1' : '0' };
  const playwright = (...options) =>
    run(
      process.execPath,
      [join(root, 'node_modules/playwright/cli.js'), 'test', ...options, ...args],
      env,
    );
  if (mode === 'perf') await waitForIdle();
  if (mode === 'review') {
    run(process.execPath, [join(root, 'scripts/e2e-review.mjs'), ...args], env);
    return;
  }
  // Build once, before either performance measurement, while holding the lock.
  if (['local', 'desktop', 'perf'].includes(mode))
    run(process.execPath, [process.env.npm_execpath, 'run', 'build'], env);
  if (['local', 'e2e', 'perf'].includes(mode)) playwright();
  if (['local', 'desktop', 'perf'].includes(mode))
    playwright('--config', 'playwright.desktop.config.ts');
}

if (process.argv[1] && resolve(process.argv[1]) === script) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
