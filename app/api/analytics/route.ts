import { NextResponse } from "next/server";

import { createClient }
from "@/lib/supabase/server";

export async function GET() {

  const supabase =
    await createClient();

  const {
    count: totalStudents,
  } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    });

  const {
    count: validated,
  } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "audit_status",
      "Validated",
    );

  const {
    count: pending,
  } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "audit_status",
      "Pending",
    );

  const {
    count: violated,
  } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "audit_status",
      "Violated",
    );

  return NextResponse.json({
    totalStudents,
    validated,
    pending,
    violated,
  });
}