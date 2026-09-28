import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, BookOpen, FileDown, FileText, History, Pencil, Plus } from "lucide-react";
import {
  describeRequirement,
  getCurriculumForStaff,
  getCurriculumVersionsForStaff,
} from "../../../lib/queries/curriculum";
import { getCurriculumHistory } from "../../../lib/queries/curriculumHistory";
import { formatDateTime, plural } from "../../../lib/format";
import { moveSubjectUp, moveSubjectDown } from "./actions";
import NewVersionForm from "./NewVersionForm";
import PageHeader from "../../../components/ui/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { buttonClasses, LinkButton } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Table, Td, Th, Tr } from "../../../components/ui/Table";
import Alert from "../../../components/ui/Alert";
import EmptyState from "../../../components/ui/EmptyState";

export const metadata: Metadata = { title: "Curriculum" };

const YEAR_LABEL: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First semester", 2: "Second semester", 3: "Midyear" };

function MoveButton({ action, subjectId, direction }: { action: (f: FormData) => Promise<void>; subjectId: string; direction: "up" | "down" }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <form action={action}>
      <input type="hidden" name="subjectId" value={subjectId} />
      <button
        type="submit"
        aria-label={`Move ${direction}`}
        title={`Move ${direction}`}
        className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
      >
        <Icon className="size-3.5" aria-hidden />
      </button>
    </form>
  );
}

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const { version } = await searchParams;
  const [versions, data] = await Promise.all([getCurriculumVersionsForStaff(), getCurriculumForStaff(version)]);

  if (!versions) {
    return (
      <>
        <PageHeader title="Curriculum" />
        <Alert tone="error">Only a chairperson account linked to a program can manage curriculum.</Alert>
      </>
    );
  }

  const latestYear = versions.versions[0]?.effectiveYear ?? null;

  if (!data) {
    return (
      <>
        <PageHeader title="Curriculum" description={versions.program} actions={<NewVersionForm latestYear={latestYear} />} />
        <Card>
          <EmptyState icon={BookOpen} title="No curriculum yet" description="Create the first curriculum version to start adding subjects." />
        </Card>
      </>
    );
  }

  const history = await getCurriculumHistory(data.curriculumId);

  type Subject = (typeof data.subjects)[number];
  const byTerm = new Map<string, { year: number; semester: number; subjects: Subject[] }>();
  for (const s of data.subjects) {
    const key = `${s.yearLevel}-${s.semester}`;
    const entry = byTerm.get(key) ?? { year: s.yearLevel, semester: s.semester, subjects: [] };
    entry.subjects.push(s);
    byTerm.set(key, entry);
  }
  const terms = [...byTerm.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);
  const totalUnits = data.subjects.reduce((sum, s) => sum + Number(s.units), 0);

  return (
    <>
      <PageHeader
        title="Curriculum"
        description={`${data.program} ${data.effectiveYear} · ${plural(data.subjects.length, "subject")} · ${plural(totalUnits, "unit")}`}
        actions={
          <>
            <a href={`/curriculum/export?curriculumId=${data.curriculumId}`} className={buttonClasses({ variant: "secondary" })}>
              <FileDown aria-hidden />
              CSV
            </a>
            <a href={`/curriculum/export-pdf?curriculumId=${data.curriculumId}`} className={buttonClasses({ variant: "secondary" })}>
              <FileText aria-hidden />
              PDF
            </a>
            <LinkButton href={`/curriculum/new?curriculumId=${data.curriculumId}`}>
              <Plus aria-hidden />
              Add subject
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-ink-500">Version</span>
        <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1 shadow-sm" aria-label="Curriculum versions">
          {versions.versions.map((v) => {
            const active = v.id === data.curriculumId;
            return (
              <Link
                key={v.id}
                href={`/curriculum?version=${v.id}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-600 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {v.effectiveYear}
              </Link>
            );
          })}
        </nav>
        <NewVersionForm latestYear={latestYear} />
      </div>

      {terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No subjects in this version"
            description="Add subjects one by one or import the whole curriculum from a CSV file."
            action={<LinkButton href={`/curriculum/new?curriculumId=${data.curriculumId}`}>Add subjects</LinkButton>}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {terms.map(({ year, semester, subjects }) => (
            <Card key={`${year}-${semester}`}>
              <CardHeader
                title={`${YEAR_LABEL[year] ?? `Year ${year}`} · ${SEMESTER_LABEL[semester] ?? `Semester ${semester}`}`}
                description={`${plural(subjects.length, "subject")} · ${plural(
                  subjects.reduce((sum, s) => sum + Number(s.units), 0),
                  "unit"
                )}`}
              />
              <Table className="table-fixed">
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col className="w-16" />
                  <col className="hidden w-64 md:table-column" />
                  <col className="w-32" />
                </colgroup>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Subject</Th>
                    <Th className="text-right">Units</Th>
                    <Th className="hidden md:table-cell">Requirements</Th>
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <Tr key={s.id}>
                      <Td className="font-mono text-ink-600">{s.code}</Td>
                      <Td className="text-ink-900">{s.title}</Td>
                      <Td className="tabular text-right text-ink-600">{Number(s.units)}</Td>
                      <Td className="hidden md:table-cell">
                        {s.requirements.length === 0 ? (
                          <span className="text-ink-400">None</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {s.requirements.map((r) => (
                              <Badge key={r.id} tone={r.type === "PREREQUISITE" ? "gray" : "blue"}>
                                {describeRequirement(r)}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          {i > 0 && <MoveButton action={moveSubjectUp} subjectId={s.id} direction="up" />}
                          {i < subjects.length - 1 && <MoveButton action={moveSubjectDown} subjectId={s.id} direction="down" />}
                          <Link
                            href={`/curriculum/${s.id}`}
                            aria-label={`Edit ${s.code}`}
                            title="Edit"
                            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-700"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Link>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Change history" description={`Recent edits to the ${data.effectiveYear} version.`} />
        {history.length === 0 ? (
          <EmptyState icon={History} title="No changes recorded yet" description="Edits to subjects and requirements will be listed here." />
        ) : (
          <ol className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <p className="text-sm text-ink-800">{h.summary}</p>
                <p className="shrink-0 text-xs text-ink-500">
                  {h.changedBy} · {formatDateTime(h.changedAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
