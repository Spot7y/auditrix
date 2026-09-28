import type { Metadata } from "next";
import { getCurriculumForStaff } from "../../../../lib/queries/curriculum";
import { createSubject } from "../actions";
import ImportCurriculumModal from "../ImportCurriculumModal";
import SubjectFields from "../SubjectFields";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import SubmitButton from "../../../../components/ui/SubmitButton";
import Alert from "../../../../components/ui/Alert";

export const metadata: Metadata = { title: "Add subject" };

export default async function NewSubjectPage({ searchParams }: { searchParams: Promise<{ curriculumId?: string }> }) {
  const { curriculumId } = await searchParams;
  const data = await getCurriculumForStaff(curriculumId);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader back={{ href: "/curriculum", label: "Curriculum" }} title="Add subject" />
        <Alert tone="error">Choose a curriculum version on the Curriculum page first.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: `/curriculum?version=${data.curriculumId}`, label: `${data.program} ${data.effectiveYear} curriculum` }}
        title="Add subject"
        description={`Add one subject to the ${data.program} ${data.effectiveYear} curriculum. Prerequisites can be added after it’s created.`}
      />

      <Card>
        <CardHeader title="New subject" />
        <form action={createSubject}>
          <input type="hidden" name="curriculumId" value={data.curriculumId} />
          <CardBody>
            <SubjectFields />
          </CardBody>
          <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <SubmitButton pendingLabel="Adding…">Add subject</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Import the whole curriculum"
          description="Replace this version’s subjects with the ones in a CSV file. You’ll see a preview before anything is saved."
        />
        <CardBody>
          <ImportCurriculumModal curriculumId={data.curriculumId} />
        </CardBody>
      </Card>
    </div>
  );
}
