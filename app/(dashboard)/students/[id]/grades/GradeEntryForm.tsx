"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, XCircle } from "lucide-react";
import { submitTermGrades, type SubmitGradesState } from "./actions";
import { Card, CardHeader, CardBody } from "../../../../../components/ui/Card";
import { Field, Hint, Label, Select } from "../../../../../components/ui/Field";
import TermFields from "../../../../../components/ui/TermFields";
import { Table, Td, Th, Tr } from "../../../../../components/ui/Table";
import { Badge } from "../../../../../components/ui/Badge";
import { Button } from "../../../../../components/ui/Button";
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
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "IN_PROGRESS" | "NOT_TAKEN";
  currentTerm: string | null;
  canTake: boolean;
  blockedReason: string | null;
}

const initialState: SubmitGradesState = { result: null, error: null };
const GRADE_OPTIONS = ["1.0", "1.25", "1.50", "1.75", "2.0", "2.25", "2.50", "2.75", "3.0", "5.0", "INC", "IP"];
const IN_PROGRESS = "IP";

/** How a grade option reads on screen. */
function gradeLabel(value: string): string {
  return value === IN_PROGRESS ? "In progress" : value;
}

function currentValue(subject: SubjectRow): string {
  if (subject.currentStatus === "INCOMPLETE") return "INC";
  if (subject.currentStatus === "IN_PROGRESS") return IN_PROGRESS;
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
  // Subjects ticked for marking as in progress all at once.
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const shown = useMemo(
    () =>
      yearLevel && semester
        ? subjects.filter((s) => s.yearLevel === Number(yearLevel) && s.semester === Number(semester))
        : [],
    [subjects, yearLevel, semester]
  );

  const term = termYear && termSemester ? `${termYear.padStart(2, "0")}-${termSemester}` : "";
  // Only grades that differ from what's recorded are submitted, so untouched
  // subjects keep their original term. A subject in progress from an earlier
  // term that's marked in progress again is being taken now, so it moves to
  // this term.
  const isChange = (s: SubjectRow, value: string) =>
    value !== currentValue(s) || (value === IN_PROGRESS && s.currentTerm !== term);
  const edits = shown.filter((s) => values[s.code] !== undefined && isChange(s, values[s.code]));
  const moved = edits.filter((s) => s.currentStatus === "IN_PROGRESS" && values[s.code] === IN_PROGRESS);
  // A final grade for an INC completes it: it keeps its original term.
  // (Marking it in progress instead means it's being taken again.)
  const resolutions = edits.filter(
    (s) => s.currentStatus === "INCOMPLETE" && values[s.code] !== "INC" && values[s.code] !== IN_PROGRESS
  );
  // Only the latest attempt is kept, so a grade from an earlier term than the
  // recorded one would replace a newer grade. Saving it needs confirming.
  const isEarlier = (s: SubjectRow) =>
    isValidTerm(term) && isValidTerm(s.currentTerm) && compareTerms(term, s.currentTerm) < 0;
  const replacesLater = edits.filter((s) => isEarlier(s) && !resolutions.includes(s));
  const corrections = edits.filter(
    (s) => currentValue(s) !== "" && !resolutions.includes(s) && !replacesLater.includes(s) && !moved.includes(s)
  );

  // A subject already passed isn't taken again, so it can't be ticked; its
  // grade can still be corrected from its own dropdown.
  const checkable = shown.filter((s) => s.currentStatus !== "PASSED");
  const checkedShown = checkable.filter((s) => checked.has(s.code));
  // Ticking all leaves out subjects the student can't take yet (e.g. a
  // prerequisite not passed); those can still be ticked one by one.
  const takeable = checkable.filter((s) => s.canTake);
  const allChecked = takeable.length > 0 && takeable.every((s) => checked.has(s.code));
  const toggle = (code: string) =>
    setChecked((c) => {
      const next = new Set(c);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  const markInProgress = () => {
    setValues((v) => ({ ...v, ...Object.fromEntries(checkedShown.map((s) => [s.code, IN_PROGRESS])) }));
    setChecked(new Set());
  };

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
          description="Only subjects you change are saved. Changing an existing grade counts as a correction. Tick subjects the student is taking now to mark them in progress all at once."
          actions={edits.length > 0 && <Badge tone="brand">{plural(edits.length, "grade")} to save</Badge>}
        />
        {!yearLevel || !semester ? (
          <EmptyState icon={ClipboardList} title="Choose a year level and semester" description="That semester’s subjects will be listed here." />
        ) : shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No subjects in that semester" />
        ) : (
          <>
            {checkedShown.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-50/60 px-5 py-2.5 text-sm">
                <span className="font-medium text-ink-800">{plural(checkedShown.length, "subject")} ticked</span>
                <Button size="sm" onClick={markInProgress}>
                  <Clock aria-hidden />
                  Mark as in progress
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
                  Clear
                </Button>
              </div>
            )}
            <Table className="table-fixed">
              <colgroup>
                <col className="w-12" />
                <col className="w-28" />
                <col />
                <col className="w-40" />
                <col className="w-44" />
              </colgroup>
              <thead>
                <tr>
                  <Th>
                    <input
                      type="checkbox"
                      aria-label="Tick every subject the student can take"
                      title="Tick every subject the student can take"
                      className="size-4 cursor-pointer accent-brand-600 align-middle disabled:cursor-default"
                      checked={allChecked}
                      disabled={takeable.length === 0}
                      ref={(el) => {
                        if (el) el.indeterminate = checkedShown.length > 0 && !allChecked;
                      }}
                      onChange={() =>
                        setChecked((c) =>
                          allChecked
                            ? new Set([...c].filter((code) => !takeable.some((s) => s.code === code)))
                            : new Set([...c, ...takeable.map((s) => s.code)])
                        )
                      }
                    />
                  </Th>
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
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Tick ${s.code}`}
                          title={s.currentStatus === "PASSED" ? "Already passed" : undefined}
                          className="mt-0.5 size-4 cursor-pointer accent-brand-600 disabled:cursor-default disabled:opacity-40"
                          checked={checked.has(s.code)}
                          disabled={s.currentStatus === "PASSED"}
                          onChange={() => toggle(s.code)}
                        />
                      </Td>
                      <Td className="font-mono text-ink-600">{s.code}</Td>
                      <Td className="text-ink-900">
                        {s.title}
                        {s.blockedReason && (
                          <p className="mt-0.5 text-xs leading-snug text-amber-800">{s.blockedReason}</p>
                        )}
                      </Td>
                      <Td className="text-ink-500">
                        {recorded ? gradeLabel(recorded) : "—"}
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
                              {gradeLabel(o)}
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
        {edits.length === 0 || !term ? (
          <button type="button" disabled className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white opacity-50">
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
                  {edits.map((s) => `${s.code}: ${gradeLabel(values[s.code])}`).join(", ")}.
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
                {moved.length > 0 && (
                  <p className="mt-2">
                    {moved.map((s) => `${s.code} (${s.currentTerm})`).join(", ")}{" "}
                    {moved.length === 1 ? "was" : "were"} in progress from an earlier term and will be in progress in{" "}
                    {term} instead.
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
