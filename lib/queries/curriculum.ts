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

export async function getCurriculumForStaff(
  curriculumId?: string
): Promise<{ program: string; curriculumId: string; effectiveYear: number; subjects: CurriculumSubjectRow[] } | null> {
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

  return { program: staff.program, curriculumId: curriculum.id, effectiveYear: curriculum.effective_year, subjects };
}