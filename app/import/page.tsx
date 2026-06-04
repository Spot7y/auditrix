import DashboardShell
from "@/components/dashboard/dashboard-shell";

import UploadZone
from "@/components/import/upload-zone";

export default function ImportPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-bold">
            Student Data Import
          </h1>

          <p className="text-slate-500">
            Upload CSV or Excel files
            for bulk student import.
          </p>
        </div>

        <UploadZone />

      </div>
    </DashboardShell>
  );
}