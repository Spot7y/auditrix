import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerClientForUser } from "../../../../../lib/domain/supabase/serverClient";
import { getCurrentStaff } from "../../../../../lib/queries/staff";
import { getStudentAudit, type StudentAuditRow } from "../../../../../lib/queries/students";
import { getRecordLock } from "../../../../../lib/queries/transitions";
import { getCurrentTerm } from "../../../../../lib/queries/yearLevels";
import { describeTerm } from "../../../../../lib/domain/Term";
import { isCorequisite } from "../../../../../lib/domain/requirements/CoursePrerequisite";
import { isOutOfOrder } from "../../../../../lib/domain/AuditResult";
import type { EnrollmentStatus } from "../../../../../lib/domain/enrollmentStatus";
import { formatDate, formatDateTime, formatGrade, LOCK_LABEL } from "../../../../../lib/format";
import EvaluationPdfDocument, { type EvaluationSection } from "./EvaluationPdfDocument";

export const runtime = "nodejs";

const YEAR_LABEL: Record<number, string> = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First Semester", 2: "Second Semester", 3: "Midyear" };
const YEAR_LEVEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };

function standing(enrollment: EnrollmentStatus): string {
  if (enrollment.kind === "REGULAR") return enrollment.assumed ? "Regular (new first year)" : "Regular";
  if (enrollment.kind === "IRREGULAR") return `Irregular (not enrolled in ${enrollment.missing.join(", ")})`;
  return "Not determined (no grades for this semester yet)";
}

function remarks({ result, recordStatus, resolvedTerm }: StudentAuditRow): string {
  const reasons = result.reasons.join("; ");
  switch (result.status) {
    case "VIOLATION":
      return `Taken out of order: ${reasons}`;
    case "COMPLETED":
      return resolvedTerm ? `Passed (INC completed ${resolvedTerm})` : "Passed";
    case "INCOMPLETE":
      return reasons || "Incomplete";
    case "UNAVAILABLE":
      return `${recordStatus === "FAILED" ? "Failed. " : ""}Needs ${reasons}`;
    case "AVAILABLE":
      if (result.outOfOrder) return reasons;
      if (recordStatus === "FAILED") return "Failed, to be retaken";
      if (recordStatus !== "NOT_TAKEN" && reasons) return reasons;
      return "Not yet taken";
  }
}

/** The student's evaluation as a printable PDF: every subject, grade and remark, with signature lines. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return new Response("Only a program chairperson can print student evaluations.", { status: 403 });
  }
  const { id } = await params;

  const supabase = await createServerClientForUser();
  // Row-level security limits all of these to the chairperson's own students.
  const [data, lock, term, { data: student }] = await Promise.all([
    getStudentAudit(id),
    getRecordLock(id),
    getCurrentTerm(),
    // Chairpersons belong to a college through their program's curriculum.
    supabase.from("students").select("curricula(effective_year, colleges(name))").eq("id", id).maybeSingle(),
  ]);
  if (!data) return new Response("Student not found.", { status: 404 });

  type One<T> = T | T[] | null | undefined;
  const first = <T,>(value: One<T>): T | undefined => (Array.isArray(value) ? value[0] : (value ?? undefined));
  const curriculum = first(student?.curricula as One<{ effective_year: number; colleges: One<{ name: string }> }>);
  const effectiveYear = curriculum?.effective_year;
  const collegeName = first(curriculum?.colleges)?.name ?? staff.collegeName;

  const sections = new Map<string, EvaluationSection & { order: number }>();
  for (const row of data.rows) {
    const { subject } = row;
    const key = `${subject.yearLevel}-${subject.semester}`;
    const section = sections.get(key) ?? {
      label: `${YEAR_LABEL[subject.yearLevel] ?? `Year ${subject.yearLevel}`} · ${SEMESTER_LABEL[subject.semester] ?? `Semester ${subject.semester}`}`,
      order: subject.yearLevel * 10 + subject.semester,
      units: 0,
      subjects: [],
    };
    section.units += Number(subject.units);
    section.subjects.push({
      code: subject.code,
      title: subject.title,
      units: Number(subject.units),
      requirements:
        subject.requirements
          .map((r) => (isCorequisite(r) ? `${r.description} (co-req)` : r.description))
          .join(", ") || "None",
      grade: row.recordStatus === "INCOMPLETE" && row.grade === null ? "INC" : formatGrade(row.grade),
      term: row.term ?? "—",
      remarks: remarks(row),
      violation: isOutOfOrder(row.result),
    });
    sections.set(key, section);
  }

  const completed = data.rows.filter((r) => r.result.status === "COMPLETED");
  const violations = data.rows.filter((r) => isOutOfOrder(r.result));
  const now = new Date();

  const pdf = await renderToBuffer(
    <EvaluationPdfDocument
      sealPath={path.join(process.cwd(), "public", "ksu-seal.png")}
      college={collegeName}
      student={{
        id: data.studentId,
        name: data.studentName,
        program: data.program,
        curriculum: effectiveYear ? `${data.program} ${effectiveYear}` : data.program,
        yearLevel: YEAR_LEVEL[data.yearLevel.level] ?? `Year ${data.yearLevel.level}`,
        standing: lock ? `${LOCK_LABEL[lock.status]}${lock.since ? ` on ${formatDate(lock.since)}` : ""}` : standing(data.enrollment),
      }}
      asOf={term ? `${describeTerm(term.term)} (${term.term})` : formatDate(now)}
      summary={{
        completed: completed.length,
        subjects: data.rows.length,
        earnedUnits: completed.reduce((sum, r) => sum + Number(r.subject.units), 0),
        totalUnits: data.rows.reduce((sum, r) => sum + Number(r.subject.units), 0),
        violations: violations.length,
      }}
      violationCodes={violations.map((r) => r.subject.code)}
      sections={[...sections.values()].sort((a, b) => a.order - b.order)}
      evaluatedBy={staff.name}
      generatedAt={formatDateTime(now)}
    />
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // Opens in the browser's PDF viewer, ready to print or save.
      "Content-Disposition": `inline; filename="${data.studentId}-evaluation.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
