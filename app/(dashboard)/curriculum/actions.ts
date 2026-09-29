"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { logCurriculumChange } from "../../../lib/queries/curriculumHistory";
import { normalizeCode, findMatchingCode } from "../../../lib/domain/import/codeMatching";
import type { ImportResult, PreviewResult } from "../../../components/ImportDialog";
import {
  parseSubjectsCsv,
  planCurriculumImport,
  type CurriculumImportPlan,
  type CurriculumImportSummary,
  type ExistingRequirement,
  type ExistingSubject,
} from "../../../lib/domain/import/curriculumImport";

const SEMESTER_NAME: Record<number, string> = { 1: "first semester", 2: "second semester", 3: "midyear" };

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
    .select("id, effective_year")
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

  await logCurriculumChange(supabase, {
    curriculumId: newCurriculum!.id,
    changedBy: staff.name,
    summary: sourceCurriculum
      ? `Created the ${effectiveYear} version as a copy of the ${sourceCurriculum.effective_year} version`
      : `Created the ${effectiveYear} version`,
  });

  revalidatePath("/curriculum");
  redirect(
    `/curriculum?version=${newCurriculum!.id}&success=${encodeURIComponent(`Created the ${effectiveYear} curriculum version.`)}`
  );
}

export async function createSubject(formData: FormData) {
  const staff = await requireChairperson();
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
  if (error) {
    const message = error.code === "23505" ? `${code} is already in this curriculum version.` : error.message;
    redirect(`/curriculum/new?curriculumId=${curriculumId}&error=${encodeURIComponent(message)}`);
  }

  await logCurriculumChange(supabase, {
    curriculumId,
    subjectCode: code,
    changedBy: staff.name,
    summary: `Added ${code} — ${title} (${units} units, year ${yearLevel}, ${SEMESTER_NAME[semester] ?? `semester ${semester}`})`,
  });

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum?version=${curriculumId}&success=${encodeURIComponent(`Added ${code}.`)}`);
}

export async function updateSubject(formData: FormData) {
  const staff = await requireChairperson();
  const supabase = await createServerClientForUser();

  const subjectId = String(formData.get("subjectId") ?? "");
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const units = Number(formData.get("units"));
  const yearLevel = Number(formData.get("yearLevel"));
  const semester = Number(formData.get("semester"));

  const { data: before } = await supabase
    .from("subjects")
    .select("curriculum_id, code, title, units, year_level, semester")
    .eq("id", subjectId)
    .single();

  const { error } = await supabase
    .from("subjects")
    .update({ code, title, units, year_level: yearLevel, semester })
    .eq("id", subjectId);
  if (error) {
    const message = error.code === "23505" ? `${code} is already in this curriculum version.` : error.message;
    redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(message)}`);
  }

  if (before) {
    const changes: string[] = [];
    if (before.code !== code) changes.push(`code ${before.code} → ${code}`);
    if (before.title !== title) changes.push(`title "${before.title}" → "${title}"`);
    if (Number(before.units) !== units) changes.push(`units ${before.units} → ${units}`);
    if (before.year_level !== yearLevel) changes.push(`year ${before.year_level} → ${yearLevel}`);
    if (before.semester !== semester) {
      changes.push(`semester ${SEMESTER_NAME[before.semester] ?? before.semester} → ${SEMESTER_NAME[semester] ?? semester}`);
    }
    if (changes.length > 0) {
      await logCurriculumChange(supabase, {
        curriculumId: before.curriculum_id,
        subjectCode: code,
        changedBy: staff.name,
        summary: `Edited ${before.code}: ${changes.join("; ")}`,
      });
    }
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum?version=${before?.curriculum_id ?? ""}&success=${encodeURIComponent(`Saved ${code}.`)}`);
}

export async function deleteSubject(formData: FormData) {
  const staff = await requireChairperson();
  const supabase = await createServerClientForUser();
  const subjectId = String(formData.get("subjectId") ?? "");

  const { data: subjectRow } = await supabase
    .from("subjects")
    .select("curriculum_id, code, title")
    .eq("id", subjectId)
    .single();

  const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
  if (error) {
    redirect(
      `/curriculum/${subjectId}?error=${encodeURIComponent(
        "Could not delete — it's still referenced as a prerequisite, or students already have grades recorded for it."
      )}`
    );
  }

  if (subjectRow) {
    await logCurriculumChange(supabase, {
      curriculumId: subjectRow.curriculum_id,
      subjectCode: subjectRow.code,
      changedBy: staff.name,
      summary: `Deleted ${subjectRow.code} — ${subjectRow.title}`,
    });
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(
    `/curriculum?version=${subjectRow?.curriculum_id ?? ""}&success=${encodeURIComponent(`Deleted ${subjectRow?.code ?? "the subject"}.`)}`
  );
}

export async function addRequirement(formData: FormData) {
  const staff = await requireChairperson();
  const supabase = await createServerClientForUser();

  const subjectId = String(formData.get("subjectId") ?? "");
  const type = String(formData.get("type") ?? "");
  const { data: subjectRow } = await supabase
    .from("subjects")
    .select("curriculum_id, code")
    .eq("id", subjectId)
    .single();
  let added = "";

  if (type === "YEAR_STANDING") {
    const requiredYearLevel = Number(formData.get("requiredYearLevel"));
    const { error } = await supabase
      .from("requirements")
      .insert({ subject_id: subjectId, type, required_year_level: requiredYearLevel });
    if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);
    added = `year ${requiredYearLevel} standing`;
  } else if (type === "COMPLETION") {
    const { error } = await supabase.from("requirements").insert({ subject_id: subjectId, type });
    if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);
    added = "all subjects completed";
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
    added = type === "COREQUISITE" ? `${matched!.code} (corequisite)` : matched!.code;
  }

  if (subjectRow) {
    await logCurriculumChange(supabase, {
      curriculumId: subjectRow.curriculum_id,
      subjectCode: subjectRow.code,
      changedBy: staff.name,
      summary: `Added requirement to ${subjectRow.code}: ${added}`,
    });
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum/${subjectId}?success=${encodeURIComponent(`Requirement added: ${added}.`)}`);
}

