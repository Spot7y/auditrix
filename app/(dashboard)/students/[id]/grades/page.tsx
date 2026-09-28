import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentGradeEntryData } from "../../../../../lib/queries/students";
import PageHeader from "../../../../../components/ui/PageHeader";
import GradeEntryForm from "./GradeEntryForm";

export const metadata: Metadata = { title: "Enter grades" };

export default async function GradeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentGradeEntryData(id);
  if (!data) notFound();

  const subjects = [...data.subjects].sort(
    (a, b) => a.yearLevel - b.yearLevel || a.semester - b.semester || a.code.localeCompare(b.code)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        eyebrow={data.studentId}
        title="Enter grades"
        description={`${data.studentName} · ${data.program}`}
      />
      <GradeEntryForm studentId={id} subjects={subjects} />
    </div>
  );
}
