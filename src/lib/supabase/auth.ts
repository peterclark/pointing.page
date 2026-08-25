import { supabase } from "./client";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";

/**
 * Guarantee the client has a session, signing in anonymously if it does not.
 *
 * Every RLS policy keys on `auth.uid()`. Without a session that is NULL, and
 * the database can no longer tell one visitor's vote from another's — which is
 * why vote privacy used to live only in the browser. An anonymous session gives
 * each visitor a durable identity without asking them to sign up: no email, no
 * password, nothing the person has to do.
 *
 * The session persists in localStorage and its token auto-refreshes, so a
 * returning visitor keeps the same `auth.uid()` and therefore the same
 * participant rows.
 *
 * Must resolve before the first query runs — see `SessionGate`.
 */
export async function ensureSession(): Promise<Session | null> {
  const {
    data: { session },
    error: getError,
  } = await supabase.auth.getSession();

  if (getError) {
    console.error("[ensureSession] Failed to read session:", getError);
  }

  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    // Leaves the app usable read-only rather than blank: policies fail closed,
    // so an unauthenticated visitor sees revealed votes and nothing else.
    console.error("[ensureSession] Anonymous sign-in failed:", error);
    return null;
  }

  return data.session;
}

/**
 * Sign out the current user
 *
 * Signing out drops the anonymous identity too, so a fresh anonymous session is
 * established on the next boot. Rooms joined under the previous identity are not
 * carried across — the participant rows remain, but the new identity does not
 * own them.
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[signOut] Error:", error);
      toast.error("Failed to log out");
      throw error;
    }
    toast.success("Logged out successfully");
  } catch (error) {
    console.error("[signOut] Unexpected error:", error);
    throw error;
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[getCurrentUser] Error:", error);
    return null;
  }

  return user;
}

/**
 * Check if user is authenticated
 *
 * Note that with anonymous sign-in this is true for every visitor. Use
 * `isAnonymous` from `useAuth()` to distinguish a guest from someone who has
 * signed in with a provider.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
