"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { submitTermGrades, type SubmitGradesState } from "./actions";
import { Card, CardHeader, CardBody } from "../../../../../components/ui/Card";
import { Field, Hint, Label, Select } from "../../../../../components/ui/Field";
import TermFields from "../../../../../components/ui/TermFields";
import { Table, Td, Th, Tr } from "../../../../../components/ui/Table";
import { Badge } from "../../../../../components/ui/Badge";
import ConfirmButton from "../../../../../components/ui/ConfirmButton";
import Alert from "../../../../../components/ui/Alert";
import EmptyState from "../../../../../components/ui/EmptyState";
import { plural } from "../../../../../lib/format";

interface SubjectRow {
  code: string;
  title: string;
  yearLevel: number;
  semester: number;
  currentGrade: number | null;
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "IN_PROGRESS" | "NOT_TAKEN";
  currentTerm: string | null;
}

const initialState: SubmitGradesState = { result: null, error: null };
const GRADE_OPTIONS = ["1.0", "1.25", "1.50", "1.75", "2.0", "2.25", "2.50", "2.75", "3.0", "5.0", "INC"];

function currentValue(subject: SubjectRow): string {
  if (subject.currentStatus === "INCOMPLETE") return "INC";
  if ((subject.currentStatus === "PASSED" || subject.currentStatus === "FAILED") && subject.currentGrade !== null) {
    return GRADE_OPTIONS.find((o) => Number(o) === subject.currentGrade) ?? "";
  }
  return "";
}

