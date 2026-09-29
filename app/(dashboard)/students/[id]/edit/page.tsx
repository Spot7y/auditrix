import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentAudit } from "../../../../../lib/queries/students";
import { getCurrentTerm, getYearLevelHistory } from "../../../../../lib/queries/yearLevels";
import { STUDENT_ID_HINT } from "../../../../../lib/domain/studentId";
import { parseTerm } from "../../../../../lib/domain/Term";
import { formatDateTime } from "../../../../../lib/format";
import { setYearLevel, updateStudentInfo } from "./actions";
import PageHeader from "../../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../../components/ui/Card";
import { Field, Hint, Input, Label, Select } from "../../../../../components/ui/Field";
import { LinkButton } from "../../../../../components/ui/Button";
import { Table, Td, Th, Tr } from "../../../../../components/ui/Table";
import ConfirmButton from "../../../../../components/ui/ConfirmButton";
import TermFields from "../../../../../components/ui/TermFields";

export const metadata: Metadata = { title: "Edit student" };

const YEAR_LABEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, currentTerm, history] = await Promise.all([getStudentAudit(id), getCurrentTerm(), getYearLevelHistory(id)]);
  if (!data) notFound();

  const term = currentTerm ? parseTerm(currentTerm.term) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        title="Edit student"
        description="Correct a mistake in the ID number or name, or change the student’s year level."
      />
      <Card>
        <CardHeader title="Details" description="Grades, transfers and history follow a new ID automatically." />
        <form action={updateStudentInfo}>
          <CardBody className="space-y-4">
            <input type="hidden" name="currentId" value={id} />
            <Field label="ID number" htmlFor="id" hint={STUDENT_ID_HINT}>
              <Input id="id" name="id" defaultValue={data.studentId} required className="font-mono" />
            </Field>
            <Field label="Full name" htmlFor="name" hint="Last, First Middle">
              <Input id="name" name="name" defaultValue={data.studentName} required />
            </Field>
          </CardBody>
          <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <LinkButton href={`/students/${id}`} variant="secondary">
              Cancel
            </LinkButton>
            <ConfirmButton
              tone="primary"
              title="Save changes to this student?"
              description="If you changed the ID number, the student’s audit, grades and history move to the new ID."
              confirmLabel="Save changes"
            >
              Save changes
            </ConfirmButton>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Year level"
          description={`Now ${YEAR_LABEL[data.nominalYearLevel] ?? `year ${data.nominalYearLevel}`}. To move a whole class up at the start of a school year, use Promote students.`}
        />
        <form action={setYearLevel}>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="studentId" value={id} />
            <Field label="Year level" htmlFor="yearLevel">
              <Select id="yearLevel" name="yearLevel" defaultValue={String(data.nominalYearLevel)} required>
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    {YEAR_LABEL[y]}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <Label htmlFor="termYear">From term</Label>
              <TermFields
                defaultYear={term ? String(term.year).padStart(2, "0") : ""}
                defaultSemester={term ? String(term.semester) : ""}
              />
              <Hint>
                Defaults to the current semester. A term before the latest one below only fills in past history; the
                current year level stays.
              </Hint>
            </div>
          </CardBody>
          <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <ConfirmButton
              tone="primary"
              title="Change this student’s year level?"
              description="The year level history records it from the term you chose. If that’s the latest term in the history, the student’s current year level changes too."
              confirmLabel="Save year level"
            >
              Save year level
            </ConfirmButton>
          </div>
        </form>
        {history.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>From term</Th>
                <Th>Year level</Th>
                <Th>Recorded by</Th>
                <Th className="text-right">When</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <Tr key={h.term}>
                  <Td className="font-mono text-ink-600">{h.term}</Td>
                  <Td className="text-ink-900">{YEAR_LABEL[h.yearLevel] ?? h.yearLevel}</Td>
                  <Td className="text-ink-600">{h.recordedBy}</Td>
                  <Td className="whitespace-nowrap text-right text-ink-500">{formatDateTime(h.recordedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
