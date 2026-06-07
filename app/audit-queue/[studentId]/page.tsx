"use client";

import StatusBadge
from "@/components/audit/status-badge";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import DashboardShell
from "@/components/dashboard/dashboard-shell";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Badge,
} from "@/components/ui/badge";

import {
  StudentAuditProfile,
} from "@/types/student-audit";

import AuditSummary
from "@/components/audit/audit-summary";

export default function
StudentAuditPage() {

  const params =
    useParams();

  const studentId =
  Array.isArray(
    params.studentId,
  )
    ? params.studentId[0]
    : params.studentId;

  if (!studentId) {
  return (
    <DashboardShell>
      <p>Invalid student ID</p>
    </DashboardShell>
  );
}

  const [
    profile,
    setProfile,
  ] = useState<
    StudentAuditProfile
    | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {

    async function
    fetchProfile() {

      try {

        const response =
          await fetch(
            `/api/students/${studentId}`,
          );

        const data =
          await response.json();

        setProfile(data);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    }

    fetchProfile();

  }, [studentId]);

  if (loading) {

    return (
      <DashboardShell>

        <p>
          Loading audit profile...
        </p>

      </DashboardShell>
    );
  }

  if (!profile) {

    return (
      <DashboardShell>

        <p>
          Student not found
        </p>

      </DashboardShell>
    );
  }

  return (
    <DashboardShell>

      <div
        className="
        space-y-8
        "
      >

        <Card>

          <CardHeader>

            <CardTitle>
              Student Audit Profile
            </CardTitle>

          </CardHeader>

          <CardContent
            className="
            space-y-4
            "
          >

            <div>

              <h2
                className="
                text-2xl
                font-bold
                "
              >
                {
                  profile.student
                    .first_name
                }{" "}
                {
                  profile.student
                    .last_name
                }
              </h2>

              <p
                className="
                text-slate-500
                "
              >
                {
                  profile.student
                    .student_number
                }
              </p>

            </div>

            <div
              className="
              flex
              gap-3
              "
            >

              <Badge>
                {
                  profile.student
                    .department
                }
              </Badge>

              <Badge
                variant="secondary"
              >
                Curriculum{" "}
                {
                  profile.student
                    .curriculum_year
                }
              </Badge>

              <StatusBadge
              status={
              profile.student
              .audit_status
            }
            />

            </div>

          </CardContent>

        </Card>

                <AuditSummary
  studentId={studentId}
/>

        <Card>

          <CardHeader>

            <CardTitle>
              Course History
            </CardTitle>

          </CardHeader>

          <CardContent>

            <div
              className="
              space-y-4
              "
            >

              {
                profile.histories.map(
                  (history) => (

                    <div
                      key={history.id}
                      className="
                      rounded-lg
                      border
                      p-4
                      "
                    >

                      <div
                        className="
                        flex
                        items-center
                        justify-between
                        "
                      >

                        <div>

                          <h3
                            className="
                            font-semibold
                            "
                          >
                            {
                              history
                              .courses
                              .course_code
                            }
                          </h3>

                          <p
                            className="
                            text-sm
                            text-slate-500
                            "
                          >
                            {
                              history
                              .courses
                              .course_title
                            }
                          </p>
                          <p
  className="
  mt-1
  text-xs
  text-slate-400
  "
>
  {
    history.semesters
    .semester_name
  }
  {" • "}
  {
    history.academic_year
  }
</p>

                        </div>

                       <StatusBadge
                      status={
                      history.status
                        }
                        />

                      </div>

                    </div>
                  )
                )
              }

            </div>

          </CardContent>

        </Card>

      </div>

    </DashboardShell>
  );
}