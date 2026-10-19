"use server";

import { flashRedirect } from "../../../../../lib/flash";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { SupabaseAcademicRecordRepository } from "../../../../../lib/domain/import/SupabaseAcademicRecordRepository";
import { GradeEntryService } from "../../../../../lib/domain/import/GradeEntryService";
import { AuditEngine } from "../../../../../lib/domain/AuditEngine";
import { isOutOfOrder } from "../../../../../lib/domain/AuditResult";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
import { getRecordLock } from "../../../../../lib/queries/transitions";
import { getCurrentTerm } from "../../../../../lib/queries/yearLevels";
import { compareTerms, gradeTermProblem, isValidTerm } from "../../../../../lib/domain/Term";
import { LOCK_LABEL } from "../../../../../lib/format";
import type { GradeEntryResult } from "../../../../../lib/domain/import/GradeEntryResult";
import type { RawGradeInput } from "../../../../../lib/domain/import/GradeValidator";

export type SubmitGradesState = {
  result: GradeEntryResult | null;
  error: string | null;
};

function parseGradeInput(raw: string): RawGradeInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^inc(omplete)?$/i.test(trimmed)) return { kind: "incomplete" };
  const value = Number(trimmed);
  if (Number.isNaN(value)) return null;
  return { kind: "numeric", value };
}

