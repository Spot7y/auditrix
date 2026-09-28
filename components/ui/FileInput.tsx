"use client";

import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Hint, Label } from "./Field";

/** A file picker styled as a drop zone. The input itself stays in the form. */
export default function FileInput({
  id,
  label,
  name = "file",
  accept,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  name?: string;
  accept?: string;
  hint?: string;
  required?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        onDragOver={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
        className={`relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors ${
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50 hover:border-brand-400 hover:bg-brand-50/50"
        }`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
          {file ? <FileSpreadsheet className="size-5" aria-hidden /> : <UploadCloud className="size-5" aria-hidden />}
        </span>
        <span className="min-w-0 text-sm">
          {file ? (
            <>
              <span className="block truncate font-medium text-ink-900">{file.name}</span>
              <span className="text-ink-500">{(file.size / 1024).toFixed(0)} KB · click to choose a different file</span>
            </>
          ) : (
            <>
              <span className="block font-medium text-ink-900">Choose a file</span>
              <span className="text-ink-500">or drag it here</span>
            </>
          )}
        </span>
        {/* Covers the whole zone so dropping a file lands on the input. */}
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
