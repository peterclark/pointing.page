/**
 * Supabase Client Singleton
 *
 * This module exports a typed Supabase client instance that is used throughout
 * the application for all database operations and real-time subscriptions.
 *
 * The client is configured with:
 * - Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * - Full TypeScript type safety via generated database types
 * - Automatic authentication and session management
 *
 * Usage:
 * ```ts
 * import { supabase } from '@/lib/supabase/client';
 *
 * const { data, error } = await supabase
 *   .from('rooms')
 *   .select('*')
 *   .eq('room_code', 'ABC12345');
 * ```
 *
 * @see /docs/realtime-subscriptions.md for subscription patterns
 * @see /docs/database-schema.md for schema documentation
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Validate environment variables at module load time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing environment variable: VITE_SUPABASE_URL\n' +
    'Please ensure .env.local is configured correctly.\n' +
    'See .env.local.example for the required format.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing environment variable: VITE_SUPABASE_ANON_KEY\n' +
    'Please ensure .env.local is configured correctly.\n' +
    'See .env.local.example for the required format.'
  );
}

/**
 * Typed Supabase client instance
 *
 * This client is configured with:
 * - Full TypeScript types from the database schema
 * - Automatic JWT token refresh
 * - Real-time subscription support
 * - Row Level Security (RLS) enforcement
 *
 * The client uses the anon/public key which is safe to expose in the browser.
 * All access control is enforced via RLS policies at the database level.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refresh JWT tokens before they expire
    autoRefreshToken: true,

    // Persist session in local storage for automatic login
    persistSession: true,

    // Detect when user switches tabs/windows
    detectSessionInUrl: true,
  },

  realtime: {
    // Reconnect automatically if connection is lost
    // Uses exponential backoff (1s, 2s, 4s, 8s, 16s)
    params: {
      eventsPerSecond: 10, // Rate limit for real-time events
    },
  },

  db: {
    // Return database schema with the query results for debugging
    schema: 'public',
  },
});

/**
 * Helper type to extract table row types from the Database type
 *
 * Usage:
 * ```ts
 * import type { Tables } from '@/lib/supabase/client';
 *
 * type Room = Tables<'rooms'>;
 * type Participant = Tables<'participants'>;
 * ```
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Helper type to extract table insert types from the Database type
 *
 * Usage:
 * ```ts
 * import type { TablesInsert } from '@/lib/supabase/client';
 *
 * type NewRoom = TablesInsert<'rooms'>;
 * type NewParticipant = TablesInsert<'participants'>;
 * ```
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Helper type to extract table update types from the Database type
 *
 * Usage:
 * ```ts
 * import type { TablesUpdate } from '@/lib/supabase/client';
 *
 * type RoomUpdate = TablesUpdate<'rooms'>;
 * type ParticipantUpdate = TablesUpdate<'participants'>;
 * ```
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/**
 * Helper type to extract enum types from the Database type
 *
 * Usage:
 * ```ts
 * import type { Enums } from '@/lib/supabase/client';
 *
 * type PointScale = Enums<'point_scale_enum'>; // 'fibonacci' | 't-shirt'
 * ```
 */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
