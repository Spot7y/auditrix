"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";

export async function recordDropped(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_transitions").insert({
    student_id: studentId,
    type: "DROPPED",
    from_program: staff!.program,
    to_program: null,
    recorded_by: staff!.name,
  });
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}`);
}

export async function recordTransferOut(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_transitions").insert({
    student_id: studentId,
    type: "TRANSFERRED_OUT",
    from_program: staff!.program,
    to_program: null,
    recorded_by: staff!.name,
  });
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}`);
}

export async function recordTransferIn(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("student_transitions").insert({
    student_id: studentId,
    type: "TRANSFERRED_IN",
    from_program: null,
    to_program: staff!.program,
    recorded_by: staff!.name,
  });
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}`);
}

export async function recordShift(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const newCurriculumId = String(formData.get("newCurriculumId") ?? "");
  const admin = createAdminClient();

  const { data: newCurriculum, error: curriculumError } = await admin
    .from("curricula")
    .select("id, program")
    .eq("id", newCurriculumId)
    .single();
  if (curriculumError || !newCurriculum) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Destination curriculum not found.")}`);
  }

  const { error: updateError } = await admin
    .from("students")
    .update({ curriculum_id: newCurriculumId })
    .eq("id", studentId);
  if (updateError) redirect(`/students/${studentId}?error=${encodeURIComponent(updateError.message)}`);

  const { error: outError } = await admin.from("student_transitions").insert({
    student_id: studentId,
    type: "SHIFTED_OUT",
    from_program: staff!.program,
    to_program: newCurriculum!.program,
    recorded_by: staff!.name,
  });
  if (outError) redirect(`/students/${studentId}?error=${encodeURIComponent(outError.message)}`);

  const { error: inError } = await admin.from("student_transitions").insert({
    student_id: studentId,
    type: "SHIFTED_IN",
    from_program: staff!.program,
    to_program: newCurriculum!.program,
    recorded_by: staff!.name,
  });
  if (inError) redirect(`/students/${studentId}?error=${encodeURIComponent(inError.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}`);
}