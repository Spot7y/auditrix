import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
) {

  try {

    const searchParams =
      request.nextUrl.searchParams;

    const query =
      searchParams.get("query");

    if (!query) {

      return NextResponse.json(
        [],
      );
    }

    const supabase =
      await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("students")
      .select(`
        id,
        student_number,
        first_name,
        last_name,
        department,
        curriculum_year
      `)
      .or(
  `first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_number.ilike.%${query}%`
)
      .limit(10);

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