import DashboardShell
from "@/components/dashboard/dashboard-shell";

import CurriculumTable
from "@/components/curriculum/curriculum-table";

export default function
CurriculumPage() {

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
            Curriculum Map
          </h1>

          <p
            className="
            text-slate-500
            "
          >
            Course prerequisite
            structure used by
            the Audit Engine
          </p>

        </div>

        <CurriculumTable />

      </div>

    </DashboardShell>
  );
}