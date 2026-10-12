"use server";

import { searchStudents } from "../../../lib/queries/students";
import { getCurrentStaff } from "../../../lib/queries/staff";

/** Student search is for chairpersons; deans see programs, not individual students. */
export async function liveSearchStudents(query: string) {
  const staff = await getCurrentStaff();
  if (staff?.role !== "chairperson") return [];
  return searchStudents(query);
}