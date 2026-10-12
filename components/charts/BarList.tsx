"use client";

import Link from "next/link";
import { useChartTooltip } from "./useChartTooltip";

export interface BarItem {
  label: string;
  value: number;
  /** Tooltip lines after the label, e.g. the subject's title and the breakdown. */
  tip: string[];
  href?: string;
}

/**
 * One thin bar per item, in the order given, with the number at the bar's
 * end. Pass the same `max` to charts shown side by side so equal numbers get
 * equal bars.
 */
export default function BarList({ items, max, emptyText }: { items: BarItem[]; max?: number; emptyText: string }) {
  const { ref, bind, tooltip } = useChartTooltip();
  const scale = Math.max(1, max ?? 0, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <p className="flex flex-1 items-center justify-center px-5 py-8 text-sm text-ink-500">{emptyText}</p>;
  }

  return (
    <div ref={ref} className="relative flex-1 space-y-1 px-5 py-4">
      {items.map((item) => (
        <div key={item.label} className="flex h-7 items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate" title={item.label}>
            {item.href ? (
              <Link href={item.href} className="font-medium text-ink-800 hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-ink-800">{item.label}</span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {item.value > 0 && (
              <div
                {...bind([item.label, ...item.tip])}
                className="h-2.5 min-w-[3px] rounded-r-[4px] bg-brand-600 outline-offset-2 transition-opacity hover:opacity-80"
                style={{ width: `${(item.value / scale) * 85}%` }}
              />
            )}
            <span className="tabular text-xs font-medium text-ink-600">{item.value}</span>
          </div>
        </div>
      ))}
      {tooltip}
    </div>
  );
}
