import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the live-database suites in `src/tests/db/`.
 *
 * Kept separate from `vitest.config.ts` so that `npm test` stays hermetic and
 * fast. These tests need a reachable Supabase instance and run serially, since
 * they share a single database and clean up by deleting rooms named "Test%".
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/db/**/*.test.ts'],
    setupFiles: ['./src/tests/setup.db.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Shared database: parallel files would race on the cleanup helper.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
