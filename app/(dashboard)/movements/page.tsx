import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight, History, Printer, SearchX } from "lucide-react";
import { getAllTransitions } from "../../../lib/queries/transitions";
import { requireRole } from "../../../lib/queries/access";
import { formatDate, TRANSITION_LABEL, TRANSITION_TONE } from "../../../lib/format";
import { filterMovements, movementYear } from "../../../lib/domain/movements";
import PageHeader from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import { buttonClasses } from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import MovementFilters from "./MovementFilters";

export const metadata: Metadata = { title: "Student movements" };

const LIMIT = 200;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; program?: string; year?: string }>;
}) {
  const staff = await requireRole("chairperson", "dean");
  // Only the chairperson opens a student; the dean sees the list without links.
  const isChair = staff.role === "chairperson";
  const { q = "", type = "", program = "", year = "" } = await searchParams;
  const all = await getAllTransitions();

  const programs = [...new Set(all.flatMap((t) => [t.fromProgram, t.toProgram]).filter((p): p is string => !!p))].sort();
  const years = [...new Set(all.map((t) => movementYear(t.recordedAt)))].sort((a, b) => b - a);
  const shown = filterMovements(all, { q, type, program, year });
  const filtered = !!(q || type || program || year);
  // The report prints the same filtered list, every row of it.
  const reportQuery = new URLSearchParams(Object.entries({ q, type, program, year }).filter(([, v]) => v)).toString();

  return (
    <>
      <PageHeader
        title="Student movements"
        description={
          staff.role === "dean"
            ? "Every shift, transfer and drop recorded in your college’s programs."
            : `Every shift, transfer and drop recorded for ${staff.program}.`
        }
        actions={
          shown.length > 0 && (
            // A PDF from a route handler, so a plain link; it opens in a new tab to print.
            <a
              href={`/movements/report-pdf${reportQuery ? `?${reportQuery}` : ""}`}
              target="_blank"
              rel="noopener"
              className={buttonClasses({ variant: "secondary" })}
            >
              <Printer aria-hidden />
              Print report
            </a>
          )
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
                    {isChair ? (
                      <Link href={`/students/${t.studentId}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {t.studentName}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink-900">{t.studentName}</span>
                    )}
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
