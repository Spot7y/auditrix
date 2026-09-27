"use client";

import { useRef, useState } from "react";
import { importSubjectsCsv } from "./actions";

export default function CsvImportForm({ curriculumId }: { curriculumId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-4">
      <form action={importSubjectsCsv} className="flex items-center gap-3">
        <input type="hidden" name="curriculumId" value={curriculumId} />
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Choose Curriculum File
        </button>
        {fileName && <span className="text-sm text-[color:var(--ink)]/60">{fileName}</span>}
        {fileName && (
          <button
            type="submit"
            className="bg-[color:var(--accent-maroon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Import CSV
          </button>
        )}
      </form>
    </div>
  );
}
