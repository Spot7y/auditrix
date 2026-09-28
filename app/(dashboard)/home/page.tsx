import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, History, Search, UserPlus, Users } from "lucide-react";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { getAnalytics, type ProgramSummary } from "../../../lib/queries/analytics";
import { getRecentTransitions } from "../../../lib/queries/transitions";
import { formatDate, TRANSITION_LABEL } from "../../../lib/format";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { LinkButton } from "../../../components/ui/Button";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import EmptyState from "../../../components/ui/EmptyState";

export const metadata: Metadata = { title: "Dashboard" };

const YEAR_NAMES = ["Freshman", "Sophomore", "Junior", "Senior"];

const TRANSITION_TONE: Record<string, BadgeTone> = {
  TRANSFERRED_IN: "blue",
  TRANSFERRED_OUT: "gray",
  SHIFTED_IN: "brand",
  SHIFTED_OUT: "gray",
  DROPPED: "red",
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
        <Badge tone="brand">{s.totalStudents} students</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total students" value={s.totalStudents} />
        <Stat label="Regular" value={s.regularStudents} tone="good" hint="No failed subject from an earlier year" />
        <Stat label="Irregular" value={s.irregularStudents} tone={s.irregularStudents ? "warn" : "default"} hint="Has a failed earlier-year subject" />
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
                  <span className="tabular text-ink-500">{v.subjectCount} subjects</span>
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

export default async function HomePage() {
  const staff = await getCurrentStaff();
  const [summaries, transitions] = await Promise.all([getAnalytics(), getRecentTransitions()]);
  const isChair = staff?.role === "chairperson";
  const firstName = staff?.name.split(/[ ,]/)[0] ?? "";

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
        {summaries.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Once students are registered, their numbers and progress show up here."
              action={isChair && <LinkButton href="/students/new">Register a student</LinkButton>}
            />
          </Card>
        ) : (
          summaries.map((s) => <ProgramSection key={s.program} s={s} />)
        )}

        <Card>
          <CardHeader title="Recent transfers, shifts and drops" description="The latest student movements in your scope." />
          {transitions.length === 0 ? (
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
                {transitions.map((t) => (
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
