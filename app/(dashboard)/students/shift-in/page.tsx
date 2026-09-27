import { getCurrentStaff } from "../../../../lib/queries/staff";
import { getCurriculumVersionsForStaff } from "../../../../lib/queries/curriculum";
import { lookupPendingShiftStudent } from "../../../../lib/queries/transitions";
import { acceptShiftIn } from "./actions";

export default async function ShiftInPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string; success?: string }>;
}) {
  const { id, error, success } = await searchParams;
  const staff = await getCurrentStaff();
  const versions = await getCurriculumVersionsForStaff();

  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm text-[color:var(--status-violation)]">
          Only a chairperson account can accept students shifting in.
        </p>
      </main>
    );
  }

  const result = id ? await lookupPendingShiftStudent(id.trim()) : null;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Shift In a Student</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        Look up a student by their ID number. Only students with an active pending shift request will be found.
      </p>

      {success && <p className="mt-4 text-sm text-[color:var(--status-completed)]">{success}</p>}
      {error && <p className="mt-4 text-sm text-[color:var(--status-violation)]">{error}</p>}

      <form method="GET" className="mt-8 flex items-center gap-3">
        <input
          type="text"
          name="id"
          defaultValue={id ?? ""}
          required
          placeholder="e.g. 23-10112"
          className="flex-1 border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
        />
        <button
          type="submit"
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Search
        </button>
      </form>

      {id && !result && (
        <p className="mt-6 text-sm text-[color:var(--ink)]/60">
          No student with a pending shift request was found for ID &ldquo;{id}&rdquo;.
        </p>
      )}

      {result && (
        <div className="mt-8 border-t border-[color:var(--ledger-line)] pt-6">
          <p className="font-[family-name:var(--font-mono)] text-sm text-[color:var(--ink)]/60">{result.studentId}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">{result.studentName}</p>
          <p className="mt-1 text-sm text-[color:var(--ink)]/70">Currently in {result.fromProgram}</p>

          <form action={acceptShiftIn} className="mt-6 space-y-4">
            <input type="hidden" name="studentId" value={result.studentId} />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
                Accept into which curriculum version?
              </label>
              <select
                name="newCurriculumId"
                required
                className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
              >
                <option value="">Select…</option>
                {versions?.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.effectiveYear}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Accept Student
            </button>
          </form>
        </div>
      )}
    </main>
  );
}