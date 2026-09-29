"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
import { STUDENT_ID_HINT, isValidStudentId, normalizeStudentId } from "../../../../../lib/domain/studentId";
import { isValidTerm } from "../../../../../lib/domain/Term";

export async function updateStudentInfo(formData: FormData) {
  const staff = await getCurrentStaff();
  const currentId = String(formData.get("currentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${currentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const newId = normalizeStudentId(String(formData.get("id") ?? ""));
  const name = String(formData.get("name") ?? "").trim();

  if (!newId || !name) {
    redirect(`/students/${currentId}/edit?error=${encodeURIComponent("ID and name are required.")}`);
  }
  // Only a changed ID is checked, so older records can still have their name edited.
  if (newId !== currentId && !isValidStudentId(newId)) {
    redirect(`/students/${currentId}/edit?error=${encodeURIComponent(STUDENT_ID_HINT)}`);
  }

  const supabase = await createServerClientForUser();
  const { data: updated, error } = await supabase
    .from("students")
    .update({ id: newId, name })
    .eq("id", currentId)
    .select("id");

  if (error) {
    const message =
      error.code === "23505" ? `Another student already has the ID ${newId}.` : error.message;
    redirect(`/students/${currentId}/edit?error=${encodeURIComponent(message)}`);
  }
  // Row-level security turns a disallowed update into "0 rows changed", not an error.
  if (!updated || updated.length === 0) {
    redirect(
      `/students/${currentId}/edit?error=${encodeURIComponent("The change couldn't be saved: your account isn't allowed to edit this student.")}`
    );
  }

  revalidatePath(`/students/${newId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  redirect(`/students/${newId}?success=${encodeURIComponent("Student details saved.")}`);
}

/** Sets one student's year level from a term, and records it in their year level history. */
export async function setYearLevel(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  const back = `/students/${studentId}/edit`;
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`${back}?error=${encodeURIComponent("Not authorized.")}`);
  }

  // "auto" sets the student back to their year level from grades.
  const rawYearLevel = String(formData.get("yearLevel") ?? "");
  const yearLevel = rawYearLevel === "auto" ? null : Number(rawYearLevel);
  const term = `${String(formData.get("termYear") ?? "").trim().padStart(2, "0")}-${String(formData.get("termSemester") ?? "").trim()}`;
  if (yearLevel !== null && (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 4)) {
    redirect(`${back}?error=${encodeURIComponent("Choose a year level from 1st to 4th year.")}`);
  }
  if (!isValidTerm(term)) {
    redirect(`${back}?error=${encodeURIComponent("Enter the term the year level starts from, e.g. 25 – 1.")}`);
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.rpc("set_student_year_level", {
    p_student_id: studentId,
    p_year_level: yearLevel,
    p_effective_term: term,
  });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  const message =
    yearLevel === null
      ? `Year level is automatic from ${term}.`
      : `Year level set to ${YEAR_LABEL[yearLevel]} from ${term}.`;
  redirect(`${back}?success=${encodeURIComponent(message)}`);
}

const YEAR_LABEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };