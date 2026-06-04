

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { generateAudit } from "@/lib/audit-engine/generate-audit";

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      studentId: string;
    }>;
  },
) {
  try {
    const { studentId } =
      await context.params;

    const supabase =
      await createClient();

    // STUDENT HISTORY

   const {
  data: histories,
  error: historyError,
} = await supabase
  .from("student_course_history")
  .select(`
    status,
    course_id
  `)
  .eq(
    "student_id",
    studentId,
  );

  if (historyError) {
  return NextResponse.json(
    {
      error:
        historyError.message,
    },
    {
      status: 500,
    },
  );
}

if (histories.length === 0) {
  return NextResponse.json({
    overallStatus: "Pending",
    validatedCourses: [],
    pendingCourses: [],
    violatedCourses: [],
    incWarnings: [
      "No academic records found",
    ],
  });
}

const courseIds =
  histories.map(
    (h) => h.course_id,
  );

const {
  data: courses,
  error: courseError,
} = await supabase
  .from("courses")
  .select(`
    id,
    course_code
  `)
  .in(
    "id",
    courseIds,
  );

if (courseError) {
  return NextResponse.json(
    {
      error:
        courseError.message,
    },
    {
      status: 500,
    },
  );
}

    // PREREQUISITES

    const {
      data: prerequisites,
      error:
        prerequisiteError,
    } = await supabase
      .from(
        "course_prerequisites",
      )
      .select(`
        courses!course_prerequisites_course_id_fkey (
          course_code
        ),

        prerequisite:courses!course_prerequisites_prerequisite_course_id_fkey (
          course_code
        )
      `);

    if (
      prerequisiteError
    ) {
      return NextResponse.json(
        {
          error:
            prerequisiteError.message,
        },
        {
          status: 500,
        },
      );
    }



    const formattedHistory =
  histories.map(
    (history) => {

      const matchingCourse =
        courses.find(
          (course) =>
            course.id ===
            history.course_id,
        );

      return {
        status:
          history.status,

        course_code:
          matchingCourse
            ?.course_code ??
          "",
      };

    },
  );

    const formattedRules =
      prerequisites.map(
        (rule: any) => ({
          course_code:
            rule.courses
              ?.course_code,

          prerequisite_code:
            rule.prerequisite
              ?.course_code,
        }),
      );

    const audit =
      generateAudit(
        formattedHistory,
        formattedRules,
      );

    return NextResponse.json(
      audit,
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Internal Server Error",
      },
      {
        status: 500,
      },
    );
  }
}