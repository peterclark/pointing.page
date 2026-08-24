/**
 * Test Setup — live-database suites (`src/tests/db/`)
 *
 * These suites issue real queries against a Supabase instance (local via
 * `npm run supabase:start`, or a disposable staging project). They are NOT part
 * of the default `npm test` run because they need infrastructure and because
 * their cleanup helper deletes every room whose name starts with "Test".
 *
 * Run them with `npm run test:db`.
 */

import { config } from 'dotenv';

// Prefer an explicit test env file, then fall back to the normal local file.
config({ path: '.env.test.local' });
config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Live-database tests require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
      'Start a local stack with `npm run supabase:start`, then `npm run supabase:use-local`.\n' +
      'Never point these at production: cleanup deletes all rooms named "Test%".'
  );
}

import.meta.env.VITE_SUPABASE_URL = url;
import.meta.env.VITE_SUPABASE_ANON_KEY = anonKey;

console.log('[DB Test Setup] Target Supabase URL:', url);
