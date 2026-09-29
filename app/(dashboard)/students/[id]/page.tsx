import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardPen, History, Pencil, Repeat, TriangleAlert } from "lucide-react";
import type { Requirement } from "../../../../lib/domain/requirements/Requirement";
import { isCorequisite } from "../../../../lib/domain/requirements/CoursePrerequisite";
import StudentSearchBar from "../StudentSearchBar";
import { getStudentAudit } from "../../../../lib/queries/students";
import { getPendingShiftRequest } from "../../../../lib/queries/transitions";
import { formatGrade, plural } from "../../../../lib/format";
import PageHeader from "../../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { LinkButton } from "../../../../components/ui/Button";
import { Badge, StatusBadge } from "../../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../../components/ui/Table";
import Alert from "../../../../components/ui/Alert";

const YEAR_LABEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First semester", 2: "Second semester", 3: "Midyear" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Student ${id}` };
}

function requirementLabel(requirement: Requirement) {
  return isCorequisite(requirement) ? `${requirement.description} (co-req)` : requirement.description;
}

function SummaryTile({
  label,
  value,
  sub,
  alert = false,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold ${alert ? "text-status-violation" : "text-ink-900"}`}>
        {value}
        {sub && <span className="ml-1 text-sm font-normal text-ink-400">{sub}</span>}
      </p>
      {children}
    </div>
  );
}

export default async function StudentAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudentAudit(id);
  if (!data) notFound();

  const isPending = await getPendingShiftRequest(id);

  type Row = (typeof data.rows)[number];
  const byTerm = new Map<string, { year: number; semester: number; rows: Row[] }>();
  for (const row of data.rows) {
    const key = `${row.subject.yearLevel}-${row.subject.semester}`;
    const entry = byTerm.get(key) ?? { year: row.subject.yearLevel, semester: row.subject.semester, rows: [] };
    entry.rows.push(row);
    byTerm.set(key, entry);
  }
  const terms = [...byTerm.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);

  const count = (status: Row["result"]["status"]) => data.rows.filter((r) => r.result.status === status).length;
  const totalUnits = data.rows.reduce((sum, r) => sum + Number(r.subject.units), 0);
  const earnedUnits = data.rows
    .filter((r) => r.result.status === "COMPLETED")
    .reduce((sum, r) => sum + Number(r.subject.units), 0);
  const violations = data.rows.filter((r) => r.result.status === "VIOLATION");
  const toVerify = data.rows.filter((r) => r.result.warnings.some((w) => w.startsWith("Year standing: please verify")));
  const progress = totalUnits ? Math.round((earnedUnits / totalUnits) * 100) : 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <LinkButton href="/students" variant="ghost" size="sm" className="-ml-3 text-ink-500">
          ← All students
        </LinkButton>
        <div className="w-full sm:w-80">
          <StudentSearchBar placeholder="Find another student…" />
        </div>
      </div>

      <PageHeader
        eyebrow={data.studentId}
        title={data.studentName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {data.program} · {YEAR_LABEL[data.nominalYearLevel] ?? `Year ${data.nominalYearLevel}`} standing
            {isPending && <Badge tone="amber">Pending shift request</Badge>}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/students/${id}/edit`} variant="secondary">
              <Pencil aria-hidden />
              Edit
            </LinkButton>
            <LinkButton href={`/students/${id}/logbook`} variant="secondary">
              <History aria-hidden />
              Grade logbook
            </LinkButton>
            <LinkButton href={`/students/${id}/transitions`} variant="secondary">
              <Repeat aria-hidden />
              Transfer / shift
            </LinkButton>
            <LinkButton href={`/students/${id}/grades`}>
              <ClipboardPen aria-hidden />
              Enter grades
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="Subjects completed" value={String(count("COMPLETED"))} sub={`of ${data.rows.length}`} />
        <SummaryTile label="Units earned" value={String(earnedUnits)} sub={`of ${totalUnits} · ${progress}%`}>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
          </div>
        </SummaryTile>
        <SummaryTile label="Can take now" value={String(count("AVAILABLE"))} sub="subjects" />
        <SummaryTile
          label="Violations"
          value={String(violations.length)}
          sub={violations.length ? "need attention" : "none"}
          alert={violations.length > 0}
        />
      </div>

      {violations.length > 0 && (
        <Alert tone="error" title="Subjects taken out of order" className="mb-6">
          {violations.map((v) => v.subject.code).join(", ")} {violations.length === 1 ? "was" : "were"} taken before a
          prerequisite was passed, or without {violations.length === 1 ? "its" : "their"} co-requisite in the same term.
          The credit doesn’t count, and {violations.length === 1 ? "it has" : "they have"} to be retaken once the
          requirements are met.
        </Alert>
      )}

      {toVerify.length > 0 && (
        <Alert tone="warning" title="Year standing: please verify" className="mb-6">
          {toVerify.map((r) => r.subject.code).join(", ")} needed a year standing that the grades alone don’t show, and no
          year level is recorded for the term {toVerify.length === 1 ? "it was" : "they were"} taken. Check the
          student’s year level at the time and record it under Edit → Year level.
        </Alert>
      )}

      <div className="space-y-5">
        {terms.map(({ year, semester, rows }) => {
          const termUnits = rows.reduce((sum, r) => sum + Number(r.subject.units), 0);
          return (
            <Card key={`${year}-${semester}`}>
              <CardHeader
                title={`${YEAR_LABEL[year] ?? `Year ${year}`} · ${SEMESTER_LABEL[semester] ?? `Semester ${semester}`}`}
                description={`${plural(rows.length, "subject")} · ${plural(termUnits, "unit")}`}
              />
              <Table className="table-fixed">
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col className="hidden w-48 md:table-column" />
                  <col className="w-16" />
                  <col className="w-20" />
                  <col className="hidden w-20 sm:table-column" />
                  <col className="w-64" />
                </colgroup>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Subject</Th>
                    <Th className="hidden md:table-cell">Prerequisites</Th>
                    <Th className="text-right">Units</Th>
                    <Th className="text-right">Grade</Th>
                    <Th className="hidden sm:table-cell">Term</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ subject, result, grade, term, resolvedTerm }) => (
                    <Tr key={subject.code} className={result.status === "VIOLATION" ? "bg-red-50/60" : ""}>
                      <Td className="font-mono text-ink-600">{subject.code}</Td>
                      <Td className="text-ink-900">{subject.title}</Td>
                      <Td className="hidden text-xs text-ink-500 md:table-cell">
                        {subject.requirements.length > 0 ? subject.requirements.map(requirementLabel).join(", ") : "—"}
                      </Td>
                      <Td className="tabular text-right text-ink-600">{Number(subject.units)}</Td>
                      <Td className="tabular text-right font-medium text-ink-900">{formatGrade(grade)}</Td>
                      <Td className="hidden font-mono text-xs text-ink-600 sm:table-cell">
                        {term ?? "—"}
                        {resolvedTerm && <span className="block text-ink-400">INC → {resolvedTerm}</span>}
                      </Td>
                      <Td>
                        <StatusBadge status={result.status} />
                        {result.reasons.length > 0 && (
                          <p className="mt-1 text-xs leading-snug text-ink-500">
                            {result.status === "UNAVAILABLE" ? "Needs: " : ""}
                            {result.reasons.join("; ")}
                          </p>
                        )}
                        {result.warnings.length > 0 && (
                          <p className="mt-1 flex gap-1 text-xs leading-snug text-amber-800">
                            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                            {result.warnings.join("; ")}
                          </p>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          );
        })}
      </div>
    </>
  );
}
