"use server";

import { flashRedirect } from "../../../../../lib/flash";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
import { getRecordLock } from "../../../../../lib/queries/transitions";
import { LOCK_LABEL } from "../../../../../lib/format";
import { userMessage } from "../../../../../lib/userMessage";

export async function recordDropped(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Not authorized." };
  }
  await refuseIfLocked(studentId);

  const supabase = await createServerClientForUser();
  const { data: student } = await supabase.from("students").select("name").eq("id", studentId).maybeSingle();

  const { error } = await supabase.from("student_transitions").insert({
    student_id: studentId,
    student_name: student?.name ?? "Unknown",
    type: "DROPPED",
    from_program: staff!.program,
    to_program: null,
    recorded_by: staff!.name,
  });
  if (error) return { error: userMessage(error) };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Marked as dropped. The record is now locked.")}`);
}

export async function recordTransferOut(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Not authorized." };
  }
  await refuseIfLocked(studentId);

  const supabase = await createServerClientForUser();
  const { data: student } = await supabase.from("students").select("name").eq("id", studentId).maybeSingle();

  const { error } = await supabase.from("student_transitions").insert({
    student_id: studentId,
    student_name: student?.name ?? "Unknown",
    type: "TRANSFERRED_OUT",
    from_program: staff!.program,
    to_program: null,
    recorded_by: staff!.name,
  });
  if (error) return { error: userMessage(error) };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Marked as transferred out. The record is now locked.")}`);
}

export async function recordTransferIn(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Not authorized." };
  }

  const supabase = await createServerClientForUser();
  const { data: student } = await supabase.from("students").select("name").eq("id", studentId).maybeSingle();

  const { error } = await supabase.from("student_transitions").insert({
    student_id: studentId,
    student_name: student?.name ?? "Unknown",
    type: "TRANSFERRED_IN",
    from_program: null,
    to_program: staff!.program,
    recorded_by: staff!.name,
  });
  if (error) return { error: userMessage(error) };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Marked as transferred in.")}`);
}

export async function requestShiftOut(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Not authorized." };
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("shift_requests").insert({
    student_id: studentId,
    from_program: staff!.program,
    requested_by: staff!.name,
  });
  if (error) {
    const message = error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")
      ? "This student already has a pending shift request."
      : userMessage(error);
    return { error: message };
  }

  revalidatePath(`/students/${studentId}`);
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Shift request submitted.")}`);
}

export async function cancelShiftRequest(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return flashRedirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("shift_requests").delete().eq("student_id", studentId);
  if (error) return flashRedirect(`/students/${studentId}?error=${encodeURIComponent(userMessage(error))}`);

  revalidatePath(`/students/${studentId}`);
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Shift request cancelled.")}`);
}
/** Sends the chairperson back when the student's record is already locked. */
async function refuseIfLocked(studentId: string) {
  const lock = await getRecordLock(studentId);
  if (lock) {
    return flashRedirect(
      `/students/${studentId}?error=${encodeURIComponent(`This record is already locked (${LOCK_LABEL[lock.status].toLowerCase()}).`)}`
    );
  }
}

/** Unlocks a dropped or transferred-out student's record, e.g. when they come back. */
export async function reopenRecord(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return flashRedirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }
  if (!(await getRecordLock(studentId))) {
    return flashRedirect(`/students/${studentId}?error=${encodeURIComponent("This record isn’t locked.")}`);
  }

  const supabase = await createServerClientForUser();
  const { data: student } = await supabase.from("students").select("name").eq("id", studentId).maybeSingle();

  // Recording the reopening unlocks the record (a database trigger does it).
  const { error } = await supabase.from("student_transitions").insert({
    student_id: studentId,
    student_name: student?.name ?? "Unknown",
    type: "REOPENED",
    from_program: staff!.program,
    to_program: null,
    recorded_by: staff!.name,
  });
  if (error) return flashRedirect(`/students/${studentId}?error=${encodeURIComponent(userMessage(error))}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/home");
  return flashRedirect(`/students/${studentId}?success=${encodeURIComponent("Record reopened. It can be changed again.")}`);
}
