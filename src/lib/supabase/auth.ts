import { supabase } from "./client";
import { toast } from "sonner";

/**
 * Sign out the current user
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
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
