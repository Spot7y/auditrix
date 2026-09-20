import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentAudit } from "../../../../../lib/queries/students";
import { updateStudentInfo } from "./actions";

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const data = await getStudentAudit(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link href={`/students/${id}`} className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to profile
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">Edit Student</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">
        Correcting a mistake in the student&rsquo;s ID number or name. All existing grades, transitions, and
        history automatically follow the new ID.
      </p>

      <form action={updateStudentInfo} className="mt-8 space-y-4">
        <input type="hidden" name="currentId" value={id} />
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">ID Number</label>
          <input
            type="text"
            name="id"
            defaultValue={data.studentId}
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">Full Name</label>
          <input
            type="text"
            name="name"
            defaultValue={data.studentName}
            required
            className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
          />
        </div>
        {error && <p className="text-sm text-[color:var(--status-violation)]">{error}</p>}
        <button
          type="submit"
          className="bg-[color:var(--accent-maroon)] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save Changes
        </button>
      </form>
    </main>
  );
}