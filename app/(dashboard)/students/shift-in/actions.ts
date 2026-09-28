"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

export async function acceptShiftIn(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/shift-in?error=${encodeURIComponent("Not authorized.")}`);
  }

  const newCurriculumId = String(formData.get("newCurriculumId") ?? "");
  if (!newCurriculumId) {
    redirect(
      `/students/shift-in?id=${encodeURIComponent(studentId)}&error=${encodeURIComponent("Please select a curriculum version.")}`
    );
  }

  const admin = createAdminClient();

  const { data: pendingRequest } = await admin
    .from("shift_requests")
    .select("from_program")
    .eq("student_id", studentId)
    .maybeSingle();
  if (!pendingRequest) {
    redirect(`/students/shift-in?error=${encodeURIComponent("This student no longer has a pending shift request.")}`);
  }

  const { data: studentRow } = await admin.from("students").select("name").eq("id", studentId).maybeSingle();
  const studentName = studentRow?.name ?? "Unknown";

  const { data: newCurriculum, error: curriculumError } = await admin
    .from("curricula")
    .select("id, program")
    .eq("id", newCurriculumId)
    .single();
  if (curriculumError || !newCurriculum) {
    redirect(
      `/students/shift-in?id=${encodeURIComponent(studentId)}&error=${encodeURIComponent("Destination curriculum not found.")}`
    );
  }
  // The admin client bypasses row-level security, so a chairperson could
  // otherwise submit another program's curriculum ID and move the student there.
  if (newCurriculum!.program !== staff!.program) {
    redirect(
      `/students/shift-in?id=${encodeURIComponent(studentId)}&error=${encodeURIComponent("You can only accept students into your own program's curriculum.")}`
    );
  }
  if (pendingRequest!.from_program === staff!.program) {
    redirect(
      `/students/shift-in?id=${encodeURIComponent(studentId)}&error=${encodeURIComponent("This student is already in your program.")}`
    );
  }

  const { error: updateError } = await admin
    .from("students")
    .update({ curriculum_id: newCurriculumId })
    .eq("id", studentId);
  if (updateError) {
    redirect(`/students/shift-in?id=${encodeURIComponent(studentId)}&error=${encodeURIComponent(updateError.message)}`);
  }

  const { error: outError } = await admin.from("student_transitions").insert({
    student_id: studentId,
    student_name: studentName,
    type: "SHIFTED_OUT",
    from_program: pendingRequest!.from_program,
    to_program: newCurriculum!.program,
    recorded_by: staff!.name,
  });
  if (outError) redirect(`/students/shift-in?error=${encodeURIComponent(outError.message)}`);

  const { error: inError } = await admin.from("student_transitions").insert({
    student_id: studentId,
    student_name: studentName,
    type: "SHIFTED_IN",
    from_program: pendingRequest!.from_program,
    to_program: newCurriculum!.program,
    recorded_by: staff!.name,
  });
  if (inError) redirect(`/students/shift-in?error=${encodeURIComponent(inError.message)}`);

  await admin.from("shift_requests").delete().eq("student_id", studentId);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(
    `/students/shift-in?success=${encodeURIComponent(`${studentId} has been accepted into ${newCurriculum!.program}.`)}`
  );
}