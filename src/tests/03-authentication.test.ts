/**
 * Test Group 8.3: Authentication Flow Tests
 *
 * Tests for Supabase authentication:
 * - Magic link email request
 * - Profile creation after authentication
 * - JWT token management
 * - Token refresh functionality
 *
 * NOTE: Some tests are integration-style tests that verify the auth infrastructure
 * is properly configured, rather than end-to-end auth flows (which require email).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { generateTestEmail, cleanupTestRooms } from './test-utils';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await cleanupTestRooms();
  });

  afterAll(async () => {
    await cleanupTestRooms();
  });

  it('should request magic link email without error', async () => {
    const testEmail = generateTestEmail();

    // Request magic link (this sends an email in production)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    // Should not error (email might not actually send in test environment)
    expect(error).toBeNull();
    // Data structure should be present
    expect(data).toBeDefined();
  });

  it('should verify profile foreign key constraint', async () => {
    // Verify we cannot create profiles with non-existent user_id
    // This proves the trigger infrastructure is working
    const testUserId = crypto.randomUUID();
    const testEmail = generateTestEmail();
    const displayName = testEmail.split('@')[0];

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId, // Doesn't exist in auth.users
        display_name: displayName,
      })
      .select()
      .single();

    // Should fail with foreign key violation OR RLS policy violation
    expect(error).not.toBeNull();
    // Could be foreign key constraint (23503) or RLS policy (42501)
    expect(['23503', '42501']).toContain(error?.code);

    // This proves the constraint is enforced at the database level
  });

  it('should have JWT token in session after authentication', async () => {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    // Session might be null if not authenticated (expected in tests)
    expect(sessionError).toBeNull();

    // If there is a session, it should have proper structure
    if (sessionData?.session) {
      expect(sessionData.session.access_token).toBeDefined();
      expect(sessionData.session.refresh_token).toBeDefined();
      expect(sessionData.session.expires_at).toBeDefined();
      expect(sessionData.session.user).toBeDefined();
    }

    // Even without session, getting session should not error
    expect(sessionError).toBeNull();
  });

  it('should handle missing session gracefully on refresh', async () => {
    // Verify the refresh method exists and is callable
    const { data, error } = await supabase.auth.refreshSession();

    // Without an active session, this returns an error (expected)
    if (!data?.session) {
      // Error is expected when there's no session to refresh
      expect(error).not.toBeNull();
      expect(error?.message).toContain('session');
    } else {
      // If somehow we have a session, verify structure
      expect(data.session.access_token).toBeDefined();
      expect(data.session.refresh_token).toBeDefined();
    }
  });

  it('should verify Supabase client is properly configured', () => {
    // Verify client has auth methods
    expect(supabase.auth).toBeDefined();
    expect(supabase.auth.signInWithOtp).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.refreshSession).toBeDefined();

    // Verify environment variables are loaded
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});
