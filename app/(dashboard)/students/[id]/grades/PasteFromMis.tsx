"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { savePastedGrades } from "./actions";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Button } from "../../../../../components/ui/Button";
import { Badge, type BadgeTone } from "../../../../../components/ui/Badge";
import { Select } from "../../../../../components/ui/Field";
import Alert from "../../../../../components/ui/Alert";
import ConfirmButton from "../../../../../components/ui/ConfirmButton";
import ActionForm from "../../../../../components/ui/ActionForm";
import { compareTerms, describeTerm } from "../../../../../lib/domain/Term";
import { parseMisPaste, planMisPaste, type PlanAction, type PlanSubject } from "../../../../../lib/domain/import/misPaste";
import { plural } from "../../../../../lib/format";

const ACTION: Record<PlanAction, [string, BadgeTone]> = {
  new: ["New", "green"],
  retake: ["Retake", "green"],
  "complete-inc": ["Completes INC", "green"],
  change: ["Changes grade", "amber"],
  same: ["Already recorded", "gray"],
  "later-recorded": ["Later grade kept", "gray"],
  "in-progress": ["In progress", "gray"],
  dropped: ["Dropped", "gray"],
  invalid: ["Not a KSU grade", "red"],
  "not-found": ["Choose subject", "red"],
  future: ["After this semester", "red"],
};

/**
 * Enter grades by pasting the student's "Academic Grades" from the KSU-MIS:
 * every term at once, checked here before anything is saved.
 */
