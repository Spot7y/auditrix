import Link from "next/link";
import { getCurrentStaff } from "../../../lib/queries/staff";
import { getAnalytics } from "../../../lib/queries/analytics";
import { getRecentTransitions } from "../../../lib/queries/transitions";

const TYPE_LABEL: Record<string, string> = {
  TRANSFERRED_IN: "Transferred In",
  TRANSFERRED_OUT: "Transferred Out",
  SHIFTED_IN: "Shifted In",
  SHIFTED_OUT: "Shifted Out",
  DROPPED: "Dropped",
};

export default async function HomePage() {
  const staff = await getCurrentStaff();
  const summaries = await getAnalytics();
  const transitions = await getRecentTransitions();

  return (
    <main className="px-8 py-12">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">Overview</h1>

      <div className="mt-10 space-y-12">
        {summaries.length === 0 && <p className="text-sm text-[color:var(--ink)]/60">No students recorded yet.</p>}

        {summaries.map((s) => (
          <section key={s.program}>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--accent-maroon)]">
              {s.program}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="border border-[color:var(--ledger-line)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/50">Curriculum</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {s.curriculumVersions.length === 0 ? (
                    <li className="text-[color:var(--ink)]/50">None yet</li>
                  ) : (
                    s.curriculumVersions.map((v) => (
                      <li key={v.effectiveYear}>
                        {v.effectiveYear} — {v.subjectCount} subjects
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="border border-[color:var(--ledger-line)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/50">Population</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>Freshman: {s.byYearLevel[1] ?? 0}</li>
                  <li>Sophomore: {s.byYearLevel[2] ?? 0}</li>
                  <li>Junior: {s.byYearLevel[3] ?? 0}</li>
                  <li>Senior: {s.byYearLevel[4] ?? 0}</li>
                </ul>
                <p className="mt-2 border-t border-[color:var(--ledger-line)] pt-2 text-xs text-[color:var(--ink)]/50">
                  Total: {s.totalStudents}
                </p>
              </div>

              <div className="border border-[color:var(--ledger-line)] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/50">Analytics</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li style={{ color: "var(--status-completed)" }}>Regular: {s.regularStudents}</li>
                  <li style={{ color: "var(--status-violated)" }}>Irregular: {s.irregularStudents}</li>
                  <li>Dropped: {s.droppedCount}</li>
                  <li>
                    Shifted: {s.shiftedInCount} in / {s.shiftedOutCount} out
                  </li>
                  <li>
                    Transferred: {s.transferredInCount} in / {s.transferredOutCount} out
                  </li>
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--accent-maroon)]">
          Transfer, Shift &amp; Drop Log
        </h2>
        {transitions.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--ink)]/60">No records yet.</p>
        ) : (
          <table className="mt-4 w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "110px" }} />
              <col />
              <col style={{ width: "140px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[color:var(--ledger-line)] text-left text-xs uppercase tracking-wide text-[color:var(--ink)]/50">
                <th className="py-2 pr-4 font-medium">ID</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Program</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--ledger-line)]">
              {transitions.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 font-[family-name:var(--font-mono)] text-[color:var(--ink)]/70">
                    <Link href={`/students/${t.studentId}`} className="hover:underline">
                      {t.studentId}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{t.studentName}</td>
                  <td className="py-2 pr-4">{TYPE_LABEL[t.type] ?? t.type}</td>
                  <td className="truncate py-2 pr-4 text-xs text-[color:var(--ink)]/60">
                    {t.fromProgram && t.toProgram
                      ? `${t.fromProgram} → ${t.toProgram}`
                      : t.fromProgram ?? t.toProgram ?? "—"}
                  </td>
                  <td className="py-2 text-xs text-[color:var(--ink)]/50">
                    {new Date(t.recordedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}