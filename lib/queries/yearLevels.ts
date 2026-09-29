import { createServerClientForUser } from "../domain/supabase/serverClient";
import { compareTerms } from "../domain/Term";
import { promotionSkipReason, type PromotionSkipReason } from "../domain/yearLevels";

export interface CollegeTerm {
  term: string;
  setBy: string;
  setAt: string;
}

/**
 * The current term of the signed-in staff member's college, if its dean has
 * set one. (Row-level security returns only that college's row.)
 */
export async function getCurrentTerm(): Promise<CollegeTerm | null> {
  const client = await createServerClientForUser();
  const { data, error } = await client.from("college_terms").select("current_term, set_by, set_at").maybeSingle();
  if (error || !data) return null;
  return { term: data.current_term, setBy: data.set_by, setAt: data.set_at };
}

export interface YearLevelHistoryEntry {
  term: string;
  yearLevel: number;
  recordedBy: string;
  recordedAt: string;
}

/** A student's year level by term, oldest first. */
export async function getYearLevelHistory(studentId: string): Promise<YearLevelHistoryEntry[]> {
  const client = await createServerClientForUser();
  const { data, error } = await client
    .from("student_year_levels")
    .select("effective_term, year_level, recorded_by, recorded_at")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      term: row.effective_term as string,
      yearLevel: row.year_level as number,
      recordedBy: row.recorded_by as string,
      recordedAt: row.recorded_at as string,
    }))
    .sort((a, b) => compareTerms(a.term, b.term));
}

export interface PromotionCandidate {
  id: string;
  name: string;
  yearLevel: number;
  /** Why the student is left unchecked by default, if they are. */
  skipReason: PromotionSkipReason | null;
}

/** The chairperson's students, with whether each one should move up a year. */
export async function getPromotionCandidates(): Promise<PromotionCandidate[]> {
  const client = await createServerClientForUser();
  const { data: students, error } = await client.from("students").select("id, name, nominal_year_level").order("name");
  if (error) throw error;
  if (!students || students.length === 0) return [];

  // Every movement the chairperson can see (their program's), rather than a
  // long list of IDs in the request.
  const { data: movements, error: movementsError } = await client
    .from("student_transitions")
    .select("student_id, type, recorded_at")
    .order("recorded_at", { ascending: true });
  if (movementsError) throw movementsError;

  const latestMovement = new Map<string, string>();
  for (const m of movements ?? []) latestMovement.set(m.student_id, m.type);

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    yearLevel: s.nominal_year_level,
    skipReason: promotionSkipReason(s.nominal_year_level, latestMovement.get(s.id) ?? null),
  }));
}
