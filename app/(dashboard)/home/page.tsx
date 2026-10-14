import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, BookOpen, ChevronRight, UserPlus, Users } from "lucide-react";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { getAnalytics, type ProgramSummary } from "../../../lib/queries/analytics";
import { plural } from "../../../lib/format";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { LinkButton } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";
import { getCurrentTerm } from "../../../lib/queries/yearLevels";
import BarList from "../../../components/charts/BarList";
import StackedBars, { type Series } from "../../../components/charts/StackedBars";
import TableView from "../../../components/charts/TableView";
import ColumnChart from "../../../components/charts/ColumnChart";
import CurrentTermCard from "./CurrentTermCard";
import { requireRole } from "../../../lib/queries/access";

export const metadata: Metadata = { title: "Dashboard" };

const YEAR_NAMES = ["Freshman", "Sophomore", "Junior", "Senior"];

const ENROLLMENT_SERIES: Series[] = [
  { key: "regular", label: "Regular", fill: "bg-status-completed" },
  { key: "irregular", label: "Irregular", fill: "bg-status-pending" },
  { key: "undetermined", label: "Not determined", fill: "bg-status-unavailable" },
];

const enrollmentValues = (s: ProgramSummary) => ({
  regular: s.regularStudents,
  irregular: s.irregularStudents,
  undetermined: s.undeterminedStudents,
});

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const color = { default: "text-ink-900", good: "text-status-completed", warn: "text-status-pending", bad: "text-status-violation" }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

interface AttentionItem {
  text: string;
  href?: string;
  action?: string;
}

