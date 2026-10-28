import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // Shared public atlas metadata is also bundled as raw text for UI illustrations.
  assetsInclude: ['**/art/steppe-*.json', '**/art/nomadic-camp-buildings.json'],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/phaser/ }] },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/game/state/**', 'src/game/data/**', 'src/shared/**'],
      thresholds: {
        'src/game/state/**': { lines: 95 },
        'src/game/data/**': { lines: 90 },
        'src/shared/**': { lines: 90 },
      },
    },
  },
});
