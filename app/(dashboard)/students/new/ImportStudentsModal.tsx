"use client";

import ImportDialog from "../../../../components/ImportDialog";
import { Field, Select } from "../../../../components/ui/Field";
import FileInput from "../../../../components/ui/FileInput";
import { importStudentsCsv } from "./importActions";

interface VersionOption {
  id: string;
  effectiveYear: number;
}

export default function ImportStudentsModal({ versions }: { versions: VersionOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ImportDialog
        triggerLabel="Import students"
        title="Import students"
        description="Register every student in an Excel, CSV or KSU-MIS export file."
        action={importStudentsCsv}
      >
        <Field
          label="Curriculum version"
          htmlFor="import-curriculumId"
          hint="Every student in the file is registered under this curriculum version."
        >
          <Select id="import-curriculumId" name="curriculumId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.effectiveYear}
              </option>
            ))}
          </Select>
        </Field>
        <FileInput id="import-file" label="File" accept=".xlsx,.xls,.csv" hint="Excel (.xlsx or .xls), CSV, or the “Export to Excel” file from KSU-MIS. Up to 10 MB." />
      </ImportDialog>
      <a href="/student-import-template.xls" download className="text-sm font-medium text-brand-700 hover:underline">
        Download template
      </a>
    </div>
  );
}
