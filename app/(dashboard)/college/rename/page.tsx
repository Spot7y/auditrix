import type { Metadata } from "next";
import { renameCollege } from "./actions";
import CollegeHistory from "../CollegeHistory";
import { getCollegeHistory, getOwnCollege } from "../../../../lib/queries/college";
import { COLLEGE_SHORT_NAME_MAX_LENGTH, NAME_MAX_LENGTH } from "../../../../lib/domain/names";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Field, Input } from "../../../../components/ui/Field";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import { requireRole } from "../../../../lib/queries/access";
import ActionForm from "../../../../components/ui/ActionForm";

export const metadata: Metadata = { title: "College name" };

export default async function CollegeNamePage() {
  const staff = await requireRole("dean");
  const [college, history] = await Promise.all([getOwnCollege(staff.collegeId!), getCollegeHistory()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="College name"
        description="Rename your college, e.g. after a split leaves it with only some of its programs."
      />

      <ActionForm action={renameCollege}>
        <Card>
          <CardHeader
            title={college ? `${college.name} (${college.shortName})` : "Your college"}
            description="Programs, students and records stay as they are; the new name shows everywhere from now on, including printed student evaluations."
          />
          <CardBody className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field label="Name" htmlFor="collegeName">
              <Input
                id="collegeName"
                name="collegeName"
                required
                maxLength={NAME_MAX_LENGTH}
                defaultValue={college?.name}
                placeholder="College of Engineering"
              />
            </Field>
            <Field label="Short name" htmlFor="shortName">
              <Input
                id="shortName"
                name="shortName"
                required
                maxLength={COLLEGE_SHORT_NAME_MAX_LENGTH}
                defaultValue={college?.shortName}
                placeholder="COE"
                className="uppercase"
              />
            </Field>
          </CardBody>
          <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <ConfirmButton
              tone="primary"
              title="Rename the college?"
              description="The new name shows everywhere: the sidebar, dashboards and printed student evaluations. The rename is added to the college history."
              confirmLabel="Rename college"
            >
              Save name
            </ConfirmButton>
          </div>
        </Card>
      </ActionForm>

      <CollegeHistory entries={history} />
    </div>
  );
}
