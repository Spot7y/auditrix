"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { passwordProblem } from "../../../../lib/domain/passwordPolicy";
import { userMessage } from "../../../../lib/userMessage";

const back = (error: string) => `/college/handover?error=${encodeURIComponent(error)}`;

/**
 * The dean hands the deanship over to a successor: the successor's account is
 * created with a temporary password, and the outgoing dean's account is
 * closed (their name stays on everything they recorded).
 */
export async function handOverDeanship(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    redirect(back("Only a dean can hand over the deanship."));
  }

  const name = String(formData.get("deanName") ?? "").trim();
  const email = String(formData.get("deanEmail") ?? "").trim();
  const password = String(formData.get("deanPassword") ?? "");
  if (!name || !email || !password) redirect(back("All fields are required."));
  const weakPassword = passwordProblem(password);
  if (weakPassword) redirect(back(weakPassword));

  const admin = createAdminClient();
  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !newUser.user) {
    redirect(back(userError?.message ?? "Could not create the new dean's account."));
  }

  // Swaps the dean and records the handover in one transaction. The auth
  // account can't be part of it, so it's deleted again if this fails.
  const { error: handoverError } = await admin.rpc("hand_over_deanship", {
    p_old_dean_id: staff!.id,
    p_new_dean_id: newUser!.user.id,
    p_new_dean_name: name,
  });
  if (handoverError) {
    await admin.auth.admin.deleteUser(newUser!.user.id);
    redirect(back(userMessage(handoverError)));
  }

  // The staff row is gone, which removes all access; banning the login stops
  // the outgoing dean from signing in at all.
  await admin.auth.admin.updateUserById(staff!.id, { ban_duration: "876000h" });
  const supabase = await createServerClientForUser();
  await supabase.auth.signOut();
  redirect("/login?reason=handover");
}
