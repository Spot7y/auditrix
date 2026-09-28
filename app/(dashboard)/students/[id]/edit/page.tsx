import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentAudit } from "../../../../../lib/queries/students";
import { STUDENT_ID_HINT } from "../../../../../lib/domain/studentId";
import { updateStudentInfo } from "./actions";
import PageHeader from "../../../../../components/ui/PageHeader";
import { Card, CardBody } from "../../../../../components/ui/Card";
import { Field, Input } from "../../../../../components/ui/Field";
import { LinkButton } from "../../../../../components/ui/Button";
import ConfirmButton from "../../../../../components/ui/ConfirmButton";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentAudit(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        title="Edit student"
        description="Correct a mistake in the ID number or name. Grades, transfers and history follow the new ID automatically."
      />
      <Card>
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
    </div>
  );
}
