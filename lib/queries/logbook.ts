import { createServerClientForUser } from "../domain/supabase/serverClient";

export interface LogbookEntry {
  id: string;
  status: string;
  grade: number | null;
  term: string | null;
  /** Set when this grade completed an INC in a later term. */
  resolvedTerm: string | null;
  changedBy: string;
  changedAt: string;
}

export interface LogbookSubjectGroup {
  subjectCode: string;
  subjectTitle: string;
  entries: LogbookEntry[];
}

export interface StudentLogbook {
  studentId: string;
  studentName: string;
  program: string;
  subjectGroups: LogbookSubjectGroup[];
}

interface LogRow {
  id: string;
  subject_id: string;
  new_status: string;
  new_grade: number | null;
  new_term: string | null;
  new_resolved_term: string | null;
  changed_by: string;
  changed_at: string;
}

interface SubjectRow {
  id: string;
  code: string;
  title: string;
}

export async function getStudentLogbook(studentId: string): Promise<StudentLogbook | null> {
  const supabase = await createServerClientForUser();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("name, curriculum_id, curricula(program)")
    .eq("id", studentId)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!studentRow) return null;

  const curricula = Array.isArray(studentRow.curricula) ? studentRow.curricula[0] : studentRow.curricula;

  const { data: subjectRows, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, code, title")
    .eq("curriculum_id", studentRow.curriculum_id);
  if (subjectsError) throw subjectsError;

  const subjectById = new Map(((subjectRows as SubjectRow[]) ?? []).map((s) => [s.id, s]));

  const { data: logRows, error: logError } = await supabase
    .from("grade_audit_log")
    .select("id, subject_id, new_status, new_grade, new_term, new_resolved_term, changed_by, changed_at")
    .eq("student_id", studentId)
    .order("changed_at", { ascending: true });
  if (logError) throw logError;

  const groupsBySubject = new Map<string, LogbookSubjectGroup>();
  for (const row of (logRows as LogRow[]) ?? []) {
    const subject = subjectById.get(row.subject_id);
    const code = subject?.code ?? "Unknown";
    const title = subject?.title ?? "Unknown subject";

    const group = groupsBySubject.get(code) ?? { subjectCode: code, subjectTitle: title, entries: [] };
    group.entries.push({
      id: row.id,
      status: row.new_status,
      grade: row.new_grade,
      term: row.new_term,
      resolvedTerm: row.new_resolved_term,
      changedBy: row.changed_by,
      changedAt: row.changed_at,
    });
    groupsBySubject.set(code, group);
  }

  const subjectGroups = [...groupsBySubject.values()].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

  return {
    studentId,
    studentName: studentRow.name as string,
    program: curricula?.program ?? "Unknown",
    subjectGroups,
  };
}