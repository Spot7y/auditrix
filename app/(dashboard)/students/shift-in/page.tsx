import type { Metadata } from "next";
import { ArrowRight, Search, UserRoundSearch } from "lucide-react";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { getCurriculumVersionsForStaff } from "../../../../lib/queries/curriculum";
import { lookupPendingShiftStudent } from "../../../../lib/queries/transitions";
import { acceptShiftIn } from "./actions";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Field, Input, Select } from "../../../../components/ui/Field";
import { Button } from "../../../../components/ui/Button";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import Alert from "../../../../components/ui/Alert";
import EmptyState from "../../../../components/ui/EmptyState";

export const metadata: Metadata = { title: "Shift in a student" };

export default async function ShiftInPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const staff = await getCurrentStaff();
  const versions = await getCurriculumVersionsForStaff();

  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Shift in a student" />
        <Alert tone="error">Only a chairperson account can accept students shifting in.</Alert>
      </div>
    );
  }

  const result = id ? await lookupPendingShiftStudent(id.trim()) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Shift in a student"
        description={`Accept a student who is shifting into ${staff.program}. Their current chairperson must have filed a shift request first.`}
      />

      <Card>
        <CardBody>
          <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Student ID number" htmlFor="id" className="flex-1">
              <Input id="id" name="id" defaultValue={id ?? ""} required placeholder="23-10112" className="font-mono" />
            </Field>
            <Button type="submit" variant="secondary">
              <Search aria-hidden />
              Look up
            </Button>
          </form>
        </CardBody>
      </Card>

      {id && !result && (
        <Card className="mt-6">
          <EmptyState
            icon={UserRoundSearch}
            title="No pending shift request"
            description={`No student with the ID “${id}” has a pending shift request. Check the ID, or ask their current chairperson to file the request.`}
          />
        </Card>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader
            title={result.studentName}
            description={
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono">{result.studentId}</span> · {result.fromProgram}
                <ArrowRight className="size-3.5" aria-label="to" /> {staff.program}
              </span>
            }
          />
          <form action={acceptShiftIn}>
            <input type="hidden" name="studentId" value={result.studentId} />
            <CardBody>
              <Field
                label="Curriculum version"
                htmlFor="newCurriculumId"
                hint="The student will be audited against this version from now on."
              >
                <Select id="newCurriculumId" name="newCurriculumId" required defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {versions?.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {staff.program} {v.effectiveYear}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardBody>
            <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
              <ConfirmButton
                tone="primary"
                title={`Accept ${result.studentName} into ${staff.program}?`}
                description={`The student moves from ${result.fromProgram} to ${staff.program}, and both programs’ records show the shift. Grades recorded under ${result.fromProgram} don’t carry over automatically; enter any credited subjects on the Enter Grades page.`}
                confirmLabel="Accept student"
              >
                Accept student
              </ConfirmButton>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
