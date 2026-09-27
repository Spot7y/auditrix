import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentAudit } from "../../../../../lib/queries/students";
import {
  getTransitionsForStudent,
  getPendingShiftRequest,
} from "../../../../../lib/queries/transitions";
import {
  recordTransferIn,
  recordTransferOut,
  recordDropped,
  requestShiftOut,
  cancelShiftRequest,
} from "./actions";

export default async function StudentTransitionsPage({
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

  const history = await getTransitionsForStudent(id);
  const isPending = await getPendingShiftRequest(id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href={`/students/${id}`} className="text-sm text-[color:var(--accent-maroon)] hover:underline">
        ← Back to profile
      </Link>
      <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[color:var(--ink)]/60">{data.studentId}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">Record Transfer / Shift</h1>
      <p className="mt-2 text-sm text-[color:var(--ink)]/70">{data.studentName} · {data.program}</p>
      {error && <p className="mt-4 text-sm text-[color:var(--status-violation)]">{error}</p>}

      {isPending ? (
        <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Shift Request Pending</h2>
          <p className="mt-1 text-xs text-[color:var(--ink)]/50">
            This student has an active pending shift request. They remain fully enrolled and manageable in{" "}
            {data.program} until another program&rsquo;s chairperson looks them up by ID and accepts them.
          </p>
          <form action={cancelShiftRequest} className="mt-4">
            <input type="hidden" name="studentId" value={id} />
            <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Cancel Shift Request
            </button>
          </form>
        </section>
      ) : (
        <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Request Shift Out</h2>
          <p className="mt-1 text-xs text-[color:var(--ink)]/50">
            Marks this student as wanting to shift to another program. They stay fully enrolled and manageable in{" "}
            {data.program} until the receiving program&rsquo;s chairperson looks them up by ID and accepts them.
          </p>
          <form action={requestShiftOut} className="mt-4">
            <input type="hidden" name="studentId" value={id} />
            <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Request Shift Out
            </button>
          </form>
        </section>
      )}

      <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Transferred Out (Left KSU)</h2>
        <p className="mt-1 text-xs text-[color:var(--ink)]/50">
          Marks this student as having transferred to a school outside KSU. They remain visible in {data.program}&rsquo;s
          records, tagged.
        </p>
        <form action={recordTransferOut} className="mt-4 space-y-3">
          <input type="hidden" name="studentId" value={id} />
          <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Mark Transferred Out
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Transferred In (From Another School)</h2>
        <p className="mt-1 text-xs text-[color:var(--ink)]/50">
          Marks this student as having transferred in from outside KSU. Enter any credited subjects separately from
          the Enter Grades page — only codes matching {data.program}&rsquo;s curriculum will be accepted.
        </p>
        <form action={recordTransferIn} className="mt-4 space-y-3">
          <input type="hidden" name="studentId" value={id} />
          <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Mark Transferred In
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Dropped</h2>
        <p className="mt-1 text-xs text-[color:var(--ink)]/50">
          Marks this student as dropped from {data.program}. They remain visible in the records, tagged.
        </p>
        <form action={recordDropped} className="mt-4">
          <input type="hidden" name="studentId" value={id} />
          <button type="submit" className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Mark as Dropped
          </button>
        </form>
      </section>

      {history.length > 0 && (
        <section className="mt-10 border-t border-[color:var(--ledger-line)] pt-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="text-[color:var(--ink)]/70">
                <span className="font-medium">{h.type.replace("_", " ")}</span>
                {h.fromProgram && h.toProgram ? ` — ${h.fromProgram} → ${h.toProgram}` : ""}
                <span className="ml-2 text-xs text-[color:var(--ink)]/40">
                  {new Date(h.recordedAt).toLocaleDateString()} by {h.recordedBy}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
