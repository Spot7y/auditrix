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
    .from("students")
    .select(`
      id,
      student_number,
      first_name,
      last_name,
      department,
      audit_status
    `)
    .order(
      "last_name",
      {
        ascending: true,
      },
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