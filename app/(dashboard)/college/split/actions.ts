"use server";

import { flashRedirect } from "../../../../lib/flash";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { passwordProblem } from "../../../../lib/domain/passwordPolicy";
import { userMessage } from "../../../../lib/userMessage";
import { nameProblem, normalizeName } from "../../../../lib/domain/names";
import { getEmptyColleges } from "../../../../lib/queries/college";


/**
 * The dean splits the college: chosen programs move to a new college with
 * its own dean. Only the programs' college changes; their curricula,
 * students, grades and history stay as they are.
 */
export async function splitCollege(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) {
    return { error: "Only a dean can split their college." };
  }

  // An existing college without programs or a dean, or "new" (or nothing) for a new one.
  const existing = String(formData.get("existingCollege") ?? "");
  const existingCollege = existing && existing !== "new" ? existing : null;
  const collegeName = String(formData.get("collegeName") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim().toUpperCase();
  const programs = [...new Set(formData.getAll("program").map((p) => String(p).trim()).filter(Boolean))];
  const deanName = normalizeName(String(formData.get("deanName") ?? ""));
  const deanEmail = String(formData.get("deanEmail") ?? "").trim();
  const deanPassword = String(formData.get("deanPassword") ?? "");

  if ((!existingCollege && (!collegeName || !shortName)) || !deanName || !deanEmail || !deanPassword) {
    return { error: "All fields are required." };
  }
  if (programs.length === 0) return { error: "Choose at least one program to move to the new college." };
  const weakPassword = passwordProblem(deanPassword);
  if (weakPassword) return { error: weakPassword };
  const badName = nameProblem(deanName);
  if (badName) return { error: badName };

  const admin = createAdminClient();

  // Checked before any account is made, for a clear message. (The admin
  // client bypasses row-level security; the database function checks the
  // programs again.)
  const { data: owned } = await admin.from("curricula").select("program").eq("college_id", staff!.collegeId!);
  const ownPrograms = new Set((owned ?? []).map((c) => c.program as string));
  if (programs.some((p) => !ownPrograms.has(p))) return { error: "Only programs of your own college can be moved." };
  if (programs.length >= ownPrograms.size) return { error: "At least one program has to stay in your college." };

  let destinationName = collegeName;
  if (existingCollege) {
    const chosen = (await getEmptyColleges()).find((c) => c.id === existingCollege);
    if (!chosen) {
      return { error: "That college already has programs or a dean. Choose another one, or a new college." };
    }
    destinationName = chosen!.name;
  } else {
    const { data: sameName } = await admin.from("colleges").select("name, short_name");
    const taken = (sameName ?? []).find(
      (c) => c.name.toLowerCase() === collegeName.toLowerCase() || c.short_name.toUpperCase() === shortName
    );
    if (taken) {
      return { error: `There is already a college named ${taken.name} (${taken.short_name}). If it has no programs yet, choose it from the list instead.` };
    }
  }

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: deanEmail,
    password: deanPassword,
    email_confirm: true,
  });
  if (userError || !newUser.user) {
    return { error: userError?.message ?? "Could not create the new dean's account." };
  }

  const { error: splitError } = await admin.rpc("split_college", {
    p_dean_id: staff!.id,
    p_existing_college: existingCollege,
    p_name: collegeName,
    p_short_name: shortName,
    p_programs: programs,
    p_new_dean_id: newUser!.user.id,
    p_new_dean_name: deanName,
  });
  if (splitError) {
    await admin.auth.admin.deleteUser(newUser!.user.id);
    return { error: userMessage(splitError) };
  }

  revalidatePath("/home");
  return flashRedirect(
    `/home?success=${encodeURIComponent(`${programs.join(", ")} moved to ${destinationName}. ${deanName} is its dean. To rename your college, go to College Name.`)}`
  );
}