/** What needs looking at first; nothing shows when all is well. */
function AttentionBanner({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs attention" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="size-4" aria-hidden />
        Needs attention
      </h2>
      <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
        {items.map((item) => (
          <li key={item.text} className="flex flex-wrap items-baseline gap-x-2">
            <span>{item.text}</span>
            {item.href && (
              <Link href={item.href} className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2 hover:text-amber-950">
                {item.action ?? "View"}
                <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function programAttention(s: ProgramSummary, isChair: boolean): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (s.atRiskStudents > 0) {
    items.push({
      text: `${plural(s.atRiskStudents, "student")} took subjects before finishing their prerequisites.`,
      ...(isChair && { href: "/students?status=VIOLATIONS", action: "See who" }),
    });
  }
  return items;
}

function ProgramSection({ s, term, isChair }: { s: ProgramSummary; term: string | null; isChair: boolean }) {
  const yearTotal = [1, 2, 3, 4].reduce((n, y) => n + (s.byYearLevel[y] ?? 0), 0);
  const movementsHref = isChair ? "/movements" : `/movements?program=${encodeURIComponent(s.program)}`;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-ink-900">{s.program}</h2>
        <Badge tone="brand">{plural(s.totalStudents, "student")}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={s.totalStudents} hint="With an open record" />
        <Stat
          label="Regular"
          value={s.regularStudents}
          tone="good"
          hint={`${percent(s.regularStudents, s.totalStudents)}% · full prescribed load`}
        />
        <Stat
          label="Irregular"
          value={s.irregularStudents}
          tone={s.irregularStudents ? "warn" : "default"}
          hint={`${percent(s.irregularStudents, s.totalStudents)}% · less than the load`}
        />
        <Stat
          label="With violations"
          value={s.atRiskStudents}
          tone={s.atRiskStudents ? "bad" : "default"}
          hint={`${percent(s.atRiskStudents, s.totalStudents)}% · subjects out of order`}
        />
      </div>

      <Card className="flex flex-col">
        <CardHeader
          title="Regular and irregular"
          description={
            term
              ? `Enrolled in ${term} in the full prescribed load (regular) or less (irregular). First years count as regular until their grades are in. Not determined: no grades recorded for ${term} yet.`
              : "The dean hasn’t set the current semester, so no student can be counted as regular or irregular yet."
          }
        />
        <StackedBars series={ENROLLMENT_SERIES} rows={[{ label: s.program, values: enrollmentValues(s) }]} unit="students" hideRowLabels />
        <TableView
          headers={["Status", "Students", "Share"]}
          rows={ENROLLMENT_SERIES.map((series) => {
            const value = enrollmentValues(s)[series.key as keyof ReturnType<typeof enrollmentValues>];
            return [series.label, value, `${percent(value, s.totalStudents)}%`];
          })}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader title="Students by year level" description="From the subjects each student has finished." />
          <ColumnChart
            columns={YEAR_NAMES.map((name, i) => {
              const count = s.byYearLevel[i + 1] ?? 0;
              return { label: name, value: count, tip: [`${plural(count, "student")} (${percent(count, yearTotal)}%)`] };
            })}
          />
          <TableView headers={["Year level", "Students"]} rows={YEAR_NAMES.map((name, i) => [name, s.byYearLevel[i + 1] ?? 0])} />
        </Card>


        <Card className="flex flex-col">
          <CardHeader title="Taken out of order" description="Taken before its prerequisites were passed." />
          <BarList
            emptyText="No subjects taken out of order."
            items={s.outOfOrder.map((v) => ({
              label: v.code,
              value: v.students,
              tip: [v.title, `${plural(v.students, "student")} took it before finishing its prerequisites`],
            }))}
          />
          <TableView
            headers={["Subject", "Students"]}
            rows={s.outOfOrder.map((v) => [`${v.code} – ${v.title}`, v.students])}
            link={
              isChair &&
              s.outOfOrder.length > 0 && (
                <Link href="/students?status=VIOLATIONS" className="text-brand-700 hover:text-brand-900">
                  See students →
                </Link>
              )
            }
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
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
          <div className="mt-auto flex h-10 items-center justify-end border-t border-line px-5 text-xs font-medium">
            {isChair && (
              <Link href="/curriculum" className="text-brand-700 hover:text-brand-900">
                Manage curriculum →
              </Link>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
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
          <div className="mt-auto flex h-10 items-center justify-end border-t border-line px-5 text-xs font-medium">
            <Link href={movementsHref} className="text-brand-700 hover:text-brand-900">
              View all movements →
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

/** The dean's side-by-side look at the college's programs. */
function ProgramComparison({ summaries, term }: { summaries: ProgramSummary[]; term: string | null }) {
  const href = (program: string) => `/home?program=${encodeURIComponent(program)}`;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Regular and irregular by program"
          description={
            term
              ? `Each program’s share of regular and irregular students in ${term}.`
              : "The current semester isn’t set, so every student is “not determined”."
          }
        />
        <StackedBars
          series={ENROLLMENT_SERIES}
          rows={summaries.map((s) => ({ label: s.program, href: href(s.program), values: enrollmentValues(s) }))}
          unit="students"
        />
        <TableView
          headers={["Program", "Regular", "Irregular", "Not determined", "Students"]}
          rows={summaries.map((s) => [s.program, s.regularStudents, s.irregularStudents, s.undeterminedStudents, s.totalStudents])}
        />
      </Card>
      <Card className="flex flex-col">
        <CardHeader title="Students with violations by program" description="Took a subject before finishing its prerequisites." />
        <BarList
          emptyText="No students with violations."
          items={[...summaries]
            .sort((a, b) => b.atRiskStudents - a.atRiskStudents || a.program.localeCompare(b.program))
            .map((s) => ({
              label: s.program,
              href: href(s.program),
              value: s.atRiskStudents,
              tip: [`${plural(s.atRiskStudents, "student")} with violations`, `${percent(s.atRiskStudents, s.totalStudents)}% of ${plural(s.totalStudents, "student")}`],
            }))}
        />
        <TableView
          headers={["Program", "With violations", "Students"]}
          rows={summaries.map((s) => [s.program, s.atRiskStudents, s.totalStudents])}
        />
      </Card>
    </div>
  );
}

/** The dean's view of every program at once: one row each, opening that program's section. */
function ProgramsTable({ summaries }: { summaries: ProgramSummary[] }) {
  const total = (pick: (s: ProgramSummary) => number) => summaries.reduce((n, s) => n + pick(s), 0);
  return (
    <Card>
      <CardHeader title="All programs" description="Open a program to see its charts, curriculum versions and student movements." />
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
        active ? "bg-brand-800 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
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
  const [summaries, currentTerm] = await Promise.all([getAnalytics(), getCurrentTerm()]);
  const term = currentTerm?.term ?? null;
  const isChair = staff?.role === "chairperson";
  const isDean = staff?.role === "dean";
  const firstName = staff?.name.split(/[ ,]/)[0] ?? "";
  // With more than one program, the dean picks one to look at, or sees them all compared.
  const multiple = summaries.length > 1;
  const selected = multiple ? (summaries.find((s) => s.program === requested)?.program ?? null) : null;
  const shown = selected ? summaries.filter((s) => s.program === selected) : summaries;

  const attention: AttentionItem[] = [];
  if (!term) {
    attention.push(
      isDean
        ? { text: "The current semester isn’t set. Set it below so students can be counted as regular or irregular." }
        : { text: "The dean hasn’t set the current semester yet, so students can’t be counted as regular or irregular." }
    );
  }
  if (multiple && !selected) {
    const flagged = summaries.filter((s) => s.atRiskStudents > 0);
    const students = flagged.reduce((n, s) => n + s.atRiskStudents, 0);
    if (students > 0) {
      attention.push({
        text: `${plural(students, "student")} in ${plural(flagged.length, "program")} took subjects before finishing their prerequisites.`,
        ...(flagged.length === 1 && {
          href: `/home?program=${encodeURIComponent(flagged[0].program)}`,
          action: `Open ${flagged[0].program}`,
        }),
      });
    }
  } else {
    for (const s of shown) attention.push(...programAttention(s, isChair));
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          isChair
            ? `Here’s how ${staff?.program} is doing today.`
            : `Overview of the programs in ${staff?.collegeName ?? "your college"}.`
        }
        actions={
          isChair && (
            <LinkButton href="/students/new">
              <UserPlus aria-hidden />
              Register student
            </LinkButton>
          )
        }
      />

      <div className="space-y-8">
        <AttentionBanner items={attention} />

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
              <ProgramSection s={shown[0]} term={term} isChair={isChair} />
            ) : (
              <>
                <ProgramComparison summaries={summaries} term={term} />
                <ProgramsTable summaries={summaries} />
              </>
            )}
          </div>
        ) : (
          summaries.map((s) => <ProgramSection key={s.program} s={s} term={term} isChair={isChair} />)
        )}
      </div>
    </>
  );
}
