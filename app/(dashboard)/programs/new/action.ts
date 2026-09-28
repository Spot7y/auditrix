"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

export async function createProgram(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    redirect(`/programs/new?error=${encodeURIComponent("Only a dean account can create a new program.")}`);
  }

  const program = String(formData.get("program") ?? "").trim().toUpperCase();
  const effectiveYear = Number(formData.get("effectiveYear"));
  const chairName = String(formData.get("chairName") ?? "").trim();
  const chairEmail = String(formData.get("chairEmail") ?? "").trim();
  const chairPassword = String(formData.get("chairPassword") ?? "");

  if (!program || !effectiveYear || !chairName || !chairEmail || !chairPassword) {
    redirect(`/programs/new?error=${encodeURIComponent("All fields are required.")}`);
  }

  const admin = createAdminClient();

  // Staff access is scoped by program name, so a duplicate name would give
  // the new chairperson access to another program's students.
  const { data: existingCurricula, error: existingError } = await admin
    .from("curricula")
    .select("id")
    .eq("program", program)
    .limit(1);
  if (existingError) {
    redirect(`/programs/new?error=${encodeURIComponent(existingError.message)}`);
  }
  if (existingCurricula && existingCurricula.length > 0) {
    redirect(`/programs/new?error=${encodeURIComponent(`A program named ${program} already exists.`)}`);
  }

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: chairEmail,
    password: chairPassword,
    email_confirm: true,
  });
  if (userError || !newUser.user) {
    redirect(`/programs/new?error=${encodeURIComponent(userError?.message ?? "Could not create chairperson account.")}`);
  }

  // Curriculum and staff row are written in one transaction. The auth account
  // can't be part of it, so it's deleted again if the transaction fails.
  const { error: createError } = await admin.rpc("create_program_with_chairperson", {
    p_program: program,
    p_effective_year: effectiveYear,
    p_college_id: staff!.collegeId,
    p_chair_id: newUser!.user.id,
    p_chair_name: chairName,
  });
  if (createError) {
    await admin.auth.admin.deleteUser(newUser!.user.id);
    redirect(`/programs/new?error=${encodeURIComponent(createError.message)}`);
  }

  redirect("/home");
}