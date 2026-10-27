import { expect, it, vi } from 'vitest';
import { waitForIdle } from '../../scripts/local-tests.mjs';

it('starts immediately on an idle host', async () => {
  const sleep = vi.fn();
  await waitForIdle({ sample: () => ({ load: 2, cpus: 8 }), sleep });
  expect(sleep).not.toHaveBeenCalled();
});

it('waits for load to settle before measuring', async () => {
  const sample = vi
    .fn()
    .mockReturnValueOnce({ load: 8, cpus: 8 })
    .mockReturnValue({ load: 4, cpus: 8 });
  const sleep = vi.fn();
  await waitForIdle({ sample, sleep, log: vi.fn() });
  expect(sleep).toHaveBeenCalledExactlyOnceWith(5000);
});

it('rejects persistently busy machines with an explicit reliability error', async () => {
  const sleep = vi.fn();
  await expect(
    waitForIdle({ sample: () => ({ load: 9, cpus: 8 }), sleep, log: vi.fn() }),
  ).rejects.toThrow('Machine busy, results unreliable');
  expect(sleep).toHaveBeenCalledTimes(6);
});
