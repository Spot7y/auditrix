import type { Metadata } from "next";
import { getProgramsWithChairpersonForDean } from "../../../../lib/queries/programs";
import { reassignChairperson } from "./actions";
import ChairAccountFields from "../ChairAccountFields";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Field, Select } from "../../../../components/ui/Field";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import Alert from "../../../../components/ui/Alert";

export const metadata: Metadata = { title: "Reassign chairperson" };

export default async function ReassignChairpersonPage() {
  const programs = await getProgramsWithChairpersonForDean();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Reassign chairperson"
        description="Hand a program over to a new chairperson. The outgoing chairperson’s login is deactivated."
      />

      {programs.length === 0 ? (
        <Alert tone="error">Only a dean account with programs in their college can reassign chairpersons.</Alert>
      ) : (
        <form action={reassignChairperson} className="space-y-6">
          <Card>
            <CardHeader title="Program" />
            <CardBody>
              <Field label="Program" htmlFor="program">
                <Select id="program" name="program" required defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {programs.map((p) => (
                    <option key={p.program} value={p.program}>
                      {p.program} — currently {p.chairpersonName ?? "vacant"}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="New chairperson" />
            <CardBody>
              <ChairAccountFields />
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <ConfirmButton
              title="Replace this program’s chairperson?"
              description="The current chairperson loses access immediately and can no longer log in. The new chairperson takes over the program’s curriculum and students."
              confirmLabel="Replace chairperson"
            >
              Reassign chairperson
            </ConfirmButton>
          </div>
        </form>
      )}
    </div>
  );
}
