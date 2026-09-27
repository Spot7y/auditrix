"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { normalizeCode, findMatchingCode } from "../../../lib/domain/import/codeMatching";
import type { ImportResult } from "../../../components/ImportDialog";

async function requireChairperson() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    redirect(`/curriculum?error=${encodeURIComponent("Only a chairperson account can manage curriculum.")}`);
  }
  return staff!;
}

export async function createCurriculumVersion(formData: FormData) {
  const staff = await requireChairperson();
  const supabase = await createServerClientForUser();

  const effectiveYear = Number(formData.get("effectiveYear"));
  if (!effectiveYear) redirect(`/curriculum?error=${encodeURIComponent("A valid year is required.")}`);

  const { data: sourceCurriculum } = await supabase
    .from("curricula")
    .select("id")
    .eq("program", staff.program)
    .order("effective_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newCurriculum, error: newCurriculumError } = await supabase
    .from("curricula")
    .insert({ program: staff.program, effective_year: effectiveYear })
    .select()
    .single();
  if (newCurriculumError) redirect(`/curriculum?error=${encodeURIComponent(newCurriculumError.message)}`);

  if (sourceCurriculum) {
    const { data: sourceSubjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, code, title, units, year_level, semester")
      .eq("curriculum_id", sourceCurriculum.id);
    if (subjectsError) redirect(`/curriculum?error=${encodeURIComponent(subjectsError.message)}`);

    const oldToNewSubjectId = new Map<string, string>();
    for (const s of sourceSubjects ?? []) {
      const { data: newSubject, error: insertError } = await supabase
        .from("subjects")
        .insert({
          curriculum_id: newCurriculum!.id,
          code: s.code,
          title: s.title,
          units: s.units,
          year_level: s.year_level,
          semester: s.semester,
        })
        .select()
        .single();
      if (insertError) redirect(`/curriculum?error=${encodeURIComponent(insertError.message)}`);
      oldToNewSubjectId.set(s.id as string, newSubject!.id as string);
    }

    const oldSubjectIds = [...oldToNewSubjectId.keys()];
    if (oldSubjectIds.length > 0) {
      const { data: sourceRequirements, error: reqFetchError } = await supabase
        .from("requirements")
        .select("subject_id, type, required_subject_id, required_year_level")
        .in("subject_id", oldSubjectIds);
      if (reqFetchError) redirect(`/curriculum?error=${encodeURIComponent(reqFetchError.message)}`);

      for (const r of sourceRequirements ?? []) {
        const newSubjectId = oldToNewSubjectId.get(r.subject_id as string);
        const newRequiredSubjectId = r.required_subject_id
          ? oldToNewSubjectId.get(r.required_subject_id as string)
          : null;

        const { error: reqInsertError } = await supabase.from("requirements").insert({
          subject_id: newSubjectId,
          type: r.type,
          required_subject_id: newRequiredSubjectId ?? null,
          required_year_level: r.required_year_level,
        });
        if (reqInsertError) redirect(`/curriculum?error=${encodeURIComponent(reqInsertError.message)}`);
      }
    }
  }

  revalidatePath("/curriculum");
  redirect(`/curriculum?version=${newCurriculum!.id}`);
}

export async function createSubject(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();

  const curriculumId = String(formData.get("curriculumId") ?? "");
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const units = Number(formData.get("units"));
  const yearLevel = Number(formData.get("yearLevel"));
  const semester = Number(formData.get("semester"));

  const { error } = await supabase.from("subjects").insert({
    curriculum_id: curriculumId,
    code,
    title,
    units,
    year_level: yearLevel,
    semester,
  });
  if (error) redirect(`/curriculum/new?curriculumId=${curriculumId}&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum?version=${curriculumId}`);
}

export async function updateSubject(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();

  const subjectId = String(formData.get("subjectId") ?? "");
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const units = Number(formData.get("units"));
  const yearLevel = Number(formData.get("yearLevel"));
  const semester = Number(formData.get("semester"));

  const { error } = await supabase
    .from("subjects")
    .update({ code, title, units, year_level: yearLevel, semester })
    .eq("id", subjectId);
  if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);

  const { data: subjectRow } = await supabase.from("subjects").select("curriculum_id").eq("id", subjectId).single();

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum?version=${subjectRow?.curriculum_id ?? ""}`);
}

export async function deleteSubject(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();
  const subjectId = String(formData.get("subjectId") ?? "");

  const { data: subjectRow } = await supabase.from("subjects").select("curriculum_id").eq("id", subjectId).single();

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) {
    redirect(
      `/curriculum/${subjectId}?error=${encodeURIComponent(
        "Could not delete — it's still referenced as a prerequisite, or students already have grades recorded for it."
      )}`
    );
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum?version=${subjectRow?.curriculum_id ?? ""}`);
}

