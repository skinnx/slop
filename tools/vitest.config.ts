import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  // Tests import game code from ../game/assets/scripts/core (outside tools/).
  server: { fs: { allow: [path.resolve(__dirname, '..')] } },
});
