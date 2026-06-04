import { createClient }
from "@/lib/supabase/server";

export async function
getCurriculum(
  trackId: string
) {

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("courses")
      .select(`
        *,
        course_prerequisites (
          prerequisite_course_id
        )
      `)
      .eq("track_id", trackId);

  if (error) {

    throw new Error(
      error.message
    );
  }

  return data;
}