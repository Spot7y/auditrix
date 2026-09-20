import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return new Response("Not authorized.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const curriculumId = searchParams.get("curriculumId");
  if (!curriculumId) {
    return new Response("Missing curriculumId.", { status: 400 });
  }

  const supabase = await createServerClientForUser();

  const { data: curriculum, error: curriculumError } = await supabase
    .from("curricula")
    .select("id, program, effective_year")
    .eq("id", curriculumId)
    .single();
  if (curriculumError || !curriculum || curriculum.program !== staff.program) {
    return new Response("Curriculum not found.", { status: 404 });
  }

  const { data: subjectRows, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, code, title, units, year_level, semester")
    .eq("curriculum_id", curriculumId)
    .order("year_level")
    .order("semester")
    .order("created_at");
  if (subjectsError) return new Response(subjectsError.message, { status: 500 });

  const idToCode = new Map((subjectRows ?? []).map((s) => [s.id, s.code as string]));
  const subjectIds = (subjectRows ?? []).map((s) => s.id);

  const { data: requirementRows, error: requirementsError } = await supabase
    .from("requirements")
    .select("subject_id, type, required_subject_id, required_year_level")
    .in("subject_id", subjectIds);
  if (requirementsError) return new Response(requirementsError.message, { status: 500 });

  const requirementsBySubject = new Map<string, string[]>();
  for (const r of requirementRows ?? []) {
    const list = requirementsBySubject.get(r.subject_id) ?? [];
    if (r.type === "YEAR_STANDING") {
      list.push(`${r.required_year_level}th Yr Standing`);
    } else if (r.type === "COMPLETION") {
      list.push("All Subjects");
    } else {
      list.push(idToCode.get(r.required_subject_id) ?? "");
    }
    requirementsBySubject.set(r.subject_id, list);
  }

  const lines = ["code,title,units,year_level,semester,prerequisite"];
  for (const s of subjectRows ?? []) {
    const requirementText = (requirementsBySubject.get(s.id) ?? []).filter(Boolean).join(";");
    lines.push(
      [
        csvField(s.code),
        csvField(s.title),
        String(s.units),
        String(s.year_level),
        String(s.semester),
        csvField(requirementText),
      ].join(",")
    );
  }

  const csvContent = lines.join("\n");
  const filename = `${curriculum.program}-${curriculum.effective_year}-curriculum.csv`;

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}