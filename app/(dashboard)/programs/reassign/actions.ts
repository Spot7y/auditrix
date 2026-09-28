"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

export async function reassignChairperson(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    redirect(`/programs/reassign?error=${encodeURIComponent("Only a dean account can reassign chairpersons.")}`);
  }

  const program = String(formData.get("program") ?? "").trim();
  const chairName = String(formData.get("chairName") ?? "").trim();
  const chairEmail = String(formData.get("chairEmail") ?? "").trim();
  const chairPassword = String(formData.get("chairPassword") ?? "");

  if (!program || !chairName || !chairEmail || !chairPassword) {
    redirect(`/programs/reassign?error=${encodeURIComponent("All fields are required.")}`);
  }

  const admin = createAdminClient();

  // The admin client bypasses row-level security, so check here that the
  // program belongs to this dean's college — the form only lists those
  // programs, but the submitted value can't be trusted.
  const { data: ownedCurricula, error: ownershipError } = await admin
    .from("curricula")
    .select("id")
    .eq("program", program)
    .eq("college_id", staff!.collegeId!)
    .limit(1);
  if (ownershipError || !ownedCurricula || ownedCurricula.length === 0) {
    redirect(`/programs/reassign?error=${encodeURIComponent("That program is not under your college.")}`);
  }

  // Find every existing chairperson row for this program — normally just
  // one, but past reassignments could have left stale rows behind, so this
  // cleans up all of them defensively rather than assuming exactly one.
  const { data: oldChairs } = await admin
    .from("staff")
    .select("id")
    .eq("role", "chairperson")
    .eq("program", program);

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: chairEmail,
    password: chairPassword,
    email_confirm: true,
  });
  if (userError || !newUser.user) {
    redirect(
      `/programs/reassign?error=${encodeURIComponent(userError?.message ?? "Could not create chairperson account.")}`
    );
  }

  const { error: staffError } = await admin.from("staff").insert({
    id: newUser!.user.id,
    name: chairName,
    role: "chairperson",
    program,
  });
  if (staffError) {
    redirect(`/programs/reassign?error=${encodeURIComponent(staffError.message)}`);
  }

  for (const oldChair of oldChairs ?? []) {
    await admin.auth.admin.updateUserById(oldChair.id, { ban_duration: "876000h" });
    await admin.from("staff").delete().eq("id", oldChair.id);
  }

  revalidatePath("/home");
  redirect("/home");
}