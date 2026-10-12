/** The numbers behind a chart, for reading exactly or with a screen reader. */
export default function TableView({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group border-t border-line">
      <summary className="cursor-pointer select-none px-5 py-2.5 text-xs font-medium text-ink-500 hover:text-ink-800">
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
  );
}
