import { NextResponse } from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function POST(
  request: Request,
) {

  try {

    const rows =
      await request.json();

    const supabase =
      await createClient();

    const students =
      rows.map(
        (row: any) => ({
          student_number:
            row.student_number,

          first_name:
            row.first_name,

          last_name:
            row.last_name,

          department:
            row.department,

          curriculum_year:
            Number(
              row.curriculum_year,
            ),

          admission_year:
            Number(
              row.admission_year,
            ),

          residency_start_year:
            Number(
              row.residency_start_year,
            ),

          audit_status:
            row.audit_status,
        }),
      );

    const {
      error,
    } = await supabase
      .from("students")
      .insert(
        students,
      );

    if (error) {

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        imported:
          students.length,
      },
    );

  } catch (error) {

    console.error(
      error,
    );

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}