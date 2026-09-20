import Link from "next/link";
import { createSubject } from "../actions";

export default async function NewSubjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; curriculumId?: string }>;
}) {
  const { error, curriculumId } = await searchParams;

  return (
    <main className="px-8 py-12">
      <Link href="/curriculum" className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to curriculum
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">Add Subject</h1>

      <form action={createSubject} className="mt-8 max-w-lg space-y-4">
        <input type="hidden" name="curriculumId" value={curriculumId ?? ""} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Code</label>
          <input
            type="text"
            name="code"
            required
            autoComplete="off"
            placeholder="e.g. CC 129"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Title</label>
          <input
            type="text"
            name="title"
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
              required
              defaultValue={3}
              className="mt-1 w-24 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Year Level</label>
            <select
              name="yearLevel"
              defaultValue="1"
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
              defaultValue="1"
              className="mt-1 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
            >
              <option value="1">First</option>
              <option value="2">Second</option>
              <option value="3">Midyear</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-[color:var(--status-violated)]">{error}</p>}
        <button
          type="submit"
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Add Subject
        </button>
      </form>
      <p className="mt-4 max-w-lg text-xs text-[color:var(--ink)]/50">
        Prerequisites can be added after creating the subject, from its edit page.
      </p>
    </main>
  );
}