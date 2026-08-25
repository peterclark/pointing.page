/**
 * Test Setup — unit / component / integration suites
 *
 * Runs before every test file in the default Vitest project.
 *
 * These suites never talk to a real Supabase instance: queries are mocked at
 * the module boundary. The Supabase client module still evaluates at import
 * time and throws when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
 * missing, so we supply inert placeholders when they are not already set.
 *
 * Suites that DO require a live database live in `src/tests/db/` and use
 * `vitest.db.config.ts` + `src/tests/setup.db.ts`, which fail loudly instead.
 */

import '@testing-library/jest-dom';

const PLACEHOLDER_URL = 'http://127.0.0.1:54321';
const PLACEHOLDER_ANON_KEY = 'test-anon-key';

process.env.VITE_SUPABASE_URL ||= PLACEHOLDER_URL;
process.env.VITE_SUPABASE_ANON_KEY ||= PLACEHOLDER_ANON_KEY;

// `import.meta.env` is what `src/lib/supabase/client.ts` actually reads.
import.meta.env.VITE_SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
import.meta.env.VITE_SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;
