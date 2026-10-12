"use client";

import Link from "next/link";
import { useChartTooltip } from "./useChartTooltip";

export interface BarItem {
  label: string;
  /** Smaller text after the label, e.g. a subject's title. */
  sub?: string;
  value: number;
  /** Tooltip lines after the label. */
  tip: string[];
  href?: string;
}

/** One bar per item, longest first as given, with the number at the bar's end. */
export default function BarList({ items, emptyText }: { items: BarItem[]; emptyText: string }) {
  const { ref, bind, tooltip } = useChartTooltip();
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) return <p className="px-5 py-6 text-sm text-ink-500">{emptyText}</p>;

  return (
    <div ref={ref} className="relative space-y-3 px-5 py-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="truncate text-sm">
            {item.href ? (
              <Link href={item.href} className="font-medium text-ink-800 hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-ink-800">{item.label}</span>
            )}
            {item.sub && <span className="text-ink-500"> · {item.sub}</span>}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-5 flex-1">
              <div
                {...bind([item.label, ...item.tip])}
                className={`h-full rounded-r-[4px] ${item.value > 0 ? "min-w-[3px]" : ""} bg-brand-600 outline-offset-2 transition-opacity hover:opacity-85`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="tabular w-8 shrink-0 text-right text-sm font-medium text-ink-700">{item.value}</span>
          </div>
        </div>
      ))}
      {tooltip}
    </div>
  );
}
