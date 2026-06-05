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
      "course_prerequisites",
    )
    .select(`
      courses!course_prerequisites_course_id_fkey (
        course_code,
        course_title
      ),

      prerequisite:courses!course_prerequisites_prerequisite_course_id_fkey (
        course_code,
        course_title
      )
    `);

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