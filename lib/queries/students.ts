import { createServerClientForUser } from "../domain/supabase/serverClient";
import { SupabaseAcademicRecordRepository } from "../domain/import/SupabaseAcademicRecordRepository";
import { AuditEngine } from "../domain/AuditEngine";
import type { AuditResult } from "../domain/AuditResult";
import type { Subject } from "../domain/Subject";
import { searchTerms } from "../domain/searchTerms";
import { enrollmentStatus, type EnrollmentStatus } from "../domain/enrollmentStatus";
import { getCurrentTerm } from "./yearLevels";
import type { YearLevelInfo } from "../domain/yearLevels";

export interface StudentSearchResult {
  id: string;
  name: string;
  program: string;
}

type StudentListRow = {
  id: string;
  name: string;
  nominal_year_level: number;
  curricula: { program: string; effective_year: number } | { program: string; effective_year: number }[] | null;
};

export interface StudentListItem {
  id: string;
  name: string;
  program: string;
  curriculumYear: number | null;
  /** Worked out from what the student has finished (see AuditEngine.yearLevel). */
  yearLevel: number;
}

/**
 * Students the current user can see (row-level security scopes this),
 * optionally filtered: every word must match the ID or the name, so
 * "Doe, John" and "john doe" both find "Doe, John James".
 */
export async function listStudents(query = "", limit = 100): Promise<StudentListItem[]> {
  const rows = await findStudents(query, limit);
  const client = await createServerClientForUser();
  const [records, currentTerm] = await Promise.all([
    new SupabaseAcademicRecordRepository(client).getRecords(rows.map((r) => r.id)),
    getCurrentTerm(),
  ]);
  const engine = new AuditEngine();
  return rows.map(({ registeredYearLevel, ...row }) => {
    const record = records.get(row.id);
    return { ...row, yearLevel: record ? engine.yearLevel(record, currentTerm?.term ?? null).level : registeredYearLevel };
  });
}

async function findStudents(query: string, limit: number) {
  const client = await createServerClientForUser();
  let request = client
    .from("students")
    .select("id, name, nominal_year_level, curricula(program, effective_year)")
    .order("name")
    .limit(limit);
  for (const term of searchTerms(query)) {
    request = request.or(`id.ilike.%${term}%,name.ilike.%${term}%`);
  }
  const { data, error } = await request;
  if (error) throw error;

  return ((data ?? []) as StudentListRow[]).map((row) => {
    const curricula = Array.isArray(row.curricula) ? row.curricula[0] : row.curricula;
    return {
      id: row.id,
      name: row.name,
      program: curricula?.program ?? "Unknown",
      curriculumYear: curricula?.effective_year ?? null,
      registeredYearLevel: row.nominal_year_level,
    };
  });
}

export async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  if (searchTerms(query).length === 0) return [];
  const students = await findStudents(query, 20);
  return students.map(({ id, name, program }) => ({ id, name, program }));
}

export interface StudentAuditRow {
  subject: Subject;
  result: AuditResult;
  grade: number | null;
  /** The term the subject was taken, and the term its INC was resolved, if any. */
  term: string | null;
  resolvedTerm: string | null;
}

export interface StudentAuditData {
  studentId: string;
  studentName: string;
  program: string;
  /** The year level for the current semester, and what it's based on. */
  yearLevel: YearLevelInfo;
  /** Regular or irregular this semester, per the Operations Manual. */
  enrollment: EnrollmentStatus;
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

  const currentTerm = (await getCurrentTerm())?.term ?? null;
  const audit = new AuditEngine().auditStudent(record, currentTerm);
  const results = new Map(audit.results.map((r) => [r.subjectCode, r]));
  const rows: StudentAuditRow[] = record.curriculum.allSubjects().map((subject) => {
    const attempt = record.recordOf(subject.code);
    return {
      subject,
      result: results.get(subject.code)!,
      grade: record.gradeOf(subject.code),
      term: attempt?.term ?? null,
      resolvedTerm: attempt?.resolvedTerm ?? null,
    };
  });

  // Within a semester, subjects keep the curriculum's own order.
  rows.sort((a, b) => a.subject.yearLevel - b.subject.yearLevel || a.subject.semester - b.subject.semester);

  return {
    studentId: record.studentId,
    studentName: studentRow.name,
    program: record.curriculum.program,
    yearLevel: audit.yearLevel,
    enrollment: enrollmentStatus(record, currentTerm, audit.yearLevel.level),
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
  currentTerm: string | null;
  /** Whether the student can take it now (or is already taking it, in order), per the audit. */
  canTake: boolean;
  /** Why not, when they can't. */
  blockedReason: string | null;
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

  const audit = new Map(new AuditEngine().auditCurriculum(record).map((r) => [r.subjectCode, r]));
  const subjects: GradeEntrySubjectRow[] = record.curriculum.allSubjects().map((subject) => {
    const status = record.statusOf(subject.code);
    const result = audit.get(subject.code)!;
    const canTake = result.status === "AVAILABLE" || (status === "IN_PROGRESS" && result.status === "PENDING");
    return {
      code: subject.code,
      title: subject.title,
      yearLevel: subject.yearLevel,
      semester: subject.semester,
      currentGrade: record.gradeOf(subject.code),
      currentStatus: status,
      currentTerm: record.recordOf(subject.code)?.term ?? null,
      canTake,
      blockedReason:
        canTake || status === "PASSED" || result.reasons.length === 0
          ? null
          : result.status === "VIOLATION"
            ? `Taken out of order: ${result.reasons.join("; ")}`
            : result.status === "UNAVAILABLE"
              ? `Can’t take yet. Needs: ${result.reasons.join("; ")}`
              : `Can’t take yet: ${result.reasons.join("; ")}`,
    };
  });

  return {
    studentId: record.studentId,
    studentName: studentRow.name,
    program: record.curriculum.program,
    subjects,
  };
}