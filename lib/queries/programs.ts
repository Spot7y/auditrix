import { createServerClientForUser } from "../domain/supabase/serverClient";

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