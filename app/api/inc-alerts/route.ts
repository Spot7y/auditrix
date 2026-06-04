import { NextResponse }
from "next/server";

import { createClient }
from "@/lib/supabase/server";

export async function GET() {

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "student_course_history",
    )
    .select(`
      id,
      status,

      students (
        first_name,
        last_name
      ),

      courses (
        course_code,
        course_title
      )
    `)
    .eq(
      "status",
      "INC",
    );

  if (error) {

    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(
    data,
  );
}