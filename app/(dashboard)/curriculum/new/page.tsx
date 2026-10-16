import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurriculumForStaff } from "../../../../lib/queries/curriculum";
import { noticeUrl } from "../../../../lib/notices";
import { createSubject } from "../actions";
import ImportCurriculumModal from "../ImportCurriculumModal";
import SubjectFields from "../SubjectFields";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import SubmitButton from "../../../../components/ui/SubmitButton";
import Alert from "../../../../components/ui/Alert";
import { requireRole } from "../../../../lib/queries/access";
import ActionForm from "../../../../components/ui/ActionForm";

export const metadata: Metadata = { title: "Add subject" };

export default async function NewSubjectPage({ searchParams }: { searchParams: Promise<{ curriculumId?: string }> }) {
  await requireRole("chairperson");
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

  if (data.studentCount > 0) {
    redirect(noticeUrl(`/curriculum?version=${data.curriculumId}`, "curriculum-locked"));
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
        <ActionForm action={createSubject}>
          <input type="hidden" name="curriculumId" value={data.curriculumId} />
          <CardBody>
            <SubjectFields />
          </CardBody>
          <div className="flex justify-end rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
            <SubmitButton pendingLabel="Adding…">Add subject</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {/* Only while the version is empty, e.g. a new program's first curriculum. A revised
          curriculum from a file is a new version: New version → An Excel or CSV file. */}
      {data.subjects.length === 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Import the whole curriculum"
            description="This version has no subjects yet. Fill it from an Excel or CSV file; you’ll see a preview before anything is saved."
          />
          <CardBody>
            <ImportCurriculumModal curriculumId={data.curriculumId} />
          </CardBody>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-ink-500">
          Have the revised curriculum as a file? On the Curriculum page, choose New version, then “An Excel or CSV
          file”.
        </p>
      )}
    </div>
  );
}
