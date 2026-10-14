// Grey stand-ins shown while a page's data loads, shaped like the page so
// nothing jumps when the real content arrives.

export function Bar({ className }: { className?: string }) {
  return <div className={`rounded bg-ink-200/70 ${className ?? ""}`} />;
}

/** The whole placeholder: pulses, and tells screen readers it's loading. */
export function Loading({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`animate-pulse ${className ?? ""}`} aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

/** Stands in for PageHeader: title, description and an optional button. */
export function HeaderSkeleton({ back, eyebrow, action }: { back?: boolean; eyebrow?: boolean; action?: boolean }) {
  return (
    <div className="mb-6">
      {back && <Bar className="mb-4 h-4 w-28 bg-ink-100" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && <Bar className="mb-2 h-4 w-24" />}
          <Bar className="h-8 w-64 max-w-full rounded-lg" />
          <Bar className="mt-2.5 h-4 w-80 max-w-full bg-ink-100" />
        </div>
        {action && <Bar className="h-10 w-40 rounded-lg" />}
      </div>
    </div>
  );
}

export function CardSkeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-xl border border-line bg-white shadow-card ${className ?? ""}`}>{children}</div>;
}

/** A card with a title row and table rows. `columns` are Tailwind widths. */
export function TableSkeleton({
  rows = 6,
  columns = ["w-2/5", "w-1/6", "w-1/6", "w-1/12"],
  title = false,
  toolbar = false,
}: {
  rows?: number;
  columns?: string[];
  title?: boolean;
  toolbar?: boolean;
}) {
  return (
    <CardSkeleton>
      {title && (
        <div className="border-b border-line px-5 py-4">
          <Bar className="h-5 w-48" />
          <Bar className="mt-2 h-3.5 w-28 bg-ink-100" />
        </div>
      )}
      {toolbar && (
        <div className="flex flex-wrap gap-3 border-b border-line px-5 py-4">
          <Bar className="h-10 w-64 max-w-full rounded-lg bg-ink-100" />
          <Bar className="h-10 w-32 rounded-lg bg-ink-100" />
          <Bar className="h-10 w-48 rounded-lg bg-ink-100" />
        </div>
      )}
      <div className="flex gap-6 border-b border-line bg-ink-50 px-5 py-3">
        {columns.map((width, i) => (
          <Bar key={i} className={`h-3 ${width} bg-ink-100`} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-6 px-5 py-4">
            {columns.map((width, i) => (
              <Bar key={i} className={`h-4 ${width} ${i === 0 ? "" : "bg-ink-100"}`} />
            ))}
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

/** A row of small number tiles, like the dashboard's. */
export function StatTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} className="p-4">
          <Bar className="h-3.5 w-20 bg-ink-100" />
          <Bar className="mt-3 h-7 w-12" />
          <Bar className="mt-3 h-3 w-32 bg-ink-100" />
        </CardSkeleton>
      ))}
    </div>
  );
}
