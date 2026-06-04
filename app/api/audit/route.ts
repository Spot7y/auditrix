import { NextRequest }
from "next/server";

import {
  runCurriculumAudit,
} from "@/lib/audit-engine/prerequisite-checker";

import {
  getStudentData,
} from "@/lib/audit-engine/get-student-data";

import {
  getCurriculum,
} from "@/lib/audit-engine/get-curriculum";

export async function GET(
  request: NextRequest
) {

  try {

    const studentNumber =
      request.nextUrl
        .searchParams
        .get("studentNumber");

    if (!studentNumber) {

      return Response.json({
        error:
          "studentNumber required",
      });
    }

    const student =
      await getStudentData(
        studentNumber
      );

    const curriculum =
      await getCurriculum(
        student.curriculum_track_id
      );

    const formattedCourses =
      curriculum.map(
        (course: any) => ({
          id: course.id,

          courseCode:
            course.course_code,

          courseTitle:
            course.course_title,

          yearLevel:
            course.year_level,

          semester: 1,

          prerequisites:
            course
              .course_prerequisites
              ?.map(
                (p: any) =>
                  p
                    .prerequisite_course_id
              ) || [],
        })
      );

    const formattedStudent = {
      studentNumber:
        student.student_number,

      firstName:
        student.first_name,

      lastName:
        student.last_name,

      department:
        student.department,

      curriculumYear: 2020,

      residencyStartYear:
        student.residency_start_year,

      records:
        student
          .student_course_history
          .map((record: any) => ({
            courseCode:
              record
                .courses
                .course_code,

            courseTitle:
              record
                .courses
                .course_title,

            academicYear:
              record.academic_year,

            semester: 1,

            finalGrade:
              record.final_grade,

            status:
              record.status,
          })),
    };

    const result =
      runCurriculumAudit(
        formattedStudent,
        formattedCourses
      );

    return Response.json(
      result
    );

  } catch (error: any) {

    return Response.json({
      error:
        error.message,
    });
  }
}   