export async function addRequirement(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();

  const subjectId = String(formData.get("subjectId") ?? "");
  const type = String(formData.get("type") ?? "");
  const { data: subjectRow } = await supabase.from("subjects").select("curriculum_id").eq("id", subjectId).single();

  if (type === "YEAR_STANDING") {
    const requiredYearLevel = Number(formData.get("requiredYearLevel"));
    const { error } = await supabase
      .from("requirements")
      .insert({ subject_id: subjectId, type, required_year_level: requiredYearLevel });
    if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);
  } else if (type === "COMPLETION") {
    const { error } = await supabase.from("requirements").insert({ subject_id: subjectId, type });
    if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);
  } else {
    const requiredCodeRaw = String(formData.get("requiredSubjectCode") ?? "");
    const { data: candidateSubjects } = await supabase
      .from("subjects")
      .select("id, code")
      .eq("curriculum_id", subjectRow?.curriculum_id);

    const matched = findMatchingCode(requiredCodeRaw, candidateSubjects ?? []);

    if (!matched) {
      redirect(
        `/curriculum/${subjectId}?error=${encodeURIComponent(`No subject with code "${requiredCodeRaw}" found in this curriculum version.`)}`
      );
    }

    const { error } = await supabase
      .from("requirements")
      .insert({ subject_id: subjectId, type, required_subject_id: matched!.id });
    if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum/${subjectId}`);
}

export async function deleteRequirement(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();
  const requirementId = String(formData.get("requirementId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");

  const { error } = await supabase.from("requirements").delete().eq("id", requirementId);
  if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum/${subjectId}`);
}

export async function moveSubjectUp(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();
  const subjectId = String(formData.get("subjectId") ?? "");

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, curriculum_id, year_level, semester, created_at")
    .eq("id", subjectId)
    .single();
  if (subjectError || !subject) redirect(`/curriculum?error=${encodeURIComponent("Subject not found.")}`);

  const { data: prevSibling } = await supabase
    .from("subjects")
    .select("id, created_at")
    .eq("curriculum_id", subject!.curriculum_id)
    .eq("year_level", subject!.year_level)
    .eq("semester", subject!.semester)
    .lt("created_at", subject!.created_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevSibling) {
    await supabase.from("subjects").update({ created_at: prevSibling.created_at }).eq("id", subject!.id);
    await supabase.from("subjects").update({ created_at: subject!.created_at }).eq("id", prevSibling.id);
  }

  revalidatePath("/curriculum");
  redirect(`/curriculum?version=${subject!.curriculum_id}`);
}

export async function moveSubjectDown(formData: FormData) {
  await requireChairperson();
  const supabase = await createServerClientForUser();
  const subjectId = String(formData.get("subjectId") ?? "");

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, curriculum_id, year_level, semester, created_at")
    .eq("id", subjectId)
    .single();
  if (subjectError || !subject) redirect(`/curriculum?error=${encodeURIComponent("Subject not found.")}`);

  const { data: nextSibling } = await supabase
    .from("subjects")
    .select("id, created_at")
    .eq("curriculum_id", subject!.curriculum_id)
    .eq("year_level", subject!.year_level)
    .eq("semester", subject!.semester)
    .gt("created_at", subject!.created_at)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextSibling) {
    await supabase.from("subjects").update({ created_at: nextSibling.created_at }).eq("id", subject!.id);
    await supabase.from("subjects").update({ created_at: subject!.created_at }).eq("id", nextSibling.id);
  }

  revalidatePath("/curriculum");
  redirect(`/curriculum?version=${subject!.curriculum_id}`);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

type ParsedRequirement =
  | { kind: "code"; code: string }
  | { kind: "year_standing"; level: number };

function parseRequirementToken(raw: string): ParsedRequirement | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "NONE") return null;

  const yearMatch = trimmed.match(/^(\d)(?:st|nd|rd|th)?\s+(?:yr|year)s?\s+standing$/i);
  if (yearMatch) {
    return { kind: "year_standing", level: Number(yearMatch[1]) };
  }

  return { kind: "code", code: normalizeCode(trimmed) };
}

