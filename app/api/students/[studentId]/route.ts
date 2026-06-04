import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      studentId: string;
    }>;
  },
) {

  try {

    const params =
      await context.params;

    const studentId =
      params.studentId;

    const supabase =
      await createClient();

    // STUDENT PROFILE

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("students")
      .select(`
        id,
        student_number,
        first_name,
        last_name,
        department,
        curriculum_year,
        admission_year,
        residency_start_year,
        audit_status
      `)
      .eq("id", studentId)
      .single();

    if (
      studentError
    ) {

      return NextResponse.json(
        {
          error:
            studentError.message,
        },
        {
          status: 500,
        },
      );
    }

    // COURSE HISTORIES

    const {
      data: histories,
      error: historyError,
    } = await supabase
      .from(
        "student_course_history",
      )
      .select(`
        id,
        academic_year,
        final_grade,
        status,
        completion_date,

        courses (
          course_code,
          course_title
        ),

        semesters (
          semester_number,
          semester_name
        )
      `)
      .eq(
        "student_id",
        studentId,
      );

    if (
      historyError
    ) {

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

    return NextResponse.json({
      student,
      histories,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}