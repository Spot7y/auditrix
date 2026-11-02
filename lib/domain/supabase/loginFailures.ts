import type { SupabaseClient } from "@supabase/supabase-js";
import type { FailureStore } from "../loginThrottle";

/**
 * Wrong-password attempts in the login_failures table. Only the server's
 * admin client can reach it; staff and the public can't read or change it.
 */
export class SupabaseFailureStore implements FailureStore {
  constructor(private readonly admin: SupabaseClient) {}

  async countSince(email: string, since: Date): Promise<number> {
    const { count, error } = await this.admin
      .from("login_failures")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("failed_at", since.toISOString());
    if (error) throw error;
    return count ?? 0;
  }

  async add(email: string, at: Date): Promise<void> {
    const { error } = await this.admin.from("login_failures").insert({ email, failed_at: at.toISOString() });
    if (error) throw error;
    // Attempts older than a day no longer matter.
    await this.admin.from("login_failures").delete().lt("failed_at", new Date(at.getTime() - 24 * 60 * 60 * 1000).toISOString());
  }

  async clear(email: string): Promise<void> {
    const { error } = await this.admin.from("login_failures").delete().eq("email", email);
    if (error) throw error;
  }
}
