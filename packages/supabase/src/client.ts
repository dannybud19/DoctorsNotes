import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

/**
 * Anon-key client, safe for the mobile/web client. RLS (keyed on `patient_id` via the `members`
 * table) enforces per-patient access — the anon key alone grants nothing without an authed session.
 * Keys are passed in by the caller from environment; never hardcode them (AGENTS.md §1.5).
 */
export function createAnonClient(url: string, anonKey: string): Db {
  if (!url || !anonKey) {
    throw new Error("createAnonClient: both url and anonKey are required");
  }
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Service-role client. SERVER-ONLY — never import into a client bundle. Bypasses RLS, so it must
 * only run in trusted server code (apps/web route handlers).
 */
export function createServiceClient(url: string, serviceRoleKey: string): Db {
  if (!url || !serviceRoleKey) {
    throw new Error("createServiceClient: both url and serviceRoleKey are required");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
