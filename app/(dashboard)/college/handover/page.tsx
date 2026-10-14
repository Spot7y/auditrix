import type { Metadata } from "next";
import { handOverDeanship } from "./actions";
import ChairAccountFields from "../../programs/ChairAccountFields";
import CollegeHistory from "../CollegeHistory";
import { getCollegeHistory } from "../../../../lib/queries/college";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import Alert from "../../../../components/ui/Alert";
import { requireRole } from "../../../../lib/queries/access";
import ActionForm from "../../../../components/ui/ActionForm";

export const metadata: Metadata = { title: "Hand over the deanship" };

export default async function HandOverDeanshipPage() {
  const staff = await requireRole("dean");
  const history = await getCollegeHistory();
  const college = staff.collegeName ?? "your college";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Hand over the deanship"
        description={`Create the account of the next dean of ${college}. Your own account is closed when you hand over.`}
      />

      <Alert tone="warning" className="mb-6">
        After the handover you’re signed out and can’t log in again. Everything you recorded keeps your name, and the
        college’s programs, students and history stay as they are.
      </Alert>

      <ActionForm action={handOverDeanship}>
        <Card>
          <CardHeader title="New dean" description={`They take over ${college} when they first log in.`} />
          <CardBody>
            <ChairAccountFields role="dean" />
          </CardBody>
          <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <ConfirmButton
              title={`Hand over the deanship of ${college}?`}
              description="The new dean’s account is created and yours is closed right away: you’ll be signed out and can’t log in again. This can’t be undone from here."
              confirmLabel="Hand over and sign out"
            >
              Hand over the deanship
            </ConfirmButton>
          </div>
        </Card>
      </ActionForm>

      <CollegeHistory entries={history} />
    </div>
  );
}
