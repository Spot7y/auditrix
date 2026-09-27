import { createServerClientForUser } from "../domain/supabase/serverClient";
import { getCurrentStaff } from "./staff";
export interface CurriculumOption {
  id: string;
  program: string;
  effectiveYear: number;
}

export async function getAllCurriculumOptions(excludeProgram?: string): Promise<CurriculumOption[]> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("curricula")
    .select("id, program, effective_year")
    .order("program")
    .order("effective_year", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; program: string; effective_year: number }>;

  return rows
    .filter((c) => !excludeProgram || c.program !== excludeProgram)
    .map((c) => ({ id: c.id, program: c.program, effectiveYear: c.effective_year }));
}

export interface ProgramWithChairperson {
  program: string;
  chairpersonName: string | null;
}

export async function getProgramsWithChairpersonForDean(): Promise<ProgramWithChairperson[]> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "dean" || !staff.collegeId) return [];

  const supabase = await createServerClientForUser();

  const { data: curriculaRows, error: curriculaError } = await supabase
    .from("curricula")
    .select("program")
    .eq("college_id", staff.collegeId);
  if (curriculaError) throw curriculaError;

  const programs = [...new Set((curriculaRows ?? []).map((c) => c.program as string))];
  if (programs.length === 0) return [];

  const { data: chairRows, error: chairError } = await supabase
    .from("staff")
    .select("name, program")
    .eq("role", "chairperson")
    .in("program", programs);
  if (chairError) throw chairError;

  const chairByProgram = new Map((chairRows ?? []).map((c) => [c.program as string, c.name as string]));

  return programs
    .sort((a, b) => a.localeCompare(b))
    .map((program) => ({ program, chairpersonName: chairByProgram.get(program) ?? null }));
}