"use client";

import { useChartTooltip } from "./useChartTooltip";

export interface Column {
  label: string;
  value: number;
  tip: string[];
}

/** A few columns side by side (e.g. year levels), with the number above each. */
export default function ColumnChart({ columns }: { columns: Column[] }) {
  const { ref, bind, tooltip } = useChartTooltip();
  const max = Math.max(1, ...columns.map((c) => c.value));

  return (
    <div ref={ref} className="relative flex flex-1 flex-col justify-end px-5 py-4">
      <div className="flex h-36 items-end justify-around border-b border-line">
        {columns.map((c) => (
          <div key={c.label} className="flex h-full w-12 flex-col items-center justify-end gap-1">
            <span className="tabular text-xs font-medium text-ink-600">{c.value}</span>
            {c.value > 0 && (
              <div
                {...bind([c.label, ...c.tip])}
                className="w-6 rounded-t-[4px] bg-brand-600 outline-offset-2 transition-opacity hover:opacity-80"
                style={{ height: `${(c.value / max) * 80}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-around">
        {columns.map((c) => (
          <span key={c.label} className="w-16 text-center text-xs text-ink-500">
            {c.label}
          </span>
        ))}
      </div>
      {tooltip}
    </div>
  );
}
