"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { describeTerm, isValidTerm } from "../../../lib/domain/Term";

function fail(message: string): never {
  redirect(`/home?error=${encodeURIComponent(message)}`);
}

/** The dean sets the current semester for every program in the college. */
export async function setCurrentTerm(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) fail("Only the dean can set the current semester.");

  const year = String(formData.get("termYear") ?? "").trim();
  const semester = String(formData.get("termSemester") ?? "").trim();
  const term = `${year.padStart(2, "0")}-${semester}`;
  if (!/^\d{1,2}$/.test(year) || !isValidTerm(term)) fail("Enter a 2-digit school year and a semester, e.g. 25 – 1.");

  const supabase = await createServerClientForUser();
  const { error } = await supabase
    .from("college_terms")
    .upsert(
      { college_id: staff.collegeId, current_term: term, set_by: staff.name, set_at: new Date().toISOString() },
      { onConflict: "college_id" }
    );
  if (error) fail(error.message);

  revalidatePath("/", "layout");
  redirect(`/home?success=${encodeURIComponent(`The current semester is now ${describeTerm(term)} (${term}).`)}`);
}
