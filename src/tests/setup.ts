/**
 * Test Setup and Configuration
 *
 * This file runs before all tests and sets up the testing environment.
 * It includes:
 * - Environment variable verification
 * - Global test utilities
 * - Database cleanup helpers
 * - Testing library matchers
 */

import { config } from 'dotenv';
import '@testing-library/jest-dom';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.VITE_SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is not set. Tests require a Supabase connection.');
}

if (!process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not set. Tests require a Supabase connection.');
}

console.log('[Test Setup] Environment variables loaded successfully');
console.log('[Test Setup] Supabase URL:', process.env.VITE_SUPABASE_URL);

// Set test timeout warning
console.log('[Test Setup] Test timeout: 30 seconds');
console.log('[Test Setup] Ready to run tests...\n');
