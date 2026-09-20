"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../lib/domain/supabase/serverClient";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerClientForUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Incorrect email or password.")}`);
  }
  redirect("/home");
}

export async function logout() {
  const supabase = await createServerClientForUser();
  await supabase.auth.signOut();
  redirect("/login");
}