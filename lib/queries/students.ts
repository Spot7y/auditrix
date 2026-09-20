import { createServerClientForUser } from "../domain/supabase/serverClient";
import { SupabaseAcademicRecordRepository } from "../domain/import/SupabaseAcademicRecordRepository";
import { AuditEngine } from "../domain/AuditEngine";
import type { AuditResult } from "../domain/AuditResult";
import type { Subject } from "../domain/Subject";

export interface StudentSearchResult {
  id: string;
  name: string;
  program: string;
}

export async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

const client = await createServerClientForUser();
  const { data, error } = await client
    .from("students")
    .select("id, name, curricula(program)")
    .or(`id.ilike.%${trimmed}%,name.ilike.%${trimmed}%`)
    .limit(20);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    curricula: { program: string } | { program: string }[] | null;
  }>;

  return rows.map((row) => {
    const curricula = Array.isArray(row.curricula) ? row.curricula[0] : row.curricula;
    return {
      id: row.id,
      name: row.name,
      program: curricula?.program ?? "Unknown",
    };
  });
}

export interface StudentAuditRow {
  subject: Subject;
  result: AuditResult;
  grade: number | null;
}

export interface StudentAuditData {
  studentId: string;
  studentName: string;
  program: string;
  nominalYearLevel: number;
  rows: StudentAuditRow[];
}

export async function getStudentAudit(studentId: string): Promise<StudentAuditData | null> {
  const client = await createServerClientForUser();
  const repository = new SupabaseAcademicRecordRepository(client);
  const record = await repository.getRecord(studentId);
  if (!record) return null;

  const { data: studentRow, error } = await client
    .from("students")
    .select("name")
    .eq("id", studentId)
    .single();
  if (error) throw error;

  const engine = new AuditEngine();
const rows: StudentAuditRow[] = record.curriculum
    .allSubjects()
    .map((subject) => ({ subject, result: engine.auditSubject(record, subject), grade: record.gradeOf(subject.code) }));

  rows.sort((a, b) => {
    if (a.subject.yearLevel !== b.subject.yearLevel) return a.subject.yearLevel - b.subject.yearLevel;
    if (a.subject.semester !== b.subject.semester) return a.subject.semester - b.subject.semester;
    return a.subject.code.localeCompare(b.subject.code);
  });

  return {
    studentId: record.studentId,
    studentName: studentRow.name,
    program: record.curriculum.program,
    nominalYearLevel: record.nominalYearLevel,
    rows,
  };
}

export interface GradeEntrySubjectRow {
  code: string;
  title: string;
  yearLevel: number;
  semester: number;
  currentGrade: number | null;
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "IN_PROGRESS" | "NOT_TAKEN";
}

export async function getStudentGradeEntryData(
  studentId: string
): Promise<{ studentId: string; studentName: string; program: string; subjects: GradeEntrySubjectRow[] } | null> {
  const supabase = await createServerClientForUser();
  const repository = new SupabaseAcademicRecordRepository(supabase);
  const record = await repository.getRecord(studentId);
  if (!record) return null;

  const { data: studentRow, error } = await supabase.from("students").select("name").eq("id", studentId).single();
  if (error) throw error;

  const subjects: GradeEntrySubjectRow[] = record.curriculum.allSubjects().map((subject) => ({
    code: subject.code,
    title: subject.title,
    yearLevel: subject.yearLevel,
    semester: subject.semester,
    currentGrade: record.gradeOf(subject.code),
    currentStatus: record.statusOf(subject.code),
  }));

  return {
    studentId: record.studentId,
    studentName: studentRow.name,
    program: record.curriculum.program,
    subjects,
  };
}