export default function GradeEntryForm({
  studentId,
  subjects,
  currentTerm,
}: {
  studentId: string;
  subjects: SubjectRow[];
  /** The college's current semester, which "Term taken" starts on. */
  currentTerm: string | null;
}) {
  const [state, formAction] = useActionState(submitTermGrades, initialState);
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [termYear, setTermYear] = useState(currentTerm?.split("-")[0] ?? "");
  const [termSemester, setTermSemester] = useState(currentTerm?.split("-")[1] ?? "");
  const [values, setValues] = useState<Record<string, string>>({});

  const shown = useMemo(
    () =>
      yearLevel && semester
        ? subjects.filter((s) => s.yearLevel === Number(yearLevel) && s.semester === Number(semester))
        : [],
    [subjects, yearLevel, semester]
  );

  // Only grades that differ from what's recorded are submitted, so untouched
  // subjects keep their original term.
  const edits = shown.filter((s) => values[s.code] !== undefined && values[s.code] !== currentValue(s));
  // A final grade for an INC completes it: it keeps its original term.
  const resolutions = edits.filter((s) => s.currentStatus === "INCOMPLETE" && values[s.code] !== "INC");
  const corrections = edits.filter((s) => currentValue(s) !== "" && !resolutions.includes(s));
  const term = termYear && termSemester ? `${termYear.padStart(2, "0")}-${termSemester}` : "";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />

      <Card>
        <CardHeader title="1. Choose the term" description="Pick the curriculum semester to show and the term the grades were earned in." />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Year level" htmlFor="yearLevel">
            <Select id="yearLevel" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
              <option value="">Select…</option>
              <option value="1">1st year</option>
              <option value="2">2nd year</option>
              <option value="3">3rd year</option>
              <option value="4">4th year</option>
            </Select>
          </Field>
          <Field label="Curriculum semester" htmlFor="semester">
            <Select id="semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Select…</option>
              <option value="1">First semester</option>
              <option value="2">Second semester</option>
              <option value="3">Midyear</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label htmlFor="termYear">Term taken</Label>
            <TermFields
              year={termYear}
              semester={termSemester}
              onYearChange={(e) => setTermYear(e.target.value)}
              onSemesterChange={(e) => setTermSemester(e.target.value)}
            />
            <Hint>
              Two-digit school year and semester, e.g. 25 – 1.
              {currentTerm && ` Starts on the current semester (${currentTerm}); change it for grades from an earlier term.`}
            </Hint>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2. Enter grades"
          description="Only subjects you change are saved. Changing an existing grade counts as a correction."
          actions={edits.length > 0 && <Badge tone="brand">{plural(edits.length, "grade")} to save</Badge>}
        />
        {!yearLevel || !semester ? (
          <EmptyState icon={ClipboardList} title="Choose a year level and semester" description="That semester’s subjects will be listed here." />
        ) : shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No subjects in that semester" />
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col className="w-28" />
              <col />
              <col className="w-32" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Subject</Th>
                <Th>Recorded</Th>
                <Th>New grade</Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const recorded = currentValue(s);
                const value = values[s.code] ?? recorded;
                const changed = value !== recorded;
                return (
                  <Tr key={s.code} className={changed ? (recorded ? "bg-amber-50/70" : "bg-brand-50/60") : ""}>
                    <Td className="font-mono text-ink-600">{s.code}</Td>
                    <Td className="text-ink-900">{s.title}</Td>
                    <Td className="text-ink-500">
                      {s.currentStatus === "IN_PROGRESS" ? "In progress" : recorded || "—"}
                      {s.currentTerm && <span className="ml-1.5 font-mono text-xs text-ink-400">{s.currentTerm}</span>}
                    </Td>
                    <Td>
                      <Select
                        name={changed ? `grade:${s.code}` : undefined}
                        value={value}
                        onChange={(e) => setValues((v) => ({ ...v, [s.code]: e.target.value }))}
                        aria-label={`Grade for ${s.code}`}
                        className="h-9"
                      >
                        {/* An existing grade can be corrected but not blanked out. */}
                        {!recorded && <option value="">—</option>}
                        {GRADE_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={`/students/${studentId}`} className="text-sm font-medium text-ink-500 hover:text-ink-800">
          Cancel
        </Link>
        {edits.length === 0 || !term ? (
          <button type="button" disabled className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white opacity-50">
            Save grades
          </button>
        ) : (
          <ConfirmButton
            tone="primary"
            confirmLabel="Save grades"
            title={`Save ${plural(edits.length, "grade")} for term ${term}?`}
            description={
              <>
                <p>
                  {edits.map((s) => `${s.code}: ${values[s.code]}`).join(", ")}.
                </p>
                {resolutions.length > 0 && (
                  <p className="mt-2">
                    {resolutions.map((s) => `${s.code}’s INC${s.currentTerm ? ` from ${s.currentTerm}` : ""}`).join(", ")}{" "}
                    will be completed: {resolutions.length === 1 ? "it stays" : "they stay"} taken in{" "}
                    {resolutions.length === 1 ? "its" : "their"} original term, and a passing grade counts from {term}.
                  </p>
                )}
                {corrections.length > 0 && (
                  <p className="mt-2 font-medium text-amber-800">
                    {plural(corrections.length, "existing grade")} will be replaced. The old value stays in the grade
                    logbook.
                  </p>
                )}
              </>
            }
          >
            Save grades
          </ConfirmButton>
        )}
      </div>

      {state.result && (
        <Card>
          <CardHeader title="Some grades weren’t saved" description="Fix the rows marked below and submit them again." />
          <ul className="divide-y divide-line text-sm">
            {state.result.rows.map((row, i) =>
              row.accepted ? (
                <li key={i} className="flex items-center gap-2 px-5 py-3 text-ink-700">
                  <CheckCircle2 className="size-4 text-status-completed" aria-hidden />
                  {row.subjectCode} saved{row.resolvedFrom ? ` (INC from ${row.resolvedFrom} completed)` : ""}
                </li>
              ) : (
                <li key={i} className="flex items-center gap-2 px-5 py-3 text-ink-700">
                  <XCircle className="size-4 text-status-violation" aria-hidden />
                  <span className="font-medium">{row.rawCode}</span> — {row.reason}
                </li>
              )
            )}
          </ul>
        </Card>
      )}
    </form>
  );
}
