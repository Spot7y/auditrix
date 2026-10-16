import { createServerClientForUser } from "../domain/supabase/serverClient";

export interface CollegeHistoryEntry {
  id: string;
  event: "DEAN_HANDOVER" | "COLLEGE_SPLIT" | "COLLEGE_CREATED" | "COLLEGE_RENAMED";
  summary: string;
  recordedBy: string;
  recordedAt: string;
}

/** Deanship handovers, splits and renames of the signed-in dean's college, newest first. */
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

export interface EmptyCollege {
  id: string;
  name: string;
  shortName: string;
}

/**
 * Colleges that exist but have no programs and no dean yet (e.g. added
 * ahead of time): a split can move programs into one of these.
 */
export async function getEmptyColleges(): Promise<EmptyCollege[]> {
  // Deans can't see other colleges' staff, so this server-only check uses the
  // admin client and returns only the colleges' names.
  const { createAdminClient } = await import("../domain/supabase/adminClient");
  const admin = createAdminClient();
  const [colleges, curricula, staff] = await Promise.all([
    admin.from("colleges").select("id, name, short_name").order("name"),
    admin.from("curricula").select("college_id"),
    admin.from("staff").select("college_id"),
  ]);
  if (colleges.error) throw colleges.error;
  const used = new Set(
    [...(curricula.data ?? []), ...(staff.data ?? [])].map((r) => r.college_id as string | null).filter(Boolean)
  );
  return (colleges.data ?? [])
    .filter((c) => !used.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, shortName: c.short_name }));
}

/** The signed-in staff member's college: its name and short name. */
export async function getOwnCollege(collegeId: string): Promise<{ name: string; shortName: string } | null> {
  const supabase = await createServerClientForUser();
  const { data, error } = await supabase.from("colleges").select("name, short_name").eq("id", collegeId).maybeSingle();
  if (error) throw error;
  return data ? { name: data.name, shortName: data.short_name } : null;
}
