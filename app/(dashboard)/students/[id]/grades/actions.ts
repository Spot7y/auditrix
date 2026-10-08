"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { SupabaseAcademicRecordRepository } from "../../../../../lib/domain/import/SupabaseAcademicRecordRepository";
import { GradeEntryService } from "../../../../../lib/domain/import/GradeEntryService";
import { AuditEngine } from "../../../../../lib/domain/AuditEngine";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
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
  if (/^ip$|^in.?progress$/i.test(trimmed)) return { kind: "in_progress" };
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

  const termYearRaw = String(formData.get("termYear") ?? "").trim();
  const termSemesterRaw = String(formData.get("termSemester") ?? "").trim();
  const termYear = Number(termYearRaw);

  if (!termYearRaw || Number.isNaN(termYear) || termYear < 0 || termYear > 99) {
    return { result: null, error: "Enter a valid 2-digit year (e.g. 25)." };
  }
  if (!["1", "2", "S"].includes(termSemesterRaw)) {
    return { result: null, error: "Semester must be 1, 2, or S (Midyear)." };
  }

  const term = `${String(termYear).padStart(2, "0")}-${termSemesterRaw}`;

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
      .filter((r) => r.status === "VIOLATION")
      .map((r) => r.subjectCode)
  );

  const service = new GradeEntryService(repository);
  // Subjects the chairperson confirmed may replace a grade from a later term.
  const replaceLaterTerm = formData.getAll("replaceLaterTerm").map(String);
  const result = await service.submit({ studentId, term, entries, replaceLaterTerm }, record.curriculum, staff.name);

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/home");

  const allAccepted = result.rows.length > 0 && result.rows.every((r) => r.accepted);
  if (allAccepted) {
    const saved = result.rows.length === 1 ? "1 grade" : `${result.rows.length} grades`;
    const params = new URLSearchParams({ success: `Saved ${saved} for term ${term}.` });
    const newViolations = result.audit
      .filter((r) => r.status === "VIOLATION" && !violationsBefore.has(r.subjectCode))
      .map((r) => r.subjectCode);
    if (newViolations.length > 0) {
      params.set(
        "error",
        newViolations.length === 1
          ? `${newViolations[0]} was taken out of order. See the audit for what was missing.`
          : `${newViolations.length} subjects were taken out of order: ${newViolations.join(", ")}. See the audit for what was missing.`
      );
    }
    redirect(`/students/${studentId}?${params}`);
  }

  return { result, error: null };
}