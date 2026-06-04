import {
  StudentProfile,
  StudentCourseRecord,
} from "@/types/student";

import {
  CurriculumCourse,
} from "@/types/curriculum";

import {
  AuditResult,
  AuditViolation,
} from "@/types/audit";

/**
 * Find a student course record
 * from historical records.
 */
function findStudentCourse(
  records: StudentCourseRecord[],
  courseCode: string
) {
  return records.find(
    (record) =>
      record.courseCode === courseCode
  );
}

/**
 * Checks whether a course
 * is officially PASSED.
 */
function isCoursePassed(
  course?: StudentCourseRecord
) {
  if (!course) return false;

  return course.status === "Passed";
}

/**
 * Checks whether a course
 * has unresolved INC.
 */
function isCourseINC(
  course?: StudentCourseRecord
) {
  if (!course) return false;

  return course.status === "INC";
}

/**
 * Main Curriculum Audit Engine
 */
export function runCurriculumAudit(
  student: StudentProfile,
  curriculumCourses: CurriculumCourse[]
): AuditResult {

  const validatedCourses: string[] = [];

  const pendingCourses: string[] = [];

  const violatedCourses: AuditViolation[] = [];

  const incWarnings: string[] = [];

  /**
   * Loop through ALL curriculum courses
   */
  for (const curriculumCourse of curriculumCourses) {

    /**
     * Student's actual course record
     */
    const studentCourse =
      findStudentCourse(
        student.records,
        curriculumCourse.courseCode
      );

    /**
     * If student has not taken
     * the course yet
     */
    if (!studentCourse) {

      pendingCourses.push(
        curriculumCourse.courseCode
      );

      continue;
    }

    /**
     * Direct INC handling
     */
    if (
      isCourseINC(studentCourse)
    ) {

      incWarnings.push(
        `${curriculumCourse.courseCode} has unresolved INC status`
      );

      pendingCourses.push(
        curriculumCourse.courseCode
      );

      continue;
    }

    /**
     * Course prerequisites
     */
    const prerequisites =
      curriculumCourse.prerequisites;

    let violated = false;

    /**
     * Validate prerequisite chain
     */
    for (
      const prerequisiteCode
      of prerequisites
    ) {

      const prerequisiteRecord =
        findStudentCourse(
          student.records,
          prerequisiteCode
        );

      /**
       * Missing prerequisite
       */
      if (!prerequisiteRecord) {

        violatedCourses.push({
          courseCode:
            curriculumCourse.courseCode,

          missingPrerequisite:
            prerequisiteCode,

          reason:
            "Missing prerequisite record",
        });

        violated = true;

        continue;
      }

      /**
       * INC prerequisite
       */
      if (
        isCourseINC(
          prerequisiteRecord
        )
      ) {

        incWarnings.push(
          `${prerequisiteCode} has unresolved INC status`
        );

        violatedCourses.push({
          courseCode:
            curriculumCourse.courseCode,

          missingPrerequisite:
            prerequisiteCode,

          reason:
            "Prerequisite has INC status",
        });

        violated = true;

        continue;
      }

      /**
       * Failed prerequisite
       */
      if (
        !isCoursePassed(
          prerequisiteRecord
        )
      ) {

        violatedCourses.push({
          courseCode:
            curriculumCourse.courseCode,

          missingPrerequisite:
            prerequisiteCode,

          reason:
            "Prerequisite not passed",
        });

        violated = true;
      }
    }

    /**
     * Final course validation
     */
    if (violated) {

      pendingCourses.push(
        curriculumCourse.courseCode
      );

      continue;
    }

    /**
     * Student passed course
     */
    if (
      isCoursePassed(studentCourse)
    ) {

      validatedCourses.push(
        curriculumCourse.courseCode
      );

    } else {

      pendingCourses.push(
        curriculumCourse.courseCode
      );
    }
  }

  /**
   * Residency monitoring
   */
  const currentYear =
    new Date().getFullYear();

  const residencyYears =
    currentYear -
    student.residencyStartYear;

  let residencyWarning:
    | string
    | undefined;

  /**
   * CEIT residency threshold
   */
  if (residencyYears > 6) {

    residencyWarning =
      "Residency exceeds curriculum limit";
  }

  /**
   * Overall audit state
   */
  let overallStatus:
    | "Pending"
    | "Validated"
    | "Violated";

  if (
    violatedCourses.length > 0
  ) {

    overallStatus = "Violated";

  } else if (
    pendingCourses.length > 0
  ) {

    overallStatus = "Pending";

  } else {

    overallStatus = "Validated";
  }

  return {
    overallStatus,

    validatedCourses,

    pendingCourses,

    violatedCourses,

    incWarnings,

    residencyWarning,
  };
}