export async function submitTermGrades(
  _prevState: SubmitGradesState,
  formData: FormData
): Promise<SubmitGradesState> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson") {
    return { result: null, error: "Only a chairperson can submit grades." };
  }

  const studentId = String(formData.get("studentId") ?? "");
  const lock = await getRecordLock(studentId);
  if (lock) {
    return {
      result: null,
      error: `This student’s record is locked (${LOCK_LABEL[lock.status].toLowerCase()}). Reopen it from Transfer / shift to change grades.`,
    };
  }

  const termYearRaw = String(formData.get("termYear") ?? "").trim();
  const termSemesterRaw = String(formData.get("termSemester") ?? "").trim();
  const termYear = Number(termYearRaw);

  if (!termYearRaw || Number.isNaN(termYear) || termYear < 0 || termYear > 99) {
    return { result: null, error: "Enter the school year the grades were earned in (two digits, e.g. 26). Nothing was saved." };
  }
  if (!["1", "2", "S"].includes(termSemesterRaw)) {
    return { result: null, error: "Semester must be 1, 2, or S (Midyear)." };
  }

  const term = `${String(termYear).padStart(2, "0")}-${termSemesterRaw}`;
  const futureTerm = gradeTermProblem(term, (await getCurrentTerm())?.term ?? null);
  if (futureTerm) return { result: null, error: `${futureTerm} Nothing was saved.` };

  const entries: { subjectCode: string; input: RawGradeInput }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("grade:")) continue;
    const subjectCode = key.slice("grade:".length);
    const parsed = parseGradeInput(String(value));
    if (parsed) entries.push({ subjectCode, input: parsed });
  }

  if (entries.length === 0) {
    return { result: null, error: "Enter at least one grade before submitting." };
  }

  const supabase = await createServerClientForUser();
  const repository = new SupabaseAcademicRecordRepository(supabase);
  const record = await repository.getRecord(studentId);
  if (!record) {
    return { result: null, error: "Student record not found, or not in your program." };
  }

  const violationsBefore = new Set(
    new AuditEngine()
      .auditCurriculum(record)
      .filter(isOutOfOrder)
      .map((r) => r.subjectCode)
  );

  const service = new GradeEntryService(repository);
  // Subjects the chairperson confirmed may replace a grade from a later term.
  const replaceLaterTerm = formData.getAll("replaceLaterTerm").map(String);
  const result = await service.submit({ studentId, term, entries, replaceLaterTerm }, record.curriculum, staff.name);

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/logbook`);
  revalidatePath("/home");

  const allAccepted = result.rows.length > 0 && result.rows.every((r) => r.accepted);
  if (allAccepted) {
    const saved = result.rows.length === 1 ? "1 grade" : `${result.rows.length} grades`;
    const params = new URLSearchParams({ success: `Saved ${saved} for term ${term}.` });
    const newViolations = result.audit
      .filter((r) => isOutOfOrder(r) && !violationsBefore.has(r.subjectCode))
      .map((r) => r.subjectCode);
    if (newViolations.length > 0) {
      params.set(
        "error",
        newViolations.length === 1
          ? `${newViolations[0]} was taken out of order. See the audit for what was missing.`
          : `${newViolations.length} subjects were taken out of order: ${newViolations.join(", ")}. See the audit for what was missing.`
      );
    }
    return flashRedirect(`/students/${studentId}?${params}`);
  }

  return { result, error: null };
}
/**
 * Saves the grades read from a paste of the student's MIS "Academic Grades"
 * page, after the chairperson checked them. Each term goes through the same
 * service as grades entered by hand, oldest term first, so retakes and INC
 * completions are recorded in order and every check still applies.
 */
export async function savePastedGrades(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson") return { error: "Only a chairperson can enter grades." };

  const studentId = String(formData.get("studentId") ?? "");
  const lock = await getRecordLock(studentId);
  if (lock) {
    return { error: `This student’s record is locked (${LOCK_LABEL[lock.status].toLowerCase()}). Reopen it from Transfer / shift to change grades.` };
  }

  let rows: { term: string; code: string; grade: string }[];
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "The pasted grades couldn’t be read. Paste them again." };
  }
  rows = rows.filter((r) => r && isValidTerm(r.term) && r.code && r.grade);
  if (rows.length === 0) return { error: "No grades are ticked to save." };

  const currentTerm = (await getCurrentTerm())?.term ?? null;
  const future = rows.find((r) => gradeTermProblem(r.term, currentTerm));
  if (future) return { error: `${gradeTermProblem(future.term, currentTerm)} Nothing was saved.` };

  const supabase = await createServerClientForUser();
  const repository = new SupabaseAcademicRecordRepository(supabase);
  const record = await repository.getRecord(studentId);
  if (!record) return { error: "Student record not found, or not in your program." };
  const engine = new AuditEngine();
  const violationsBefore = new Set(
    engine.auditCurriculum(record).filter((r) => r.status === "VIOLATION").map((r) => r.subjectCode)
  );

  const service = new GradeEntryService(repository);
  const terms = [...new Set(rows.map((r) => r.term))].sort(compareTerms);
  let saved = 0;
  const refused: string[] = [];
  let lastAudit: GradeEntryResult["audit"] = [];
  for (const term of terms) {
    const entries = rows
      .filter((r) => r.term === term)
      .map((r) => ({ subjectCode: r.code, input: parseGradeInput(r.grade) }))
      .filter((e): e is { subjectCode: string; input: RawGradeInput } => e.input !== null);
    if (entries.length === 0) continue;
    const result = await service.submit({ studentId, term, entries }, record.curriculum, staff.name);
    for (const row of result.rows) {
      if (row.accepted) saved++;
      else refused.push(`${row.rawCode} (${term}): ${row.reason}`);
    }
    if (result.audit.length > 0) lastAudit = result.audit;
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/logbook`);
  revalidatePath("/home");

  if (saved === 0) return { error: `Nothing was saved. ${refused.join(" ")}` };
  const newViolations = lastAudit
    .filter((r) => r.status === "VIOLATION" && !violationsBefore.has(r.subjectCode))
    .map((r) => r.subjectCode);
  const problems = [
    ...(refused.length > 0 ? [`Not saved: ${refused.join("; ")}`] : []),
    ...(newViolations.length > 0 ? [`Taken out of order: ${newViolations.join(", ")}. See the audit for what was missing.`] : []),
  ];
  const params = new URLSearchParams({
    success: `Saved ${saved === 1 ? "1 grade" : `${saved} grades`} from the MIS (${terms.join(", ")}).`,
  });
  if (problems.length > 0) params.set("error", problems.join(" "));
  return flashRedirect(`/students/${studentId}?${params}`);
}
