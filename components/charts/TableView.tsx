import type { ReactNode } from "react";

/**
 * The bottom of a chart card: "View as table" (the numbers behind the chart,
 * for reading exactly or with a screen reader) and an optional link.
 */
export default function TableView({
  headers,
  rows,
  link,
}: {
  headers: string[];
  rows: (string | number)[][];
  /** Shown at the right of the footer, e.g. "See students". */
  link?: ReactNode;
}) {
  return (
    <div className="relative mt-auto border-t border-line">
      {link && <div className="absolute right-5 top-0 flex h-10 items-center text-xs font-medium">{link}</div>}
      {rows.length === 0 ? (
        <div className="h-10" />
      ) : (
        <details className="group">
          <summary className="flex h-10 w-fit cursor-pointer select-none items-center px-5 text-xs font-medium text-ink-500 hover:text-ink-800">
            <span className="group-open:hidden">View as table</span>
            <span className="hidden group-open:inline">Hide table</span>
          </summary>
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-500">
                  {headers.map((h, i) => (
                    <th key={h} scope="col" className={`py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row[0])} className="border-b border-line last:border-0">
                    {row.map((cell, i) => (
                      <td key={i} className={`py-1.5 ${i > 0 ? "tabular text-right text-ink-900" : "text-ink-700"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
