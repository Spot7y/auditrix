"use server";

import { flashRedirect } from "../../../../lib/flash";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../../../lib/domain/supabase/adminClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { userMessage } from "../../../../lib/userMessage";

export async function acceptShiftIn(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Not authorized." };
  }

  const newCurriculumId = String(formData.get("newCurriculumId") ?? "");
  if (!newCurriculumId) {
    return { error: "Please select a curriculum version." };
  }

  const admin = createAdminClient();

  const { data: pendingRequest } = await admin
    .from("shift_requests")
    .select("from_program")
    .eq("student_id", studentId)
    .maybeSingle();
  if (!pendingRequest) {
    return { error: "This student no longer has a pending shift request." };
  }

  const { data: newCurriculum, error: curriculumError } = await admin
    .from("curricula")
    .select("id, program")
    .eq("id", newCurriculumId)
    .single();
  if (curriculumError || !newCurriculum) {
    return { error: "Destination curriculum not found." };
  }
  // The admin client bypasses row-level security, so a chairperson could
  // otherwise submit another program's curriculum ID and move the student there.
  if (newCurriculum!.program !== staff!.program) {
    return { error: "You can only accept students into your own program's curriculum." };
  }
  if (pendingRequest!.from_program === staff!.program) {
    return { error: "This student is already in your program." };
  }

  // Consumes the request, moves the student and logs both sides of the
  // shift in one transaction, so a failure part-way leaves nothing changed.
  const { error: acceptError } = await admin.rpc("accept_shift_in", {
    p_student_id: studentId,
    p_new_curriculum_id: newCurriculumId,
    p_recorded_by: staff!.name,
  });
  if (acceptError) {
    return { error: userMessage(acceptError) };
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  return flashRedirect(
    `/students/shift-in?success=${encodeURIComponent(`${studentId} has been accepted into ${newCurriculum!.program}.`)}`
  );
}