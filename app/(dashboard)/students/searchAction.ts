"use server";

import { searchStudents } from "../../../lib/queries/students";

export async function liveSearchStudents(query: string) {
  return searchStudents(query);
}