"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../lib/domain/supabase/serverClient";
import { LoginThrottle } from "../../lib/domain/loginThrottle";
import { createAdminClient } from "../../lib/domain/supabase/adminClient";
import { SupabaseFailureStore } from "../../lib/domain/supabase/loginFailures";

/** Runs a throttle step; if the failures table can't be reached, logging in still works. */
async function safely<T>(step: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await step();
  } catch (error) {
    console.error("Login throttle unavailable:", error);
    return fallback;
  }
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const throttle = new LoginThrottle(new SupabaseFailureStore(createAdminClient()));
  if (await safely(() => throttle.isBlocked(email), false)) redirect("/login?error=too-many");

  const supabase = await createServerClientForUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status !== 429) await safely(() => throttle.recordFailure(email), undefined);
    const blocked = error.status === 429 || (await safely(() => throttle.isBlocked(email), false));
    // A code rather than the message itself, so the login page only ever
    // shows its own wording (a link can't put other text on it).
    redirect(`/login?error=${blocked ? "too-many" : "credentials"}`);
  }
  await safely(() => throttle.recordSuccess(email), undefined);
  redirect("/home");
}

export async function logout() {
  const supabase = await createServerClientForUser();
  await supabase.auth.signOut();
  redirect("/login");
}
/** Signs out after 30 minutes without activity (see components/IdleLogout). */
export async function logoutAfterInactivity() {
  const supabase = await createServerClientForUser();
  await supabase.auth.signOut();
  redirect("/login?reason=idle");
}
