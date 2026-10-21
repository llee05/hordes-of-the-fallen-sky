import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // Shared public atlas metadata is also bundled as raw text for UI illustrations.
  assetsInclude: ['**/art/steppe-*.json'],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/phaser/ }] },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
