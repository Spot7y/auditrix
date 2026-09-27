"use client";

import ImportDialog from "../../../components/ImportDialog";
import { importSubjectsCsv } from "./actions";

export default function ImportCurriculumModal({ curriculumId }: { curriculumId: string }) {
  return (
    <>
      <ImportDialog
        triggerLabel="Import Curriculum"
        triggerClassName="mt-4 block w-full border border-[color:var(--ledger-line)] px-5 py-2 text-center text-sm font-medium text-[color:var(--ink)] hover:bg-black/5"
        title="Import Curriculum"
        action={importSubjectsCsv}
        doneHref={`/curriculum?version=${curriculumId}`}
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
          This replaces the subject list of this curriculum version. Subjects that aren’t in the file will be
          removed, and prerequisites are replaced with the ones in the file.
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
