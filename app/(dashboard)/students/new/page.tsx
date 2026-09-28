import Link from "next/link";
import { getCurrentStaff } from "../../../../lib/queries/staff";
import { registerStudent } from "./actions";
import ImportStudentsModal from "./ImportStudentsModal";
import { STUDENT_ID_HINT, STUDENT_ID_PATTERN } from "../../../../lib/domain/studentId";
import { getCurriculumVersionsForStaff } from "../../../../lib/queries/curriculum";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();
  const versions = await getCurriculumVersionsForStaff();

  if (!staff || staff.role !== "chairperson" || !staff.program) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm text-[color:var(--status-violation)]">
          Only a chairperson account linked to a program can register new students.
        </p>
        <Link href="/students" className="mt-4 inline-block text-sm text-[color:var(--accent-maroon)] hover:underline">
          ← Back to search
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link href="/students" className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to search
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">Register new student</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{staff.program}</p>

      <form action={registerStudent} className="mt-8 space-y-4">
        <div>
          <label htmlFor="id" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            ID Number
          </label>
          <input
            id="id"
            name="id"
            type="text"
            required
            pattern={STUDENT_ID_PATTERN}
            title={STUDENT_ID_HINT}
            placeholder="e.g. 25-123456"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Last, First Middle"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>

        <div>
          <label htmlFor="curriculumId" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Curriculum Version
          </label>
          <select
            id="curriculumId"
            name="curriculumId"
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

        <div>
          <label htmlFor="nominalYearLevel" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
            Year Level
          </label>
          <select
            id="nominalYearLevel"
            name="nominalYearLevel"
            required
            defaultValue="1"
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          >
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>
        {error && <p className="text-sm text-[color:var(--status-violation)]">{error}</p>}
        <button
          type="submit"
          className="w-full bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Register student
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[color:var(--ledger-line)]" />
        <span className="text-xs uppercase tracking-wide text-[color:var(--ink)]/40">or</span>
        <div className="h-px flex-1 bg-[color:var(--ledger-line)]" />
      </div>

      <ImportStudentsModal versions={versions?.versions ?? []} />
    </main>
  );
}
