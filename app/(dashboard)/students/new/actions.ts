"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { STUDENT_ID_HINT, isValidStudentId, normalizeStudentId } from "../../../../lib/domain/studentId";

export async function registerStudent(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/new?error=${encodeURIComponent("Not authorized to register students.")}`);
  }

  const id = normalizeStudentId(String(formData.get("id") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const nominalYearLevel = Number(formData.get("nominalYearLevel"));

  if (!isValidStudentId(id)) {
    redirect(`/students/new?error=${encodeURIComponent(STUDENT_ID_HINT)}`);
  }

  const curriculumId = String(formData.get("curriculumId") ?? "");
  if (!curriculumId) {
    redirect(`/students/new?error=${encodeURIComponent("Please select a curriculum version.")}`);
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("students").insert({
    id,
    name,
    curriculum_id: curriculumId,
    nominal_year_level: nominalYearLevel,
  });

  if (error) {
    const message = error.code === "23505" ? `A student with the ID ${id} is already registered.` : error.message;
    redirect(`/students/new?error=${encodeURIComponent(message)}`);
  }

  redirect(`/students/${id}?success=${encodeURIComponent(`Registered ${name}.`)}`);
}