// Placeholder shown while a page's data loads.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 rounded bg-ink-200" />
      <div className="mt-3 h-8 w-72 max-w-full rounded-lg bg-ink-200" />
      <div className="mt-2 h-4 w-48 rounded bg-ink-100" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-line bg-white" />
        ))}
      </div>
      <div className="mt-6 space-y-3 rounded-xl border border-line bg-white p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 rounded bg-ink-100" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
