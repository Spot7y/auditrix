"use client";

import { useState } from "react";
import { importStudentsCsv } from "./actions";

interface VersionOption {
  id: string;
  effectiveYear: number;
}

export default function ImportStudentsForm({ versions }: { versions: VersionOption[] }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={importStudentsCsv} className="mt-8 space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">
          Curriculum Version
        </label>
        <select
          name="curriculumId"
          required
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
        <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]/60">CSV/XLS File</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".csv, .xls"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="text-sm file:mr-3 file:border-0 file:bg-[color:var(--accent-maroon)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
          />
          {fileName && (
            <button
              type="submit"
              className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Import Students
            </button>
          )}
        </div>
      </div>
    </form>
  );
}