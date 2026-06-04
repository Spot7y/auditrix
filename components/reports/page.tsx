import DashboardShell
from "@/components/dashboard/dashboard-shell";

import ReportTable
from "@/components/reports/report-table";

export default function
ReportsPage() {

  return (

    <DashboardShell>

      <div
        className="
        space-y-8
        "
      >

        <div>

          <h1
            className="
            text-4xl
            font-bold
            "
          >
            Audit Reports
          </h1>

          <p
            className="
            text-slate-500
            "
          >
            Student audit
            compliance records
          </p>

        </div>

        <ReportTable />

      </div>

    </DashboardShell>
  );
}