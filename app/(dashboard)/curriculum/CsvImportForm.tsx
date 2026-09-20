"use client";

import { useState } from "react";
import { importSubjectsCsv } from "./actions";

export default function CsvImportForm({ curriculumId }: { curriculumId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <form action={importSubjectsCsv} className="flex items-center gap-3">
        <input type="hidden" name="curriculumId" value={curriculumId} />
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="text-sm file:mr-3 file:border-0 file:bg-[color:var(--accent-maroon)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
        />
        {fileName && (
          <button
            type="submit"
            className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Import CSV
          </button>
        )}
      </form>
       <a     
        href="/curriculum-import-template.csv"
        download
        className="mt-2 inline-block text-xs text-[color:var(--accent-maroon)] hover:underline"
      >
        Download a template CSV
      </a>
    </div>
  );
}