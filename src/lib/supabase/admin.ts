/**
 * Admin-only reads. Both go through database functions that check the caller
 * against the `admins` table; see migration 20261023150000_admin_metrics.sql.
 */

import { supabase } from "./client";
import { DatabaseError } from "./queries";

/** The shape `admin_metrics()` returns. Days and hours are in UTC. */
export interface AdminMetrics {
  generated_at: string;
  users: {
    anonymous: number;
    registered: number;
    new_7d: number;
    /** People who joined two or more rooms. */
    returning: number;
  };
  rooms: {
    total: number;
    last_7d: number;
    active_24h: number;
    /** Rooms that revealed at least one story. */
    pointed: number;
    avg_people: number | null;
    solo: number;
    max_people: number;
    fibonacci: number;
    t_shirt: number;
  };
  stories: {
    total: number;
    revealed: number;
    votes: number;
    avg_votes: number | null;
  };
  daily: { day: string; rooms: number; stories: number; people: number }[];
  /** Rooms by headcount; `size` 10 means ten or more. Empty sizes are left out. */
  room_sizes: { size: number; rooms: number }[] | null;
  hours: { hour: number; events: number }[];
}

/** Whether the signed-in user may open the admin page. */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    throw new DatabaseError(`Failed to check admin access: ${error.message}`, error.code, error);
  }
  return data === true;
}

/** Usage across every room. `days` sets the window for the daily and hourly charts. */
export async function getAdminMetrics(days: number): Promise<AdminMetrics> {
  const { data, error } = await supabase.rpc("admin_metrics", { days });
  if (error) {
    throw new DatabaseError(`Failed to load metrics: ${error.message}`, error.code, error);
  }
  return data as unknown as AdminMetrics;
}
