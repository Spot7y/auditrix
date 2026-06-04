import DashboardShell from "@/components/dashboard/dashboard-shell";

import StudentSearch from "@/components/audit/student-search";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuditQueuePage() {

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
            tracking-tight
            "
          >
            Audit Queue
          </h1>

          <p
            className="
            mt-2
            text-slate-500
            "
          >
            Search and evaluate
            student curriculum compliance
          </p>

        </div>

        <Card>

          <CardHeader>

            <CardTitle>
              Student Lookup
            </CardTitle>

          </CardHeader>

          <CardContent>

            <StudentSearch />

          </CardContent>

        </Card>

        <Card>

          <CardHeader>

            <CardTitle>
              Audit Workflow
            </CardTitle>

          </CardHeader>

          <CardContent>

            <div
              className="
              space-y-4
              text-sm
              text-slate-600
              "
            >

              <p>
                1. Search a student
                using student number
                or name.
              </p>

              <p>
                2. Open the student
                audit profile.
              </p>

              <p>
                3. Review prerequisite
                compliance and INC
                warnings.
              </p>

              <p>
                4. Validate curriculum
                eligibility before
                enrollment approval.
              </p>

            </div>

          </CardContent>

        </Card>

      </div>

    </DashboardShell>
  );
}