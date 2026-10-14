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
import { compareTerms, isValidTerm } from "../../../../../lib/domain/Term";

interface SubjectRow {
  code: string;
  title: string;
  yearLevel: number;
  semester: number;
  currentGrade: number | null;
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "NOT_TAKEN";
  currentTerm: string | null;
  blockedReason: string | null;
}

const initialState: SubmitGradesState = { result: null, error: null };
const GRADE_OPTIONS = ["1.0", "1.25", "1.50", "1.75", "2.0", "2.25", "2.50", "2.75", "3.0", "5.0", "INC"];
// The term's semester that goes with each curriculum semester (3 is the midyear, S on KSU records).
const TERM_SEMESTER: Record<string, string> = { "1": "1", "2": "2", "3": "S" };

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
  /** The college's current semester, shown as a reminder. */
  currentTerm: string | null;
}) {
  const [state, formAction] = useActionState(submitTermGrades, initialState);
  const [yearLevel, setYearLevel] = useState("");
  const [semester, setSemester] = useState("");
  // The year starts empty on purpose: grades can't be saved until the
  // chairperson types the school year they were earned in.
  const [termYear, setTermYear] = useState("");
  const [termSemester, setTermSemester] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [missingYear, setMissingYear] = useState(false);

  const shown = useMemo(
    () =>
      yearLevel && semester
        ? subjects.filter((s) => s.yearLevel === Number(yearLevel) && s.semester === Number(semester))
        : [],
    [subjects, yearLevel, semester]
  );

  const yearValid = /^\d{1,2}$/.test(termYear.trim());
  const term = yearValid && termSemester ? `${termYear.trim().padStart(2, "0")}-${termSemester}` : "";
  // Only grades the chairperson picked that differ from what's recorded are
  // submitted, so untouched subjects keep their original term. The same
  // grade in another term is a retake with the same result (e.g. 5.0 again),
  // which is a new attempt, so it's saved too.
  const isChange = (s: SubjectRow, value: string) =>
    value !== currentValue(s) || (s.currentTerm !== null && s.currentTerm !== term);
  const edits = shown.filter((s) => values[s.code] !== undefined && isChange(s, values[s.code]));
  const retakes = edits.filter((s) => values[s.code] === currentValue(s));
  // A final grade for an INC completes it: it keeps its original term.
  const resolutions = edits.filter((s) => s.currentStatus === "INCOMPLETE" && values[s.code] !== "INC");
  // Only the latest attempt is kept, so a grade from an earlier term than the
  // recorded one would replace a newer grade. Saving it needs confirming.
  const isEarlier = (s: SubjectRow) =>
    isValidTerm(term) && isValidTerm(s.currentTerm) && compareTerms(term, s.currentTerm) < 0;
  const replacesLater = edits.filter((s) => isEarlier(s) && !resolutions.includes(s));
  const laterRetakes = retakes.filter((s) => !replacesLater.includes(s));
  const corrections = edits.filter(
    (s) => currentValue(s) !== "" && !resolutions.includes(s) && !replacesLater.includes(s) && !retakes.includes(s)
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />
      {/* Confirmed in the save dialog, which warns about these. */}
      {replacesLater.map((s) => (
        <input key={s.code} type="hidden" name="replaceLaterTerm" value={s.code} />
      ))}

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
            <Select
              id="semester"
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                // Grades for a semester's subjects are usually earned in that
                // semester, so the term follows; it can still be changed.
                if (TERM_SEMESTER[e.target.value]) setTermSemester(TERM_SEMESTER[e.target.value]);
              }}
            >
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
              yearPlaceholder="e.g. 26"
              yearInvalid={missingYear && !yearValid}
              onYearChange={(e) => {
                setTermYear(e.target.value);
                setMissingYear(false);
              }}
              onSemesterChange={(e) => setTermSemester(e.target.value)}
            />
            {missingYear && !term ? (
              <p role="alert" className="mt-1.5 text-sm font-medium text-status-violation">
                {yearValid
                  ? "Choose the semester the grades were earned in. Nothing was saved."
                  : "Enter the school year the grades were earned in (two digits, e.g. 26). Nothing was saved."}
              </p>
            ) : (
              <Hint>
                Type the two-digit school year as on the KSU record, e.g. 25 – 1. The semester follows the curriculum
                semester; midyear is S (26 – S comes before 26 – 1).
                {currentTerm && ` The current semester is ${currentTerm}.`}
              </Hint>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2. Enter grades"
          description="Only subjects you pick a grade for are saved. Changing an existing grade counts as a correction; the same grade in a later term is a retake."
          actions={edits.length > 0 && <Badge tone="brand">{plural(edits.length, "grade")} to save</Badge>}
        />
        {!yearLevel || !semester ? (
          <EmptyState icon={ClipboardList} title="Choose a year level and semester" description="That semester’s subjects will be listed here." />
        ) : shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No subjects in that semester" />
        ) : (
          <>
            <Table className="table-fixed">
              <colgroup>
                <col className="w-28" />
                <col />
                <col className="w-40" />
                <col className="w-44" />
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
                  const changed = values[s.code] !== undefined && isChange(s, value);
                  return (
                    <Tr key={s.code} className={changed ? (recorded ? "bg-amber-50/70" : "bg-brand-50/60") : ""}>
                      <Td className="font-mono text-ink-600">{s.code}</Td>
                      <Td className="text-ink-900">
                        {s.title}
                        {s.blockedReason && (
                          <p className="mt-0.5 text-xs leading-snug text-amber-800">{s.blockedReason}</p>
                        )}
                      </Td>
                      <Td className="text-ink-500">
                        {recorded ? recorded : "—"}
                        {s.currentTerm && <span className="ml-1.5 whitespace-nowrap font-mono text-xs text-ink-400">{s.currentTerm}</span>}
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
                        {changed && isEarlier(s) && (
                          <p className="mt-1 text-xs leading-snug text-amber-800">Recorded grade is from a later term</p>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </>
        )}
      </Card>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={`/students/${studentId}`} className="text-sm font-medium text-ink-500 hover:text-ink-800">
          Cancel
        </Link>
        {edits.length === 0 ? (
          <button type="button" disabled className="h-10 rounded-lg bg-brand-800 px-4 text-sm font-medium text-white opacity-50">
            Save grades
          </button>
        ) : !term ? (
          // Without a full term nothing is saved: point at what's missing instead.
          <button
            type="button"
            onClick={() => {
              setMissingYear(true);
              document.getElementById(yearValid ? "termYearSemester" : "termYear")?.focus();
            }}
            className="h-10 rounded-lg bg-brand-800 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-900"
          >
            Save grades
          </button>
        ) : (
          <ConfirmButton
            tone="primary"
            confirmLabel={replacesLater.length > 0 ? "Replace and save" : "Save grades"}
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
                {replacesLater.length > 0 && (
                  <p className="mt-2 font-medium text-red-800">
                    {replacesLater.map((s) => `${s.code} (${s.currentTerm})`).join(", ")}{" "}
                    {replacesLater.length === 1 ? "already has a grade" : "already have grades"} from a later term than{" "}
                    {term}. Only the latest attempt is kept, so saving replaces{" "}
                    {replacesLater.length === 1 ? "it" : "them"}; the old grade stays in the grade logbook. Continue only
                    if the later term was entered by mistake.
                  </p>
                )}
                {laterRetakes.length > 0 && (
                  <p className="mt-2">
                    {laterRetakes.map((s) => `${s.code} (${s.currentTerm})`).join(", ")}{" "}
                    {laterRetakes.length === 1 ? "is" : "are"} saved as retaken in {term} with the same grade. Only the
                    latest attempt is kept; the earlier one stays in the grade logbook.
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
