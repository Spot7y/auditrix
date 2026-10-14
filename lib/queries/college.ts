import { createServerClientForUser } from "../domain/supabase/serverClient";

export interface CollegeHistoryEntry {
  id: string;
  event: "DEAN_HANDOVER" | "COLLEGE_SPLIT" | "COLLEGE_CREATED";
  summary: string;
  recordedBy: string;
  recordedAt: string;
}

/** Deanship handovers and splits of the signed-in dean's college, newest first. */
export async function getCollegeHistory(): Promise<CollegeHistoryEntry[]> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase
    .from("college_history")
    .select("id, event, summary, recorded_by, recorded_at")
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    event: r.event,
    summary: r.summary,
    recordedBy: r.recorded_by,
    recordedAt: r.recorded_at,
  }));
}
