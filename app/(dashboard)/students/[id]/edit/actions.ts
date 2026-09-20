"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";

export async function updateStudentInfo(formData: FormData) {
  const staff = await getCurrentStaff();
  const currentId = String(formData.get("currentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${currentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const newId = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!newId || !name) {
    redirect(`/students/${currentId}/edit?error=${encodeURIComponent("ID and name are required.")}`);
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("students").update({ id: newId, name }).eq("id", currentId);

  if (error) {
    redirect(`/students/${currentId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/students/${newId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  redirect(`/students/${newId}`);
}