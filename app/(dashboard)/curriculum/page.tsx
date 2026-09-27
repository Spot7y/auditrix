import Link from "next/link";
import { Fragment } from "react";
import { getCurriculumForStaff, getCurriculumVersionsForStaff } from "../../../lib/queries/curriculum";
import { moveSubjectUp, moveSubjectDown } from "./actions";
import NewVersionForm from "./NewVersionForm";

const YEAR_LABEL: Record<number, string> = { 1: "Year 1", 2: "Year 2", 3: "Year 3", 4: "Year 4" };
const SEMESTER_LABEL: Record<number, string> = { 1: "First Semester", 2: "Second Semester", 3: "Midyear" };

export default async function CurriculumPage({
  searchParams,
}: {
    searchParams: Promise<{ error?: string; version?: string; success?: string; warnings?: string }>;
}) {
  const { error, version, success, warnings } = await searchParams;
  const versions = await getCurriculumVersionsForStaff();
  const data = await getCurriculumForStaff(version);

  if (!versions || !data) {
    return (
      <main className="px-8 py-12">
        <p className="text-sm text-[color:var(--status-violation)]">
          Only a chairperson account linked to a program can manage curriculum.
        </p>
      </main>
    );
  }

  type Subject = (typeof data.subjects)[number];
  const byYear = new Map<number, Map<number, Subject[]>>();
  for (const s of data.subjects) {
    const yearMap = byYear.get(s.yearLevel) ?? new Map<number, Subject[]>();
    const semList = yearMap.get(s.semester) ?? [];
    semList.push(s);
    yearMap.set(s.semester, semList);
    byYear.set(s.yearLevel, yearMap);
  }

  const sections = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([year, semesterMap]) =>
      [...semesterMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([semester, subjects]) => ({
          key: `${year}-${semester}`,
          label: `${YEAR_LABEL[year] ?? `Year ${year}`} — ${SEMESTER_LABEL[semester] ?? `Semester ${semester}`}`,
          subjects,
        }))
    );

  return (
    <main className="px-8 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Curriculum</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{data.program}</p>
      {error && <p className="mt-4 text-sm text-[color:var(--status-violation)]">{error}</p>}
      {success && <p className="mt-4 text-sm text-[color:var(--status-completed)]">{success}</p>}
      {warnings && <p className="mt-2 max-w-2xl text-xs text-[color:var(--status-pending)]">{warnings}</p>}


      <div className="mt-6 flex flex-wrap items-center gap-2">
        {versions.versions.map((v) => (
          <Link
            key={v.id}
            href={`/curriculum?version=${v.id}`}
            className={`border px-3 py-1.5 text-sm ${
              v.id === data.curriculumId
                ? "border-[color:var(--accent-maroon)] bg-[color:var(--accent-maroon)] text-white"
                : "border-[color:var(--ledger-line)] hover:bg-black/5"
            }`}
          >
            {v.effectiveYear}
          </Link>
        ))}

        <NewVersionForm />
      </div>
      <p className="mt-2 text-xs text-[color:var(--ink)]/50">
        Creating a new version clones every subject and requirement from the most recent existing version.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/curriculum/new?curriculumId=${data.curriculumId}`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add Subject
        </Link>
        <a
          href={`/curriculum/export?curriculumId=${data.curriculumId}`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Export Curriculum (CSV)
        </a>
        <a
        href={`/curriculum/export-pdf?curriculumId=${data.curriculumId}`}
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Export Curriculum (PDF)
        </a>

      </div>

      <table className="mt-8 w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "110px" }} />
          <col />
          <col style={{ width: "70px" }} />
          <col style={{ width: "250px" }} />
          <col style={{ width: "60px" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[color:var(--ledger-line)] text-left text-xs uppercase tracking-wide text-[color:var(--ink)]/50">
            <th className="py-2 pr-4 font-medium">Code</th>
            <th className="py-2 pr-4 font-medium">Subject Description</th>
            <th className="py-2 pr-4 font-medium">Units</th>
            <th className="py-2 pr-4 font-medium">Requirements</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--ledger-line)]">
          {sections.map((section) => (
            <Fragment key={section.key}>
              <tr>
                <td
                  colSpan={5}
                  className="pt-6 pb-1 font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wide text-[color:var(--accent-maroon)]"
                >
                  {section.label}
                </td>
              </tr>
              {section.subjects.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-4 font-[family-name:var(--font-mono)] text-[color:var(--ink)]/70">{s.code}</td>
                  <td className="py-2 pr-4">{s.title}</td>
                  <td className="py-2 pr-4">{s.units}</td>
                  <td className="truncate py-2 pr-4 text-xs text-[color:var(--ink)]/60">
                    {s.requirements.length === 0
                      ? "None"
                      : s.requirements
                          .map((r) =>
                            r.type === "YEAR_STANDING"
                              ? `Y${r.requiredYearLevel} standing`
                              : r.type === "COMPLETION"
                              ? "All subjects"
                              : r.requiredSubjectCode
                          )
                          .join(", ")}
                  </td>
                                <td className="py-2">
                <div className="flex items-center gap-2">
                  <form action={moveSubjectUp}>
                    <input type="hidden" name="subjectId" value={s.id} />
                    <button type="submit" className="text-xs text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]" aria-label="Move up">
                      ▲
                    </button>
                  </form>
                  <form action={moveSubjectDown}>
                    <input type="hidden" name="subjectId" value={s.id} />
                    <button type="submit" className="text-xs text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]" aria-label="Move down">
                      ▼
                    </button>
                  </form>
                  <Link href={`/curriculum/${s.id}`} className="text-xs text-[color:var(--accent-maroon)] hover:underline">
                    Edit
                  </Link>
                </div>
              </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </main>
  );
}
