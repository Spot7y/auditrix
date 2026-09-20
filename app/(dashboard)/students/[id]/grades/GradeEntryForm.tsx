"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { submitTermGrades, type SubmitGradesState } from "./actions";

interface SubjectRow {
  code: string;
  title: string;
  yearLevel: number;
  semester: number;
  currentGrade: number | null;
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "IN_PROGRESS" | "NOT_TAKEN";
}

const initialState: SubmitGradesState = { result: null, error: null };

function formatGradeForDropdown(grade: number | null): string {
  if (grade === null) return "";
  const map: Record<string, string> = {
    "1": "1.0",
    "1.25": "1.25",
    "1.5": "1.50",
    "1.75": "1.75",
    "2": "2.0",
    "2.25": "2.25",
    "2.5": "2.50",
    "2.75": "2.75",
    "3": "3.0",
    "5": "5.0",
  };
  return map[String(grade)] ?? "";
}

function defaultDropdownValue(subject: SubjectRow): string {
  if (subject.currentStatus === "INCOMPLETE") return "INC";
  if (subject.currentStatus === "PASSED" || subject.currentStatus === "FAILED") {
    return formatGradeForDropdown(subject.currentGrade);
  }
  return "";
}

export default function GradeEntryForm({ studentId, subjects }: { studentId: string; subjects: SubjectRow[] }) {
  const [state, formAction, pending] = useActionState(submitTermGrades, initialState);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [semesterFilter, setSemesterFilter] = useState<string>("");

  const filtered =
    yearFilter && semesterFilter
      ? subjects.filter((s) => s.yearLevel === Number(yearFilter) && s.semester === Number(semesterFilter))
      : [];

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="studentId" value={studentId} />

      <div className="flex max-w-md gap-4">
        <div className="flex-1">
          <label htmlFor="yearFilter" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Year Level
          </label>
          <select
            id="yearFilter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          >
            <option value="">Select…</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="semesterFilter" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Semester
          </label>
          <select
            id="semesterFilter"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          >
            <option value="">Select…</option>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
            <option value="3">Midyear</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Term</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            name="termYear"
            type="number"
            required
            min={0}
            max={99}
            placeholder="25"
            className="w-20 border border-[color:var(--ledger-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
          <span className="text-sm text-[color:var(--ink)]/50">-</span>
          <input
            name="termSemester"
            type="number"
            required
            min={1}
            max={3}
            placeholder="2"
            className="w-16 border border-[color:var(--ledger-line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <p className="mt-1 text-xs text-[color:var(--ink)]/40">Year (e.g. 25) and semester (1, 2, or 3 for Midyear)</p>
      </div>

      {!yearFilter || !semesterFilter ? (
        <p className="mt-8 text-sm text-[color:var(--ink)]/50">
          Select a year level and semester above to show that term&rsquo;s subjects.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-[color:var(--ink)]/50">No subjects found for that year and semester.</p>
      ) : (
        <>
          {/*<p className="mt-6 text-xs text-[color:var(--ink)]/50">
            Select a grade for each subject the student took this term. Already-graded subjects show their current
            grade — change it to correct a mistake. Leave as &ldquo;—&rdquo; to skip a subject.
          </p>*/}

          <table className="mt-3 w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "110px" }} />
              <col />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[color:var(--ledger-line)] text-left text-xs uppercase tracking-wide text-[color:var(--ink)]/50">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Subject Description</th>
                <th className="py-2 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ledger-line)]">
              {filtered.map((s) => (
                <tr key={s.code}>
                  <td className="py-2 pr-4 font-[family-name:var(--font-mono)] text-[color:var(--ink)]/70">{s.code}</td>
                  <td className="py-2 pr-4">{s.title}</td>
                  <td className="py-2">
                    <select
                      name={`grade:${s.code}`}
                      defaultValue={defaultDropdownValue(s)}
                      className="w-28 border border-[color:var(--ledger-line)] bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
                    >
                      <option value="">—</option>
                      <option value="1.0">1.0</option>
                      <option value="1.25">1.25</option>
                      <option value="1.50">1.50</option>
                      <option value="1.75">1.75</option>
                      <option value="2.0">2.0</option>
                      <option value="2.25">2.25</option>
                      <option value="2.50">2.50</option>
                      <option value="2.75">2.75</option>
                      <option value="3.0">3.0</option>
                      <option value="5.0">5.0</option>
                      <option value="INC">INC</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit grades"}
          </button>
        </>
      )}

      {state.error && <p className="mt-4 text-sm text-[color:var(--status-violation)]">{state.error}</p>}

      {state.result && (
        <div className="mt-8 border-t border-[color:var(--ledger-line)] pt-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Submission result</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {state.result.rows.map((row, i) =>
              row.accepted ? (
                <li key={i} style={{ color: "var(--status-completed)" }}>
                  ✓ {row.subjectCode} accepted
                </li>
              ) : (
                <li key={i} style={{ color: "var(--status-violation)" }}>
                  ✗ {row.rawCode}: {row.reason}
                </li>
              )
            )}
          </ul>
          <Link href={`/students/${studentId}`} className="mt-6 inline-block text-sm text-[color:var(--accent-maroon)] hover:underline">
            View updated curriculum audit →
          </Link>
        </div>
      )}
    </form>
  );
}
