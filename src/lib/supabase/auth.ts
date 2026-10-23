import { supabase } from "./client";
import { toast } from "sonner";
import { getCaptchaToken } from "@/lib/captcha";
import type { Session } from "@supabase/supabase-js";

/** Shown when a write needs a session and `ensureSession` could not make one. */
export const SESSION_ERROR =
  "Couldn't start your session. Check your connection and try again.";

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

  let captchaToken: string | undefined;
  try {
    captchaToken = await getCaptchaToken();
  } catch (err) {
    // Sign-in is attempted anyway: if CAPTCHA protection is on it will be
    // refused and the app degrades to read-only, same as any sign-in failure.
    console.error("[ensureSession] CAPTCHA failed:", err);
  }

  const { data, error } = await supabase.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined
  );

  if (error) {
    // Leaves the app usable read-only rather than blank: policies fail closed,
    // so an unauthenticated visitor sees revealed votes and nothing else.
    console.error("[ensureSession] Anonymous sign-in failed:", error);
    return null;
  }

  return data.session;
}

export type OAuthProvider = "google" | "github";

const PENDING_PROVIDER_KEY = "pending_oauth_provider";

/** Called before `linkIdentity()`, so a conflict on return knows which provider to retry. */
export function rememberOAuthProvider(provider: OAuthProvider): void {
  try {
    sessionStorage.setItem(PENDING_PROVIDER_KEY, provider);
  } catch {
    // Without storage a conflict just leaves the visitor as a guest.
  }
}

/**
 * Finish signing in a returning user whose provider is already linked.
 *
 * Sign-in links the provider to the visitor's guest identity. When that
 * provider already belongs to an account, Supabase refuses the link and comes
 * back with `error_code=identity_already_exists`, leaving the guest session in
 * place. The person asked to sign in, so sign them in to that account instead.
 * Rooms joined as this guest stay with the guest.
 *
 * Returns true when it has started the redirect to the provider.
 */
export async function resumeSignInAfterLinkConflict(): Promise<boolean> {
  const { location, history } = window;
  const params = new URLSearchParams(location.hash.slice(1));
  new URLSearchParams(location.search).forEach((value, key) => params.set(key, value));
  if (params.get("error_code") !== "identity_already_exists") return false;

  history.replaceState(null, "", location.pathname);

  let provider: string | null = null;
  try {
    provider = sessionStorage.getItem(PENDING_PROVIDER_KEY);
    sessionStorage.removeItem(PENDING_PROVIDER_KEY);
  } catch {
    // Fall through: nothing to retry with.
  }
  if (provider !== "google" && provider !== "github") return false;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${location.origin}/` },
  });
  if (error) {
    console.error("[resumeSignInAfterLinkConflict] Sign-in failed:", error);
    return false;
  }
  return true;
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
