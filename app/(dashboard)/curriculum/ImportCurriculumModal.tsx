"use client";

import ImportDialog from "../../../components/ImportDialog";
import FileInput from "../../../components/ui/FileInput";
import Alert from "../../../components/ui/Alert";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import type { CurriculumImportSummary } from "../../../lib/domain/import/curriculumImport";
import { importSubjectsCsv, previewSubjectsCsv } from "./actions";

export default function ImportCurriculumModal({ curriculumId }: { curriculumId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ImportDialog
        triggerLabel="Import curriculum"
        title="Import curriculum"
        description="Replace this version’s subjects with the ones in a CSV or .xls file."
        action={importSubjectsCsv}
        doneHref={`/curriculum?version=${curriculumId}`}
        preview={{ action: previewSubjectsCsv, render: (summary) => <ImportSummary summary={summary} /> }}
      >
        <input type="hidden" name="curriculumId" value={curriculumId} />
        <FileInput
          id="import-curriculum-file"
          label="File"
          accept=".csv,.xls"
          hint="CSV or .xls. Columns: code, title, units, year level, semester, prerequisites (separate several with “;”)."
        />
        <Alert tone="warning">
          Subjects that aren’t in the file are removed, and prerequisites are replaced with the ones in the file.
          You’ll see exactly what changes before anything is saved.
        </Alert>
      </ImportDialog>
      <a href="/curriculum-import-template.csv" download className="text-sm font-medium text-brand-700 hover:underline">
        Download template
      </a>
    </div>
  );
}

export function ImportSummary({ summary }: { summary: CurriculumImportSummary }) {
  const { added, changed, unchangedCount, removed, keptWithGrades } = summary;
  const nothingChanges = added.length === 0 && changed.length === 0 && removed.length === 0;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["Added", added.length, "text-status-completed"],
          ["Changed", changed.length, "text-status-pending"],
          ["Unchanged", unchangedCount, "text-ink-700"],
          ["Removed", removed.length, "text-status-violation"],
        ].map(([label, count, color]) => (
          <div key={label as string} className="rounded-lg border border-line bg-ink-50 px-2 py-2.5">
            <p className={`tabular text-lg font-semibold ${color}`}>{count}</p>
            <p className="text-xs text-ink-500">{label}</p>
          </div>
        ))}
      </div>
      {nothingChanges && <p className="text-ink-600">The file matches this curriculum version. Importing won’t change it.</p>}

      <SummarySection title="Will be removed" tone="red" items={removed}>
        Not in the file. Their prerequisites are removed with them.
      </SummarySection>
      <SummarySection title="Added" tone="green" items={added} />
      {changed.length > 0 && (
        <div>
          <p className="font-medium text-ink-900">Changed</p>
          <ul className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto text-xs text-ink-600">
            {changed.map((c) => (
              <li key={c.code}>
                <span className="font-mono font-medium text-ink-800">{c.code}</span> — {c.changes.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <SummarySection title="Kept because students have grades in them" tone="gray" items={keptWithGrades}>
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
  tone: BadgeTone;
  items: string[];
  children?: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-ink-900">{title}</p>
      {children && <p className="mt-0.5 text-xs text-ink-500">{children}</p>}
      <div className="mt-1.5 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
        {items.map((code) => (
          <Badge key={code} tone={tone}>
            {code}
          </Badge>
        ))}
      </div>
    </div>
  );
}
