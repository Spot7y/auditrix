import { createServerClientForUser } from "../domain/supabase/serverClient";
import { getCurrentStaff } from "./staff";

export interface TransitionRow {
  id: string;
  studentId: string;
  studentName: string;
  type: "TRANSFERRED_IN" | "TRANSFERRED_OUT" | "SHIFTED_IN" | "SHIFTED_OUT";
  fromProgram: string | null;
  toProgram: string | null;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
}

interface TransitionQueryRow {
  id: string;
  student_id: string;
  type: TransitionRow["type"];
  from_program: string | null;
  to_program: string | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
  students: { name: string } | { name: string }[] | null;
}

function mapRow(row: TransitionQueryRow): TransitionRow {
  const student = Array.isArray(row.students) ? row.students[0] : row.students;
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: student?.name ?? "Unknown",
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
    .select("id, student_id, type, from_program, to_program, notes, recorded_by, recorded_at, students(name)")
    .order("recorded_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map(mapRow);
}

export async function getTransitionsForStudent(studentId: string): Promise<TransitionRow[]> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("student_transitions")
    .select("id, student_id, type, from_program, to_program, notes, recorded_by, recorded_at, students(name)")
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map(mapRow);
}