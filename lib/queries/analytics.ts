import { createServerClientForUser } from "../domain/supabase/serverClient";
import { SupabaseAcademicRecordRepository } from "../domain/import/SupabaseAcademicRecordRepository";
import { AuditEngine } from "../domain/AuditEngine";
import { getCurrentStaff } from "./staff";

export interface CurriculumVersionInfo {
  effectiveYear: number;
  subjectCount: number;
}

export interface ProgramSummary {
  program: string;
  curriculumVersions: CurriculumVersionInfo[];
  totalStudents: number;
  clearStudents: number;
  atRiskStudents: number;
  byYearLevel: Record<number, number>;
  regularStudents: number;
  irregularStudents: number;
  droppedCount: number;
  shiftedInCount: number;
  shiftedOutCount: number;
  transferredInCount: number;
  transferredOutCount: number;
}

interface StudentRow {
  id: string;
  nominal_year_level: number;
  curricula: { program: string } | { program: string }[] | null;
}

interface CurriculumRow {
  id: string;
  program: string;
  effective_year: number;
  college_id: string | null;
}

interface TransitionForCount {
  type: string;
  from_program: string | null;
  to_program: string | null;
}

function emptySummary(program: string): ProgramSummary {
  return {
    program,
    curriculumVersions: [],
    totalStudents: 0,
    clearStudents: 0,
    atRiskStudents: 0,
    byYearLevel: { 1: 0, 2: 0, 3: 0, 4: 0 },
    regularStudents: 0,
    irregularStudents: 0,
    droppedCount: 0,
    shiftedInCount: 0,
    shiftedOutCount: 0,
    transferredInCount: 0,
    transferredOutCount: 0,
  };
}

export async function getAnalytics(): Promise<ProgramSummary[]> {
  const staff = await getCurrentStaff();
  if (!staff) return [];

  const supabase = await createServerClientForUser();
  const byProgram = new Map<string, ProgramSummary>();

  function getOrCreate(program: string): ProgramSummary {
    let summary = byProgram.get(program);
    if (!summary) {
      summary = emptySummary(program);
      byProgram.set(program, summary);
    }
    return summary;
  }

  // Students — RLS already scopes this correctly per role
  const { data: studentRows, error: studentsError } = await supabase
    .from("students")
    .select("id, nominal_year_level, curricula(program)");
  if (studentsError) throw studentsError;

  const repository = new SupabaseAcademicRecordRepository(supabase);
  const engine = new AuditEngine();

  for (const row of (studentRows ?? []) as StudentRow[]) {
    const curricula = Array.isArray(row.curricula) ? row.curricula[0] : row.curricula;
    const program = curricula?.program ?? "Unknown";
    const summary = getOrCreate(program);

    const record = await repository.getRecord(row.id);
    let hasViolation = false;
    let isIrregular = false;

    if (record) {
      const auditResults = engine.auditCurriculum(record);
      hasViolation = auditResults.some((r) => r.status === "VIOLATION");

      // Irregular: a FAILED subject from an earlier year, still unretaken —
      // per the adviser's confirmed definition, distinct from "at risk"
      // (which is about right-now enrollment eligibility, not history).
      for (const subject of record.curriculum.allSubjects()) {
        if (subject.yearLevel < row.nominal_year_level && record.statusOf(subject.code) === "FAILED") {
          isIrregular = true;
          break;
        }
      }
    }

    summary.totalStudents += 1;
    summary.byYearLevel[row.nominal_year_level] = (summary.byYearLevel[row.nominal_year_level] ?? 0) + 1;
    if (hasViolation) summary.atRiskStudents += 1;
    else summary.clearStudents += 1;
    if (isIrregular) summary.irregularStudents += 1;
    else summary.regularStudents += 1;
  }

  // Curriculum versions — year + subject count per program.
  // curricula's RLS deliberately allows any staff member to read every
  // program (needed for the shift-destination picker elsewhere), so the
  // dashboard has to filter down to its own scope itself, not rely on RLS.
  const { data: curriculaRows, error: curriculaError } = await supabase
    .from("curricula")
    .select("id, program, effective_year, college_id");
  if (curriculaError) throw curriculaError;

  const scopedCurricula = ((curriculaRows ?? []) as CurriculumRow[]).filter((c) => {
    if (staff.role === "admin") return true;
    if (staff.role === "dean") return c.college_id === staff.collegeId;
    return c.program === staff.program;
  });

  for (const c of scopedCurricula) {
    const summary = getOrCreate(c.program);
    const { count, error: countError } = await supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("curriculum_id", c.id);
    if (countError) throw countError;

    summary.curriculumVersions.push({ effectiveYear: c.effective_year, subjectCount: count ?? 0 });
  }
  for (const summary of byProgram.values()) {
    summary.curriculumVersions.sort((a, b) => b.effectiveYear - a.effectiveYear);
  }

  // Dropped / shifted / transferred counts per program.
  // Transitions are visible if EITHER side involves your own program (so a
  // chairperson can see the paper trail of a student who shifted away) —
  // but that broader visibility must never spin up a dashboard section for
  // a program that isn't actually yours. Only add to a section that already
  // exists from the students/curriculum steps above; never create one here.
  const { data: transitionRows, error: transitionError } = await supabase
    .from("student_transitions")
    .select("type, from_program, to_program");
  if (transitionError) throw transitionError;

  for (const t of (transitionRows ?? []) as TransitionForCount[]) {
    if (t.type === "DROPPED" && t.from_program) {
      const summary = byProgram.get(t.from_program);
      if (summary) summary.droppedCount += 1;
    } else if (t.type === "SHIFTED_IN" && t.to_program) {
      const summary = byProgram.get(t.to_program);
      if (summary) summary.shiftedInCount += 1;
    } else if (t.type === "SHIFTED_OUT" && t.from_program) {
      const summary = byProgram.get(t.from_program);
      if (summary) summary.shiftedOutCount += 1;
    } else if (t.type === "TRANSFERRED_IN" && t.to_program) {
      const summary = byProgram.get(t.to_program);
      if (summary) summary.transferredInCount += 1;
    } else if (t.type === "TRANSFERRED_OUT" && t.from_program) {
      const summary = byProgram.get(t.from_program);
      if (summary) summary.transferredOutCount += 1;
    }
  }

  return [...byProgram.values()].sort((a, b) => a.program.localeCompare(b.program));
}