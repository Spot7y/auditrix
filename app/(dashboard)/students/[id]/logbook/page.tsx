import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentLogbook } from "../../../../../lib/queries/logbook";
import { formatGrade } from "../../../../../lib/format";

const RECORD_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  PASSED: { label: "Passed", color: "var(--status-completed)" },
  FAILED: { label: "Failed", color: "var(--status-violation)" },
  INCOMPLETE: { label: "Incomplete", color: "var(--status-pending)" },
  IN_PROGRESS: { label: "In Progress", color: "var(--status-pending)" },
};

export default async function StudentLogbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentLogbook(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href={`/students/${id}`} className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to profile
      </Link>
      <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[color:var(--ink)]/60">{data.studentId}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">Grade Logbook</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{data.studentName} · {data.program}</p>
      <p className="mt-2 max-w-xl text-xs text-[color:var(--ink)]/50">
        Full history of every grade ever recorded for this student, including attempts later replaced by a retake.
      </p>

      {data.subjectGroups.length === 0 ? (
        <p className="mt-10 text-sm text-[color:var(--ink)]/60">No grades have been recorded for this student yet.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {data.subjectGroups.map((group) => (
            <section key={group.subjectCode}>
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[color:var(--accent-maroon)]">
                {group.subjectCode} — {group.subjectTitle}
              </h2>
              <table className="mt-2 w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "90px" }} />
                  <col />
                  <col style={{ width: "140px" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[color:var(--ledger-line)] text-left text-xs uppercase tracking-wide text-[color:var(--ink)]/50">
                    <th className="py-2 pr-4 font-medium">Term</th>
                    <th className="py-2 pr-4 font-medium">Grade</th>
                    <th className="py-2 pr-4 font-medium">Result</th>
                    <th className="py-2 pr-4 font-medium">Recorded By</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--ledger-line)]">
                  {group.entries.map((entry) => {
                    const style = RECORD_STATUS_STYLE[entry.status] ?? { label: entry.status, color: "var(--ink)" };
                    return (
                      <tr key={entry.id}>
                        <td className="py-2 pr-4">{entry.term ?? "—"}</td>
                        <td className="py-2 pr-4 font-[family-name:var(--font-mono)]">{formatGrade(entry.grade)}</td>
                        <td className="py-2 pr-4">
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.color }}>
                            {style.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-[color:var(--ink)]/60">{entry.changedBy}</td>
                        <td className="py-2 text-xs text-[color:var(--ink)]/50">
                          {new Date(entry.changedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}