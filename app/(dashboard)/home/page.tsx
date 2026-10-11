import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, ChevronRight, History, Search, UserPlus, Users } from "lucide-react";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { getAnalytics, type ProgramSummary } from "../../../lib/queries/analytics";
import { getRecentTransitions } from "../../../lib/queries/transitions";
import { formatDate, plural, TRANSITION_LABEL } from "../../../lib/format";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { LinkButton } from "../../../components/ui/Button";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";
import { getCurrentTerm } from "../../../lib/queries/yearLevels";
import { describeTerm } from "../../../lib/domain/Term";
import CurrentTermCard from "./CurrentTermCard";
import { requireRole } from "../../../lib/queries/access";

export const metadata: Metadata = { title: "Dashboard" };

const YEAR_NAMES = ["Freshman", "Sophomore", "Junior", "Senior"];

const TRANSITION_TONE: Record<string, BadgeTone> = {
  TRANSFERRED_IN: "blue",
  TRANSFERRED_OUT: "gray",
  SHIFTED_IN: "brand",
  SHIFTED_OUT: "gray",
  DROPPED: "red",
  REOPENED: "green",
};

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, hint, tone = "default" }: { label: string; value: number; hint?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const color = { default: "text-ink-900", good: "text-status-completed", warn: "text-status-pending", bad: "text-status-violation" }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function ProgramSection({ s }: { s: ProgramSummary }) {
  const maxInYear = Math.max(1, ...[1, 2, 3, 4].map((y) => s.byYearLevel[y] ?? 0));
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-ink-900">{s.program}</h2>
        <Badge tone="brand">{plural(s.totalStudents, "student")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total students" value={s.totalStudents} />
        <Stat
          label="Regular"
          value={s.regularStudents}
          tone="good"
          hint={`Full prescribed load${s.undeterminedStudents ? ` · ${s.undeterminedStudents} not determined` : ""}`}
        />
        <Stat
          label="Irregular"
          value={s.irregularStudents}
          tone={s.irregularStudents ? "warn" : "default"}
          hint="Less than the prescribed load"
        />
        <Stat label="With violations" value={s.atRiskStudents} tone={s.atRiskStudents ? "bad" : "default"} hint="Subjects taken out of order" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Students by year level" />
          <ul className="space-y-3 px-5 py-4">
            {YEAR_NAMES.map((name, i) => {
              const count = s.byYearLevel[i + 1] ?? 0;
              return (
                <li key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-600">{name}</span>
                    <span className="tabular font-medium text-ink-900">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / maxInYear) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Curriculum versions" />
          {s.curriculumVersions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">None yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.curriculumVersions.map((v) => (
                <li key={v.effectiveYear} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink-800">
                    <BookOpen className="size-4 text-ink-400" aria-hidden />
                    {v.effectiveYear} curriculum
                  </span>
                  <span className="tabular text-ink-500">{plural(v.subjectCount, "subject")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Student movements" />
          <dl className="divide-y divide-line text-sm">
            {[
              ["Shifted in / out", `${s.shiftedInCount} / ${s.shiftedOutCount}`],
              ["Transferred in / out", `${s.transferredInCount} / ${s.transferredOutCount}`],
              ["Dropped", String(s.droppedCount)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between px-5 py-3">
                <dt className="text-ink-600">{label}</dt>
                <dd className="tabular font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </section>
  );
}

/** The dean's view of every program at once: one row each, opening that program's section. */
function ProgramsTable({ summaries }: { summaries: ProgramSummary[] }) {
  const total = (pick: (s: ProgramSummary) => number) => summaries.reduce((n, s) => n + pick(s), 0);
  return (
    <Card>
      <CardHeader title="All programs" description="Open a program to see its year levels, curriculum versions and student movements." />
      <Table>
        <thead>
          <tr>
            <Th>Program</Th>
            <Th className="text-right">Students</Th>
            <Th className="text-right">Regular</Th>
            <Th className="text-right">Irregular</Th>
            <Th className="text-right">With violations</Th>
            <Th className="hidden text-right sm:table-cell">Curricula</Th>
            <Th>
              <span className="sr-only">Open</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <Tr key={s.program} className="group">
              <Td>
                <Link href={`/home?program=${encodeURIComponent(s.program)}`} className="font-medium text-ink-900 group-hover:text-brand-700">
                  {s.program}
                </Link>
              </Td>
              <Td className="tabular text-right text-ink-900">{s.totalStudents}</Td>
              <Td className="tabular text-right text-status-completed">{s.regularStudents}</Td>
              <Td className={`tabular text-right ${s.irregularStudents ? "text-status-pending" : "text-ink-500"}`}>{s.irregularStudents}</Td>
              <Td className={`tabular text-right ${s.atRiskStudents ? "text-status-violation" : "text-ink-500"}`}>{s.atRiskStudents}</Td>
              <Td className="tabular hidden text-right text-ink-500 sm:table-cell">
                {s.curriculumVersions.map((v) => v.effectiveYear).join(", ") || "—"}
              </Td>
              <Td className="w-10 text-right">
                <Link
                  href={`/home?program=${encodeURIComponent(s.program)}`}
                  aria-label={`Open ${s.program}`}
                  className="inline-flex text-ink-400 group-hover:text-brand-700"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </Td>
            </Tr>
          ))}
          <tr className="bg-ink-50 font-medium">
            <Td className="text-ink-700">Total</Td>
            <Td className="tabular text-right text-ink-900">{total((s) => s.totalStudents)}</Td>
            <Td className="tabular text-right text-ink-900">{total((s) => s.regularStudents)}</Td>
            <Td className="tabular text-right text-ink-900">{total((s) => s.irregularStudents)}</Td>
            <Td className="tabular text-right text-ink-900">{total((s) => s.atRiskStudents)}</Td>
            <Td className="hidden sm:table-cell" />
            <Td />
          </tr>
        </tbody>
      </Table>
    </Card>
  );
}

/** Tabs to show all programs or one of them. */
function ProgramPicker({ programs, selected }: { programs: string[]; selected: string | null }) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-brand-600 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Programs" className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1 shadow-card">
      {tab("All programs", "/home", selected === null)}
      {programs.map((p) => tab(p, `/home?program=${encodeURIComponent(p)}`, selected === p))}
    </nav>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  await requireRole("chairperson", "dean");
  const { program: requested } = await searchParams;
  const staff = await getCurrentStaff();
  const [summaries, transitions, currentTerm] = await Promise.all([
    getAnalytics(),
    getRecentTransitions(),
    getCurrentTerm(),
  ]);
  const isChair = staff?.role === "chairperson";
  const isDean = staff?.role === "dean";
  const firstName = staff?.name.split(/[ ,]/)[0] ?? "";
  // With more than one program, the dean picks one to look at, or sees them all in a table.
  const multiple = summaries.length > 1;
  const selected = multiple ? (summaries.find((s) => s.program === requested)?.program ?? null) : null;
  const shownTransitions = selected
    ? transitions.filter((t) => t.fromProgram === selected || t.toProgram === selected)
    : transitions;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {isChair
              ? `Here’s how ${staff?.program} is doing today.`
              : `Overview of the programs in ${staff?.collegeName ?? "your college"}.`}
            {isChair && (
              <Badge tone={currentTerm ? "brand" : "amber"}>
                {currentTerm ? `${describeTerm(currentTerm.term)} (${currentTerm.term})` : "Current semester not set by the dean"}
              </Badge>
            )}
          </span>
        }
        actions={
          isChair && (
            <>
              <LinkButton href="/students" variant="secondary">
                <Search aria-hidden />
                Find a student
              </LinkButton>
              <LinkButton href="/students/new">
                <UserPlus aria-hidden />
                Register student
              </LinkButton>
            </>
          )
        }
      />

      <div className="space-y-10">
        {isDean && <CurrentTermCard current={currentTerm} collegeName={staff?.collegeName ?? "your college"} />}

        {summaries.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Once students are registered, their numbers and progress show up here."
              action={isChair && <LinkButton href="/students/new">Register a student</LinkButton>}
            />
          </Card>
        ) : multiple ? (
          <div className="space-y-6">
            <ProgramPicker programs={summaries.map((s) => s.program)} selected={selected} />
            {selected ? (
              <ProgramSection s={summaries.find((s) => s.program === selected)!} />
            ) : (
              <ProgramsTable summaries={summaries} />
            )}
          </div>
        ) : (
          summaries.map((s) => <ProgramSection key={s.program} s={s} />)
        )}

        <Card>
          <CardHeader
            title="Recent transfers, shifts and drops"
            description={selected ? `The latest student movements in ${selected}.` : "The latest student movements in your scope."}
          />
          {shownTransitions.length === 0 ? (
            <EmptyState icon={History} title="Nothing recorded yet" description="Shifts, transfers and drops will be listed here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Movement</Th>
                  <Th>Program</Th>
                  <Th className="text-right">Date</Th>
                </tr>
              </thead>
              <tbody>
                {shownTransitions.map((t) => (
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
                      {t.fromProgram && t.toProgram ? (
                        <span className="inline-flex items-center gap-1.5">
                          {t.fromProgram}
                          <ArrowRight className="size-3.5 text-ink-400" aria-label="to" />
                          {t.toProgram}
                        </span>
                      ) : (
                        (t.fromProgram ?? t.toProgram ?? "—")
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-right text-ink-500">{formatDate(t.recordedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
