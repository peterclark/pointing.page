import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Use happy-dom for tests that need browser APIs (localStorage, navigator)
    // Use node environment for database tests
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 30000, // 30 seconds for database operations
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
