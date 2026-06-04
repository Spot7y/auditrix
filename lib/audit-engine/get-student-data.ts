import { createClient }
from "@/lib/supabase/server";

export async function
getStudentData(
  studentNumber: string
) {

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("students")
      .select(`
        *,
        student_course_history (
          *,
          courses (*)
        )
      `)
      .eq(
        "student_number",
        studentNumber
      )
      .limit(1);

  if (error) {

    throw new Error(
      error.message
    );
  }

  if (!data || data.length === 0) {

    throw new Error(
      "Student not found"
    );
  }

  return data[0];
}