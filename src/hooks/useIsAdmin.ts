import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin as fetchIsAdmin } from "@/lib/supabase/admin";

/**
 * Whether the current user is an admin. Guests never are, so the database is
 * only asked once someone has signed in with a provider.
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const [checked, setChecked] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchIsAdmin()
      .catch((error) => {
        console.error("[useIsAdmin]", error);
        return false;
      })
      .then((isAdmin) => {
        if (!cancelled) setChecked({ userId, isAdmin });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (authLoading) return { isAdmin: false, isLoading: true };
  if (!userId) return { isAdmin: false, isLoading: false };
  if (checked?.userId !== userId) return { isAdmin: false, isLoading: true };
  return { isAdmin: checked.isAdmin, isLoading: false };
}
