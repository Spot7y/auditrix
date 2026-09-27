import { getProgramsWithChairpersonForDean } from "../../../../lib/queries/programs";
import { reassignChairperson } from "./actions";

export default async function ReassignChairpersonPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const programs = await getProgramsWithChairpersonForDean();

  if (programs.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm text-[color:var(--status-violation)]">
          Only a dean account with programs under their college can reassign chairpersons.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Reassign Chairperson</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        Creates a new login for the incoming chairperson and deactivates the outgoing one for the selected program.
      </p>

      <form action={reassignChairperson} className="mt-8 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Program</label>
          <select
            name="program"
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          >
            <option value="">Select…</option>
            {programs.map((p) => (
              <option key={p.program} value={p.program}>
                {p.program} — currently {p.chairpersonName ?? "Vacant"}
              </option>
            ))}
          </select>
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

        {error && <p className="text-sm text-[color:var(--status-violation)]">{error}</p>}

        <button
          type="submit"
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Reassign Chairperson
        </button>
      </form>
    </main>
  );
}