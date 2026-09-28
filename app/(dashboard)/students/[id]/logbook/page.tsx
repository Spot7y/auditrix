import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { getStudentLogbook } from "../../../../../lib/queries/logbook";
import { formatDateTime, formatGrade } from "../../../../../lib/format";
import PageHeader from "../../../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../../../components/ui/Card";
import { Badge, type BadgeTone } from "../../../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../../../components/ui/Table";
import EmptyState from "../../../../../components/ui/EmptyState";

export const metadata: Metadata = { title: "Grade logbook" };

const RESULT: Record<string, { label: string; tone: BadgeTone }> = {
  PASSED: { label: "Passed", tone: "green" },
  FAILED: { label: "Failed", tone: "red" },
  INCOMPLETE: { label: "Incomplete", tone: "amber" },
  IN_PROGRESS: { label: "In progress", tone: "blue" },
};

export default async function StudentLogbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentLogbook(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `/students/${id}`, label: "Back to audit" }}
        eyebrow={data.studentId}
        title="Grade logbook"
        description={`${data.studentName} · ${data.program} — every grade ever recorded, including attempts later replaced.`}
      />

      {data.subjectGroups.length === 0 ? (
        <Card>
          <EmptyState icon={NotebookPen} title="No grades recorded yet" description="Grades appear here as soon as they’re entered." />
        </Card>
      ) : (
        <div className="space-y-5">
          {data.subjectGroups.map((group) => (
            <Card key={group.subjectCode}>
              <CardHeader
                title={
                  <span>
                    <span className="font-mono text-ink-500">{group.subjectCode}</span> · {group.subjectTitle}
                  </span>
                }
                description={group.entries.length > 1 ? `${group.entries.length} entries` : undefined}
              />
              <Table className="table-fixed">
                <colgroup>
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-32" />
                  <col />
                  <col className="w-48" />
                </colgroup>
                <thead>
                  <tr>
                    <Th>Term</Th>
                    <Th className="text-right">Grade</Th>
                    <Th>Result</Th>
                    <Th>Recorded by</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry) => {
                    const result = RESULT[entry.status] ?? { label: entry.status, tone: "gray" as const };
                    return (
                      <Tr key={entry.id}>
                        <Td className="font-mono text-ink-600">{entry.term ?? "—"}</Td>
                        <Td className="tabular text-right font-medium">{formatGrade(entry.grade)}</Td>
                        <Td>
                          <Badge tone={result.tone}>{result.label}</Badge>
                        </Td>
                        <Td className="text-ink-600">{entry.changedBy}</Td>
                        <Td className="text-ink-500">{formatDateTime(entry.changedAt)}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
