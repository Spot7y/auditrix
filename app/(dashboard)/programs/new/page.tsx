import type { Metadata } from "next";
import { createProgram } from "./action";
import ChairAccountFields from "../ChairAccountFields";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Field, Input } from "../../../../components/ui/Field";
import ConfirmButton from "../../../../components/ui/ConfirmButton";

export const metadata: Metadata = { title: "Create program" };

export default function NewProgramPage() {
  const thisYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create program"
        description="Adds a new program to your college, with an empty first curriculum and a login for its chairperson."
      />
      <form action={createProgram} className="space-y-6">
        <Card>
          <CardHeader title="Program" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Program code" htmlFor="program" hint="Short name, e.g. BSCE. Must be unique.">
              <Input id="program" name="program" required placeholder="BSCE" className="uppercase" />
            </Field>
            <Field label="First curriculum year" htmlFor="effectiveYear">
              <Input id="effectiveYear" name="effectiveYear" type="number" required min={2000} max={thisYear + 10} defaultValue={thisYear} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Chairperson account" description="The chairperson manages this program’s curriculum and students." />
          <CardBody>
            <ChairAccountFields />
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <ConfirmButton
            tone="primary"
            title="Create this program?"
            description="The program and the chairperson’s login are created right away. Program codes can’t be reused."
            confirmLabel="Create program"
          >
            Create program
          </ConfirmButton>
        </div>
      </form>
    </div>
  );
}
