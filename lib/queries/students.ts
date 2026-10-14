import { createServerClientForUser } from "../domain/supabase/serverClient";
import { fetchAll } from "../domain/supabase/fetchAll";
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
  record_status?: string;
  curricula: { program: string; effective_year: number } | { program: string; effective_year: number }[] | null;
};

export type StudentListStatus = "REGULAR" | "IRREGULAR" | "NOT_DETERMINED" | "DROPPED" | "TRANSFERRED_OUT";

export interface StudentListItem {
  id: string;
  name: string;
  program: string;
  curriculumYear: number | null;
  /** Worked out from what the student has finished (see AuditEngine.yearLevel). */
  yearLevel: number;
  /** Regular or irregular this semester, or why the record is closed. */
  status: StudentListStatus;
  violations: number;
  /** A short reason for the status, e.g. which subjects were taken out of order. */
  note: string | null;
}

/** "CPE 211, MATH 112 and 2 more". */
function codeList(codes: string[], shown = 3): string {
  if (codes.length <= shown) return codes.join(", ");
  return `${codes.slice(0, shown).join(", ")} and ${codes.length - shown} more`;
}

export interface StudentListFilters {
  q?: string;
  year?: number;
  curriculumYear?: number;
  /** A status, or "VIOLATIONS" for students with subjects taken out of order. */
  status?: StudentListStatus | "VIOLATIONS" | "CLOSED";
}

/**
 * Students the current user can see (row-level security scopes this) that
 * match the filters: every word of `q` must match the ID or the name, so
 * "Doe, John" and "john doe" both find "Doe, John James". Also returns the
 * curriculum versions in use, for the filter.
 */
export async function listStudents(
  filters: StudentListFilters = {},
  limit = 100
): Promise<{ students: StudentListItem[]; total: number; curriculumYears: number[] }> {
  const client = await createServerClientForUser();
  const rows = (
    await fetchAll((from, to) =>
      client
        .from("students")
        .select("id, name, nominal_year_level, record_status, curricula(program, effective_year)")
        .order("name")
        .order("id")
        .range(from, to)
    )
  ).map(toListRow);
  const curriculumYears = [...new Set(rows.map((r) => r.curriculumYear).filter((y): y is number => y !== null))].sort();

  const terms = searchTerms(filters.q ?? "").map((t) => t.toLowerCase());
  const matching = rows.filter(
    (r) =>
      terms.every((t) => r.id.toLowerCase().includes(t) || r.name.toLowerCase().includes(t)) &&
      (!filters.curriculumYear || r.curriculumYear === filters.curriculumYear)
  );

  const [records, currentTerm] = await Promise.all([
    new SupabaseAcademicRecordRepository(client).getRecords(matching.map((r) => r.id)),
    getCurrentTerm(),
  ]);
  const engine = new AuditEngine();
  const students: StudentListItem[] = matching.map(({ registeredYearLevel, recordStatus, ...row }) => {
    const record = records.get(row.id);
    if (!record) return { ...row, yearLevel: registeredYearLevel, status: "NOT_DETERMINED", violations: 0, note: null };
    const term = currentTerm?.term ?? null;
    const { results, yearLevel } = engine.auditStudent(record, term);
    const closed = recordStatus === "DROPPED" || recordStatus === "TRANSFERRED_OUT";
    const enrollment = enrollmentStatus(record, term, yearLevel.level);
    const outOfOrder = results.filter((r) => r.status === "VIOLATION").map((r) => r.subjectCode);

    const notes: string[] = [];
    if (outOfOrder.length > 0) notes.push(`Out of order: ${codeList(outOfOrder)}`);
    if (!closed && enrollment.kind === "IRREGULAR") notes.push(`Not enrolled in ${codeList(enrollment.missing)}`);

    return {
      ...row,
      yearLevel: yearLevel.level,
      status: closed ? recordStatus : enrollment.kind,
      violations: outOfOrder.length,
      note: notes.length ? notes.join(" · ") : null,
    };
  });

  const filtered = students.filter(
    (s) =>
      (!filters.year || s.yearLevel === filters.year) &&
      (!filters.status ||
        (filters.status === "VIOLATIONS"
          ? s.violations > 0
          : filters.status === "CLOSED"
            ? s.status === "DROPPED" || s.status === "TRANSFERRED_OUT"
            : s.status === filters.status))
  );
  return { students: filtered.slice(0, limit), total: filtered.length, curriculumYears };
}

function toListRow(row: StudentListRow) {
  const curricula = Array.isArray(row.curricula) ? row.curricula[0] : row.curricula;
  return {
    id: row.id,
    name: row.name,
    program: curricula?.program ?? "Unknown",
    curriculumYear: curricula?.effective_year ?? null,
    registeredYearLevel: row.nominal_year_level,
    recordStatus: (row.record_status ?? "ACTIVE") as StudentListStatus | "ACTIVE",
  };
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
  return ((data ?? []) as StudentListRow[]).map(toListRow);
}

/** How many students in the signed-in staff member's scope have an open record. */
export async function countActiveStudents(): Promise<number> {
  const supabase = await createServerClientForUser();
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "ACTIVE");
  if (error) return 0;
  return count ?? 0;
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
  const [record, { data: studentRow, error }, term] = await Promise.all([
    repository.getRecord(studentId),
    client.from("students").select("name").eq("id", studentId).maybeSingle(),
    getCurrentTerm(),
  ]);
  if (!record) return null;
  if (error) throw error;
  if (!studentRow) return null;

  const currentTerm = term?.term ?? null;
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
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "NOT_TAKEN";
  currentTerm: string | null;
  /** Why the student can't take it now, per the audit, if they can't. */
  blockedReason: string | null;
}

export async function getStudentGradeEntryData(
  studentId: string
): Promise<{ studentId: string; studentName: string; program: string; subjects: GradeEntrySubjectRow[] } | null> {
  const supabase = await createServerClientForUser();
  const repository = new SupabaseAcademicRecordRepository(supabase);
  const [record, { data: studentRow, error }] = await Promise.all([
    repository.getRecord(studentId),
    supabase.from("students").select("name").eq("id", studentId).maybeSingle(),
  ]);
  if (!record) return null;
  if (error) throw error;
  if (!studentRow) return null;

  const audit = new Map(new AuditEngine().auditCurriculum(record).map((r) => [r.subjectCode, r]));
  const subjects: GradeEntrySubjectRow[] = record.curriculum.allSubjects().map((subject) => {
    const status = record.statusOf(subject.code);
    const result = audit.get(subject.code)!;
    return {
      code: subject.code,
      title: subject.title,
      yearLevel: subject.yearLevel,
      semester: subject.semester,
      currentGrade: record.gradeOf(subject.code),
      currentStatus: status,
      currentTerm: record.recordOf(subject.code)?.term ?? null,
      blockedReason:
        result.status === "AVAILABLE" || status === "PASSED" || result.reasons.length === 0
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