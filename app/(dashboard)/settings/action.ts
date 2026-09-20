"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";
import { createAdminClient } from "../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../lib/queries/staff";

export async function updateName(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/settings?error=${encodeURIComponent("Name cannot be empty.")}`);

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("staff").update({ name }).eq("id", staff!.id);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=" + encodeURIComponent("Name updated."));
}

export async function updatePassword(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    redirect(`/settings?error=${encodeURIComponent("All password fields are required.")}`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/settings?error=${encodeURIComponent("New passwords do not match.")}`);
  }
  if (newPassword.length < 6) {
    redirect(`/settings?error=${encodeURIComponent("New password must be at least 6 characters.")}`);
  }

  const supabase = await createServerClientForUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/settings?error=${encodeURIComponent("Could not verify account email.")}`);

  // Verify the current password with a throwaway sign-in attempt — this
  // runs on a separate, temporary connection and never touches the real
  // logged-in session.
  const admin = createAdminClient();
  const { error: verifyError } = await admin.auth.signInWithPassword({
    email: user!.email!,
    password: currentPassword,
  });
  if (verifyError) {
    redirect(`/settings?error=${encodeURIComponent("Current password is incorrect.")}`);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) redirect(`/settings?error=${encodeURIComponent(updateError.message)}`);

  redirect("/settings?success=" + encodeURIComponent("Password updated."));
}