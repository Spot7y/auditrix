"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { isValidTerm } from "../../../../lib/domain/Term";
import { plural } from "../../../../lib/format";

function fail(message: string): never {
  redirect(`/students/promote?error=${encodeURIComponent(message)}`);
}

/** Moves the checked students up one year level, all at once or not at all. */
export async function promoteStudents(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) fail("Only a chairperson can promote students.");

  const term = `${String(formData.get("termYear") ?? "").trim().padStart(2, "0")}-${String(formData.get("termSemester") ?? "").trim()}`;
  if (!isValidTerm(term)) fail("Enter the term the new year levels start from, e.g. 26 – 1.");

  const ids = [...new Set(formData.getAll("studentId").map(String).filter(Boolean))];
  if (ids.length === 0) fail("Select at least one student to promote.");

  const supabase = await createServerClientForUser();
  const { data, error } = await supabase.rpc("promote_students", { p_student_ids: ids, p_effective_term: term });
  if (error) fail(error.message);

  revalidatePath("/students", "layout");
  revalidatePath("/home");
  redirect(`/students?success=${encodeURIComponent(`Promoted ${plural(Number(data ?? ids.length), "student")} from ${term}.`)}`);
}
