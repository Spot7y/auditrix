"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { passwordProblem } from "../../../../lib/domain/passwordPolicy";
import { userMessage } from "../../../../lib/userMessage";

const back = (error: string) => `/college/split?error=${encodeURIComponent(error)}`;

/**
 * The dean splits the college: chosen programs move to a new college with
 * its own dean. Only the programs' college changes; their curricula,
 * students, grades and history stay as they are.
 */
export async function splitCollege(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    redirect(back("Only a dean can split their college."));
  }

  const collegeName = String(formData.get("collegeName") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim().toUpperCase();
  const programs = [...new Set(formData.getAll("program").map((p) => String(p).trim()).filter(Boolean))];
  const deanName = String(formData.get("deanName") ?? "").trim();
  const deanEmail = String(formData.get("deanEmail") ?? "").trim();
  const deanPassword = String(formData.get("deanPassword") ?? "");

  if (!collegeName || !shortName || !deanName || !deanEmail || !deanPassword) {
    redirect(back("All fields are required."));
  }
  if (programs.length === 0) redirect(back("Choose at least one program to move to the new college."));
  const weakPassword = passwordProblem(deanPassword);
  if (weakPassword) redirect(back(weakPassword));

  const admin = createAdminClient();

  // Checked before any account is made, for a clear message. (The admin
  // client bypasses row-level security; the database function checks the
  // programs again.)
  const { data: owned } = await admin.from("curricula").select("program").eq("college_id", staff!.collegeId!);
  const ownPrograms = new Set((owned ?? []).map((c) => c.program as string));
  if (programs.some((p) => !ownPrograms.has(p))) redirect(back("Only programs of your own college can be moved."));
  if (programs.length >= ownPrograms.size) redirect(back("At least one program has to stay in your college."));

  const { data: sameName } = await admin.from("colleges").select("name, short_name");
  const taken = (sameName ?? []).find(
    (c) => c.name.toLowerCase() === collegeName.toLowerCase() || c.short_name.toUpperCase() === shortName
  );
  if (taken) redirect(back(`There is already a college named ${taken.name} (${taken.short_name}).`));

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: deanEmail,
    password: deanPassword,
    email_confirm: true,
  });
  if (userError || !newUser.user) {
    redirect(back(userError?.message ?? "Could not create the new dean's account."));
  }

  const { error: splitError } = await admin.rpc("split_college", {
    p_dean_id: staff!.id,
    p_name: collegeName,
    p_short_name: shortName,
    p_programs: programs,
    p_new_dean_id: newUser!.user.id,
    p_new_dean_name: deanName,
  });
  if (splitError) {
    await admin.auth.admin.deleteUser(newUser!.user.id);
    redirect(back(userMessage(splitError)));
  }

  revalidatePath("/home");
  redirect(
    `/home?success=${encodeURIComponent(`${programs.join(", ")} moved to ${collegeName}. ${deanName} is its dean.`)}`
  );
}
