import { evaluateINC } from "./evaluate-inc";

import { evaluatePrerequisites } from "./evaluate-prerequisites";

import {
  AuditResult,
} from "./types";

export function generateAudit(
  histories: {
    course_code: string;
    status: string;
  }[],

  prerequisites: {
    course_code: string;
    prerequisite_code: string;
  }[],
): AuditResult {

  const incWarnings =
    evaluateINC(
      histories,
    );

  const violations =
    evaluatePrerequisites(
      histories,
      prerequisites,
    );

  const validatedCourses =
    histories
      .filter(
        (course) =>
          course.status ===
          "Passed",
      )
      .map(
        (course) =>
          course.course_code,
      );

  const pendingCourses =
    histories
      .filter(
        (course) =>
          course.status !==
          "Passed",
      )
      .map(
        (course) =>
          course.course_code,
      );

  let overallStatus:
    | "Validated"
    | "Pending"
    | "Violated";

  if (
    violations.length > 0
  ) {

    overallStatus =
      "Violated";

  } else if (
    incWarnings.length > 0
  ) {

    overallStatus =
      "Pending";

  } else {

    overallStatus =
      "Validated";

  }

  return {

    overallStatus,

    validatedCourses,

    pendingCourses,

    violatedCourses:
      violations,

    incWarnings,

  };
}