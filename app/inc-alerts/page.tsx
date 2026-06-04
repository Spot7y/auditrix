import DashboardShell
from "@/components/dashboard/dashboard-shell";

import IncAlertTable
from "@/components/inc/inc-alert-table";

export default function
IncAlertsPage() {

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
            INC Alert Dashboard
          </h1>

          <p
            className="
            text-slate-500
            "
          >
            Monitor students with
            unresolved INC grades
          </p>

        </div>

        <IncAlertTable />

      </div>

    </DashboardShell>
  );
}