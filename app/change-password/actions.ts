"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../lib/domain/supabase/serverClient";
import { createAdminClient } from "../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../lib/queries/staff";
import { passwordProblem } from "../../lib/domain/passwordPolicy";

export async function setFirstPassword(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/auth/no-access");

  const newPassword = String(formData.get("newPassword") ?? "");
  const problem = passwordProblem(newPassword, String(formData.get("confirmPassword") ?? ""));
  if (problem) redirect(`/change-password?error=${encodeURIComponent(problem)}`);

  const supabase = await createServerClientForUser();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) redirect(`/change-password?error=${encodeURIComponent(error.message)}`);

  // Staff can't change this flag themselves (only their name), so the server clears it.
  const admin = createAdminClient();
  const { error: flagError } = await admin.from("staff").update({ must_change_password: false }).eq("id", staff!.id);
  if (flagError) redirect(`/change-password?error=${encodeURIComponent(flagError.message)}`);

  redirect(`/home?success=${encodeURIComponent("Password saved. Welcome to Auditrix!")}`);
}
