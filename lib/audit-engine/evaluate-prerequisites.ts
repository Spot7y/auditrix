import { AuditViolation } from "./types";

export function evaluatePrerequisites(
  histories: {
    course_code: string;
    status: string;
  }[],

  prerequisites: {
    course_code: string;
    prerequisite_code: string;
  }[],
): AuditViolation[] {

  const violations: AuditViolation[] = [];

  const passedCourses =
    histories
      .filter(
        (course) =>
          course.status === "Passed",
      )
      .map(
        (course) =>
          course.course_code,
      );

  prerequisites.forEach((rule) => {

    const targetCourse =
      rule.course_code;

    const prerequisiteCourse =
      rule.prerequisite_code;

    const tookTargetCourse =
      histories.some(
        (history) =>
          history.course_code ===
          targetCourse,
      );

    if (
      tookTargetCourse &&
      !passedCourses.includes(
        prerequisiteCourse,
      )
    ) {

      violations.push({
        courseCode:
          targetCourse,

        missingPrerequisite:
          prerequisiteCourse,

        reason:
          "Prerequisite not passed",
      });

    }

  });

  return violations;
}