"use client";

import { useEffect, useState } from "react";

import StatusBadge from "./status-badge";
import ViolationCard from "./violation-card";
import WarningCard from "./warning-card";
import CourseList from "./course-list";

interface Props {
  studentId: string;
}

export default function AuditSummary({
  studentId,
}: Props) {

  const [audit, setAudit] =
    useState<any>(null);

  useEffect(() => {

    fetch(
      `/api/audit/${studentId}`,
    )
      .then(
        (res) =>
          res.json(),
      )
      .then(setAudit);

  }, [studentId]);

  if (!audit) {

    return (
      <div>
        Loading Audit...
      </div>
    );

  }

  return (
    <div
      className="
        space-y-6
      "
    >
      <StatusBadge
        status={
          audit.overallStatus
        }
      />

      {audit.incWarnings.map(
        (
          warning: string,
        ) => (
          <WarningCard
            key={warning}
            message={warning}
          />
        ),
      )}

      {audit.violatedCourses.map(
        (
          violation: any,
        ) => (
          <ViolationCard
            key={
              violation.courseCode
            }
            violation={
              violation
            }
          />
        ),
      )}

      <div
        className="
          grid
          md:grid-cols-2
          gap-6
        "
      >
        <CourseList
          title="Passed Courses"
          courses={
            audit.validatedCourses
          }
        />

        <CourseList
          title="Pending Courses"
          courses={
            audit.pendingCourses
          }
        />
      </div>
    </div>
  );
}