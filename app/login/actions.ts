"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../lib/domain/supabase/serverClient";
import { loginThrottle } from "../../lib/domain/loginThrottle";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (loginThrottle.isBlocked(email)) redirect("/login?error=too-many");

  const supabase = await createServerClientForUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status !== 429) loginThrottle.recordFailure(email);
    // A code rather than the message itself, so the login page only ever
    // shows its own wording (a link can't put other text on it).
    redirect(`/login?error=${error.status === 429 || loginThrottle.isBlocked(email) ? "too-many" : "credentials"}`);
  }
  loginThrottle.recordSuccess(email);
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
