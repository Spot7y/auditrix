"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";

export async function recordDropped(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

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
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}?success=${encodeURIComponent("Marked as dropped.")}`);
}

export async function recordTransferOut(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

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
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}?success=${encodeURIComponent("Marked as transferred out.")}`);
}

export async function recordTransferIn(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
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
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");
  redirect(`/students/${studentId}?success=${encodeURIComponent("Marked as transferred in.")}`);
}

export async function requestShiftOut(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
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
      : error.message;
    redirect(`/students/${studentId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}?success=${encodeURIComponent("Shift request submitted.")}`);
}

export async function cancelShiftRequest(formData: FormData) {
  const staff = await getCurrentStaff();
  const studentId = String(formData.get("studentId") ?? "");
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/students/${studentId}?error=${encodeURIComponent("Not authorized.")}`);
  }

  const supabase = await createServerClientForUser();
  const { error } = await supabase.from("shift_requests").delete().eq("student_id", studentId);
  if (error) redirect(`/students/${studentId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}?success=${encodeURIComponent("Shift request cancelled.")}`);
}