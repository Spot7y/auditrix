import { createServerClientForUser } from "../domain/supabase/serverClient";

type Client = Awaited<ReturnType<typeof createServerClientForUser>>;

export interface CurriculumChange {
  id: string;
  subjectCode: string | null;
  summary: string;
  changedBy: string;
  changedAt: string;
}

/**
 * Records a curriculum edit. Best effort: a failure here is logged on the
 * server but never blocks the edit itself.
 */
export async function logCurriculumChange(
  supabase: Client,
  entry: { curriculumId: string; summary: string; changedBy: string; subjectCode?: string | null }
) {
  const { error } = await supabase.from("curriculum_change_log").insert({
    curriculum_id: entry.curriculumId,
    subject_code: entry.subjectCode ?? null,
    summary: entry.summary,
    changed_by: entry.changedBy,
  });
  if (error) console.error("Could not record curriculum change:", error.message);
}

export async function getCurriculumHistory(curriculumId: string, limit = 15): Promise<CurriculumChange[]> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("curriculum_change_log")
    .select("id, subject_code, summary, changed_by, changed_at")
    .eq("curriculum_id", curriculumId)
    .order("changed_at", { ascending: false })
    .limit(limit);
  // Before the change-log migration is applied the table doesn't exist; show no history.
  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    subjectCode: row.subject_code,
    summary: row.summary,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  }));
}
