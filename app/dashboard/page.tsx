import DashboardShell from "@/components/dashboard/dashboard-shell";

import StatCards
from "@/components/analytics/stat-cards";

export default function DashboardPage() {

  return (
    <DashboardShell>

      <div className="space-y-8">

        <div>

          <h1
            className="
            text-4xl
            font-bold
            tracking-tight
            "
          >
            Auditrix Command Center
          </h1>

          <p
            className="
            mt-2
            text-slate-500
            "
          >
            Curriculum Audit Monitoring
            for KSU-CEIT
          </p>

        </div>

        <StatCards />

      </div>

    </DashboardShell>
  );
}