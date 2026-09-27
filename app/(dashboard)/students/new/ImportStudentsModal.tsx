"use client";

import ImportDialog from "../../../../components/ImportDialog";
import { importStudentsCsv } from "./importActions";

interface VersionOption {
  id: string;
  effectiveYear: number;
}

export default function ImportStudentsModal({ versions }: { versions: VersionOption[] }) {
  return (
    <ImportDialog
      triggerLabel="Import Students (CSV/XLS)"
      triggerClassName="mt-4 block w-full border border-[color:var(--ledger-line)] px-5 py-2 text-center text-sm font-medium text-[color:var(--ink)] hover:bg-black/5"
      title="Import Students"
      action={importStudentsCsv}
    >
      <div>
        <label
          htmlFor="import-curriculumId"
          className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60"
        >
          Curriculum Version
        </label>
        <select
          id="import-curriculumId"
          name="curriculumId"
          required
          defaultValue=""
          className="mt-1 w-full border border-[color:var(--ledger-line)] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-maroon)]"
        >
          <option value="">Select…</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.effectiveYear}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[color:var(--ink)]/50">
          All students in the file will be registered under this one curriculum version.
        </p>
      </div>

      <div>
        <label htmlFor="import-file" className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
          CSV/XLS File
        </label>
        <input
          id="import-file"
          type="file"
          name="file"
          accept=".csv, .xls"
          required
          className="mt-1 block w-full text-sm file:mr-3 file:border-0 file:bg-[color:var(--accent-maroon)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
      </div>
    </ImportDialog>
  );
}
