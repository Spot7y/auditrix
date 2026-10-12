import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight, History, SearchX } from "lucide-react";
import { getAllTransitions, type TransitionRow } from "../../../lib/queries/transitions";
import { requireRole } from "../../../lib/queries/access";
import { formatDate, TRANSITION_LABEL, TRANSITION_TONE } from "../../../lib/format";
import { searchTerms } from "../../../lib/domain/searchTerms";
import PageHeader from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";
import MovementFilters from "./MovementFilters";

export const metadata: Metadata = { title: "Student movements" };

const LIMIT = 200;

/** The calendar year a movement was recorded, in Philippine time. */
function yearOf(t: TransitionRow): number {
  return Number(new Intl.DateTimeFormat("en-PH", { year: "numeric", timeZone: "Asia/Manila" }).format(new Date(t.recordedAt)));
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; program?: string; year?: string }>;
}) {
  const staff = await requireRole("chairperson", "dean");
  const { q = "", type = "", program = "", year = "" } = await searchParams;
  const all = await getAllTransitions();

  const programs = [...new Set(all.flatMap((t) => [t.fromProgram, t.toProgram]).filter((p): p is string => !!p))].sort();
  const years = [...new Set(all.map(yearOf))].sort((a, b) => b - a);
  const terms = searchTerms(q).map((t) => t.toLowerCase());
  const shown = all.filter(
    (t) =>
      (!type || t.type === type) &&
      (!program || t.fromProgram === program || t.toProgram === program) &&
      (!year || yearOf(t) === Number(year)) &&
      terms.every((term) => t.studentId.toLowerCase().includes(term) || t.studentName.toLowerCase().includes(term))
  );
  const filtered = !!(q || type || program || year);

  return (
    <>
      <PageHeader
        title="Student movements"
        description={
          staff.role === "dean"
            ? "Every shift, transfer and drop recorded in your college’s programs."
            : `Every shift, transfer and drop recorded for ${staff.program}.`
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <Suspense>
            <MovementFilters programs={staff.role === "dean" ? programs : []} years={years} />
          </Suspense>
          <p className="text-sm text-ink-500">
            {shown.length > LIMIT
              ? `Showing ${LIMIT} of ${shown.length} movements`
              : `${shown.length} movement${shown.length === 1 ? "" : "s"}`}
            {filtered && " matching"}
          </p>
        </div>

        {shown.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title="No matches" description="No movement matches the search and filters." />
          ) : (
            <EmptyState icon={History} title="Nothing recorded yet" description="Shifts, transfers and drops will be listed here." />
          )
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Movement</Th>
                <Th>Program</Th>
                <Th className="hidden md:table-cell">Recorded by</Th>
                <Th className="text-right">Date</Th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, LIMIT).map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/students/${t.studentId}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {t.studentName}
                    </Link>
                    <p className="font-mono text-xs text-ink-500">{t.studentId}</p>
                  </Td>
                  <Td>
                    <Badge tone={TRANSITION_TONE[t.type] ?? "gray"}>{TRANSITION_LABEL[t.type] ?? t.type}</Badge>
                  </Td>
                  <Td className="text-ink-600">
                    {t.fromProgram && t.toProgram && t.fromProgram !== t.toProgram ? (
                      <span className="inline-flex items-center gap-1.5">
                        {t.fromProgram}
                        <ArrowRight className="size-3.5 text-ink-400" aria-label="to" />
                        {t.toProgram}
                      </span>
                    ) : (
                      (t.fromProgram ?? t.toProgram ?? "—")
                    )}
                  </Td>
                  <Td className="hidden text-ink-600 md:table-cell">{t.recordedBy}</Td>
                  <Td className="whitespace-nowrap text-right text-ink-500">{formatDate(t.recordedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
