import { createClient } from "@supabase/supabase-js";

/**
 * Elevated, RLS-bypassing client — for scripts, seeding, and admin
 * tasks only. NEVER use this to serve a real user's request; use
 * serverClient.ts for that, which respects the logged-in user's
 * session and Row Level Security.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, secretKey);
}