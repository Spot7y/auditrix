import { createProgram } from "./action";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="max-w-lg px-8 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Create New Course</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        Creates a new program under your college and a login account for its chairperson.
      </p>

      <form action={createProgram} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Program Name</label>
          <input
            type="text"
            name="program"
            required
            placeholder="e.g. BSCE"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Initial Curriculum Year</label>
          <input
            type="number"
            name="effectiveYear"
            required
            placeholder="e.g. 2026"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>

        <div className="border-t border-[color:var(--ledger-line)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">New Chairperson Account</p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Full Name</label>
          <input
            type="text"
            name="chairName"
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Email</label>
          <input
            type="email"
            name="chairEmail"
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Temporary Password</label>
          <input
            type="text"
            name="chairPassword"
            required
            minLength={6}
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
          <p className="mt-1 text-xs text-[color:var(--ink)]/50">
            Share this with the new chairperson directly — it isn&rsquo;t emailed automatically.
          </p>
        </div>

        {error && <p className="text-sm text-[color:var(--status-violated)]">{error}</p>}

        <button type="submit" className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
          Create Course &amp; Chairperson Account
        </button>
      </form>
    </main>
  );
}