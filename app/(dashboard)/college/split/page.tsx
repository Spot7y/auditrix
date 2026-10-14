import type { Metadata } from "next";
import { splitCollege } from "./actions";
import ChairAccountFields from "../../programs/ChairAccountFields";
import CollegeHistory from "../CollegeHistory";
import { getCollegeHistory, getEmptyColleges } from "../../../../lib/queries/college";
import DestinationFields from "./DestinationFields";
import { getProgramsWithChairpersonForDean } from "../../../../lib/queries/programs";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import Alert from "../../../../components/ui/Alert";
import { requireRole } from "../../../../lib/queries/access";

export const metadata: Metadata = { title: "Split the college" };

export default async function SplitCollegePage() {
  const staff = await requireRole("dean");
  const [programs, history, emptyColleges] = await Promise.all([
    getProgramsWithChairpersonForDean(),
    getCollegeHistory(),
    getEmptyColleges(),
  ]);
  const college = staff.collegeName ?? "your college";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Split the college"
        description={`Move some of ${college}’s programs to a new college with its own dean.`}
      />

      {programs.length < 2 ? (
        <Alert tone="info">A college needs at least two programs to be split: one moves, at least one stays.</Alert>
      ) : (
        <form action={splitCollege} className="space-y-6">
          <Alert tone="info">
            Only the programs’ college changes. Their curriculum versions, students, grades, chairpersons and history
            stay as they are, and the new college starts on {college}’s current semester. You stop seeing the moved
            programs; the new dean sees them.
          </Alert>

          <Card>
            <CardHeader title="Where the programs go" />
            <CardBody>
              <DestinationFields emptyColleges={emptyColleges} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Programs that move" description="Tick the programs that go to the new college." />
            <ul className="divide-y divide-line">
              {programs.map((p) => (
                <li key={p.program}>
                  <label className="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm hover:bg-ink-50">
                    <input type="checkbox" name="program" value={p.program} className="size-4 accent-brand-600" />
                    <span className="font-medium text-ink-900">{p.program}</span>
                    <span className="text-ink-500">· {p.chairpersonName ?? "no chairperson"}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Dean of the new college" />
            <CardBody>
              <ChairAccountFields role="dean" />
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <ConfirmButton
              tone="primary"
              title="Split the college?"
              description={`The ticked programs move to the new college and its dean’s account is created. You’ll no longer see those programs in ${college}.`}
              confirmLabel="Split the college"
            >
              Split the college
            </ConfirmButton>
          </div>
        </form>
      )}

      <CollegeHistory entries={history} />
    </div>
  );
}
