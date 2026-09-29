import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChevronRight, SearchX, UserPlus, Users } from "lucide-react";
import { listStudents } from "../../../lib/queries/students";
import PageHeader from "../../../components/ui/PageHeader";
import { Card } from "../../../components/ui/Card";
import { LinkButton } from "../../../components/ui/Button";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";
import StudentFilter from "./StudentFilter";

export const metadata: Metadata = { title: "Students" };

const LIMIT = 100;
const YEAR = ["", "1st year", "2nd year", "3rd year", "4th year"];

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const students = await listStudents(q, LIMIT);

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
            <StudentFilter />
          </Suspense>
          <p className="text-sm text-ink-500">
            {students.length === LIMIT ? `Showing the first ${LIMIT}` : `${students.length} student${students.length === 1 ? "" : "s"}`}
            {q && " matching your search"}
          </p>
        </div>

        {students.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title="No matches" description={`No student’s ID or name matches “${q}”.`} />
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
                  </Td>
                  <Td className="font-mono text-ink-600">{s.id}</Td>
                  <Td className="hidden text-ink-600 sm:table-cell">
                    {s.program}
                    {s.curriculumYear ? ` · ${s.curriculumYear}` : ""}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-600">{YEAR[s.yearLevel] ?? s.yearLevel}</Td>
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
