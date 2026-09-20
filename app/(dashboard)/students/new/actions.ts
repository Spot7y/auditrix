"use server";

import { redirect } from "next/navigation";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

export async function registerStudent(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/new?error=${encodeURIComponent("Not authorized to register students.")}`);
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const nominalYearLevel = Number(formData.get("nominalYearLevel"));

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
    redirect(`/students/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/students/${id}`);
}