export async function importSubjectsCsv(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return { error: "Only a chairperson account can manage curriculum." };
  }
  const curriculumId = String(formData.get("curriculumId") ?? "");
  if (!curriculumId) {
    return { error: "No curriculum version selected. Go back to the curriculum page and pick one first." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a CSV file." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { error: "File appears to be empty." };
  }
  const dataRows = rows.slice(1);

  type ParsedSubject = {
    code: string;
    title: string;
    units: number;
    yearLevel: number;
    semester: number;
    requirements: ParsedRequirement[];
  };

  const parsedSubjects: ParsedSubject[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const [rawCode, rawTitle, rawUnits, rawYear, rawSemester, rawPrereq] = dataRows[i];
    const code = normalizeCode(rawCode ?? "");
    const title = (rawTitle ?? "").trim();
    const units = Number(rawUnits);
    const yearLevel = Number(rawYear);
    const semester = Number(rawSemester);

    if (!code || !title || Number.isNaN(units) || Number.isNaN(yearLevel) || Number.isNaN(semester)) {
      warnings.push(`Row ${i + 2}: missing or invalid data, skipped.`);
      continue;
    }

    const requirements = (rawPrereq ?? "")
      .split(";")
      .map((token) => parseRequirementToken(token))
      .filter((r): r is ParsedRequirement => r !== null);

    parsedSubjects.push({ code, title, units, yearLevel, semester, requirements });
  }

  if (parsedSubjects.length === 0) {
    return { error: "No valid rows found in file.", warnings };
  }

  const supabase = await createServerClientForUser();

  const { data: existingSubjects, error: existingError } = await supabase
    .from("subjects")
    .select("id, code")
    .eq("curriculum_id", curriculumId);
  if (existingError) {
    return { error: existingError.message };
  }

  const codeToId = new Map<string, string>();
  for (const s of existingSubjects ?? []) codeToId.set(s.code, s.id);

  const parsedCodes = new Set(parsedSubjects.map((s) => s.code));
  const subjectsToRemove = (existingSubjects ?? []).filter((s) => !parsedCodes.has(s.code as string));
  let removedCount = 0;

  for (const s of subjectsToRemove) {
    const { error: removeError } = await supabase.from("subjects").delete().eq("id", s.id);
    if (removeError) {
      warnings.push(
        `Could not remove "${s.code}" (not in this file) — it's still referenced as a prerequisite or has student grades recorded.`
      );
    } else {
      removedCount++;
    }
  }

  const importBaseTime = Date.now();
  for (let i = 0; i < parsedSubjects.length; i++) {
    const s = parsedSubjects[i];
    const { data, error } = await supabase
      .from("subjects")
      .upsert(
        {
          curriculum_id: curriculumId,
          code: s.code,
          title: s.title,
          units: s.units,
          year_level: s.yearLevel,
          semester: s.semester,
          created_at: new Date(importBaseTime + i * 10).toISOString(),
        },
        { onConflict: "curriculum_id,code" }
      )
      .select()
      .single();
    if (error) {
      warnings.push(`${s.code}: ${error.message}`);
      continue;
    }
    codeToId.set(s.code, data.id);
  }

  const subjectIdsInImport = parsedSubjects
    .map((s) => codeToId.get(s.code))
    .filter((id): id is string => Boolean(id));

  if (subjectIdsInImport.length > 0) {
    const { error: clearError } = await supabase
      .from("requirements")
      .delete()
      .in("subject_id", subjectIdsInImport);
    if (clearError) {
      warnings.push(`Could not clear existing requirements before re-import: ${clearError.message}`);
    }
  }

  const codeCandidates = [...codeToId.entries()].map(([code, id]) => ({ code, id }));

  for (const s of parsedSubjects) {
    const subjectId = codeToId.get(s.code);
    if (!subjectId) continue;

    for (const req of s.requirements) {
      if (req.kind === "year_standing") {
        const { error } = await supabase.from("requirements").insert({
          subject_id: subjectId,
          type: "YEAR_STANDING",
          required_year_level: req.level,
        });
        if (error) warnings.push(`${s.code} (Year ${req.level} standing): ${error.message}`);
        continue;
      }

      const matched = findMatchingCode(req.code, codeCandidates);
      if (!matched) {
        warnings.push(`${s.code}: prerequisite "${req.code}" not found, skipped.`);
        continue;
      }
      const { error } = await supabase.from("requirements").insert({
        subject_id: subjectId,
        type: "PREREQUISITE",
        required_subject_id: matched.id,
      });
      if (error) warnings.push(`${s.code} → ${req.code}: ${error.message}`);
    }
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");

  const summary = `Imported ${parsedSubjects.length} subject(s).${removedCount > 0 ? ` Removed ${removedCount} subject(s) not in file.` : ""}${warnings.length > 0 ? ` ${warnings.length} warning(s).` : ""}`;
  return { success: summary, warnings };
}