import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, SearchX, UserPlus, Users } from "lucide-react";
import { listStudents, type StudentListFilters, type StudentListItem } from "../../../lib/queries/students";
import { Badge } from "../../../components/ui/Badge";
import PageHeader from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { LinkButton } from "../../../components/ui/Button";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";
import StudentFilter from "./StudentFilter";
import { requireRole } from "../../../lib/queries/access";

export const metadata: Metadata = { title: "Students" };

const LIMIT = 100;
const YEAR = ["", "1st year", "2nd year", "3rd year", "4th year"];

const STATUSES = ["REGULAR", "IRREGULAR", "NOT_DETERMINED", "DROPPED", "TRANSFERRED_OUT", "VIOLATIONS", "CLOSED"];

function StatusBadges({ s }: { s: StudentListItem }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {s.status === "REGULAR" && <Badge tone="green">Regular</Badge>}
      {s.status === "IRREGULAR" && <Badge tone="amber">Irregular</Badge>}
      {s.status === "DROPPED" && <Badge tone="red">Dropped</Badge>}
      {s.status === "TRANSFERRED_OUT" && <Badge tone="red">Transferred out</Badge>}
      {s.violations > 0 && <Badge tone="red">{s.violations === 1 ? "1 violation" : `${s.violations} violations`}</Badge>}
      {s.status === "NOT_DETERMINED" && s.violations === 0 && <span className="text-ink-400">—</span>}
    </span>
  );
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; curriculum?: string; status?: string }>;
}) {
  await requireRole("chairperson");
  const { q = "", year, curriculum, status } = await searchParams;
  const filters: StudentListFilters = {
    q,
    year: Number(year) || undefined,
    curriculumYear: Number(curriculum) || undefined,
    status: STATUSES.includes(status ?? "") ? (status as StudentListFilters["status"]) : undefined,
  };
  const filtered = !!(q || filters.year || filters.curriculumYear || filters.status);
  const { students, total, curriculumYears } = await listStudents(filters, LIMIT);

  return (
    <>
      <PageHeader
        title="Students"
        description="Everyone in your program. Open a student to see their audit, grades and history."
        actions={
          <LinkButton href="/students/new">
            <UserPlus aria-hidden />
            Register student
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <Suspense>
            <StudentFilter curriculumYears={curriculumYears} />
          </Suspense>
          <p className="text-sm text-ink-500">
            {total > LIMIT ? `Showing ${LIMIT} of ${total} students` : `${total} student${total === 1 ? "" : "s"}`}
            {filtered && " matching"}
          </p>
        </div>

        {students.length === 0 ? (
          filtered ? (
            <EmptyState icon={SearchX} title="No matches" description="No student matches the search and filters." />
          ) : (
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Register students one at a time or import a class list."
              action={<LinkButton href="/students/new">Register a student</LinkButton>}
            />
          )
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>ID number</Th>
                <Th className="hidden sm:table-cell">Curriculum</Th>
                <Th>Year</Th>
                <Th className="hidden md:table-cell">Status</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <Tr key={s.id} className="group">
                  <Td>
                    <Link href={`/students/${s.id}`} className="font-medium text-ink-900 group-hover:text-brand-700">
                      {s.name}
                    </Link>
                    {s.note && (
                      <p className={`mt-0.5 text-xs ${s.violations > 0 ? "text-status-violation" : "text-ink-500"}`}>{s.note}</p>
                    )}
                  </Td>
                  <Td className="font-mono text-ink-600">{s.id}</Td>
                  <Td className="hidden text-ink-600 sm:table-cell">
                    {s.program}
                    {s.curriculumYear ? ` · ${s.curriculumYear}` : ""}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-600">{YEAR[s.yearLevel] ?? s.yearLevel}</Td>
                  <Td className="hidden md:table-cell">
                    <StatusBadges s={s} />
                  </Td>
                  <Td className="w-10 text-right">
                    <Link href={`/students/${s.id}`} aria-label={`Open ${s.name}`} className="inline-flex text-ink-400 group-hover:text-brand-700">
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
