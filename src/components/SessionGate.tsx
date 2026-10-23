import { useEffect, useState } from "react";
import { ensureSession, resumeSignInAfterLinkConflict } from "@/lib/supabase/auth";

interface SessionGateProps {
  children: React.ReactNode;
}

/**
 * Holds the app back until a Supabase session exists.
 *
 * Every RLS policy keys on `auth.uid()`, so a query issued before the session
 * is established is evaluated as an anonymous stranger: it would return no
 * votes and reject every write. Rather than have each caller defend against
 * that race, the gate makes "a session exists" true for the whole tree beneath
 * it.
 *
 * Sign-in is a single network round trip against a locally cached token, so in
 * the common case this resolves before the first paint would have happened
 * anyway.
 *
 * If sign-in fails the children still render. The policies fail closed, so the
 * result is a read-only app showing revealed votes — degraded, but honest, and
 * better than a permanent spinner over a working network.
 */
export function SessionGate({ children }: SessionGateProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A returning user's sign-in comes back here as a link conflict; when that
    // redirects to the provider, keep the gate closed until the page unloads.
    resumeSignInAfterLinkConflict()
      .catch(() => false)
      .then((redirecting) => (redirecting ? new Promise<never>(() => {}) : ensureSession()))
      .catch((err) => {
        // ensureSession handles its own errors, so this only fires if it throws
        // outright. Swallow it here rather than surfacing an unhandled
        // rejection: the gate opens either way and the policies fail closed.
        console.error("[SessionGate] Session bootstrap failed:", err);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-sm">Starting session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
