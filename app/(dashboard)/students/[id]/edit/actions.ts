"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
import { STUDENT_ID_HINT, isValidStudentId, normalizeStudentId } from "../../../../../lib/domain/studentId";

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