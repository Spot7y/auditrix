import type { Metadata } from "next";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { getCurriculumVersionsForStaff } from "../../../../lib/queries/curriculum";
import { STUDENT_ID_HINT, STUDENT_ID_PATTERN } from "../../../../lib/domain/studentId";
import { registerStudent } from "./actions";
import ImportStudentsModal from "./ImportStudentsModal";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Field, Input, Select } from "../../../../components/ui/Field";
import SubmitButton from "../../../../components/ui/SubmitButton";
import Alert from "../../../../components/ui/Alert";

export const metadata: Metadata = { title: "Register student" };

export default async function NewStudentPage() {
  const staff = await getCurrentStaff();
  const versions = await getCurriculumVersionsForStaff();

  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Register student" />
        <Alert tone="error">Only a chairperson account linked to a program can register students.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/students", label: "All students" }}
        title="Register student"
        description={`Add a student to ${staff.program}, or import a whole class list at once.`}
      />

      <Card>
        <CardHeader title="Student details" />
        <form action={registerStudent}>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="ID number" htmlFor="id" hint={STUDENT_ID_HINT}>
              <Input
                id="id"
                name="id"
                required
                pattern={STUDENT_ID_PATTERN}
                title={STUDENT_ID_HINT}
                placeholder="25-123456"
                className="font-mono"
              />
            </Field>
            <Field label="Full name" htmlFor="name" hint="Last, First Middle">
              <Input id="name" name="name" required placeholder="Dela Cruz, Juan Santos" />
            </Field>
            <Field label="Curriculum version" htmlFor="curriculumId">
              <Select id="curriculumId" name="curriculumId" required defaultValue="">
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
            <Field
              label="Year level"
              htmlFor="nominalYearLevel"
              hint="Where the student is now. It rises automatically as their grades are entered."
            >
              <Select id="nominalYearLevel" name="nominalYearLevel" required defaultValue="1">
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
              </Select>
            </Field>
          </CardBody>
          <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <SubmitButton pendingLabel="Registering…">Register student</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Import a class list"
          description="Upload an Excel or CSV file, or the “Export to Excel” file from KSU-MIS, to register many students at once."
        />
        <CardBody>
          <ImportStudentsModal versions={versions?.versions ?? []} />
        </CardBody>
      </Card>
    </div>
  );
}
