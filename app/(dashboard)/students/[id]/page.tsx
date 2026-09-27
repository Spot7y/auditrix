import StudentSearchBar from "../StudentSearchBar";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentAudit } from "../../../../lib/queries/students";
import { getPendingShiftRequest } from "../../../../lib/queries/transitions";
import type { AuditStatus } from "../../../../lib/domain/AuditResult";
import { Fragment } from "react";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { formatGrade } from "../../../../lib/format";
import FeedbackModal from "../../../../components/FeedbackModal";

const STATUS_STYLE: Record<AuditStatus, { label: string; color: string }> = {
  COMPLETED: { label: "Completed", color: "var(--status-completed)" },
  AVAILABLE: { label: "Available", color: "var(--status-available)" },
  PENDING: { label: "Pending", color: "var(--status-pending)" },
  UNAVAILABLE: { label: "Unavailable", color: "var(--status-unavailable)" },
  VIOLATION: { label: "Violation", color: "var(--status-violation)" },
};

const YEAR_LABEL: Record<number, string> = { 1: "Year 1", 2: "Year 2", 3: "Year 3", 4: "Year 4" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First Semester", 2: "Second Semester", 3: "Midyear" };

export default async function StudentAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const { error, success } = await searchParams;
  const data = await getStudentAudit(id);
  if (!data) notFound();

  const isPending = await getPendingShiftRequest(id);

  type Row = (typeof data.rows)[number];

  const byYear = new Map<number, Map<number, Row[]>>();
  for (const row of data.rows) {
    const yearMap = byYear.get(row.subject.yearLevel) ?? new Map<number, Row[]>();
    const semList = yearMap.get(row.subject.semester) ?? [];
    semList.push(row);
    yearMap.set(row.subject.semester, semList);
    byYear.set(row.subject.yearLevel, yearMap);
  }

  const sections = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([year, semesterMap]) =>
      [...semesterMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([semester, rows]) => ({
          label: `${YEAR_LABEL[year] ?? `Year ${year}`} — ${SEMESTER_LABEL[semester] ?? `Semester ${semester}`}`,
          key: `${year}-${semester}`,
          rows,
        }))
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/students" className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to search
      </Link>

    <div className="mt-4 max-w-md">
        <StudentSearchBar placeholder="Search another student…" />
      </div>

      <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[color:var(--ink)]/60">
        {data.studentId}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
        {data.studentName}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        {data.program} · Year {data.nominalYearLevel} standing
      </p>

      {isPending && (
        <p className="mt-2 inline-block bg-[color:var(--status-pending)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--status-pending)]">
          Pending Shift Request
        </p>
      )}

      <FeedbackModal key={`${error ?? ""}-${success ?? ""}`} error={error} success={success} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/students/${id}/grades`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Enter Grades
        </Link>
        <Link
          href={`/students/${id}/transitions`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Record Transfer / Shift
        </Link>
        <Link
          href={`/students/${id}/logbook`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + View Grade Logbook
        </Link>
        <Link
          href={`/students/${id}/edit`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Edit Student Info
        </Link>
      </div>

      <table className="mt-10 w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "110px" }} />
          <col />
          <col style={{ width: "220px" }} />
          <col style={{ width: "70px" }} />
          <col style={{ width: "170px" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[color:var(--ledger-line)] text-left text-xs uppercase tracking-wide text-[color:var(--ink)]/50">
            <th className="py-2 pr-4 font-medium">Code</th>
            <th className="py-2 pr-4 font-medium">Subject Description</th>
            <th className="py-2 pr-4 font-medium">Prerequisite</th>
            <th className="py-2 pr-4 text-right font-medium">Grade</th>
            <th className="py-2 font-medium">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--ledger-line)]">
          {sections.map((section) => (
            <Fragment key={section.key}>
              <tr key={`${section.key}-header`}>
                <td
                  colSpan={5}
                  className="pt-6 pb-1 font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wide text-[color:var(--accent-maroon)]"
                >
                  {section.label}
                </td>
              </tr>
              {section.rows.map(({ subject, result, grade }) => {
                const style = STATUS_STYLE[result.status];
                const prereqLabel =
                  subject.requirements.length > 0
                    ? subject.requirements.map((r) => r.description).join(", ")
                    : "None";
                return (
                  <tr key={subject.code}>
                    <td className="py-2 pr-4 font-[family-name:var(--font-mono)] text-[color:var(--ink)]/70">
                      {subject.code}
                    </td>
                    <td className="py-2 pr-4">{subject.title}</td>
                    <td className="truncate py-2 pr-4 font-[family-name:var(--font-mono)] text-xs text-[color:var(--ink)]/60">
                      {prereqLabel}
                    </td>
                    <td className="py-2 pr-4 text-right font-[family-name:var(--font-mono)]">
                    {formatGrade(grade)}
                    </td>
                    <td className="py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.color }}>
                        {style.label}
                      </span>
                      {result.reasons.length > 0 && (
                        <p className="mt-0.5 text-xs text-[color:var(--ink)]/50">Needs: {result.reasons.join(", ")}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </main>
  );
}
