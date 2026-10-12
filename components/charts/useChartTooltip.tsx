"use client";

import { useRef, useState, type FocusEvent, type MouseEvent } from "react";

type Tip = { x: number; y: number; lines: string[] };

/**
 * A hover (and keyboard focus) tooltip for chart marks. Spread `bind(lines)`
 * on a mark and render `tooltip` inside the element that carries `ref`.
 */
export function useChartTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  function place(target: HTMLElement, clientX: number | null, lines: string[]) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const rect = target.getBoundingClientRect();
    const x = (clientX ?? rect.left + rect.width / 2) - box.left;
    // Keep the box inside the chart so it isn't cut off at the edges.
    setTip({ x: Math.min(Math.max(x, 90), box.width - 90), y: rect.top - box.top, lines });
  }

  function bind(lines: string[]) {
    return {
      tabIndex: 0,
      "aria-label": lines.join(". "),
      onMouseMove: (e: MouseEvent<HTMLElement>) => place(e.currentTarget, e.clientX, lines),
      onMouseLeave: () => setTip(null),
      onFocus: (e: FocusEvent<HTMLElement>) => place(e.currentTarget, null, lines),
      onBlur: () => setTip(null),
    };
  }

  const tooltip = tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-3 py-2 text-xs text-white shadow-overlay"
      style={{ left: tip.x, top: tip.y - 6 }}
    >
      <p className="font-semibold">{tip.lines[0]}</p>
      {tip.lines.slice(1).map((line) => (
        <p key={line} className="tabular mt-0.5 text-ink-200">
          {line}
        </p>
      ))}
    </div>
  );

  return { ref, bind, tooltip };
}
