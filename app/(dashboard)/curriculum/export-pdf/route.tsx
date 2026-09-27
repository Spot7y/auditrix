import { renderToBuffer } from "@react-pdf/renderer";
import { createServerClientForUser } from "../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import CurriculumPdfDocument from "./CurriculumPdfDocument";

export const runtime = "nodejs";

const YEAR_LABEL: Record<number, string> = { 1: "Year 1", 2: "Year 2", 3: "Year 3", 4: "Year 4" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First Semester", 2: "Second Semester", 3: "Midyear" };

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

  const typedSubjectRows = (subjectRows ?? []) as Array<{
    id: string;
    code: string;
    title: string;
    units: number;
    year_level: number;
    semester: number;
  }>;

  const idToCode = new Map(typedSubjectRows.map((s) => [s.id, s.code]));
  const subjectIds = typedSubjectRows.map((s) => s.id);

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

  const sectionsMap = new Map<string, { label: string; order: number; subjects: { code: string; title: string; units: number; requirementsText: string }[] }>();

  for (const s of typedSubjectRows) {
    const key = `${s.year_level}-${s.semester}`;
    const label = `${YEAR_LABEL[s.year_level] ?? `Year ${s.year_level}`} — ${SEMESTER_LABEL[s.semester] ?? `Semester ${s.semester}`}`;
    const order = s.year_level * 10 + s.semester;
    const section = sectionsMap.get(key) ?? { label, order, subjects: [] };
    section.subjects.push({
      code: s.code,
      title: s.title,
      units: s.units,
      requirementsText: (requirementsBySubject.get(s.id) ?? []).filter(Boolean).join(", ") || "None",
    });
    sectionsMap.set(key, section);
  }

  const sections = [...sectionsMap.values()].sort((a, b) => a.order - b.order);

  const pdfBuffer = await renderToBuffer(
    <CurriculumPdfDocument program={curriculum.program} effectiveYear={curriculum.effective_year} sections={sections} />
  );

  const filename = `${curriculum.program}-${curriculum.effective_year}-curriculum.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
