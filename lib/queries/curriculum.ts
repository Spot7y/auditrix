import { createServerClientForUser } from "../domain/supabase/serverClient";
import { getCurrentStaff } from "./staff";

export interface CurriculumRequirementRow {
  id: string;
  type: "PREREQUISITE" | "COREQUISITE" | "YEAR_STANDING" | "COMPLETION";
  requiredSubjectCode: string | null;
  requiredYearLevel: number | null;
}

export interface CurriculumSubjectRow {
  id: string;
  code: string;
  title: string;
  units: number;
  yearLevel: number;
  semester: number;
  requirements: CurriculumRequirementRow[];
}

export interface CurriculumVersionSummary {
  id: string;
  effectiveYear: number;
}

export async function getCurriculumVersionsForStaff(): Promise<{ program: string; versions: CurriculumVersionSummary[] } | null> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) return null;

  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("curricula")
    .select("id, effective_year")
    .eq("program", staff.program)
    .order("effective_year", { ascending: false });
  if (error) throw error;

  return {
    program: staff.program,
    versions: (data ?? []).map((c) => ({ id: c.id as string, effectiveYear: c.effective_year as number })),
  };
}

/** Why a curriculum version with students can't be changed, and what to do instead. */
export const LOCKED_CURRICULUM_MESSAGE =
  "This curriculum version is locked because students are registered on it. To change the curriculum, create a new version.";

/**
 * How many students (any record status) are registered on a curriculum
 * version. A version with students is locked: its subjects and requirements
 * can't be changed (the database refuses it too).
 */
export async function countStudentsOnCurriculum(curriculumId: string): Promise<number> {
  const supabase = await createServerClientForUser();
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("curriculum_id", curriculumId);
  if (error) throw error;
  return count ?? 0;
}

export async function getCurriculumForStaff(
  curriculumId?: string
): Promise<{
  program: string;
  curriculumId: string;
  effectiveYear: number;
  subjects: CurriculumSubjectRow[];
  /** Students registered on this version; more than 0 means it's locked. */
  studentCount: number;
} | null> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) return null;

  const supabase = await createServerClientForUser();
  let curriculum: { id: string; effective_year: number } | null = null;

  if (curriculumId) {
    const { data, error } = await supabase
      .from("curricula")
      .select("id, effective_year, program")
      .eq("id", curriculumId)
      .maybeSingle();
    if (error || !data || data.program !== staff.program) return null;
    curriculum = { id: data.id, effective_year: data.effective_year };
  } else {
    const { data, error } = await supabase
      .from("curricula")
      .select("id, effective_year")
      .eq("program", staff.program)
      .order("effective_year", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    curriculum = data;
  }

  const { data: subjectRows, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, code, title, units, year_level, semester")
    .eq("curriculum_id", curriculum.id)
    .order("year_level")
    .order("semester")
    .order("created_at");
  if (subjectsError) throw subjectsError;

  const idToCode = new Map((subjectRows ?? []).map((s) => [s.id as string, s.code as string]));
  const subjectIds = (subjectRows ?? []).map((s) => s.id);

  const { data: reqRows, error: reqError } = await supabase
    .from("requirements")
    .select("id, subject_id, type, required_subject_id, required_year_level")
    .in("subject_id", subjectIds);
  if (reqError) throw reqError;

  const reqsBySubject = new Map<string, CurriculumRequirementRow[]>();
  for (const r of reqRows ?? []) {
    const list = reqsBySubject.get(r.subject_id) ?? [];
    list.push({
      id: r.id,
      type: r.type,
      requiredSubjectCode: r.required_subject_id ? idToCode.get(r.required_subject_id) ?? null : null,
      requiredYearLevel: r.required_year_level,
    });
    reqsBySubject.set(r.subject_id, list);
  }

  const subjects: CurriculumSubjectRow[] = (subjectRows ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    units: s.units,
    yearLevel: s.year_level,
    semester: s.semester,
    requirements: reqsBySubject.get(s.id) ?? [],
  }));

  const studentCount = await countStudentsOnCurriculum(curriculum.id);
  return { program: staff.program, curriculumId: curriculum.id, effectiveYear: curriculum.effective_year, subjects, studentCount };
}
/** The curriculum version a subject belongs to, so pages can load the right version. */
export async function getCurriculumIdForSubject(subjectId: string): Promise<string | null> {
  const supabase = await createServerClientForUser();
  const { data } = await supabase.from("subjects").select("curriculum_id").eq("id", subjectId).maybeSingle();
  return (data?.curriculum_id as string | undefined) ?? null;
}

export function describeRequirement(r: CurriculumRequirementRow): string {
  if (r.type === "YEAR_STANDING") return `Year ${r.requiredYearLevel} standing`;
  if (r.type === "COMPLETION") return "All subjects completed";
  if (r.type === "COREQUISITE") return `${r.requiredSubjectCode ?? "?"} (corequisite)`;
  return r.requiredSubjectCode ?? "?";
}
