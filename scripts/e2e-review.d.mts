interface Suite {
  file?: string;
  title: string;
  specs?: { file: string; title: string }[];
  suites?: Suite[];
}
export function needsFullSuite(files: string[]): boolean;
export const smokeTests: string[];
export function selectedTests(
  report: { config?: { rootDir: string }; suites?: Suite[] },
  testDir?: string,
): string[];
export function main(args?: string[]): void;
