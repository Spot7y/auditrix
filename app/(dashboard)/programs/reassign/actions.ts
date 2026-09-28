"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { passwordProblem } from "../../../../lib/domain/passwordPolicy";

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
  const weakPassword = passwordProblem(chairPassword);
  if (weakPassword) redirect(`/programs/reassign?error=${encodeURIComponent(weakPassword)}`);

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

  // Removes every existing chairperson row for the program (normally one, but
  // stale rows from past reassignments are cleaned up too) and adds the new
  // one in a single transaction. The auth account can't be part of it, so
  // it's deleted again if the transaction fails.
  const { data: oldChairIds, error: replaceError } = await admin.rpc("replace_chairperson", {
    p_program: program,
    p_new_chair_id: newUser!.user.id,
    p_new_chair_name: chairName,
  });
  if (replaceError) {
    await admin.auth.admin.deleteUser(newUser!.user.id);
    redirect(`/programs/reassign?error=${encodeURIComponent(replaceError.message)}`);
  }

  // Their staff rows are already gone, which removes their access; banning
  // the auth accounts also stops them from logging in at all.
  for (const oldChairId of (oldChairIds as string[] | null) ?? []) {
    await admin.auth.admin.updateUserById(oldChairId, { ban_duration: "876000h" });
  }

  revalidatePath("/home");
  redirect(`/home?success=${encodeURIComponent(`${chairName} is now the chairperson of ${program}.`)}`);
}