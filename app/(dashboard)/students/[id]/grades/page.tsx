import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentGradeEntryData } from "../../../../../lib/queries/students";
import GradeEntryForm from "./GradeEntryForm";
import { formatGrade } from "../../../../../lib/format";

export default async function GradeEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentGradeEntryData(id);
  if (!data) notFound();

  const subjects = [...data.subjects].sort(
    (a, b) => a.yearLevel - b.yearLevel || a.semester - b.semester || a.code.localeCompare(b.code)
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href={`/students/${id}`} className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to audit
      </Link>
      <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[color:var(--ink)]/60">{data.studentId}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">Enter grades</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{data.studentName} · {data.program}</p>
      <GradeEntryForm studentId={id} subjects={subjects} />
    </main>
  );
}