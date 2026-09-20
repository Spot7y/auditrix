import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurriculumForStaff } from "../../../../lib/queries/curriculum";
import { updateSubject, deleteSubject, deleteRequirement } from "../actions";
import AddRequirementForm from "./AddRequirementForm";

export default async function EditSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { subjectId } = await params;
  const { error } = await searchParams;
  const data = await getCurriculumForStaff();
  if (!data) notFound();

  const subject = data.subjects.find((s) => s.id === subjectId);
  if (!subject) notFound();

  return (
    <main className="px-8 py-12">
      <Link href="/curriculum" className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to curriculum
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">Edit Subject</h1>
      {error && <p className="mt-4 text-sm text-[color:var(--status-violated)]">{error}</p>}

      <form action={updateSubject} className="mt-8 max-w-lg space-y-4">
        <input type="hidden" name="subjectId" value={subject.id} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Code</label>
          <input
            type="text"
            name="code"
            defaultValue={subject.code}
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Title</label>
          <input
            type="text"
            name="title"
            defaultValue={subject.title}
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Units</label>
            <input
              type="number"
              step="0.5"
              name="units"
              defaultValue={subject.units}
              required
              className="mt-1 w-24 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Year Level</label>
            <select
              name="yearLevel"
              defaultValue={subject.yearLevel}
              className="mt-1 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Semester</label>
            <select
              name="semester"
              defaultValue={subject.semester}
              className="mt-1 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            >
              <option value="1">First</option>
              <option value="2">Second</option>
              <option value="3">Midyear</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save Changes
        </button>
      </form>

      <section className="mt-12 max-w-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--accent-maroon)]">
          Requirements
        </h2>
        {subject.requirements.length === 0 && (
          <p className="mt-2 text-sm text-[color:var(--ink)]/60">No requirements — open to all students.</p>
        )}
        <ul className="mt-3 divide-y divide-[color:var(--ledger-line)]">
          {subject.requirements.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {r.type === "YEAR_STANDING"
                  ? `Year Standing: ${r.requiredYearLevel}`
                  : r.type === "COMPLETION"
                  ? "Completion: All Subjects"
                  : `${r.type === "COREQUISITE" ? "Corequisite" : "Prerequisite"}: ${r.requiredSubjectCode}`}
              </span>
              <form action={deleteRequirement}>
                <input type="hidden" name="requirementId" value={r.id} />
                <input type="hidden" name="subjectId" value={subject.id} />
                <button type="submit" className="text-xs text-[color:var(--status-violated)] hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>

        <AddRequirementForm subjectId={subject.id} />
      </section>

      <section className="mt-12 max-w-lg border-t border-[color:var(--ledger-line)] pt-6">
        <form action={deleteSubject}>
          <input type="hidden" name="subjectId" value={subject.id} />
          <button type="submit" className="text-sm text-[color:var(--status-violated)] hover:underline">
            Delete this subject
          </button>
        </form>
      </section>
    </main>
  );
}