import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Default Vitest config: unit, component and integration suites.
 *
 * These are hermetic — every Supabase call is mocked at the module boundary —
 * so they need no credentials and no running services. The live-database
 * suites live in `src/tests/db/` and use `vitest.db.config.ts` instead.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/tests/db/**', 'node_modules/**', 'dist/**'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Test code and fixtures
        'src/**/*.test.{ts,tsx}',
        'src/tests/**',
        // Vendored shadcn/ui primitives — upstream code, not ours to test
        'src/components/ui/**',
        // Generated from the Supabase schema
        'src/lib/supabase/database.types.ts',
        // Pure type declarations / app entrypoints with no branching logic
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Ratchet these upward as suites land; they are a floor, not a target.
      thresholds: {
        statements: 88,
        branches: 80,
        functions: 90,
        lines: 88,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