export async function deleteRequirement(formData: FormData) {
  const staff = await requireChairperson();
  const supabase = await createServerClientForUser();
  const requirementId = String(formData.get("requirementId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");

  const { data: requirement } = await supabase
    .from("requirements")
    .select("type, required_year_level, subject:subjects!requirements_subject_id_fkey(code, curriculum_id), required:subjects!requirements_required_subject_id_fkey(code)")
    .eq("id", requirementId)
    .maybeSingle();

  const { error } = await supabase.from("requirements").delete().eq("id", requirementId);
  if (error) redirect(`/curriculum/${subjectId}?error=${encodeURIComponent(error.message)}`);

  const subject = one(requirement?.subject);
  if (requirement && subject) {
    const removed =
      requirement.type === "YEAR_STANDING"
        ? `year ${requirement.required_year_level} standing`
        : requirement.type === "COMPLETION"
          ? "all subjects completed"
          : (one(requirement.required)?.code ?? "a prerequisite");
    await logCurriculumChange(supabase, {
      curriculumId: subject.curriculum_id,
      subjectCode: subject.code,
      changedBy: staff.name,
      summary: `Removed requirement from ${subject.code}: ${removed}`,
    });
  }

  revalidatePath("/curriculum");
  revalidatePath("/students/[id]", "page");
  redirect(`/curriculum/${subjectId}?success=${encodeURIComponent("Requirement removed.")}`);
}

/** Supabase returns a to-one relation as an object or a one-item array depending on the schema cache. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
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

type LoadedImportPlan =
  | { error: string; warnings?: string[] }
  | { plan: CurriculumImportPlan; curriculumId: string; existing: ExistingSubject[]; staffName: string };

// Shared by the preview and the real import, so what the preview shows is
// exactly what the import will do.
async function loadImportPlan(formData: FormData): Promise<LoadedImportPlan> {
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
    return { error: "Please choose a file." };
  }

  const parsed = parseSubjectsCsv(await file.text());
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createServerClientForUser();

  const { data: existingRows, error: existingError } = await supabase
    .from("subjects")
    .select("id, code, title, units, year_level, semester")
    .eq("curriculum_id", curriculumId);
  if (existingError) return { error: existingError.message };
  const existing = (existingRows ?? []) as ExistingSubject[];

  let existingRequirements: ExistingRequirement[] = [];
  if (existing.length > 0) {
    const { data, error } = await supabase
      .from("requirements")
      .select("subject_id, type, required_subject_id, required_year_level")
      .in(
        "subject_id",
        existing.map((s) => s.id)
      );
    if (error) return { error: error.message };
    existingRequirements = (data ?? []) as ExistingRequirement[];
  }

  // Subjects with student grades recorded can't be deleted.
  const importedCodes = new Set(parsed.subjects.map((s) => s.code));
  const notInFileIds = existing.filter((s) => !importedCodes.has(s.code)).map((s) => s.id);
  const gradedSubjectIds = new Set<string>();
  if (notInFileIds.length > 0) {
    const { data, error } = await supabase.from("subject_records").select("subject_id").in("subject_id", notInFileIds);
    if (error) return { error: error.message };
    for (const r of data ?? []) gradedSubjectIds.add(r.subject_id as string);
  }

  const plan = planCurriculumImport(parsed.subjects, existing, existingRequirements, gradedSubjectIds, parsed.warnings);
  return { plan, curriculumId, existing, staffName: staff.name };
}

export async function previewSubjectsCsv(
  _prev: PreviewResult<CurriculumImportSummary> | null,
  formData: FormData
): Promise<PreviewResult<CurriculumImportSummary>> {
  const loaded = await loadImportPlan(formData);
  if ("error" in loaded) return { error: loaded.error, warnings: loaded.warnings };

  const { plan } = loaded;
  return {
    preview: {
      added: plan.added,
      changed: plan.changed,
      unchangedCount: plan.unchangedCount,
      removed: plan.removed.map((s) => s.code),
      keptWithGrades: plan.keptWithGrades,
    },
    warnings: plan.warnings,
  };
}

export async function importSubjectsCsv(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const loaded = await loadImportPlan(formData);
  if ("error" in loaded) return { error: loaded.error, warnings: loaded.warnings };

  const { plan, curriculumId, existing, staffName } = loaded;
  const warnings = [...plan.warnings];
  const supabase = await createServerClientForUser();

  const codeToId = new Map<string, string>();
  for (const s of existing) codeToId.set(s.code, s.id);

  // created_at is spaced out so subjects keep the file's order.
  const importBaseTime = Date.now();
  for (let i = 0; i < plan.subjects.length; i++) {
    const s = plan.subjects[i];
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

  // Clear old requirements before deleting anything: a requirement that
  // points at a removed subject would otherwise block its deletion.
  const importedIds = plan.subjects.map((s) => codeToId.get(s.code)).filter((id): id is string => Boolean(id));
  const removedIds = plan.removed.map((s) => s.id);
  const idsToClear = [...importedIds, ...removedIds];
  if (idsToClear.length > 0) {
    const { error: clearError } = await supabase.from("requirements").delete().in("subject_id", idsToClear);
    if (clearError) {
      warnings.push(`Could not clear existing requirements before re-import: ${clearError.message}`);
    }
  }

  let removedCount = 0;
  const removedCodes: string[] = [];
  for (const s of plan.removed) {
    const { error: removeError } = await supabase.from("subjects").delete().eq("id", s.id);
    if (removeError) {
      warnings.push(`Could not remove "${s.code}": ${removeError.message}`);
    } else {
      removedCount++;
      removedCodes.push(s.code);
      codeToId.delete(s.code);
    }
  }

  // Resolve prerequisites against subjects that exist after the import.
  const codeCandidates = [...codeToId.entries()].map(([code, id]) => ({ code, id }));

  for (const s of plan.subjects) {
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

      // Unmatched prerequisites were already reported by the plan.
      const matched = findMatchingCode(req.code, codeCandidates);
      if (!matched) continue;
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

  const parts = [
    `Imported ${plan.subjects.length} subject(s): ${plan.added.length} added, ${plan.changed.length} changed.`,
  ];
  if (removedCount > 0) parts.push(`Removed ${removedCount} subject(s) not in the file.`);
  if (plan.keptWithGrades.length > 0) {
    parts.push(`Kept ${plan.keptWithGrades.length} subject(s) not in the file because students have grades in them.`);
  }
  const listed = (label: string, codes: string[]) =>
    codes.length ? `${label} ${codes.slice(0, 8).join(", ")}${codes.length > 8 ? ` and ${codes.length - 8} more` : ""}` : null;
  await logCurriculumChange(supabase, {
    curriculumId,
    changedBy: staffName,
    summary: [
      `Imported a file of ${plan.subjects.length} subjects`,
      listed("added", plan.added),
      listed("changed", plan.changed.map((c) => c.code)),
      listed("removed", removedCodes),
    ]
      .filter(Boolean)
      .join("; "),
  });

  return { success: parts.join(" "), warnings };
}
