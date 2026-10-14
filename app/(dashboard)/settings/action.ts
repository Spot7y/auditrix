"use server";

import { redirect } from "next/navigation";
import { flashRedirect } from "../../../lib/flash";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";
import { createAdminClient } from "../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { passwordProblem } from "../../../lib/domain/passwordPolicy";
import { userMessage } from "../../../lib/userMessage";

export async function updateName(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name cannot be empty." };

  const supabase = await createServerClientForUser();
  const { data: updated, error } = await supabase.from("staff").update({ name }).eq("id", staff!.id).select("id");
  if (error) return { error: userMessage(error) };
  // Row-level security turns a disallowed update into "0 rows changed", not an error.
  if (!updated || updated.length === 0) {
    return { error: "Your name couldn't be saved. Ask your administrator to apply the latest database update." };
  }

  return flashRedirect("/settings?success=" + encodeURIComponent("Name updated."));
}

export async function updatePassword(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "All password fields are required." };
  }
  const problem = passwordProblem(newPassword, confirmPassword);
  if (problem) return { error: problem };

  const supabase = await createServerClientForUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Could not verify account email." };

  // Verify the current password with a throwaway sign-in attempt — this
  // runs on a separate, temporary connection and never touches the real
  // logged-in session.
  const admin = createAdminClient();
  const { error: verifyError } = await admin.auth.signInWithPassword({
    email: user!.email!,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: userMessage(updateError) };

  return flashRedirect("/settings?success=" + encodeURIComponent("Password updated."));
}