export default function PasteFromMis({
  studentId,
  subjects,
  currentTerm,
}: {
  studentId: string;
  subjects: (PlanSubject & { yearLevel: number; semester: number })[];
  currentTerm: string | null;
}) {
  const [text, setText] = useState("");
  const [read, setRead] = useState<ReturnType<typeof parseMisPaste> | null>(null);
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [leftOut, setLeftOut] = useState<Set<number>>(new Set());

  const plan = useMemo(
    () => (read ? planMisPaste(read.rows, subjects, currentTerm, chosen) : []),
    [read, subjects, currentTerm, chosen]
  );
  const otherStudent = read?.studentId && read.studentId !== studentId ? read.studentId : null;
  const toSave = plan
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => row.save && !leftOut.has(index) && row.subjectCode);
  const terms = [...new Set(plan.map((r) => r.term))].sort(compareTerms);

  const reset = () => {
    setRead(null);
    setChosen({});
    setLeftOut(new Set());
  };

  return (
    <Card className="mb-6">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ClipboardPaste className="size-4.5 text-brand-600" aria-hidden />
            Paste from MIS
          </span>
        }
        description="In the KSU-MIS, open this student’s Grades, select the page (Ctrl+A selects all of it; menus and names are ignored), copy (Ctrl+C) and paste here. Nothing is saved until you check the grades and confirm."
      />
      <CardBody className="space-y-4">
        {!read ? (
          <>
            <textarea
              aria-label="Grades copied from the MIS"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={"Term: 25-1 - First Semester\nCODE  DESCRIPTION  GRADE  UNITS  REMARKS\nMATH 11  Mathematics in the Modern World  2.5  3  Passed\n…"}
              className="block w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm text-ink-900 shadow-sm placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex justify-end">
              <Button onClick={() => setRead(parseMisPaste(text))} disabled={!text.trim()}>
                Read grades
              </Button>
            </div>
          </>
        ) : otherStudent ? (
          <>
            <Alert tone="error" title="This paste is for another student">
              It shows ID number {otherStudent}, but these are the grades of {studentId}. Nothing will be saved. Copy
              this student’s grades from the MIS instead.
            </Alert>
            <Button variant="secondary" onClick={reset}>
              Paste again
            </Button>
          </>
        ) : plan.length === 0 ? (
          <>
            <Alert tone="warning" title="No grades found">
              Copy the Academic Grades section in the MIS, including the “Term: 25-1 - First Semester” lines above each
              table, then paste again.
            </Alert>
            <Button variant="secondary" onClick={reset}>
              Paste again
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-700">
              Found {plural(plan.length, "grade")} in {plural(terms.length, "term")}.{" "}
              <span className="font-medium text-ink-900">{plural(toSave.length, "grade")} will be saved</span>; the others
              are already recorded or can’t be saved (see why). Untick any you don’t want.
            </p>
            {terms.map((term) => (
              <div key={term} className="overflow-x-auto rounded-lg border border-line">
                <p className="border-b border-line bg-ink-50 px-3 py-2 text-sm font-medium text-ink-900">
                  {term} · {describeTerm(term)}
                </p>
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                      <th className="w-10 px-3 py-2">
                        <span className="sr-only">Save</span>
                      </th>
                      <th className="px-3 py-2">In the MIS</th>
                      <th className="w-16 px-3 py-2 text-right">Grade</th>
                      <th className="px-3 py-2">Auditrix subject</th>
                      <th className="px-3 py-2">What happens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plan
                      .map((row, index) => ({ row, index }))
                      .filter(({ row }) => row.term === term)
                      .map(({ row, index }) => {
                        const [label, tone] = ACTION[row.action];
                        const canChoose = row.action === "not-found" || chosen[index] !== undefined || row.matchedBy === "title";
                        return (
                          <tr key={index} className={row.save && !leftOut.has(index) ? "" : "text-ink-500"}>
                            <td className="px-3 py-2">
                              {row.save && (
                                <input
                                  type="checkbox"
                                  aria-label={`Save ${row.code}`}
                                  checked={!leftOut.has(index)}
                                  onChange={(e) =>
                                    setLeftOut((s) => {
                                      const next = new Set(s);
                                      if (e.target.checked) next.delete(index);
                                      else next.add(index);
                                      return next;
                                    })
                                  }
                                  className="size-4 accent-brand-700"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-ink-800">{row.code}</span>
                              <span className="block text-xs text-ink-500">{row.description}</span>
                            </td>
                            <td className="tabular px-3 py-2 text-right font-medium text-ink-900">{row.grade}</td>
                            <td className="px-3 py-2">
                              {canChoose ? (
                                <Select
                                  aria-label={`Auditrix subject for ${row.code}`}
                                  value={row.subjectCode ?? ""}
                                  onChange={(e) =>
                                    setChosen((c) => {
                                      const next = { ...c };
                                      if (e.target.value) next[index] = e.target.value;
                                      else delete next[index];
                                      return next;
                                    })
                                  }
                                  className="h-8 min-w-36 py-0 text-sm"
                                >
                                  <option value="">Choose…</option>
                                  {subjects.map((s) => (
                                    <option key={s.code} value={s.code}>
                                      {s.code} · {s.title}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <span className="font-mono text-ink-800">{row.subjectCode ?? "—"}</span>
                              )}
                              {row.matchedBy === "title" && !chosen[index] && (
                                <span className="mt-0.5 block text-xs text-amber-800">Matched by title, check it</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={tone}>{label}</Badge>
                              <span className="mt-0.5 block text-xs text-ink-500">{row.note}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ))}
            <ActionForm action={savePastedGrades} errorClassName="mb-4">
              <input type="hidden" name="studentId" value={studentId} />
              <input
                type="hidden"
                name="rows"
                value={JSON.stringify(toSave.map(({ row }) => ({ term: row.term, code: row.subjectCode, grade: row.grade })))}
              />
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button variant="secondary" onClick={reset}>
                  Paste again
                </Button>
                {toSave.length === 0 ? (
                  <Button disabled>Nothing to save</Button>
                ) : (
                  <ConfirmButton
                    tone="primary"
                    title={`Save ${plural(toSave.length, "grade")} from the MIS?`}
                    description={`For ${[...new Set(toSave.map(({ row }) => row.term))].sort(compareTerms).join(", ")}. Every grade goes in the grade logbook, and the usual checks still apply when saving.`}
                    confirmLabel="Save grades"
                  >
                    Save {plural(toSave.length, "grade")}
                  </ConfirmButton>
                )}
              </div>
            </ActionForm>
          </>
        )}
      </CardBody>
    </Card>
  );
}
