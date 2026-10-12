"use client";

import Link from "next/link";
import { useChartTooltip } from "./useChartTooltip";

export interface Series {
  key: string;
  label: string;
  /** Tailwind background class for the segment and its legend swatch. */
  fill: string;
}

export interface StackedRow {
  label: string;
  href?: string;
  values: Record<string, number>;
}

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Each row is one whole (e.g. a program's students) split into the series,
 * as shares of 100%. The count shows inside a segment when it fits; every
 * segment has a tooltip, and the legend names the colors.
 */
export default function StackedBars({
  series,
  rows,
  unit,
  hideRowLabels = false,
}: {
  series: Series[];
  rows: StackedRow[];
  /** What the numbers count, plural, e.g. "students". */
  unit: string;
  /** For a single bar whose title already says what it is. */
  hideRowLabels?: boolean;
}) {
  const { ref, bind, tooltip } = useChartTooltip();

  return (
    <div ref={ref} className="relative px-5 py-4">
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${s.fill}`} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        {rows.map((row) => {
          const total = series.reduce((n, s) => n + (row.values[s.key] ?? 0), 0);
          const shown = series.filter((s) => (row.values[s.key] ?? 0) > 0);
          return (
            <div key={row.label}>
              {!hideRowLabels && (
                <div className="mb-1 flex justify-between text-sm">
                  {row.href ? (
                    <Link href={row.href} className="font-medium text-ink-800 hover:text-brand-700">
                      {row.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-800">{row.label}</span>
                  )}
                  <span className="tabular text-ink-500">
                    {total} {unit}
                  </span>
                </div>
              )}
              {total === 0 ? (
                <div className="flex h-6 items-center rounded-r-[4px] bg-ink-100 px-2 text-xs text-ink-500">No {unit}</div>
              ) : (
                <div className="flex h-6 gap-[2px]">
                  {shown.map((s, i) => {
                    const value = row.values[s.key] ?? 0;
                    const share = (value / total) * 100;
                    const last = i === shown.length - 1;
                    return (
                      <div
                        key={s.key}
                        {...bind([
                          hideRowLabels ? s.label : `${row.label} · ${s.label}`,
                          `${value} ${unit} (${percent(value, total)}%)`,
                        ])}
                        className={`flex min-w-[3px] items-center justify-center overflow-hidden text-xs font-semibold text-white outline-offset-2 transition-opacity hover:opacity-85 ${s.fill} ${last ? "rounded-r-[4px]" : ""}`}
                        style={{ width: `${share}%` }}
                      >
                        {share >= 9 && <span className="tabular">{value}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {tooltip}
    </div>
  );
}
