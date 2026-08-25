/**
 * useAuth Hook
 *
 * Custom React hook for managing Supabase authentication state.
 * Provides reactive auth state updates using Supabase's onAuthStateChange listener.
 *
 * Features:
 * - Reactive auth state (user, session, isAuthenticated)
 * - Automatic session initialization on mount
 * - Real-time auth state changes (login/logout)
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```tsx
 * function ProfileButton() {
 *   const { user, isAuthenticated, isLoading } = useAuth();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <Avatar>
 *       {isAuthenticated ? <User /> : <LogIn />}
 *     </Avatar>
 *   );
 * }
 * ```
 */

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * Return type for useAuth hook
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  /**
   * True only for a user who signed in with a provider.
   *
   * Every visitor now holds a session, because RLS needs an `auth.uid()` to
   * key on — so "has a user" no longer means "has an account". This stays
   * account-shaped, which is what the profile and menu affordances care about.
   */
  isAuthenticated: boolean;
  /** True for a guest session created by `signInAnonymously()`. */
  isAnonymous: boolean;
  isLoading: boolean;
}

/**
 * Hook to manage authentication state with Supabase
 *
 * @returns Object containing user, session, isAuthenticated, and isLoading
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error("[useAuth] Error fetching session:", error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAnonymous = user?.is_anonymous === true;

  return {
    user,
    session,
    isAuthenticated: !!user && !isAnonymous,
    isAnonymous,
    isLoading,
  };
}
