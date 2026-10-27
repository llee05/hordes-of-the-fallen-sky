export function waitForIdle(options?: {
  sample?: () => { load: number; cpus: number };
  sleep?: (ms: number) => Promise<void> | void;
  log?: (message: string) => void;
}): Promise<void>;
