import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { noticeUrl } from "../../../../../lib/notices";
import { getRecordLock } from "../../../../../lib/queries/transitions";
import { getStudentGradeEntryData } from "../../../../../lib/queries/students";
import { getCurrentTerm } from "../../../../../lib/queries/yearLevels";
import PageHeader from "../../../../../components/ui/PageHeader";
import GradeEntryForm from "./GradeEntryForm";
import { requireRole } from "../../../../../lib/queries/access";

export const metadata: Metadata = { title: "Enter grades" };

export default async function GradeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("chairperson");
  const { id } = await params;
  const [data, currentTerm, lock] = await Promise.all([
    getStudentGradeEntryData(id),
    getCurrentTerm(),
    getRecordLock(id),
  ]);
  if (!data) notFound();
  if (lock) {
    redirect(noticeUrl(`/students/${id}`, "record-locked"));
  }

  // Within a semester, subjects keep the curriculum's own order.
  const subjects = [...data.subjects].sort((a, b) => a.yearLevel - b.yearLevel || a.semester - b.semester);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        eyebrow={data.studentId}
        title="Enter grades"
        description={`${data.studentName} · ${data.program}`}
      />
      <GradeEntryForm studentId={id} subjects={subjects} currentTerm={currentTerm?.term ?? null} />
    </div>
  );
}
