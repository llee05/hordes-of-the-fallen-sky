import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'phaser', test: /node_modules\/phaser/ }] },
      },
    },
  },
  test: { include: ['tests/unit/**/*.test.ts'] },
});
