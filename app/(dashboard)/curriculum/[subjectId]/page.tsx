import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListChecks, Trash2, X } from "lucide-react";
import {
  describeRequirement,
  getCurriculumForStaff,
  getCurriculumIdForSubject,
} from "../../../../lib/queries/curriculum";
import { updateSubject, deleteSubject, deleteRequirement } from "../actions";
import AddRequirementForm from "./AddRequirementForm";
import SubjectFields from "../SubjectFields";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { LinkButton } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import ConfirmButton from "../../../../components/ui/ConfirmButton";
import EmptyState from "../../../../components/ui/EmptyState";

export const metadata: Metadata = { title: "Edit subject" };

export default async function EditSubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  // Load the subject's own version, not just the newest one, so older versions can be edited too.
  const curriculumId = await getCurriculumIdForSubject(subjectId);
  const data = curriculumId ? await getCurriculumForStaff(curriculumId) : null;
  const subject = data?.subjects.find((s) => s.id === subjectId);
  if (!data || !subject) notFound();

  const backHref = `/curriculum?version=${data.curriculumId}`;
  const otherCodes = data.subjects.filter((s) => s.id !== subject.id).map((s) => s.code);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: backHref, label: `${data.program} ${data.effectiveYear} curriculum` }}
        eyebrow={subject.code}
        title={subject.title}
        description="Edit the subject’s details and what students need before taking it."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Details" />
          <form action={updateSubject}>
            <input type="hidden" name="subjectId" value={subject.id} />
            <CardBody>
              <SubjectFields subject={subject} />
            </CardBody>
            <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-ink-50 px-5 py-3">
              <LinkButton href={backHref} variant="secondary">
                Cancel
              </LinkButton>
              <ConfirmButton
                tone="primary"
                title={`Save changes to ${subject.code}?`}
                description="Every student audit using this curriculum version updates right away."
                confirmLabel="Save changes"
              >
                Save changes
              </ConfirmButton>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Requirements" description="Students must meet all of these before taking the subject." />
          {subject.requirements.length === 0 ? (
            <EmptyState icon={ListChecks} title="No requirements" description="Any student can take this subject." />
          ) : (
            <ul className="divide-y divide-line">
              {subject.requirements.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm text-ink-800">
                    <Badge tone={r.type === "PREREQUISITE" ? "gray" : "blue"}>
                      {r.type === "PREREQUISITE"
                        ? "Prerequisite"
                        : r.type === "COREQUISITE"
                          ? "Corequisite"
                          : r.type === "YEAR_STANDING"
                            ? "Year standing"
                            : "Completion"}
                    </Badge>
                    {describeRequirement(r)}
                  </span>
                  <form action={deleteRequirement}>
                    <input type="hidden" name="requirementId" value={r.id} />
                    <input type="hidden" name="subjectId" value={subject.id} />
                    <ConfirmButton
                      variant="danger-ghost"
                      size="sm"
                      title={`Remove this requirement from ${subject.code}?`}
                      description={`Students will no longer need “${describeRequirement(r)}” to take ${subject.code}. Their audits update right away.`}
                      confirmLabel="Remove"
                      aria-label={`Remove requirement ${describeRequirement(r)}`}
                    >
                      <X aria-hidden />
                      Remove
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-5 py-4">
            <AddRequirementForm subjectId={subject.id} codes={otherCodes} />
          </div>
        </Card>

        <Card className="border-red-200">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <h2 className="font-semibold text-ink-900">Delete subject</h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Only possible if no student has a grade in it and no other subject requires it.
              </p>
            </div>
            <form action={deleteSubject}>
              <input type="hidden" name="subjectId" value={subject.id} />
              <ConfirmButton
                title={`Delete ${subject.code}?`}
                description={`${subject.code} — ${subject.title} will be removed from the ${data.effectiveYear} curriculum. This can’t be undone.`}
                confirmLabel="Delete subject"
              >
                <Trash2 aria-hidden />
                Delete
              </ConfirmButton>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
