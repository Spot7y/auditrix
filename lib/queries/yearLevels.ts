import { createServerClientForUser } from "../domain/supabase/serverClient";
import { compareTerms } from "../domain/Term";

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
  /** Null for an override that set the student back to automatic. */
  yearLevel: number | null;
  source: "REGISTERED" | "CHAIRPERSON";
  recordedBy: string;
  recordedAt: string;
}

/** The year levels recorded for a student (registration and overrides), oldest first. */
export async function getYearLevelHistory(studentId: string): Promise<YearLevelHistoryEntry[]> {
  const client = await createServerClientForUser();
  const { data, error } = await client
    .from("student_year_levels")
    .select("effective_term, year_level, source, recorded_by, recorded_at")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      term: row.effective_term as string,
      yearLevel: row.year_level as number | null,
      source: row.source as "REGISTERED" | "CHAIRPERSON",
      recordedBy: row.recorded_by as string,
      recordedAt: row.recorded_at as string,
    }))
    .sort((a, b) => compareTerms(a.term, b.term) || a.recordedAt.localeCompare(b.recordedAt));
}
