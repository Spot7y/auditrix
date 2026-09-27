import { createServerClientForUser } from "../domain/supabase/serverClient";
import { createAdminClient } from "../domain/supabase/adminClient";
import { getCurrentStaff } from "./staff";

export interface TransitionRow {
  id: string;
  studentId: string;
  studentName: string;
  type: "TRANSFERRED_IN" | "TRANSFERRED_OUT" | "SHIFTED_IN" | "SHIFTED_OUT" | "DROPPED";
  fromProgram: string | null;
  toProgram: string | null;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
}

interface TransitionQueryRow {
  id: string;
  student_id: string;
  student_name: string;
  type: TransitionRow["type"];
  from_program: string | null;
  to_program: string | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
}

function mapRow(row: TransitionQueryRow): TransitionRow {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    type: row.type,
    fromProgram: row.from_program,
    toProgram: row.to_program,
    notes: row.notes,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
  };
}

export async function getRecentTransitions(): Promise<TransitionRow[]> {
  const staff = await getCurrentStaff();
  if (!staff) return [];

  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("student_transitions")
    .select("id, student_id, student_name, type, from_program, to_program, notes, recorded_by, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map(mapRow);
}

export async function getTransitionsForStudent(studentId: string): Promise<TransitionRow[]> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("student_transitions")
    .select("id, student_id, student_name, type, from_program, to_program, notes, recorded_by, recorded_at")
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(mapRow);
}

export async function getPendingShiftRequest(studentId: string): Promise<boolean> {
  const supabase = await createServerClientForUser();
  const { data } = await supabase.from("shift_requests").select("id").eq("student_id", studentId).maybeSingle();
  return !!data;
}

export interface PendingShiftLookupResult {
  studentId: string;
  studentName: string;
  fromProgram: string;
}

export async function lookupPendingShiftStudent(studentId: string): Promise<PendingShiftLookupResult | null> {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("shift_requests")
    .select("student_id, from_program")
    .eq("student_id", studentId)
    .maybeSingle();
  if (!request) return null;

  const { data: student } = await admin.from("students").select("name").eq("id", studentId).maybeSingle();
  if (!student) return null;

  return { studentId: request.student_id, studentName: student.name, fromProgram: request.from_program };
}