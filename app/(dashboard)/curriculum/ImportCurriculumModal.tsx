"use client";

import ImportDialog from "../../../components/ImportDialog";
import type { CurriculumImportSummary } from "../../../lib/domain/import/curriculumImport";
import { importSubjectsCsv, previewSubjectsCsv } from "./actions";

export default function ImportCurriculumModal({ curriculumId }: { curriculumId: string }) {
  return (
    <>
      <ImportDialog
        triggerLabel="Import Curriculum"
        triggerClassName="mt-4 block w-full border border-[color:var(--ledger-line)] px-5 py-2 text-center text-sm font-medium text-[color:var(--ink)] hover:bg-black/5"
        title="Import Curriculum"
        action={importSubjectsCsv}
        doneHref={`/curriculum?version=${curriculumId}`}
        preview={{ action: previewSubjectsCsv, render: (summary) => <ImportSummary summary={summary} /> }}
      >
        <input type="hidden" name="curriculumId" value={curriculumId} />

        <div>
          <label
            htmlFor="import-curriculum-file"
            className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60"
          >
            CSV File
          </label>
          <input
            id="import-curriculum-file"
            type="file"
            name="file"
            accept=".csv"
            required
            className="mt-1 block w-full text-sm file:mr-3 file:border-0 file:bg-[color:var(--accent-maroon)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
          />
          <p className="mt-1 text-xs text-[color:var(--ink)]/50">
            Columns: Code, Title, Units, Year, Semester, Prerequisites (separate several with “;”).
          </p>
        </div>

        <p className="border-l-4 border-[color:var(--status-pending)] bg-black/[0.03] px-3 py-2 text-xs text-[color:var(--ink)]/80">
          This replaces the subject list of this curriculum version: subjects that aren’t in the file are removed, and
          prerequisites are replaced with the ones in the file. You’ll see a preview before anything is saved.
        </p>
      </ImportDialog>
      <a
        href="/curriculum-import-template.csv"
        download
        className="mt-2 inline-block text-sm text-[color:var(--accent-maroon)] hover:underline"
      >
        Download CSV template
      </a>
    </>
  );
}

export function ImportSummary({ summary }: { summary: CurriculumImportSummary }) {
  const { added, changed, unchangedCount, removed, keptWithGrades } = summary;
  const nothingChanges = added.length === 0 && changed.length === 0 && removed.length === 0;

  return (
    <div className="space-y-4 text-sm">
      <p className="font-medium">
        {added.length} added · {changed.length} changed · {unchangedCount} unchanged · {removed.length} removed
      </p>
      {nothingChanges && (
        <p className="text-[color:var(--ink)]/70">
          The file matches this curriculum version. Importing won’t change it.
        </p>
      )}

      <SummarySection title="Will be removed" tone="violation" items={removed}>
        Not in the file. Their prerequisites are removed with them.
      </SummarySection>
      <SummarySection title="Added" tone="completed" items={added} />
      {changed.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--status-pending)]">
            Changed ({changed.length})
          </p>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
            {changed.map((c) => (
              <li key={c.code}>
                <span className="font-medium">{c.code}</span>: {c.changes.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <SummarySection title="Kept because students have grades in them" tone="unavailable" items={keptWithGrades}>
        Not in the file, but can’t be removed while grades are recorded.
      </SummarySection>
    </div>
  );
}

function SummarySection({
  title,
  tone,
  items,
  children,
}: {
  title: string;
  tone: "violation" | "completed" | "unavailable";
  items: string[];
  children?: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `var(--status-${tone})` }}>
        {title} ({items.length})
      </p>
      {children && <p className="mt-0.5 text-xs text-[color:var(--ink)]/60">{children}</p>}
      <p className="mt-1 max-h-24 overflow-y-auto text-xs">{items.join(", ")}</p>
    </div>
  );
}
